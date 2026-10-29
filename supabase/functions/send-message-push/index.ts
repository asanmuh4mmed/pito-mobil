import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply(405, { success: false, error: 'Method not allowed' });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return reply(503, { success: false, error: 'Server configuration missing' });
    const bearer = req.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!bearer) return reply(401, { success: false, error: 'Authentication required' });
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth, error: authError } = await db.auth.getUser(bearer);
    if (authError || !auth.user) return reply(401, { success: false, error: 'Invalid session' });
    let body;
    try { body = await req.json(); } catch { return reply(400, { success: false, error: 'Invalid JSON' }); }
    const id = body?.message_id;
    if (!['string', 'number'].includes(typeof id) || !/^[a-zA-Z0-9-]{1,80}$/.test(String(id))) {
      return reply(400, { success: false, error: 'Invalid message ID' });
    }
    // Fetch the saved message. Never accept receiver, title, text or push token from the caller.
    const { data: message, error: messageError } = await db.from('messages')
      .select('id,sender_id,receiver_id,room_id,text').eq('id', id).eq('sender_id', auth.user.id).maybeSingle();
    if (messageError) throw new Error('message_lookup');
    if (!message || message.receiver_id === auth.user.id) return reply(404, { success: false, error: 'Message not found' });
    const { data: blocks, error: blocksError } = await db.from('blocks').select('blocker_id,blocked_id')
      .in('blocker_id', [message.sender_id, message.receiver_id])
      .in('blocked_id', [message.sender_id, message.receiver_id]);
    if (blocksError) throw new Error('block_lookup');
    if (blocks?.length) return reply(200, { success: true, skipped: 'blocked' });
    const { data: recipient, error: recipientError } = await db.from('users')
      .select('expo_push_token,notification_settings').eq('id', message.receiver_id).maybeSingle();
    if (recipientError) throw new Error('recipient_lookup');
    const token = recipient?.expo_push_token;
    if (!token || recipient.notification_settings?.enabled === false) return reply(200, { success: true, skipped: 'disabled_or_no_token' });
    if (!/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(token)) return reply(200, { success: true, skipped: 'invalid_token' });
    // One provider attempt per message, including concurrent calls. No automatic retry after an uncertain outcome.
    const { error: claimError } = await db.from('pito_message_push_attempts').insert({
      message_key: String(message.id), sender_id: auth.user.id,
    });
    if (claimError?.code === '23505') return reply(200, { success: true, skipped: 'already_attempted' });
    if (claimError) throw new Error('push_claim');
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ to: token, title: 'Pito’dan yeni mesaj 🐾',
        body: String(message.text || '📷 Bir fotoğraf gönderildi.').slice(0, 180),
        ...(recipient.notification_settings?.sound === false ? {} : { sound: 'default' }),
        data: { roomId: message.room_id, senderId: message.sender_id },
      }),
    });
    const result = await response.json();
    if (!response.ok || result?.data?.status !== 'ok') throw new Error('push_provider');
    return reply(200, { success: true, accepted: true });
  } catch {
    // Keep message content, recipient tokens and service credentials out of logs and responses.
    console.error('send-message-push failed');
    return reply(503, { success: false, error: 'Notification could not be confirmed' });
  }
});
