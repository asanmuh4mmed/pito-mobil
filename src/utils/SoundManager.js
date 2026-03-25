import { Audio } from 'expo-av';

// ✅ DOSYA YOLLARI '../../' İLE ANA DİZİNE ÇIKACAK ŞEKİLDE AYARLANDI
const soundFiles = {
    // 📱 UI Sesleri
    water: require('../../assets/sounds/water.mp3'),       // Tıklama / Menü Geçişi
    kitty: require('../../assets/sounds/kitty.mp3'),       // Bağış / Özel İşlem
    noti: require('../../assets/sounds/noti.mp3'),         // 🔔 Yeni: Üstten Düşen Bildirim Sesi
    
    // 🗄️ Veritabanı Aksiyon Sesleri
    paw: require('../../assets/sounds/paw.mp3'),           // Beğeni (Like) / Sipariş Verme
    follow: require('../../assets/sounds/follow.mp3'),     // Takip Etme
    success: require('../../assets/sounds/success.mp3'),   // İlan/Post Paylaşma Başarısı
    message: require('../../assets/sounds/message.mp3'),   // Mesaj Gönderme/Alma

    // 🎮 OYUN SESLERİ (TÜM OYUNLAR İÇİN BİRLEŞTİRİLDİ)
    jump: require('../../assets/sounds/jump.mp3'),         // Uçan Pito - Zıplama
    score: require('../../assets/sounds/score.mp3'),       // Uçan Pito & Mamaları Yakala - Puan/Yıldız Alma
    gamewin: require('../../assets/sounds/gamewin.mp3'),   // Uçan Pito & Mamaları Yakala - Seviye Atlama
    gameover: require('../../assets/sounds/gameover.mp3'), // Tüm Oyunlar - Yanma / Süre Bitişi
    card_flip: require('../../assets/sounds/card_flip.mp3'), // Pati Eşleştirme - Kart Çevirme
    success1: require('../../assets/sounds/success1.mp3'),   // Pati Eşleştirme - İki Kartın Doğru Eşleşmesi
    success2: require('../../assets/sounds/success2.mp3'),   // Pati Eşleştirme - Tüm Kartların Bitmesi (Kazanma)
    error: require('../../assets/sounds/error.mp3'),         // Mamaları Yakala - Yasaklı Maddeye (Bomba) Çarpma

    // 🔄 Geriye Dönük Uyumluluk (Eski kodlarda kalmışsa hata vermemesi için)
    game_start: require('../../assets/sounds/water.mp3'),    // Oyun başlama sesi (water'a yönlendirildi)
    match_success: require('../../assets/sounds/success1.mp3'), // Eşleşme alternatifi (success1'e yönlendirildi)
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

        // Çalma işlemi bittiğinde sesi bellekten temizle (Performans için kritik)
        sound.setOnPlaybackStatusUpdate(async (status) => {
            if (status.didJustFinish) {
                await sound.unloadAsync();
            }
        });

    } catch (error) {
        console.log("Ses oynatma hatası:", error);
    }
};