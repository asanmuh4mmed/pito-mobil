import React, { useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Animated, Easing, ScrollView, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// 🔒 GÜVENLİ TOKEN ÇEKİMİ (.env dosyasından geliyor - Yeni Pito Token'ı)
const HF_TOKEN = process.env.EXPO_PUBLIC_HF_TOKEN; 

// ✅ Hugging Face Router URL - En stabil görüntü sınıflandırma modeli
const HF_MODEL_URL = "https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224";

const TRANSLATIONS = {
    TR: {
        title: "Türü Nedir? (AI)",
        subtitle: "Fotoğrafı gönder, yapay zeka türünü anında söylesin!",
        camera: "Kamera",
        gallery: "Galeri",
        analyzing: "Yapay Zeka Analiz Ediyor...",
        resultTitle: "Tahmin Edilen Tür",
        error: "Analiz yapılamadı. Lütfen tekrar dene.",
        loadingModel: "Yapay zeka motoru hazırlanıyor, lütfen bekleyin...",
        serverError: "Sunucu meşgul, lütfen birkaç saniye sonra tekrar dene.",
        lowConfidence: "Düşük Tahmin: Fotoğraf tam net olmayabilir, ancak buna benziyor.",
        highConfidence: "Yüksek İhtimal: Büyük ihtimalle bu cins.",
        certainConfidence: "Kesin Sonuç: Bundan hiç şüphemiz yok!"
    },
    AU: {
        title: "What Breed? (AI)",
        subtitle: "Upload photo, let AI find the breed instantly!",
        camera: "Camera",
        gallery: "Gallery",
        analyzing: "AI is Analyzing...",
        resultTitle: "Predicted Breed",
        error: "Analysis failed. Please try again.",
        loadingModel: "AI engine is warming up, please wait...",
        serverError: "Server busy, please try again in a few seconds.",
        lowConfidence: "Low Confidence: Photo might not be clear, but it looks like this.",
        highConfidence: "High Confidence: Highly likely to be this breed.",
        certainConfidence: "Certain: We have no doubt about this!"
    }
};

const PetIdentifierScreen = ({ navigation }) => {
    const { country } = useContext(AuthContext);
    const { theme, isDarkMode } = useContext(ThemeContext);
    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
    const t = TRANSLATIONS[activeLang];

    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState({ text: "", score: 0, level: "" });

    const scanAnim = useRef(new Animated.Value(0)).current;

    const startScanAnimation = () => {
        scanAnim.setValue(0);
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnim, { toValue: 1, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(scanAnim, { toValue: 0, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
            ])
        ).start();
    };

    const stopScanAnimation = () => { scanAnim.stopAnimation(); };

    const pickImage = async (useCamera) => {
        const { granted } = useCamera 
            ? await ImagePicker.requestCameraPermissionsAsync() 
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!granted) {
            Alert.alert("Hata", "İzin verilmedi.");
            return;
        }

        let result = await (useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5, 
            // base64: true kaldırıldı, sadece URI kullanılacak
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            analyzeImage(result.assets[0].uri); // API'ye URI gönderiliyor
        }
    };

    const getConfidenceLevel = (score) => {
        if (score < 50) return { text: t.lowConfidence, color: '#FF9F43', icon: 'warning' };
        if (score < 90) return { text: t.highConfidence, color: '#0984E3', icon: 'checkmark-circle' };
        return { text: t.certainConfidence, color: '#00B894', icon: 'shield-checkmark' };
    };

    const analyzeImage = async (uri, retryCount = 0) => {
        setLoading(true);
        if (retryCount === 0) {
            setResultData({ text: "", score: 0, level: "" });
            startScanAnimation();
        }

        const MAX_RETRIES = 3; 

        try {
            // Resmi Blob (Binary) formatına çevirme işlemi
            const imgResponse = await fetch(uri);
            const blob = await imgResponse.blob();

            const response = await fetch(HF_MODEL_URL, {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${HF_TOKEN}`
                    // Content-Type belirtilmedi, fetch Blob için otomatik ayarlar
                },
                body: blob,
            });

            const data = await response.json();
            console.log("Hugging Face Yanıtı:", data);

            if (data.error) {
                if (data.error.includes("loading") && retryCount < MAX_RETRIES) {
                    setResultData({ text: t.loadingModel, score: 0, level: 'loading' });
                    setTimeout(() => analyzeImage(uri, retryCount + 1), 5000);
                    return;
                }
                throw new Error(data.error);
            }

            if (Array.isArray(data) && data.length > 0) {
                const topResult = data[0].label;
                const scoreValue = parseFloat((data[0].score * 100).toFixed(1));
                const cleanResult = topResult.split(',')[0].toUpperCase();
                
                setResultData({ 
                    text: cleanResult, 
                    score: scoreValue, 
                    level: getConfidenceLevel(scoreValue) 
                });
            } else {
                setResultData({ text: t.error, score: 0, level: 'error' });
            }
        } catch (err) {
            setResultData({ text: t.error, score: 0, level: 'error' });
            console.log("Fetch Error / API Hatası:", err.message || err);
        } finally {
            if (retryCount >= MAX_RETRIES || !loading) {
                setLoading(false);
                stopScanAnimation();
            }
        }
    };

    const translateY = scanAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 260] 
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F8F9FA' }]}>
            
            {/* ŞIK HEADER */}
            <View style={[styles.header, { backgroundColor: theme.cardBg }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, {backgroundColor: isDarkMode ? '#333' : '#F0F0F0'}]}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Ionicons name="scan-outline" size={22} color="#6C5CE7" style={{marginRight: 8}} />
                    <Text style={[styles.headerTitle, { color: theme.text }]}>{t.title}</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* AÇIKLAMA METNİ */}
                <View style={styles.titleContainer}>
                    <Text style={[styles.subtitle, { color: theme.subText }]}>{t.subtitle}</Text>
                </View>

                {/* PREMIUM RESİM ALANI */}
                <View style={[styles.imageWrapper, { backgroundColor: theme.cardBg, shadowColor: isDarkMode ? '#000' : '#6C5CE7' }]}>
                    <View style={[styles.imageContainer, { borderColor: isDarkMode ? '#444' : '#E0E0E0' }]}>
                        {imageUri ? (
                            <>
                                <Image source={{ uri: imageUri }} style={styles.image} />
                                {loading && (
                                    <View style={styles.radarOverlay}>
                                        <Animated.View style={[styles.radarLine, { transform: [{ translateY }] }]} />
                                    </View>
                                )}
                            </>
                        ) : (
                            <View style={styles.placeholder}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="image-outline" size={50} color="#6C5CE7" />
                                </View>
                                <Text style={{ color: theme.subText, marginTop: 15, fontWeight: '500' }}>Fotoğraf Bekleniyor...</Text>
                                <Text style={{ color: theme.subText, fontSize: 11, marginTop: 5, opacity: 0.6 }}>Kamera veya galeriden seçiniz</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* MODERN BUTONLAR (TON SÜR TON) */}
                <View style={styles.btnRow}>
                    <TouchableOpacity 
                        style={[styles.btn, { backgroundColor: '#5B4BC4' }]} 
                        onPress={() => pickImage(true)} 
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="camera" size={22} color="white" />
                        <Text style={styles.btnText}>{t.camera}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.btn, { backgroundColor: '#6C5CE7' }]} 
                        onPress={() => pickImage(false)} 
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="images" size={22} color="white" />
                        <Text style={styles.btnText}>{t.gallery}</Text>
                    </TouchableOpacity>
                </View>

                {/* PREMIUM SONUÇ KARTI */}
                {(loading || resultData.text !== "") && (
                    <View style={[styles.resultCard, { backgroundColor: isDarkMode ? '#1E1E2C' : '#FFFFFF' }]}>
                        {loading && resultData.level === 'loading' ? (
                             <View style={{ alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#6C5CE7" />
                                <Text style={{ marginTop: 12, color: '#6C5CE7', textAlign: 'center', fontWeight: '600' }}>{resultData.text}</Text>
                             </View>
                        ) : loading ? (
                            <View style={{ alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#6C5CE7" />
                                <Text style={{ marginTop: 12, color: '#6C5CE7', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 }}>{t.analyzing}</Text>
                            </View>
                        ) : resultData.level === 'error' ? (
                            <View style={{ alignItems: 'center' }}>
                                <Ionicons name="warning" size={32} color="#FF4D4D" style={{ marginBottom: 10 }} />
                                <Text style={{ color: '#FF4D4D', fontWeight: 'bold', textAlign: 'center' }}>{resultData.text}</Text>
                            </View>
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                <View style={styles.sparkleContainer}>
                                    <Ionicons name="sparkles" size={28} color="#FDCB6E" />
                                </View>
                                <Text style={[styles.resTitle, { color: theme.subText }]}>{t.resultTitle}</Text>
                                
                                <Text style={[styles.resText, { color: isDarkMode ? '#A55EEA' : '#5B4BC4' }]}>
                                    {resultData.text} 
                                </Text>
                                
                                <Text style={[styles.scoreText, { color: theme.text }]}>
                                    (%{resultData.score} Emin)
                                </Text>

                                {/* YÜZDEYE GÖRE DİNAMİK BİLGİ KUTUSU */}
                                {resultData.level && (
                                    <View style={[styles.confidenceBox, { backgroundColor: resultData.level.color + '15', borderColor: resultData.level.color }]}>
                                        <Ionicons name={resultData.level.icon} size={18} color={resultData.level.color} style={{marginRight: 6}} />
                                        <Text style={[styles.confidenceText, { color: resultData.level.color }]}>
                                            {resultData.level.text}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
    backButton: { padding: 8, borderRadius: 14 },
    headerTitle: { fontSize: 19, fontWeight: '800' },
    
    scrollContent: { padding: 20, alignItems: 'center', paddingBottom: 50 },
    
    titleContainer: { marginBottom: 25, marginTop: 10, paddingHorizontal: 10 },
    subtitle: { textAlign: 'center', fontSize: 15, fontWeight: '500', lineHeight: 22 },
    
    imageWrapper: { width: width * 0.88, borderRadius: 32, padding: 10, elevation: 8, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 15, marginBottom: 30 },
    imageContainer: { width: '100%', height: 260, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(108, 92, 231, 0.03)' },
    image: { width: '100%', height: '100%' },
    placeholder: { alignItems: 'center', justifyContent: 'center' },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(108, 92, 231, 0.1)', justifyContent: 'center', alignItems: 'center' },
    
    radarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
    radarLine: { width: '100%', height: 3, backgroundColor: '#00E5FF', shadowColor: '#00E5FF', shadowOpacity: 1, shadowRadius: 15, elevation: 10 }, 
    
    btnRow: { flexDirection: 'row', justifyContent: 'space-between', width: width * 0.88, marginBottom: 30 },
    btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 20, marginHorizontal: 6, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
    
    resultCard: { width: width * 0.88, padding: 25, borderRadius: 28, elevation: 10, shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, borderWidth: 1, borderColor: 'rgba(108, 92, 231, 0.1)' },
    sparkleContainer: { backgroundColor: 'rgba(253, 203, 110, 0.15)', padding: 12, borderRadius: 20, marginBottom: 10 },
    resTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 5 },
    resText: { fontSize: 24, fontWeight: '900', textAlign: 'center', lineHeight: 32 },
    scoreText: { fontSize: 16, fontWeight: '600', marginTop: 5, opacity: 0.8 },
    
    confidenceBox: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1 },
    confidenceText: { fontSize: 12, fontWeight: '700', flex: 1, flexWrap: 'wrap' }
});

export default PetIdentifierScreen;