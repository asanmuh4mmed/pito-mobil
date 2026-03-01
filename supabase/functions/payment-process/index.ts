// supabase/functions/payment-process/index.ts

// CORS Ayarları (Uygulamanın erişebilmesi için)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// YENİ YÖNTEM: "Deno.serve" (Import gerektirmez, doğrudan çalışır)
Deno.serve(async (req) => {
  
  // 1. Preflight (CORS) kontrolü
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("🟢 İstek sunucuya ulaştı!"); // Loglarda bunu kesin görmeliyiz

    // Gelen veriyi okumaya çalışalım
    const body = await req.json();
    console.log("📦 Gelen Sipariş Verisi:", body);

    // --- SANAL İŞLEM (Mock) ---
    // 1 saniye bekleyelim (Gerçekçilik için)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const fakeOrderId = "TEST-" + Math.floor(Math.random() * 1000000);
    
    const responseData = {
      status: 'success',
      orderId: fakeOrderId,
      message: 'Ödeme başarıyla alındı (Modern Deno)'
    };
    // ---------------------------

    console.log("✅ Cevap gönderiliyor:", responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("🔴 Sunucu Hatası:", error.message);
    
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})