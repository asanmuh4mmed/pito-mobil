// src/utils/sendPushNotification.js

export const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
    // Eğer kullanıcının token'ı yoksa işlemi iptal et
    if (!expoPushToken) return;

    const message = {
        to: expoPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
        priority: 'high',          // ✨ YENİ: Android'de bildirimin ekranın üstünden zorla düşmesini (banner) sağlar.
        channelId: 'default',      // ✨ YENİ: AuthContext'te oluşturduğun Android kanalını hedefler (ses ve titreşim için şart).
    };

    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
        console.log("🚀 Arka plan (Push) bildirimi başarıyla fırlatıldı!");
    } catch (error) {
        console.log("❌ Bildirim gönderme hatası:", error);
    }
};