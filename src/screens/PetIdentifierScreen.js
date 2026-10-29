import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, Alert, Animated, Easing, Modal, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { requestAi, aiErrorText } from '../utils/requestAi';


// --- PITO YENİ RENK PALETİ ---
const PITO_COLORS = {
    primary: '#C5A059', 
    primaryDark: '#B08D4B', 
    navyBg: '#0B131E', 
    navySurface: '#1A2533', 
    navyLight: '#243447',
    cream: '#F5F5DC',
    white: '#FFFFFF',
    grayText: '#A0AAB5',
    error: '#FF4757',
    success: '#00B894'
};

const TRANSLATIONS = {
    TR: {
        title: 'Irk tahmini', back: 'Geri dön', tag: 'PİTO • YAPAY ZEKÂ',
        headline: 'Bir fotoğraf,\nyeni bir ipucu.',
        intro: 'Dostunun görünüşünden yola çıkarak olası ırkını birlikte keşfedelim.',
        cat: 'Kediler', dog: 'Köpekler', visual: 'Görsel tahmin',
        photoTitle: 'Dostunu kadraja al', photoSub: 'Net bir fotoğrafla başlayalım.',
        placeholder: 'Bu alan onun için ayrıldı', placeholderSub: 'Kamera veya galeriden bir fotoğraf seç.',
        gallery: 'Galeriden fotoğraf seç', camera: 'Fotoğraf çek', change: 'Başka bir fotoğraf dene',
        analyzing: 'Fotoğrafın inceleniyor', analyzingSub: 'Görsel özellikler değerlendiriliyor. Biraz sürebilir.',
        selected: 'SEÇİLEN FOTOĞRAF', expand: 'Fotoğrafı büyüt', close: 'Kapat',
        resultTitle: 'OLASI IRK', resultHeading: 'Küçük dostundan bir ipucu',
        estimate: 'Yapay zekâ tahmini', unclear: 'Daha net bir fotoğraf deneyebilirsin',
        errorTitle: 'Bu kez analiz tamamlanamadı', error: 'Fotoğrafı yeniden seçerek tekrar deneyebilirsin.',
        resultNote: 'Bu sonuç görünüşe dayalı bir tahmindir. Safkanlık veya soy bilgisi fotoğraftan doğrulanamaz.',
        tipsTitle: 'Daha iyi bir fotoğraf için', tipsSub: 'Küçük detaylar, daha anlamlı bir tahmine yardımcı olur.',
        tips: [
            ['sunny-outline', 'Doğal ışık kullan', 'Karanlık, yoğun filtre veya bulanıklık olmayan bir fotoğraf seç.'],
            ['paw-outline', 'Tek dost, tek kare', 'Karede yalnızca bir kedi veya köpek bulunsun.'],
            ['scan-outline', 'Yüzü ve gövdesi görünsün', 'Kulakları ve tüy yapısı mümkün olduğunca net olsun.'],
        ],
        privacyTitle: 'Fotoğraf analizi hakkında',
        privacy: 'Seçtiğin fotoğraf analiz için Google Gemini’ye gönderilir. Ücretsiz hizmet koşullarında içerik Google ürünlerini geliştirmek için kullanılabilir. Kişisel bilgi içeren fotoğraflar seçme.',
        footer: 'Her dost, ırkından çok daha fazlası. 🐾',
    },
    AU: {
        title: 'Breed estimate', back: 'Go back', tag: 'PITO • ARTIFICIAL INTELLIGENCE',
        headline: 'One photo.\nA new clue.',
        intro: 'Explore a possible breed based on your companion’s appearance.',
        cat: 'Cats', dog: 'Dogs', visual: 'Visual estimate',
        photoTitle: 'Meet the star of the photo', photoSub: 'Start with a clear picture.',
        placeholder: 'A little space just for them', placeholderSub: 'Choose a photo or take a new one.',
        gallery: 'Choose from gallery', camera: 'Take a photo', change: 'Try another photo',
        analyzing: 'Looking at your photo', analyzingSub: 'Visual features are being assessed. This may take a moment.',
        selected: 'YOUR PHOTO', expand: 'Expand photo', close: 'Close',
        resultTitle: 'POSSIBLE BREED', resultHeading: 'A clue about your companion',
        estimate: 'AI estimate', unclear: 'Try a clearer photo',
        errorTitle: 'The analysis could not finish', error: 'Choose your photo again to retry.',
        resultNote: 'This is an estimate based on appearance. A photo cannot confirm pedigree or ancestry.',
        tipsTitle: 'For a better photo', tipsSub: 'A few small details can help make the estimate more useful.',
        tips: [
            ['sunny-outline', 'Use natural light', 'Choose a sharp photo without heavy filters or dark shadows.'],
            ['paw-outline', 'One companion at a time', 'Include only one cat or dog in the frame.'],
            ['scan-outline', 'Show their face and body', 'Keep ears and coat features as clear as possible.'],
        ],
        privacyTitle: 'About photo analysis',
        privacy: 'Your selected photo is sent to Google Gemini for analysis. Under the free service terms, content may be used to improve Google products. Avoid photos containing personal information.',
        footer: 'Every companion is more than a breed. 🐾',
    },
};

