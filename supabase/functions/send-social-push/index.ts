import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (status: number, body: Record<string, unknown>) => Response.json(body, { status, headers });
const validId = (id: unknown) => ['string', 'number'].includes(typeof id) && /^[a-zA-Z0-9-]{1,80}$/.test(String(id));
Deno.serve(async (req: Request) => {
 if (req.method === 'OPTIONS') return new Response(null, { headers });
 if (req.method !== 'POST') return reply(405, { success: false });
 try {
  const token = req.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return reply(401, { success: false });
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('config');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return reply(401, { success: false });
  let body;
  try { body = await req.json(); } catch { return reply(400, { success: false }); }
  const { source, kind, post_id, comment_id } = body || {};
  if (!['community', 'posts'].includes(source) || !['like', 'comment'].includes(kind) || !validId(post_id) || (kind === 'comment' && !validId(comment_id))) return reply(400, { success: false });
  const actor = auth.user.id;
  const { data: post, error: postError } = await db.from(source === 'community' ? 'community_posts' : 'posts').select('*').eq('id', post_id).maybeSingle();
  if (postError) throw new Error('post');
  if (!post) return reply(404, { success: false });
  const receiver = post.user_id;
  if (!receiver || receiver === actor) return reply(200, { success: true, skipped: 'self' });
  let exists = false;
  if (source === 'community') {
   const query = db.from(kind === 'like' ? 'community_likes' : 'community_comments')
    .select('user_id').eq('user_id', actor).eq('post_id', post_id);
   if (kind === 'comment') query.eq('id', comment_id);
   const { data, error } = await query.limit(1);
   if (error) throw new Error('event');
   exists = Boolean(data?.length);
  } else if (kind === 'like') {
   exists = Array.isArray(post.liked_by) && post.liked_by.some((id: unknown) => String(id) === actor);
  } else {
   exists = Array.isArray(post.comments) && post.comments.some((comment: Record<string, unknown>) =>
    String(comment.id) === String(comment_id) && String(comment.userId ?? comment.user_id) === actor);
  }
  if (!exists) return reply(403, { success: false, error: 'Event could not be verified' });
  const { data: blocks, error: blockError } = await db.from('blocks').select('blocker_id')
   .in('blocker_id', [actor, receiver]).in('blocked_id', [actor, receiver]);
  if (blockError) throw new Error('blocks');
  if (blocks?.length) return reply(200, { success: true, skipped: 'blocked' });
  const { data: sender, error: senderError } = await db.from('users').select('fullname,username,avatar').eq('id', actor).single();
  if (senderError) throw new Error('sender');
  const { data: recipient, error: recipientError } = await db.from('users').select('expo_push_token,notification_settings').eq('id', receiver).single();
  if (recipientError) throw new Error('recipient');
  const name = sender.fullname || sender.username || 'Bir kullanıcı';
  const message = `${name} ${source === 'community' ? 'Pito Dünyası’ndaki yazını' : 'gönderini'} ${kind === 'like' ? 'beğendi. 🐾' : 'yorumladı. 💬'}`;
  const notification = { id: crypto.randomUUID(), type: kind, message, fromUserId: actor, fromUser: name, fromUserAvatar: sender.avatar,
   read: false, date: new Date().toISOString(), postId: post_id };
  const eventKey = `${source}:${kind}:${post_id}:${kind === 'like' ? actor : comment_id}`;
  const { data: committed, error: commitError } = await db.rpc('pito_commit_social_notification', {
   p_event_key: eventKey, p_receiver: receiver, p_notification: notification,
  });
  if (commitError) throw new Error('commit');
  if (!committed) return reply(200, { success: true, skipped: 'duplicate' });
  const pushToken = recipient.expo_push_token;
  if (recipient.notification_settings?.enabled === false || typeof pushToken !== 'string' || !/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(pushToken)) return reply(200, { success: true, skipped: 'push_disabled_or_no_token' });
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
   method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000),
   body: JSON.stringify({ to: pushToken, title: 'Pito’dan yeni bildirim 🐾', body: message.slice(0,180),
    ...(recipient.notification_settings?.sound === false ? {} : { sound: 'default' }),
    data: { type: kind, fromUser: sender.username, postId: post_id } }),
  });
  const ticket = await response.json();
  if (!response.ok || ticket?.data?.status !== 'ok') return reply(200, { success: true, pushAccepted: false });
  return reply(200, { success: true, pushAccepted: true });
 } catch {
  console.error('send-social-push failed');
  return reply(503, { success: false, error: 'Notification could not be confirmed' });
 }
});
