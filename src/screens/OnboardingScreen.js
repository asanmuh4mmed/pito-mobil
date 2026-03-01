import React, { useState, useRef, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, TouchableOpacity, Dimensions, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { COLORS } from '../constants/colors';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase'; // Kendi yoluna göre ayarla

const { width, height } = Dimensions.get('window');

const BUTTON_TEXTS = {
    TR: { skip: "Geç", next: "İleri", start: "Keşfetmeye Başla" },
    AU: { skip: "Skip", next: "Next", start: "Start Exploring" }
};

// 7 SAYFALIK DEV YEDEK PLAN (Veritabanı bağlanana kadar bunlar görünür)
const FALLBACK_SLIDES = [
    { id: '1', title_tr: "Pito'ya Hoş Geldin!", desc_tr: "Evcil dostunun en sevimli anlarını Petsgram'da paylaş, diğer hayvanseverlerle sosyalleş.", title_au: "Welcome to Pito!", desc_au: "Share your pet's cutest moments on Petsgram and socialize.", icon: "images", color: "#FF6B6B" },
    { id: '2', title_tr: "Yapay Zeka VetBot", desc_tr: "7/24 yanınızda! Yapay zekaya fotoğraf gönderin, anında ırk ve duygu durumu analizi alın.", title_au: "AI VetBot", desc_au: "Send photos to AI and get instant breed and mood analysis.", icon: "hardware-chip", color: "#4ECDC4" },
    { id: '3', title_tr: "Sahiplen & Eş Bul", desc_tr: "Yeni bir can dostu sahiplenin, kayıp ilanları açın veya minik dostunuza uygun bir eş bulun.", title_au: "Adopt & Find Mate", desc_au: "Adopt a new furry friend, post lost pet ads, or find a mate.", icon: "paw", color: "#F7B731" },
    { id: '4', title_tr: "Sağlık ve Aşı Takibi", desc_tr: "Aşı takvimlerini oluşturun, sağlık raporlarını dijital ortamda güvenle saklayın ve bildirim alın.", title_au: "Vaccine Tracker", desc_au: "Create vaccine schedules and securely store health reports.", icon: "medical", color: "#3DC1D3" },
    { id: '5', title_tr: "Mağaza ve Bağış", desc_tr: "İhtiyaçlarınızı karşılarken, sokaktaki canlar için mama kumbarasına destek olun.", title_au: "Shop & Donate", desc_au: "Fulfill needs while supporting the food bank for stray animals.", icon: "cart", color: "#26de81" },
    { id: '6', title_tr: "Oyunlar ve Eğlence", desc_tr: "Oyunlarımızla eğlenin, liderlik tablosunda yükselerek puanlar toplayın ve bağışa dönüştürün.", title_au: "Games & Fun", desc_au: "Have fun with games, climb the leaderboard and collect points.", icon: "game-controller", color: "#a55eea" },
    { id: '7', title_tr: "Rozetler ve Premium", desc_tr: "Görevleri tamamlayıp rozetler kazanın, Premium avantajlarıyla uygulamanın sınırlarını kaldırın.", title_au: "Badges & Premium", desc_au: "Earn badges and remove limits with Premium advantages.", icon: "trophy", color: "#fd9644" }
];

const OnboardingScreen = ({ navigation }) => {
    const { country } = useContext(AuthContext) || { country: { code: 'TR' } };
    const activeLang = country?.code || 'TR';
    const t = BUTTON_TEXTS[activeLang];

    const [slides, setSlides] = useState(FALLBACK_SLIDES); // Başlangıçta fallback dolu gelsin
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef(null);

    // Veritabanından verileri çek
    useEffect(() => {
        const fetchSlides = async () => {
            try {
                const { data, error } = await supabase
                    .from('onboarding_slides')
                    .select('*')
                    .order('order_index', { ascending: true }); 

                if (error) throw error;
                // Veritabanında en az 6-7 slayt varsa onu kullan, yoksa fallback kalsın.
                if (data && data.length > 5) {
                    setSlides(data);
                }
            } catch (error) {
                console.log("Supabase Onboarding Hatası (Fallback Kullanılıyor):", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSlides();
    }, []);

    const viewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollTo = async () => {
        if (currentIndex < slides.length - 1) {
            slidesRef.current.scrollToIndex({ index: currentIndex + 1 });
        } else {
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            navigation.replace('Login'); 
        }
    };

    const skipToLast = () => {
        if(slidesRef.current) {
            slidesRef.current.scrollToIndex({ index: slides.length - 1 });
        }
    };

    // Modern Tasarımlı Slayt İçeriği
    const SlideItem = ({ item, index }) => {
        const title = activeLang === 'TR' ? item.title_tr : item.title_au;
        const description = activeLang === 'TR' ? item.desc_tr : item.desc_au;

        // --- ANİMASYONLAR (PARALLAX & SCALE) ---
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        
        // İkonun Büyüyüp Küçülmesi
        const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
            extrapolate: 'clamp',
        });

        // Metnin Yavaşça Ekrana Girmesi
        const translateY = scrollX.interpolate({
            inputRange,
            outputRange: [50, 0, 50],
            extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.slideContainer}>
                {/* Arka Plandaki Soft Dekoratif Daire */}
                <View style={[styles.bgBlob, { backgroundColor: item.color + '10' }]} />

                <Animated.View style={[styles.imageContainer, { transform: [{ scale }] }]}>
                    <View style={[styles.iconCircle, { backgroundColor: item.color + '20', borderColor: item.color + '40' }]}>
                        <View style={[styles.innerCircle, { backgroundColor: item.color }]}>
                            <Ionicons name={item.icon} size={80} color="white" />
                        </View>
                    </View>
                </Animated.View>

                <Animated.View style={[styles.textContainer, { opacity, transform: [{ translateY }] }]}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.description}>{description}</Text>
                </Animated.View>
            </View>
        );
    };

    const Paginator = ({ data }) => {
        return (
            <View style={styles.paginatorContainer}>
                {data.map((_, i) => {
                    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

                    const dotWidth = scrollX.interpolate({
                        inputRange,
                        outputRange: [8, 24, 8],
                        extrapolate: 'clamp',
                    });

                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.3, 1, 0.3],
                        extrapolate: 'clamp',
                    });

                    const backgroundColor = scrollX.interpolate({
                        inputRange,
                        outputRange: ['#ccc', COLORS.primary, '#ccc'],
                        extrapolate: 'clamp',
                    });

                    return (
                        <Animated.View 
                            key={i.toString()} 
                            style={[styles.dot, { width: dotWidth, opacity, backgroundColor }]} 
                        />
                    );
                })}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={{ flex: 3 }}>
                <FlatList 
                    data={slides}
                    renderItem={({ item, index }) => <SlideItem item={item} index={index} />}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.id.toString()}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                        useNativeDriver: false,
                    })}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    ref={slidesRef}
                />
            </View>

            <Paginator data={slides} />

            <View style={styles.footerContainer}>
                <TouchableOpacity 
                    style={styles.skipButton} 
                    onPress={skipToLast}
                    disabled={currentIndex === slides.length - 1} 
                >
                    <Text style={[styles.skipText, { opacity: currentIndex === slides.length - 1 ? 0 : 1 }]}>
                        {t.skip}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.nextButton, currentIndex === slides.length - 1 && styles.startButton]} 
                    onPress={scrollTo}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.nextButtonText, currentIndex === slides.length - 1 && { fontSize: 16 }]}>
                        {currentIndex === slides.length - 1 ? t.start : t.next}
                    </Text>
                    {currentIndex !== slides.length - 1 && (
                        <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 5 }} />
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA', // Daha modern kırık beyaz arka plan
    },
    bgBlob: {
        position: 'absolute',
        top: '10%',
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width,
        zIndex: -1,
    },
    slideContainer: {
        width,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: height * 0.1,
        overflow: 'hidden',
    },
    imageContainer: {
        flex: 0.6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconCircle: {
        width: 240,
        height: 240,
        borderRadius: 120,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    innerCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    textContainer: {
        flex: 0.4,
        alignItems: 'center',
        marginTop: 30,
    },
    title: {
        fontSize: 30,
        fontWeight: '900',
        color: '#2d3436',
        marginBottom: 15,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 16,
        color: '#636e72',
        textAlign: 'center',
        lineHeight: 26,
        paddingHorizontal: 25,
        fontWeight: '500',
    },
    paginatorContainer: {
        flexDirection: 'row',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 5,
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 30,
        paddingBottom: Platform.OS === 'ios' ? 30 : 40,
        height: 90,
    },
    skipButton: {
        paddingVertical: 10,
        paddingHorizontal: 10,
    },
    skipText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#b2bec3',
    },
    nextButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 30,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    startButton: {
        paddingHorizontal: 35, // Son slaytta buton daha geniş olsun
    },
    nextButtonText: {
        fontSize: 18,
        fontWeight: '800',
        color: 'white',
        letterSpacing: 0.5,
    }
});

export default OnboardingScreen;