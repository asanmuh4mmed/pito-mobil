import React, { useState, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Animated, Easing, ScrollView, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/colors';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// ✅ Daha hafif ve hızlı bir model seçtik
const HF_MODEL_URL = "https://router.huggingface.co/hf-inference/models/google/vit-base-patch16-224";

const TRANSLATIONS = {
    TR: {
        title: "Türü Nedir? (AI)",
        subtitle: "Fotoğrafı gönder, yapay zeka türünü söylesin!",
        camera: "Kamera",
        gallery: "Galeri",
        analyzing: "Analiz Ediliyor...",
        resultTitle: "Tahmin Edilen Tür:",
        error: "Analiz yapılamadı. Lütfen tekrar dene.",
        loadingModel: "Yapay zeka uyanıyor... Lütfen 10-15 saniye bekleyip tekrar fotoğraf gönderir misin?",
        serverError: "Sunucu şu an meşgul veya model yükleniyor. Lütfen birkaç saniye sonra tekrar dene."
    },
    AU: {
        title: "What Breed? (AI)",
        subtitle: "Upload photo, AI finds the breed!",
        camera: "Camera",
        gallery: "Gallery",
        analyzing: "Analyzing...",
        resultTitle: "Predicted Breed:",
        error: "Analysis failed. Please try again.",
        loadingModel: "AI is waking up... Please wait 10-15 seconds and try sending the photo again.",
        serverError: "Server is busy or model is loading. Please try again in a few seconds."
    }
};

const PetIdentifierScreen = ({ navigation }) => {
    const { country } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);
    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
    const t = TRANSLATIONS[activeLang];

    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(false);
    const [resultText, setResultText] = useState("");

    const scanAnim = useRef(new Animated.Value(0)).current;

    const startScanAnimation = () => {
        scanAnim.setValue(0);
        Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnim, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(scanAnim, { toValue: 0, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
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
            quality: 0.4, // Veri transferini hızlandırmak için kaliteyi düşürdük
            base64: true,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            analyzeImage(result.assets[0].base64);
        }
    };

    const analyzeImage = async (base64Image) => {
        setLoading(true);
        setResultText("");
        startScanAnimation();

        try {
            const response = await fetch(HF_MODEL_URL, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ inputs: base64Image }),
            });

            const contentType = response.headers.get("content-type");
            
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                console.log("AI Response:", data);

                if (Array.isArray(data) && data.length > 0) {
                    const topResult = data[0].label;
                    const score = (data[0].score * 100).toFixed(1);
                    setResultText(`${topResult} (%${score} Emin)`);
                } else if (data.error && data.error.includes("loading")) {
                    setResultText(t.loadingModel);
                } else {
                    setResultText(t.error);
                }
            } else {
                // Sunucu HTML veya başka bir şey döndürdüğünde (503 hatası gibi)
                setResultText(t.serverError);
            }
        } catch (err) {
            setResultText(t.error);
            console.log("Network Error:", err);
        } finally {
            setLoading(false);
            stopScanAnimation();
        }
    };

    const translateY = scanAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 250]
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.cardBg }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t.title}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.subtitle, { color: theme.subText }]}>{t.subtitle}</Text>

                <View style={[styles.imageContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
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
                            <Ionicons name="scan-circle-outline" size={80} color={COLORS.primary} style={{ opacity: 0.5 }} />
                            <Text style={{ color: theme.subText, marginTop: 10 }}>Fotoğraf bekleniyor...</Text>
                        </View>
                    )}
                </View>

                <View style={styles.btnRow}>
                    <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary }]} onPress={() => pickImage(true)} disabled={loading}>
                        <Ionicons name="camera" size={24} color="white" />
                        <Text style={styles.btnText}>{t.camera}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#6C5CE7' }]} onPress={() => pickImage(false)} disabled={loading}>
                        <Ionicons name="images" size={24} color="white" />
                        <Text style={styles.btnText}>{t.gallery}</Text>
                    </TouchableOpacity>
                </View>

                {(loading || resultText !== "") && (
                    <View style={[styles.resultCard, { backgroundColor: theme.cardBg }]}>
                        {loading ? (
                            <View style={{ alignItems: 'center', padding: 20 }}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={{ marginTop: 10, color: COLORS.primary, fontWeight: 'bold' }}>{t.analyzing}</Text>
                            </View>
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                <Ionicons name="sparkles" size={24} color="#FDCB6E" style={{ marginBottom: 10 }} />
                                <Text style={[styles.resTitle, { color: theme.text }]}>{t.resultTitle}</Text>
                                <Text style={[styles.resText, { color: COLORS.primary }]}>{resultText}</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
    backButton: { padding: 8, borderRadius: 12 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    subtitle: { textAlign: 'center', fontSize: 14, marginBottom: 20, paddingHorizontal: 20 },
    imageContainer: { width: 250, height: 250, borderRadius: 25, borderWidth: 2, borderStyle: 'dashed', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
    image: { width: '100%', height: '100%' },
    placeholder: { alignItems: 'center', justifyContent: 'center' },
    radarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
    radarLine: { width: '100%', height: 4, backgroundColor: '#00FF00', shadowColor: '#00FF00', shadowOpacity: 1, elevation: 5 },
    btnRow: { flexDirection: 'row', justifyContent: 'space-between', width: width * 0.85, marginBottom: 25 },
    btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 15, marginHorizontal: 5, elevation: 3 },
    btnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
    resultCard: { width: width * 0.9, padding: 25, borderRadius: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, marginBottom: 30 },
    resTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
    resText: { fontSize: 18, fontWeight: '900', textAlign: 'center' }
});

export default PetIdentifierScreen;