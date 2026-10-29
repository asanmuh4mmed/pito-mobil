import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const payload = await req.json();
  const newRecord = payload.record;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: userData } = await supabase
    .from('users')
    .select('expo_push_token')
    .eq('id', newRecord.receiver_id)
    .single();

  if (!userData?.expo_push_token) {
    return new Response("Kullanıcının token'ı yok.", { status: 200 });
  }

  const message = {
    to: userData.expo_push_token,
    sound: 'default',
    title: 'Yeni Bir Mesajın Var 🐾',
    body: newRecord.text || '📷 Bir fotoğraf gönderildi.',
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
})