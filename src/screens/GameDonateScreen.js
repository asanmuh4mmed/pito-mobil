import React, { useContext, useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, Animated, Modal, Dimensions, Easing, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; 
import { AuthContext } from '../context/AuthContext';
import { GameContext } from '../context/GameContext';
import { playSound } from '../utils/SoundManager';
import { supabase } from '../lib/supabase'; // Supabase bağlantısı

const { width } = Dimensions.get('window');
const TARGET_POINTS = 10000; 

// ✅ Admin ID Supabase'den alınarak güncellendi
const PETSPITO_ADMIN_ID = "c6d87d7b-0c0c-40ee-aebb-dd37436b0292";

const TRANSLATIONS = {
    TR: {
        title: "Mama Kumbarası 🐾",
        currentBalance: "TOPLADIĞIN PUAN",
        target: "HEDEF: 1 PAKET MAMA",
        donateBtn: "BAĞIŞI TAMAMLA",
        playBtn: "PUAN BİRİKTİR",
        playDesc: "Oyun oyna, puan biriktir ve dostlarımıza mama bağışı yap.",
        donateDesc: "Harika! Hedefe ulaştın. Bağış yaparak bir dostumuzu sevindir!",
        successTitle: "MAMA PAKETİ HAZIR! 🦴",
        successDesc: "Bağışın alındı! Senin sayende bir dostumuzun karnı doyacak.",
        messageSentText: "Sohbet kutunu kontrol et, sana özel bir teşekkür mesajımız var! 💬",
        close: "Kapat",
        ready: "HAZIR!"
    },
    AU: {
        title: "Treat Jar 🐾",
        currentBalance: "COLLECTED POINTS",
        target: "GOAL: 1 FOOD PACK",
        donateBtn: "COMPLETE DONATION",
        playBtn: "COLLECT POINTS",
        playDesc: "Play games, collect points, and donate food to our friends.",
        donateDesc: "Great! You hit the goal. Make a donation to feed a friend!",
        successTitle: "FOOD PACK READY! 🦴",
        successDesc: "Donation received! Thanks to you, a friend will be fed.",
        messageSentText: "Check your inbox, we sent you a special thank you message! 💬",
        close: "Close",
        ready: "READY!"
    }
};

const GameDonateScreen = ({ navigation }) => {
    const { country, user } = useContext(AuthContext);
    const { userPoints, spendPoints, fetchUserPoints } = useContext(GameContext); 
    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
    const t = TRANSLATIONS[activeLang];

    const [showSuccess, setShowSuccess] = useState(false);
    const [isDonating, setIsDonating] = useState(false);
    const [messageSentStatus, setMessageSentStatus] = useState(false); 
    
    const currentPoints = userPoints || 0; 
    
    // --- ANİMASYONLAR ---
    const progressAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(0)).current;

    const canDonate = currentPoints >= TARGET_POINTS;
    const progressPercent = Math.min((currentPoints / TARGET_POINTS) * 100, 100);

    useFocusEffect(
        useCallback(() => {
            fetchUserPoints();
        }, [])
    );

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: progressPercent,
            duration: 1500,
            easing: Easing.out(Easing.exp),
            useNativeDriver: false
        }).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, { toValue: -15, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(bounceAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();

    }, [currentPoints]);

    // ✅ UYGULAMA İÇİ MESAJ GÖNDERME FONKSİYONU
    const sendInAppThankYouMessage = async () => {
        if (!user || PETSPITO_ADMIN_ID === "BURAYA_PETSPITO_USER_ID_YAPISTIRILACAK") {
            console.log("Admin ID girilmediği için mesaj atlanıyor.");
            return;
        }

        try {
            const userName = user?.user_metadata?.full_name || 'Kahraman Hayvansever';
            const messageContent = `Tebrikler ${userName}! 🎉\n\nPito Games'te 10.000 Puan toplayarak harika bir iş başardın ve 1 paket mama bağışı yaptın. 🐶🦴🐱\n\nSenin sayende bir patili dostumuzun karnı doyacak. Bize katıldığın ve bu iyiliğe ortak olduğun için Pito ailesi olarak sana sonsuz teşekkür ederiz! ❤️`;

            // Veritabanındaki 'messages' tablosuna (kendi tablo adına göre güncelle) mesaj ekliyoruz
            const { error } = await supabase
                .from('messages') // 🚨 Kendi sohbet tablonun adını buraya yaz (ör: chats, messages, direct_messages)
                .insert({
                    sender_id: PETSPITO_ADMIN_ID,
                    receiver_id: user.id,
                    content: messageContent, // 🚨 Kendi tablonun mesaj sütun adını yaz (ör: text, message, content)
                });

            if (error) throw error;
            console.log("Uygulama içi teşekkür mesajı başarıyla gönderildi!");
            setMessageSentStatus(true);
        } catch (error) {
            console.error("Mesaj gönderme hatası:", error);
        }
    };

    const handleAction = async () => {
    if (canDonate) {
        setIsDonating(true); 
        // 1. 10.000 Puanı harca
        const success = await spendPoints(TARGET_POINTS);
        
        if (success) {
            // 2. Mesajı gönder
            await sendInAppThankYouMessage();

            // 3. 🚨 KULLANICININ BAĞIŞ SAYISINI 1 ARTIR 🚨
            try {
                // Mevcut bağış sayısını al (yoksa 0 kabul et) ve 1 ekle
                const currentDonationCount = user?.donation_count || 0;
                const newDonationCount = currentDonationCount + 1;

                const { error: updateError } = await supabase
                    .from('users') // <-- Senin tablonun gerçek adı!
                    .update({ donation_count: newDonationCount })
                    .eq('id', user.id);
                    
                if (updateError) console.error("Bağış sayısı güncellenemedi:", updateError);
            } catch (err) {
                console.error("Veritabanı hatası:", err);
            }
            
            playSound('game_win');
            setShowSuccess(true);
        }
        setIsDonating(false); 
    } else {
        navigation.navigate('GameList');
    }
};
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#e0f2fe" />

            <View style={[styles.bgCircle, { top: -80, right: -50, backgroundColor: '#bbf7d0' }]} />
            <View style={[styles.bgCircle, { bottom: 100, left: -100, backgroundColor: '#fef08a' }]} />

            <SafeAreaView style={{ flex: 1 }}>
                
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={28} color="#334155" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t.title}</Text>
                    <View style={{ width: 45 }} />
                </View>

                <View style={styles.content}>
                    
                    <Animated.View style={[styles.heroContainer, { transform: [{ translateY: bounceAnim }] }]}>
                        <Image 
                            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/616/616408.png' }} 
                            style={styles.petImageDog} 
                        />
                        <Image 
                            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/616/616430.png' }} 
                            style={styles.petImageCat} 
                        />
                        <Image 
                            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3048/3048361.png' }} 
                            style={styles.foodImage} 
                        />

                        {canDonate && (
                            <View style={styles.readyTag}>
                                <Ionicons name="checkmark-circle" size={18} color="white" />
                                <Text style={styles.readyTagText}>{t.ready}</Text>
                            </View>
                        )}
                    </Animated.View>

                    <View style={styles.mainCard}>
                        
                        <View style={styles.statsRow}>
                            <View>
                                <Text style={styles.statLabel}>{t.currentBalance}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="star" size={22} color="#f59e0b" style={{ marginRight: 5 }} />
                                    <Text style={styles.statValue}>{currentPoints.toLocaleString()}</Text>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.statLabel}>{t.target}</Text>
                                <Text style={styles.targetValue}>{TARGET_POINTS.toLocaleString()}</Text>
                            </View>
                        </View>

                        <View style={styles.progressWrapper}>
                            <View style={styles.barBackground}>
                                <Animated.View 
                                    style={[
                                        styles.barFill, 
                                        { 
                                            width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                                            backgroundColor: canDonate ? '#10b981' : '#3b82f6' 
                                        }
                                    ]} 
                                />
                            </View>
                            <View style={styles.percentContainer}>
                                <Text style={[styles.percentText, { color: canDonate ? '#047857' : '#1d4ed8' }]}>
                                    %{Math.floor(progressPercent)}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.infoText}>
                            {canDonate ? t.donateDesc : t.playDesc}
                        </Text>

                    </View>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[
                            styles.mainButton, 
                            { backgroundColor: canDonate ? '#10b981' : '#3b82f6' }
                        ]}
                        activeOpacity={0.8}
                        onPress={handleAction}
                        disabled={isDonating} 
                    >
                        {isDonating ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <>
                                <Text style={styles.mainButtonText}>
                                    {canDonate ? t.donateBtn : t.playBtn}
                                </Text>
                                <Ionicons 
                                    name={canDonate ? "heart" : "game-controller"} 
                                    size={26} 
                                    color="white" 
                                    style={{ marginLeft: 12 }} 
                                />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

            </SafeAreaView>

            <Modal transparent={true} visible={showSuccess} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.successIconCircle}>
                            <Ionicons name="paw" size={50} color="white" />
                        </View>
                        <Text style={styles.modalTitle}>{t.successTitle}</Text>
                        <Text style={styles.modalDesc}>{t.successDesc}</Text>
                        
                        {/* ✅ YENİ: Mesaj gittiğini belirten ek uyarı */}
                        {messageSentStatus && (
                            <View style={styles.mailNoticeContainer}>
                                <Ionicons name="chatbubble-ellipses" size={24} color="#3b82f6" />
                                <Text style={styles.mailNoticeText}>{t.messageSentText}</Text>
                            </View>
                        )}

                        <TouchableOpacity style={styles.modalBtn} onPress={() => setShowSuccess(false)}>
                            <Text style={styles.modalBtnText}>{t.close}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#e0f2fe' },
    bgCircle: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.5 },
    
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10 },
    backBtn: { width: 45, height: 45, backgroundColor: 'white', borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b' },

    content: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },

    heroContainer: { height: 260, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    foodImage: { width: 140, height: 140, resizeMode: 'contain', zIndex: 2 },
    petImageDog: { width: 110, height: 110, resizeMode: 'contain', position: 'absolute', bottom: 10, left: 30, zIndex: 1, transform: [{ rotate: '-10deg' }] },
    petImageCat: { width: 90, height: 90, resizeMode: 'contain', position: 'absolute', top: 40, right: 40, zIndex: 1, transform: [{ rotate: '15deg' }] },
    
    readyTag: { 
        position: 'absolute', top: 20, right: 20, backgroundColor: '#ef4444', 
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, 
        borderRadius: 20, transform: [{ rotate: '10deg' }], elevation: 5, zIndex: 10
    },
    readyTagText: { color: 'white', fontWeight: '900', fontSize: 14, marginLeft: 5 },

    mainCard: { 
        backgroundColor: 'rgba(255, 255, 255, 0.85)', 
        padding: 25, borderRadius: 30, elevation: 5, 
        shadowColor: '#3b82f6', shadowOpacity: 0.15, shadowRadius: 15, shadowOffset: { width: 0, height: 8 },
        borderWidth: 1, borderColor: 'rgba(255,255,255,1)'
    },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    statLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 5, letterSpacing: 0.5 },
    statValue: { fontSize: 28, fontWeight: '900', color: '#1e293b' },
    targetValue: { fontSize: 20, fontWeight: '800', color: '#94a3b8' },

    progressWrapper: { marginBottom: 25 },
    barBackground: { height: 26, backgroundColor: '#f1f5f9', borderRadius: 13, overflow: 'hidden', borderWidth: 3, borderColor: '#e2e8f0' },
    barFill: { height: '100%', borderRadius: 10 },
    percentContainer: { position: 'absolute', width: '100%', alignItems: 'center', top: 32 },
    percentText: { fontSize: 18, fontWeight: '900' },

    infoText: { textAlign: 'center', color: '#475569', fontSize: 15, lineHeight: 22, fontWeight: '600' },

    footer: { padding: 25, paddingBottom: 40 },
    mainButton: { 
        height: 65, borderRadius: 22, flexDirection: 'row', 
        justifyContent: 'center', alignItems: 'center', elevation: 8,
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }
    },
    mainButtonText: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: 1 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 40, padding: 35, alignItems: 'center' },
    successIconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 5, borderColor: '#d1fae5' },
    modalTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 15, textAlign: 'center' },
    modalDesc: { textAlign: 'center', color: '#475569', fontSize: 16, lineHeight: 24, marginBottom: 20, fontWeight: '500' },
    
    mailNoticeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', padding: 15, borderRadius: 15, marginBottom: 25, width: '100%', justifyContent: 'center' },
    mailNoticeText: { color: '#3b82f6', fontWeight: 'bold', marginLeft: 8, fontSize: 13, textAlign: 'center', flex: 1 },

    modalBtn: { backgroundColor: '#1e293b', paddingHorizontal: 40, paddingVertical: 18, borderRadius: 20, width: '100%', alignItems: 'center' },
    modalBtnText: { color: 'white', fontWeight: '900', fontSize: 16 }
});

export default GameDonateScreen;