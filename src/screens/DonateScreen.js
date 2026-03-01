import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, FlatList, ScrollView, Animated, Alert, StatusBar, Easing, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient'; 
import { COLORS } from '../constants/colors';
import { WebView } from 'react-native-webview'; 
import { supabase } from '../lib/supabase'; // Supabase bağlantısı

const { width, height } = Dimensions.get('window');

// ✅ GÜNCEL KUR (1 TL = ~0.045 AUD). 
const AUD_EXCHANGE_RATE = 0.045; 
const DONATION_PACKAGES_TL = [50, 100, 250, 500];

const CAMPAIGN_MEDIA = [
    { id: '1', uri: 'https://static.bianet.org/system/uploads/1/articles/spot_image/000/188/253/original/1_510.jpg' }, 
    { id: '2', uri: 'https://static.bianet.org/haber/2025/04/04/kisirlastirma-seferberligi-baslatilmasi-sart.jpg' }, 
    { id: '3', uri: 'https://gazetekadikoy.com.tr/Uploads/gazetekadikoy.com.tr/202407040939551-img.png' }, 
    { id: '4', uri: 'https://www.guncelkibris.com/wp-content/uploads/2021/05/sokak-hayvanlari-guncel-kibris.jpeg' }, 
];

const DonateScreen = ({ navigation }) => {
    const { theme } = useContext(ThemeContext);
    const { country, user } = useContext(AuthContext); 
    const activeLang = country?.code || 'TR';
    
    const scrollX = useRef(new Animated.Value(0)).current;
    const [activeIndex, setActiveIndex] = useState(0);

    // --- STATE'LER ---
    const [selectedAmountTL, setSelectedAmountTL] = useState(100); 
    const [isPaymentModalVisible, setPaymentModalVisible] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState(null);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    
    // Veritabanına çift kaydı önlemek için güvenlik kilidi
    const [isSaving, setIsSaving] = useState(false); 

    // --- ANİMASYONLAR ---
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideUpAnim = useRef(new Animated.Value(50)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Kalp atışı animasyonu
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.03, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
            ])
        ).start();

        // İçerik yüklenme animasyonu
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideUpAnim, { toValue: 0, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.exp) })
        ]).start();
    }, []);

    const TEXTS = {
        TR: {
            title: "Bir Çaresiz Bakışa\nUmut Ol",
            subtitle: "ONLARIN SESİ SENSİN",
            desc: "Soğuk sokaklarda bekleyen binlerce can var. Senin küçük bir yardımın, onların dünyasını tamamen değiştirebilir.",
            selectAmount: "Bağış Miktarı",
            btn: "Bağış Yap",
            trustTitle: "Neden Bize Güvenmelisiniz?",
            trust1: "Şeffaf",
            trust1Desc: "Tüm yardımlar kayıt altındadır.",
            trust2: "Güvenli Ödeme",
            trust2Desc: "256-bit SSL koruması.",
            trust3: "Doğrudan Etki",
            trust3Desc: "Aracı olmadan kliniğe ulaşır.",
            infoNote: "Bağışlarınız doğrudan yetkili veterinerlere ve mama tedarikçilerine aktarılır.",
            currency: "₺",
        },
        AU: {
            title: "Be the Hope They\nAre Looking For",
            subtitle: "YOU ARE THEIR VOICE",
            desc: "Thousands of souls are waiting on cold streets. Your small contribution can change their entire world.",
            selectAmount: "Select Amount",
            btn: "Donate Now",
            trustTitle: "Why Trust Us?",
            trust1: "Transparent",
            trust1Desc: "All aids are fully recorded.",
            trust2: "Secure Checkout",
            trust2Desc: "256-bit SSL protection.",
            trust3: "Direct Impact",
            trust3Desc: "Goes directly to clinics.",
            infoNote: "Your donations are transferred directly to authorized vets and food suppliers.",
            currency: "$",
        }
    };

    const t = TEXTS[activeLang];

    // DİNAMİK KUR HESAPLAYICI (Avustralya için Yukarı Yuvarlama)
    const getDisplayAmount = (amountTL) => {
        if (activeLang === 'AU') {
            return Math.ceil(amountTL * AUD_EXCHANGE_RATE); 
        }
        return amountTL;
    };

    const onViewRef = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
    });
    const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

    // ✅ ÖDEME İŞLEMİNİ BAŞLAT
    const handleDonate = async () => {
        if (!user) {
            Alert.alert(activeLang === 'TR' ? "Hata" : "Error", activeLang === 'TR' ? "Bağış yapabilmek için giriş yapmalısınız." : "You must be logged in to donate.");
            return;
        }

        setIsGeneratingLink(true);

        try {
            const payload = { 
                amountTL: selectedAmountTL, 
                displayAmount: getDisplayAmount(selectedAmountTL),
                currency: activeLang === 'AU' ? 'AUD' : 'TRY',
                userId: user.id,
                email: user.email || 'email@yok.com',
                name: user.fullname || 'Kullanıcı'
            };

            const { data, error } = await supabase.functions.invoke('create-iyzico-checkout', { body: payload });

            if (error) throw error;

            if (data && data.paymentPageUrl) {
                setPaymentUrl(data.paymentPageUrl);
                setPaymentModalVisible(true);
            }

        } catch (error) {
            console.log("Ödeme Hatası (Iyzico Backend):", error.message);
            
            // 🚨 SİMÜLASYON: Gerçek Iyzico kurulana kadar çökmemesi için (Test amaçlı)
            setPaymentUrl("https://sandbox-api.iyzipay.com/"); 
            setPaymentModalVisible(true);
        } finally {
            setIsGeneratingLink(false);
        }
    };

    // ✅ VERİTABANINA BAĞIŞI KAYDETME (TAM BAĞLANTI)
    const onNavigationStateChange = async (navState) => {
        const url = navState.url;
        
        // Ödeme başarılı sayfasına yönlendiğinde ve henüz kaydedilmiyorsa
        if (url.includes('pitopets.com/success') && !isSaving) {
            setIsSaving(true); // Kilidi kapat, mükerrer kaydı engelle
            setPaymentModalVisible(false);
            setPaymentUrl(null);

            const finalAmount = activeLang === 'AU' ? getDisplayAmount(selectedAmountTL) : selectedAmountTL;
            const currency = activeLang === 'AU' ? 'AUD' : 'TRY';

            try {
                // Supabase 'donations' tablosuna kaydet
                const { error } = await supabase
                    .from('donations')
                    .insert([
                        {
                            user_id: user.id,
                            amount: finalAmount,
                            currency: currency,
                            status: 'success'
                        }
                    ]);

                if (error) {
                    console.error("Veritabanı Kayıt Hatası:", error.message);
                    throw error;
                }

                // Kullanıcıya teşekkür et
                Alert.alert(
                    activeLang === 'TR' ? "Teşekkürler! ❤️" : "Thank You! ❤️", 
                    activeLang === 'TR' ? "Bağışınız başarıyla alındı ve canlara ulaştı." : "Your donation was successful and reached the souls in need."
                );

            } catch (err) {
                Alert.alert(
                    activeLang === 'TR' ? "Bilgi" : "Info", 
                    activeLang === 'TR' ? "Bağışınız alındı ancak makbuz oluşturulurken bir sorun oluştu." : "Donation received but there was an issue generating your receipt."
                );
            } finally {
                // İşlem bittikten sonra kilidi aç
                setTimeout(() => setIsSaving(false), 2000);
            }
        } 
        // Kullanıcı iptal ettiyse
        else if ((url.includes('pitopets.com/cancel') || url.includes('pitopets.com/fail')) && !isSaving) {
            setPaymentModalVisible(false);
            setPaymentUrl(null);
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.mediaContainer}>
            <Image source={{ uri: item.uri }} style={styles.mediaImage} resizeMode="cover" />
            <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', '#F8F9FA']} style={styles.mediaOverlay} />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: '#F8F9FA' }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <View style={styles.carouselContainer}>
                <FlatList
                    data={CAMPAIGN_MEDIA}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    horizontal pagingEnabled showsHorizontalScrollIndicator={false} bounces={false}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
                    onViewableItemsChanged={onViewRef.current} viewabilityConfig={viewConfigRef.current}
                />
                <SafeAreaView style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                </SafeAreaView>
                <View style={styles.pagination}>
                    {CAMPAIGN_MEDIA.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 20, 8], extrapolate: 'clamp' });
                        const opacity = scrollX.interpolate({ inputRange, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });
                        return <Animated.View key={i.toString()} style={[styles.dot, { width: dotWidth, opacity, backgroundColor: COLORS.primary }]} />;
                    })}
                </View>
            </View>

            {/* İÇERİK ALANI */}
            <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim, transform: [{ translateY: slideUpAnim }] }]}>
                <View style={styles.contentContainer}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                        
                        <View style={styles.textWrapper}>
                            <View style={styles.badgeContainer}>
                                <Ionicons name="paw" size={14} color={COLORS.primary} style={{marginRight: 5}}/>
                                <Text style={styles.subtitle}>{t.subtitle}</Text>
                            </View>
                            <Text style={styles.title}>{t.title}</Text>
                            <Text style={styles.desc}>{t.desc}</Text>
                        </View>

                        {/* MİKTAR SEÇİMİ */}
                        <Text style={styles.sectionTitle}>{t.selectAmount}</Text>
                        <View style={styles.amountContainer}>
                            {DONATION_PACKAGES_TL.map((amountTL) => {
                                const isSelected = selectedAmountTL === amountTL;
                                const displayValue = getDisplayAmount(amountTL);
                                return (
                                    <TouchableOpacity 
                                        key={amountTL}
                                        style={[styles.amountBox, isSelected && styles.amountBoxActive]}
                                        onPress={() => setSelectedAmountTL(amountTL)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.amountText, isSelected && styles.amountTextActive]}>
                                            {activeLang === 'AU' ? t.currency : ''}{displayValue} {activeLang === 'TR' ? t.currency : ''}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* GÜVEN ROZETLERİ */}
                        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>{t.trustTitle}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                            <View style={styles.trustCard}>
                                <View style={[styles.trustIconBg, { backgroundColor: '#E8F5E9' }]}><Ionicons name="checkmark-done" size={24} color="#2E7D32" /></View>
                                <Text style={styles.trustCardTitle}>{t.trust1}</Text>
                                <Text style={styles.trustCardDesc}>{t.trust1Desc}</Text>
                            </View>
                            <View style={styles.trustCard}>
                                <View style={[styles.trustIconBg, { backgroundColor: '#E3F2FD' }]}><Ionicons name="shield-checkmark" size={24} color="#1565C0" /></View>
                                <Text style={styles.trustCardTitle}>{t.trust2}</Text>
                                <Text style={styles.trustCardDesc}>{t.trust2Desc}</Text>
                            </View>
                            <View style={styles.trustCard}>
                                <View style={[styles.trustIconBg, { backgroundColor: '#FFF3E0' }]}><Ionicons name="heart" size={24} color="#EF6C00" /></View>
                                <Text style={styles.trustCardTitle}>{t.trust3}</Text>
                                <Text style={styles.trustCardDesc}>{t.trust3Desc}</Text>
                            </View>
                        </ScrollView>

                        {/* BİLGİLENDİRME NOTU */}
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} style={{marginRight: 12}} />
                            <Text style={styles.infoText}>{t.infoNote}</Text>
                        </View>
                        
                    </ScrollView>
                </View>
            </Animated.View>

            {/* SABİT BAĞIŞ BUTONU */}
            <View style={styles.footerOverlay}>
                <LinearGradient colors={['rgba(248, 249, 250, 0)', '#F8F9FA', '#F8F9FA']} style={styles.gradientFooter}>
                    <Animated.View style={{ transform: [{ scale: isGeneratingLink ? 1 : pulseAnim }], width: '100%', paddingHorizontal: 20, paddingBottom: 35 }}>
                        <TouchableOpacity style={styles.donateBtn} onPress={handleDonate} activeOpacity={0.9} disabled={isGeneratingLink}>
                            <LinearGradient colors={[COLORS.primary, '#FFA07A']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.btnGradient}>
                                {isGeneratingLink ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text style={styles.btnText}>
                                            {activeLang === 'AU' ? t.currency : ''}{getDisplayAmount(selectedAmountTL)} {activeLang === 'TR' ? t.currency : ''} - {t.btn}
                                        </Text>
                                        <View style={styles.btnIconContainer}><Ionicons name="heart" size={20} color={COLORS.primary} /></View>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </LinearGradient>
            </View>

            {/* KREDİ KARTI / ÖDEME EKRANI (WEBVIEW MODAL) */}
            <Modal visible={isPaymentModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPaymentModalVisible(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={styles.modalHeader}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Ionicons name="lock-closed" size={18} color="#4CAF50" style={{marginRight: 6}} />
                            <Text style={styles.modalTitle}>{activeLang === 'TR' ? "Güvenli Ödeme" : "Secure Checkout"}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                            <Text style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: 16 }}>{activeLang === 'TR' ? "İptal" : "Cancel"}</Text>
                        </TouchableOpacity>
                    </View>
                    {paymentUrl ? (
                        <WebView 
                            source={{ uri: paymentUrl }}
                            onNavigationStateChange={onNavigationStateChange}
                            startInLoadingState={true}
                            renderLoading={() => <ActivityIndicator color={COLORS.primary} size="large" style={{flex: 1}} />}
                        />
                    ) : (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    )}
                </SafeAreaView>
            </Modal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    carouselContainer: { height: height * 0.45, width: width },
    header: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    mediaContainer: { width: width, height: '100%' },
    mediaImage: { width: '100%', height: '100%' },
    mediaOverlay: { ...StyleSheet.absoluteFillObject },
    pagination: { position: 'absolute', bottom: 45, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    dot: { height: 6, borderRadius: 3, marginHorizontal: 4 },
    
    contentWrapper: { flex: 1, marginTop: -35, zIndex: 20 },
    contentContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 30, backgroundColor: '#F8F9FA', borderTopLeftRadius: 35, borderTopRightRadius: 35 },
    
    textWrapper: { marginBottom: 25 },
    badgeContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: COLORS.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
    subtitle: { fontWeight: '800', fontSize: 11, color: COLORS.primary, letterSpacing: 1 },
    title: { fontSize: 30, fontWeight: '900', marginBottom: 10, lineHeight: 38, color: '#1A1A1A' },
    desc: { fontSize: 15, lineHeight: 24, color: '#666', fontWeight: '400' },
    
    sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginBottom: 15 },
    
    amountContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
    amountBox: { width: '48%', backgroundColor: '#FFFFFF', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: '#E0E0E0', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
    amountBoxActive: { backgroundColor: COLORS.primary + '10', borderColor: COLORS.primary },
    amountText: { fontSize: 20, fontWeight: '700', color: '#555' },
    amountTextActive: { color: COLORS.primary, fontWeight: '900' },

    trustCard: { backgroundColor: '#FFFFFF', width: 130, padding: 15, borderRadius: 20, marginRight: 15, borderWidth: 1, borderColor: '#F0F0F0', elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 3 },
    trustIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    trustCardTitle: { fontWeight: '700', fontSize: 14, color: '#333', marginBottom: 4 },
    trustCardDesc: { fontSize: 12, color: '#888', lineHeight: 16 },

    infoBox: { flexDirection: 'row', padding: 18, borderRadius: 20, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', marginBottom: 20 },
    infoText: { flex: 1, fontSize: 13, lineHeight: 20, color: '#555', fontWeight: '500' },

    footerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50 },
    gradientFooter: { paddingTop: 30, width: '100%' },
    donateBtn: { borderRadius: 30, elevation: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, overflow: 'hidden' },
    btnGradient: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 25 },
    btnText: { color: 'white', fontSize: 19, fontWeight: '800', letterSpacing: 0.5 },
    btnIconContainer: { backgroundColor: 'white', width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },

    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center', backgroundColor: '#FAFAFA' },
    modalTitle: { fontSize: 17, fontWeight: '800', color: '#333' }
});

export default DonateScreen;