const PetIdentifierScreen = ({ navigation }) => {
    const { user, language } = useContext(AuthContext);
    const { theme, isDarkMode } = useContext(ThemeContext);
    const activeLang = language === 'EN' ? 'AU' : 'TR';
    const t = TRANSLATIONS[activeLang];

    const { width } = useWindowDimensions();
    const photoHeight = Math.min(Math.max(width - 80, 240), 420);
    const [zoomVisible, setZoomVisible] = useState(false);
    const palette = isDarkMode
        ? { bg: '#0B131E', card: '#172332', text: '#F6F1E7', sub: '#B2BDCB', line: '#2C3A4A', tint: '#282B29', photo: '#111E2C' }
        : { bg: '#F8F5EF', card: '#FFFFFF', text: '#172638', sub: '#6D7784', line: '#E7E1D7', tint: '#F3EAD7', photo: '#FAF8F3' };
    const [imageUri, setImageUri] = useState(null);
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState({ text: "", score: 0, level: "" });

    const lifecycle = useRef({ live: true, version: 0, busy: false, controller: null, animation: null });
    const accountId = useRef(user?.id); accountId.current = user?.id;
    useEffect(() => {
        lifecycle.current.live = true;
        return () => { lifecycle.current.live = false; lifecycle.current.version++; lifecycle.current.controller?.abort(); lifecycle.current.animation?.stop(); };
    }, []);
    useEffect(() => {
        lifecycle.current.version++; lifecycle.current.controller?.abort(); lifecycle.current.animation?.stop(); lifecycle.current.busy = false;
        setLoading(false); setResultData({ text: '', score: 0, level: '' }); setImageUri(null);
    }, [user?.id]);
    const scanAnim = useRef(new Animated.Value(0)).current;

    const startScanAnimation = () => {
        scanAnim.setValue(0);
        lifecycle.current.animation?.stop();
        lifecycle.current.animation = Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnim, { toValue: 1, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(scanAnim, { toValue: 0, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
            ])
        );
        lifecycle.current.animation.start();
    };

    const stopScanAnimation = () => { lifecycle.current.animation?.stop(); scanAnim.stopAnimation(); };

    const pickImage = async (useCamera) => {
        if (lifecycle.current.busy) return;
        if (!user?.id) { Alert.alert('Pito', aiErrorText({ code: 'auth' }, activeLang === 'AU')); return; }
        lifecycle.current.busy = true;
        const ownerId = user.id;
        try {
            const permission = await (useCamera ? ImagePicker.requestCameraPermissionsAsync() : ImagePicker.requestMediaLibraryPermissionsAsync());
            if (!permission.granted) { Alert.alert('Pito', activeLang === 'AU' ? 'Photo permission is required.' : 'Fotoğraf izni gerekli.'); return; }
            const result = await (useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({
                mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
            });
            if (result.canceled || !result.assets?.[0] || !lifecycle.current.live || accountId.current !== ownerId) return;
            const asset = result.assets[0];
            if (!asset.base64 || asset.base64.length > 5600000) throw Object.assign(new Error('image'), { code: 'image' });
            setImageUri(asset.uri);
            await analyzeImage(asset.base64, ownerId);
        } catch (error) {
            if (lifecycle.current.live && accountId.current === ownerId) Alert.alert('Pito', aiErrorText(error, activeLang === 'AU'));
        } finally {
            if (accountId.current === ownerId) lifecycle.current.busy = false;
        }
    };

    const analyzeImage = async (imageBase64, ownerId) => {
        const version = ++lifecycle.current.version;
        lifecycle.current.controller?.abort();
        const controller = new AbortController(); lifecycle.current.controller = controller;
        const current = () => lifecycle.current.live && lifecycle.current.version === version && accountId.current === ownerId;
        setLoading(true); setResultData({ text: '', score: 0, level: '' }); startScanAnimation();
        try {
            const data = await requestAi({ kind: 'classify', imageBase64, language: activeLang === 'AU' ? 'EN' : 'TR' }, controller.signal);
            if (typeof data.label !== 'string' || !data.label.trim()) throw new Error('Invalid analysis response');
            if (current()) setResultData({
                text: data.label.trim(), score: null,
                level: { text: data.note || t.resultNote, uncertain: data.uncertain === true },
            });
        } catch (error) {
            if (current()) setResultData({ text: aiErrorText(error, activeLang === 'AU'), score: 0, level: 'error' });
        } finally {
            if (current()) { setLoading(false); stopScanAnimation(); lifecycle.current.controller = null; }
        }
    };

    const translateY = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, photoHeight - 4] });

    const hasResult = !loading && Boolean(resultData.text) && resultData.level !== 'error';
    const hasError = !loading && resultData.level === 'error';
    const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home');

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: palette.bg }]}>
            <View style={styles.header}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={t.back} onPress={goBack} style={[styles.backButton, { backgroundColor: palette.card, borderColor: palette.line }]}>
                    <Ionicons name="arrow-back" size={23} color={palette.text} />
                </TouchableOpacity>
                <Text accessibilityRole="header" style={[styles.headerTitle, { color: palette.text }]}>{t.title}</Text>
                <View style={[styles.aiBadge, { backgroundColor: palette.tint }]}><Ionicons name="sparkles" size={15} color={PITO_COLORS.primaryDark} /><Text style={styles.aiBadgeText}>AI</Text></View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.hero}>
                    <View accessible={false} pointerEvents="none" style={styles.heroOrbit} />
                    <View style={styles.heroTop}><Text style={styles.eyebrow}>{t.tag}</Text><Ionicons name="paw" size={25} color="#D9BC7E" /></View>
                    <Text accessibilityRole="header" style={styles.headline}>{t.headline}</Text>
                    <Text style={styles.heroIntro}>{t.intro}</Text>
                    <View style={styles.pillRow}>
                        {[t.cat, t.dog, t.visual].map((label, index) => <View key={label} style={styles.pill}><Ionicons name={index === 2 ? 'sparkles-outline' : 'paw-outline'} size={13} color="#D9BC7E" /><Text style={styles.pillText}>{label}</Text></View>)}
                    </View>
                </View>

                <View style={styles.sectionHeading}><View style={styles.flex}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>{t.photoTitle}</Text><Text style={[styles.sectionSub, { color: palette.sub }]}>{t.photoSub}</Text></View><View style={[styles.sectionIcon, { backgroundColor: palette.tint }]}><Ionicons name="scan-outline" size={23} color={PITO_COLORS.primaryDark} /></View></View>

                <View style={[styles.photoCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
                    <View style={[styles.photoFrame, { height: photoHeight, backgroundColor: palette.photo, borderColor: imageUri ? 'transparent' : (isDarkMode ? '#4B4940' : '#D7C7A4'), borderStyle: imageUri ? 'solid' : 'dashed' }]}>
                        {imageUri ? <>
                            <Image source={{ uri: imageUri }} resizeMode="contain" style={styles.image} />
                            <View style={styles.photoLabel}><View style={styles.goldDot} /><Text style={styles.photoLabelText}>{t.selected}</Text></View>
                            {!loading && <TouchableOpacity accessibilityRole="button" accessibilityLabel={t.expand} onPress={() => setZoomVisible(true)} style={styles.expandButton}><Ionicons name="expand-outline" size={20} color="#FFFFFF" /></TouchableOpacity>}
                            {loading && <View style={styles.radarOverlay}><Animated.View style={[styles.radarLine, { transform: [{ translateY }] }]} /><View style={styles.loadingChip}><ActivityIndicator size="small" color="#D9BC7E" /><Text style={styles.loadingChipText}>{t.analyzing}</Text></View></View>}
                        </> : <View style={styles.placeholder}>
                            <View style={[styles.placeholderRing, { borderColor: isDarkMode ? '#3E4039' : '#E9DDBF' }]}><View style={[styles.placeholderIcon, { backgroundColor: palette.tint }]}><Ionicons name="paw-outline" size={52} color={PITO_COLORS.primaryDark} /></View><View style={styles.plusMark}><Ionicons name="add" size={19} color="#152437" /></View></View>
                            <Text style={[styles.placeholderTitle, { color: palette.text }]}>{t.placeholder}</Text>
                            <Text style={[styles.placeholderSub, { color: palette.sub }]}>{t.placeholderSub}</Text>
                        </View>}
                    </View>
                    <TouchableOpacity accessibilityRole="button" disabled={loading} activeOpacity={0.8} onPress={() => pickImage(false)} style={[styles.primaryButton, loading && styles.disabled]}><Ionicons name="images-outline" size={21} color="#142334" /><Text style={styles.primaryButtonText}>{imageUri ? t.change : t.gallery}</Text><Ionicons name="arrow-forward" size={19} color="#142334" /></TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" disabled={loading} activeOpacity={0.7} onPress={() => pickImage(true)} style={[styles.secondaryButton, { borderColor: palette.line }, loading && styles.disabled]}><Ionicons name="camera-outline" size={21} color={palette.text} /><Text style={[styles.secondaryButtonText, { color: palette.text }]}>{t.camera}</Text></TouchableOpacity>
                </View>

                {loading && <View accessibilityLiveRegion="polite" style={[styles.statusCard, { backgroundColor: palette.card, borderColor: palette.line }]}><ActivityIndicator color={PITO_COLORS.primaryDark} /><View style={styles.flex}><Text style={[styles.featureTitle, { color: palette.text }]}>{t.analyzing}</Text><Text style={[styles.bodySmall, { color: palette.sub }]}>{t.analyzingSub}</Text></View></View>}

                {hasError && <View accessibilityLiveRegion="polite" style={[styles.errorCard, { backgroundColor: palette.card }]}><Ionicons name="alert-circle-outline" size={29} color="#CC6557" /><Text style={[styles.resultHeading, { color: palette.text }]}>{t.errorTitle}</Text><Text style={[styles.body, { color: palette.sub }]}>{resultData.text}</Text><TouchableOpacity accessibilityRole="button" onPress={() => pickImage(false)} style={[styles.retryButton, { backgroundColor: palette.tint }]}><Ionicons name="images-outline" size={18} color={PITO_COLORS.primaryDark}/><Text style={styles.retryText}>{t.change}</Text></TouchableOpacity></View>}

                {hasResult && <View accessibilityLiveRegion="polite" style={[styles.resultCard, { backgroundColor: palette.card, borderColor: '#C5A059' }]}>
                    <View style={styles.resultTop}><View style={[styles.resultIcon, { backgroundColor: palette.tint }]}><Ionicons name={resultData.level?.uncertain ? 'help-circle-outline' : 'sparkles-outline'} size={25} color={PITO_COLORS.primaryDark} /></View><View style={styles.flex}><Text style={styles.resultEyebrow}>{t.resultTitle}</Text><Text style={[styles.bodySmall, { color: palette.sub }]}>{t.resultHeading}</Text></View></View>
                    <Text selectable style={[styles.resultName, { color: palette.text }]}>{resultData.text}</Text>
                    <View style={[styles.estimatePill, { backgroundColor: palette.tint }]}><Ionicons name="information-circle-outline" size={15} color={PITO_COLORS.primaryDark} /><Text style={styles.estimateText}>{resultData.level?.uncertain ? t.unclear : t.estimate}</Text></View>
                    <Text selectable style={[styles.body, { color: palette.sub }]}>{resultData.level?.text || t.resultNote}</Text>
                    <View style={[styles.resultFooter, { borderColor: palette.line }]}><Ionicons name="paw-outline" size={20} color={PITO_COLORS.primaryDark}/><Text style={[styles.resultDisclaimer, { color: palette.sub }]}>{t.resultNote}</Text></View>
                </View>}

                <View style={[styles.tipsCard, { backgroundColor: palette.card, borderColor: palette.line }]}>
                    <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>{t.tipsTitle}</Text><Text style={[styles.sectionSub, { color: palette.sub }]}>{t.tipsSub}</Text>
                    {t.tips.map(([icon, title, description], index) => <View key={title} style={[styles.tipRow, index > 0 && { borderTopWidth: 1, borderTopColor: palette.line }]}><View style={[styles.tipIcon, { backgroundColor: palette.tint }]}><Ionicons name={icon} size={22} color={PITO_COLORS.primaryDark} /></View><View style={styles.flex}><Text style={[styles.featureTitle, { color: palette.text }]}>{title}</Text><Text style={[styles.bodySmall, { color: palette.sub }]}>{description}</Text></View></View>)}
                </View>

                <View style={styles.privacy}><Ionicons name="information-circle-outline" size={21} color={palette.sub}/><View style={styles.flex}><Text style={[styles.privacyTitle, { color: palette.text }]}>{t.privacyTitle}</Text><Text style={[styles.privacyBody, { color: palette.sub }]}>{t.privacy}</Text></View></View>
                <Text style={[styles.footerText, { color: palette.sub }]}>{t.footer}</Text>
            </ScrollView>

            <Modal visible={zoomVisible && Boolean(imageUri)} transparent animationType="fade" onRequestClose={() => setZoomVisible(false)}>
                <SafeAreaView style={styles.zoomBackground}><View style={styles.zoomHeader}><Text style={styles.zoomTitle}>{t.selected}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t.close} onPress={() => setZoomVisible(false)} style={styles.zoomClose}><Ionicons name="close" size={27} color="#FFFFFF" /></TouchableOpacity></View>{imageUri && <Image source={{ uri: imageUri }} resizeMode="contain" style={styles.zoomImage} />}</SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 }, flex: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backButton: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 19, fontWeight: '800' },
    aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13 },
    aiBadgeText: { color: '#A07A34', fontWeight: '800', fontSize: 12 },
    scrollContent: { padding: 20, paddingTop: 8, paddingBottom: 32, width: '100%', maxWidth: 640, alignSelf: 'center' },
    hero: { borderRadius: 28, backgroundColor: '#142334', padding: 24, overflow: 'hidden' },
    heroOrbit: { position: 'absolute', width: 230, height: 230, borderRadius: 120, borderWidth: 35, borderColor: '#203247', right: -110, top: -60 },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    eyebrow: { color: '#D9BC7E', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, flexShrink: 1 },
    headline: { color: '#FCF8F0', fontWeight: '800', fontSize: 32, lineHeight: 40, letterSpacing: -0.8, marginTop: 19 },
    heroIntro: { color: '#C5CED9', fontSize: 14, lineHeight: 23, marginTop: 12 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 21 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#253448' },
    pillText: { color: '#EEE7D9', fontSize: 10, fontWeight: '600' },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28, marginBottom: 15 },
    sectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
    sectionSub: { fontSize: 13, lineHeight: 21, marginTop: 5 },
    sectionIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    photoCard: { borderWidth: 1, borderRadius: 27, padding: 12 },
    photoFrame: { borderWidth: 1.5, borderRadius: 20, overflow: 'hidden', justifyContent: 'center' },
    image: { width: '100%', height: '100%' },
    placeholder: { padding: 20, alignItems: 'center', justifyContent: 'center' },
    placeholderRing: { width: 120, height: 120, borderRadius: 65, borderWidth: 1, padding: 10, marginBottom: 23 },
    placeholderIcon: { flex: 1, borderRadius: 55, alignItems: 'center', justifyContent: 'center' },
    plusMark: { position: 'absolute', right: 1, bottom: 8, width: 29, height: 29, borderRadius: 15, backgroundColor: '#D9BC7E', alignItems: 'center', justifyContent: 'center' },
    placeholderTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
    placeholderSub: { fontSize: 12, lineHeight: 20, marginTop: 8, textAlign: 'center' },
    photoLabel: { position: 'absolute', top: 12, left: 12, borderRadius: 12, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,29,43,0.8)' },
    goldDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D9BC7E' },
    photoLabelText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
    expandButton: { position: 'absolute', right: 12, bottom: 12, padding: 11, borderRadius: 14, backgroundColor: 'rgba(16,29,43,0.8)' },
    radarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,19,30,0.35)' },
    radarLine: { height: 3, backgroundColor: '#D9BC7E', width: '100%' },
    loadingChip: { position: 'absolute', bottom: 16, left: 14, right: 14, borderRadius: 16, padding: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, backgroundColor: 'rgba(16,29,43,0.9)' },
    loadingChipText: { color: '#FFFFFF', fontSize: 12, flexShrink: 1 },
    primaryButton: { backgroundColor: '#D1B06B', borderRadius: 17, paddingHorizontal: 16, paddingVertical: 17, marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 55 },
    primaryButtonText: { flex: 1, color: '#142334', fontSize: 14, fontWeight: '800' },
    secondaryButton: { borderRadius: 17, padding: 15, minHeight: 51, marginTop: 9, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
    secondaryButtonText: { fontSize: 14, fontWeight: '700' }, disabled: { opacity: 0.5 },
    statusCard: { marginTop: 18, borderRadius: 22, padding: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
    featureTitle: { fontSize: 14, fontWeight: '700', marginBottom: 5 },
    bodySmall: { fontSize: 12, lineHeight: 20 }, body: { fontSize: 14, lineHeight: 24 },
    resultCard: { marginTop: 20, borderRadius: 27, padding: 23, borderWidth: 1 },
    resultTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    resultIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    resultEyebrow: { color: '#A07A34', fontSize: 10, fontWeight: '800', letterSpacing: 1.6, marginBottom: 3 },
    resultName: { fontSize: 27, lineHeight: 35, fontWeight: '800', letterSpacing: -0.6, marginTop: 21, marginBottom: 13 },
    estimatePill: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, maxWidth: '100%' },
    estimateText: { color: '#A07A34', fontSize: 11, fontWeight: '700', flexShrink: 1 },
    resultFooter: { borderTopWidth: 1, marginTop: 19, paddingTop: 17, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    resultDisclaimer: { flex: 1, fontSize: 11, lineHeight: 18 },
    errorCard: { marginTop: 20, borderWidth: 1, borderColor: '#CC6557', borderRadius: 25, padding: 22, gap: 12 },
    resultHeading: { fontSize: 19, lineHeight: 27, fontWeight: '800' },
    retryButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderRadius: 14, marginTop: 3 }, retryText: { color: '#A07A34', fontWeight: '700', fontSize: 12, flexShrink: 1 },
    tipsCard: { borderRadius: 25, padding: 21, borderWidth: 1, marginTop: 23 },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingVertical: 17 },
    tipIcon: { width: 41, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    privacy: { flexDirection: 'row', gap: 11, marginTop: 24, paddingHorizontal: 3 },
    privacyTitle: { fontSize: 12, fontWeight: '700', marginBottom: 5 },
    privacyBody: { fontSize: 11, lineHeight: 19 }, footerText: { fontSize: 12, textAlign: 'center', lineHeight: 20, marginTop: 27 },
    zoomBackground: { flex: 1, backgroundColor: '#080F18' }, zoomHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, gap: 12 },
    zoomTitle: { color: '#E6DDCA', fontSize: 11, letterSpacing: 1.5, fontWeight: '700', flex: 1 }, zoomClose: { padding: 10, backgroundColor: '#1B2939', borderRadius: 15 }, zoomImage: { flex: 1, width: '100%' },
});

export default PetIdentifierScreen;