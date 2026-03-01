import { Audio } from 'expo-av';

// ✅ DÜZELTME YAPILDI: Dosya yolları '../../' ile ana dizine çıkıyor
const soundFiles = {
    // UI Sesleri
    water: require('../../assets/sounds/water.mp3'),       // Tıklama / Menü Geçişi
    kitty: require('../../assets/sounds/kitty.mp3'),       // Bağış / Özel İşlem
    
    // Veritabanı Aksiyon Sesleri
    paw: require('../../assets/sounds/paw.mp3'),           // Beğeni (Like) / Sipariş Verme
    follow: require('../../assets/sounds/follow.mp3'),     // Takip Etme
    success: require('../../assets/sounds/success.mp3'),   // İlan/Post Paylaşma Başarısı
    message: require('../../assets/sounds/message.mp3'),   // Mesaj Gönderme/Alma
};

export const playSound = async (soundName) => {
    try {
        const source = soundFiles[soundName];
        
        // Eğer istenen ses dosyası listede yoksa konsola yaz ve çık
        if (!source) {
            console.log(`⚠️ Ses dosyası bulunamadı veya tanımlı değil: ${soundName}`);
            return;
        }

        // Sesi oluştur ve ayarla
        const { sound } = await Audio.Sound.createAsync(
            source,
            { shouldPlay: true }
        );

        // Çalma işlemi bittiğinde sesi bellekten temizle (Performans için önemli)
        sound.setOnPlaybackStatusUpdate(async (status) => {
            if (status.didJustFinish) {
                await sound.unloadAsync();
            }
        });

    } catch (error) {
        console.log("Ses oynatma hatası:", error);
    }
};