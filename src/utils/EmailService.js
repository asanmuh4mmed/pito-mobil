import emailjs from '@emailjs/react-native';

// ✅ Anahtarlar artık güvenli bir şekilde .env dosyasından çekiliyor.
const SERVICE_ID = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = process.env.EXPO_PUBLIC_EMAILJS_PUBLIC_KEY;

export const sendVerificationEmail = async (email, name, code) => {
    
    // Konsola basarak değerlerin dolu olduğunu teyit edelim (Canlıya çıkarken bu logları silebilirsin)
    console.log("📨 Email Gönderiliyor...");
    console.log("Kime:", email);
    console.log("Kod:", code);

    // Eğer anahtarlar boşsa hata ver (.env dosyasını veya önbelleği kontrol etmeni sağlar)
    if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
        console.error("🛑 HATA: EmailJS anahtarları eksik! .env dosyanı kontrol et.");
        return { success: false, error: "Configuration Error" };
    }

    try {
        const response = await emailjs.send(
            SERVICE_ID,    
            TEMPLATE_ID,   
            {
                to_email: email,   
                to_name: name,     
                code: code,        
            },
            {
                publicKey: PUBLIC_KEY 
            }
        );
        
        console.log("✅ BAŞARILI! Email Gönderildi.", response.status, response.text);
        return { success: true };
    } catch (error) {
        console.log("❌ Email Gönderme Hatası:", error);
        return { success: false, error };
    }
};