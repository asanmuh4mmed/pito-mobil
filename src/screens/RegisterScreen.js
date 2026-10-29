import React, { useState, useContext, useRef, useEffect } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, 
    ActivityIndicator, Modal, FlatList, Animated, KeyboardAvoidingView, Platform, StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { CITY_DATA } from '../constants/cities'; 

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

const RegisterScreen = ({ navigation }) => {
    const { register, verifyEmail, isLoading } = useContext(AuthContext);
    
    const [language, setLanguage] = useState('TR');
    const fixedCountry = 'TR'; 
    
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [isRegistering, setIsRegistering] = useState(false);
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');

    const [modalVisible, setModalVisible] = useState(false);
    const [selectionType, setSelectionType] = useState(null); 
    const [verifyModalVisible, setVerifyModalVisible] = useState(false);
    const [userCode, setUserCode] = useState(''); 
    const [isVerifying, setIsVerifying] = useState(false); 

    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const scaleAnim = useRef(new Animated.Value(0)).current;

    const [eulaVisible, setEulaVisible] = useState(false);
    const [privacyVisible, setPrivacyVisible] = useState(false);
    const [isAgreed, setIsAgreed] = useState(false); 

    useEffect(() => {
        if (successModalVisible) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true
            }).start();
        } else {
            scaleAnim.setValue(0);
        }
    }, [successModalVisible]);

    const TEXTS = {
        TR: {
            title: "Aramıza Katıl",
            subtitle: "Can dostlarımızı bulmak için hesap oluştur.",
            labelUser: "Kullanıcı Adı",
            labelName: "Ad Soyad",
            labelEmail: "E-Posta",
            labelPass: "Şifre",
            labelPassConfirm: "Şifre (Tekrar)",
            labelCity: "İl Seçiniz",
            labelDistrict: "İlçe Seçiniz",
            btnRegister: "Kayıt Ol",
            linkLogin: "Zaten hesabın var mı? Giriş Yap",
            errFill: "Lütfen tüm alanları doldurunuz.",
            errSpace: "Kullanıcı adı boşluk içeremez ve küçük harf olmalıdır.",
            errPass: "Girdiğiniz şifreler birbiriyle uyuşmuyor.",
            errAgreed: "Lütfen kayıt olmak için Kullanım Koşulları ve Gizlilik Politikasını okuyup onaylayınız.", 
            successTitle: "Tebrikler! 🎉",
            successMsg: "Hesabınız başarıyla doğrulandı. Şimdi giriş yapabilirsiniz.",
            modalCity: "İl Seçiniz",
            modalDistrict: "İlçe Seçiniz",
            city: "İl",
            dist: "İlçe",
            verifyTitle: "E-Posta Doğrulama",
            verifyMsg: "E-posta adresine gönderilen 6 haneli kodu giriniz.",
            btnVerify: "Doğrula ve Bitir",
            errCode: "Hatalı kod veya süresi dolmuş.",
            codeSentTitle: "Kod Gönderildi",
            codeSentMsg: "adresine doğrulama kodu gönderildi. Spam kutusunu kontrol etmeyi unutma.",
            agreeText: "Kayıt olarak, ",
            agreeEnd: " kabul ediyorum.",
            eula: "Kullanım Koşulları",
            privacy: "Gizlilik Politikası",
            and: " ve ",
            close: "Kapat",
            goLogin: "Giriş Yap",
            warnTitle: "Uyarı",
            warnCityDesc: "Önce şehir seçmelisiniz.",
            errMissingTitle: "Eksik Bilgi",
            errTitle: "Hata"
        },
        EN: {
            title: "Join Us",
            subtitle: "Create an account to find your best friends.",
            labelUser: "Username",
            labelName: "Full Name",
            labelEmail: "Email",
            labelPass: "Password",
            labelPassConfirm: "Confirm Password",
            labelCity: "Select Province",
            labelDistrict: "Select District",
            btnRegister: "Sign Up",
            linkLogin: "Already have an account? Login",
            errFill: "Please fill in all fields.",
            errSpace: "Username cannot contain spaces.",
            errPass: "Passwords do not match.",
            errAgreed: "Please read and accept the Terms of Use and Privacy Policy to register.", 
            successTitle: "Congratulations! 🎉",
            successMsg: "Account verified successfully. You can login now.",
            modalCity: "Select Province",
            modalDistrict: "Select District",
            city: "Province",
            dist: "District",
            verifyTitle: "Email Verification",
            verifyMsg: "Enter the 6-digit verification code sent to your email.",
            btnVerify: "Verify & Finish",
            errCode: "Invalid code or expired.",
            codeSentTitle: "Code Sent",
            codeSentMsg: "Verification code sent to",
            agreeText: "I agree to the ",
            agreeEnd: ".",
            eula: "Terms of Use",
            privacy: "Privacy Policy",
            and: " and ",
            close: "Close",
            goLogin: "Login",
            warnTitle: "Warning",
            warnCityDesc: "Please select a province first.",
            errMissingTitle: "Missing Info",
            errTitle: "Error"
        }
    };

    const t = TEXTS[language]; 

    const handleSelection = (item) => {
        if (selectionType === 'city') {
            setCity(item);
            setDistrict(''); 
        } else {
            setDistrict(item);
        }
        setModalVisible(false);
    };

    const openModal = (type) => {
        if (type === 'district' && !city) {
            Alert.alert(t.warnTitle, t.warnCityDesc);
            return;
        }
        setSelectionType(type);
        setModalVisible(true);
    };

    const getListData = () => {
        const countryData = CITY_DATA[fixedCountry] || {};
        if (selectionType === 'city') {
            return Object.keys(countryData).sort();
        } else {
            return countryData[city]?.sort() || [];
        }
    };

    const handleUsernameChange = (text) => {
        const formattedText = text.replace(/\s/g, '').toLowerCase();
        setUsername(formattedText);
    };

    const handleRegister = async () => {
        if (!isAgreed) {
            Alert.alert(t.warnTitle, t.errAgreed);
            return;
        }

        const cleanEmail = email ? email.trim() : "";
        
        if (!username || !name || !cleanEmail || !password || !confirmPassword || !city || !district) {
            Alert.alert(t.errMissingTitle, t.errFill);
            return;
        }

        if (username.includes(' ')) {
            Alert.alert(t.errTitle, t.errSpace);
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert(t.errTitle, t.errPass);
            return;
        }

        setIsRegistering(true);

        // HERKES OTOMATİK OLARAK 'standard' HESAP TÜRÜYLE KAYIT OLUYOR
        const result = await register(username, name, cleanEmail, password, fixedCountry, city, district, 'standard');

        setIsRegistering(false);

        if (result.success) {
            if (!result.session) {
                setVerifyModalVisible(true);
                Alert.alert(t.codeSentTitle, `${t.codeSentMsg} ${cleanEmail}`);
            } else {
                navigation.navigate('Login');
            }
        } else {
            Alert.alert(t.errTitle, result.message);
        }
    };

    const handleVerify = async () => {
        if (!userCode || userCode.length < 6) {
            Alert.alert(t.errTitle, t.errCode);
            return;
        }

        setIsVerifying(true);
        const cleanEmail = email ? email.trim() : "";

        const result = await verifyEmail(cleanEmail, userCode);

        setIsVerifying(false);
        
        if (result.success) {
            setVerifyModalVisible(false);
            setSuccessModalVisible(true);
        } else {
            Alert.alert(t.errTitle, result.message || t.errCode);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={PITO_COLORS.navyBg} />
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }} 
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.langSwitchContainer}>
                        <TouchableOpacity 
                            style={styles.langBtn} 
                            onPress={() => setLanguage(language === 'TR' ? 'EN' : 'TR')}
                        >
                            <Ionicons name="globe-outline" size={18} color={PITO_COLORS.grayText} />
                            <Text style={styles.langText}>{language}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.header}>
                        <View style={styles.logoPlaceholder}>
                            <Ionicons name="person-add" size={40} color={PITO_COLORS.primary} />
                        </View>
                        <Text style={styles.title}>{t.title}</Text>
                        <Text style={styles.subtitle}>{t.subtitle}</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t.labelUser}</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="kullanici_adi" 
                                placeholderTextColor={PITO_COLORS.grayText} 
                                value={username} 
                                onChangeText={handleUsernameChange} 
                                autoCapitalize="none" 
                                selectionColor={PITO_COLORS.primary}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t.labelName}</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="John Doe" 
                                placeholderTextColor={PITO_COLORS.grayText} 
                                value={name} 
                                onChangeText={setName} 
                                selectionColor={PITO_COLORS.primary}
                            />
                        </View>

                        <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                            <View style={[styles.inputContainer, {width:'48%'}]}>
                                <Text style={styles.label}>{t.city}</Text>
                                <TouchableOpacity style={styles.input} onPress={() => openModal('city')}>
                                    <Text style={{color: city ? PITO_COLORS.white : PITO_COLORS.grayText}}>{city || t.labelCity}</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.inputContainer, {width:'48%'}]}>
                                <Text style={styles.label}>{t.dist}</Text>
                                <TouchableOpacity style={styles.input} onPress={() => openModal('district')}>
                                    <Text style={{color: district ? PITO_COLORS.white : PITO_COLORS.grayText}}>{district || t.labelDistrict}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t.labelEmail}</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="mail@ornek.com" 
                                placeholderTextColor={PITO_COLORS.grayText} 
                                keyboardType="email-address" 
                                value={email} 
                                onChangeText={setEmail} 
                                autoCapitalize="none" 
                                selectionColor={PITO_COLORS.primary}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t.labelPass}</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput 
                                    style={styles.passwordInput} 
                                    placeholder="••••••" 
                                    placeholderTextColor={PITO_COLORS.grayText} 
                                    secureTextEntry={!showPassword} 
                                    value={password} 
                                    onChangeText={setPassword} 
                                    selectionColor={PITO_COLORS.primary}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={PITO_COLORS.grayText} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t.labelPassConfirm}</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput 
                                    style={styles.passwordInput} 
                                    placeholder="••••••" 
                                    placeholderTextColor={PITO_COLORS.grayText} 
                                    secureTextEntry={!showConfirmPassword} 
                                    value={confirmPassword} 
                                    onChangeText={setConfirmPassword} 
                                    selectionColor={PITO_COLORS.primary}
                                />
                                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={PITO_COLORS.grayText} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.checkboxContainer}>
                            <TouchableOpacity 
                                style={styles.checkbox} 
                                onPress={() => setIsAgreed(!isAgreed)}
                                activeOpacity={0.7}
                            >
                                <Ionicons 
                                    name={isAgreed ? "checkbox" : "square-outline"} 
                                    size={24} 
                                    color={isAgreed ? PITO_COLORS.primary : PITO_COLORS.grayText} 
                                />
                            </TouchableOpacity>
                            
                            <View style={styles.checkboxTextContainer}>
                                <Text style={styles.legalText}>
                                    {t.agreeText}
                                    <Text style={styles.legalLink} onPress={() => setEulaVisible(true)}>{t.eula}</Text>
                                    {t.and}
                                    <Text style={styles.legalLink} onPress={() => setPrivacyVisible(true)}>{t.privacy}</Text>
                                    {t.agreeEnd}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[styles.button, { opacity: isAgreed ? 1 : 0.5 }]} 
                            onPress={handleRegister} 
                            disabled={isRegistering || !isAgreed}
                            activeOpacity={0.8}
                        >
                            {isRegistering ? <ActivityIndicator color={PITO_COLORS.navyBg} /> : <Text style={styles.buttonText}>{t.btnRegister}</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                            <Text style={styles.linkText}>{t.linkLogin}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* ŞEHİR/İLÇE MODALI */}
            <Modal visible={modalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{selectionType === 'city' ? t.modalCity : t.modalDistrict}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={PITO_COLORS.grayText} />
                            </TouchableOpacity>
                        </View>
                        <FlatList 
                            data={getListData()}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => handleSelection(item)}>
                                    <Text style={styles.modalItemText}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* DOĞRULAMA KODU MODALI */}
            <Modal visible={verifyModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlayDark}>
                    <View style={styles.verifyModalContentDark}>
                        <View style={styles.verifyModalHeader}>
                            <Text style={styles.verifyModalTitle}>{t.verifyTitle}</Text>
                            <TouchableOpacity onPress={() => setVerifyModalVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={PITO_COLORS.grayText} />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.verifyModalDesc}>{t.verifyMsg}</Text>

                        <TextInput 
                            style={styles.verifyInputDark}
                            placeholder="••••••"
                            placeholderTextColor={PITO_COLORS.navyLight}
                            maxLength={6}
                            keyboardType="number-pad"
                            value={userCode}
                            onChangeText={setUserCode}
                            selectionColor={PITO_COLORS.primary}
                        />

                        <TouchableOpacity 
                            style={[styles.button, { marginTop: 25 }]} 
                            onPress={handleVerify}
                            disabled={isVerifying}
                        >
                            {isVerifying ? <ActivityIndicator color={PITO_COLORS.navyBg} /> : <Text style={styles.buttonText}>{t.btnVerify}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* BAŞARI MODALI */}
            <Modal visible={successModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <Animated.View style={[styles.successModernCard, { transform: [{ scale: scaleAnim }] }]}>
                        <View style={styles.successIconCircleModern}>
                            <Ionicons name="checkmark" size={40} color={PITO_COLORS.navyBg} />
                        </View>
                        <Text style={styles.successTitleModern}>{t.successTitle}</Text>
                        <Text style={styles.successSubModern}>{t.successMsg}</Text>
                        <TouchableOpacity 
                            style={styles.successButton}
                            onPress={() => {
                                setSuccessModalVisible(false);
                                navigation.navigate('Login');
                            }}
                        >
                            <Text style={styles.successButtonText}>{t.goLogin}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Modal>

            {/* EULA MODALI */}
            <Modal visible={eulaVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t.eula}</Text>
                            <TouchableOpacity onPress={() => setEulaVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={PITO_COLORS.grayText} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                            <Text style={styles.legalModalText}>
                                {language === 'TR' ? 
                                `1. GİRİŞ\nBu uygulamayı (Pito) kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız. Lütfen dikkatlice okuyunuz.\n\n2. HESAP GÜVENLİĞİ\nKullanıcılar hesaplarının güvenliğinden sorumludur. Şifrenizi kimseyle paylaşmayınız.\n\n3. İÇERİK POLİTİKASI\nUygulamada paylaşılan içerikler genel ahlak kurallarına uygun olmalıdır. Nefret söylemi, şiddet içeren veya yasa dışı içerikler yasaktır ve hesabın silinmesine neden olabilir.\n\n4. HİZMETİN KAPSAMI\nPito, hayvan sahiplerini ve veterinerleri bir araya getiren bir platformdur. Kullanıcılar arasındaki etkileşimlerden (sahiplendirme, eş bulma vb.) doğacak sorunlardan Pito sorumlu tutulamaz.\n\n5. ÜYELİK İPTALİ\nKullanıcılar diledikleri zaman hesaplarını silebilirler. Kurallara uymayan hesaplar Pito tarafından askıya alınabilir.` 
                                : 
                                `1. INTRODUCTION\nBy using this application (Pito), you agree to the following terms. Please read carefully.\n\n2. ACCOUNT SECURITY\nUsers are responsible for the security of their accounts. Do not share your password.\n\n3. CONTENT POLICY\nContent shared in the application must comply with general moral rules. Hate speech, violent, or illegal content is prohibited and may result in account deletion.\n\n4. SCOPE OF SERVICE\nPito is a platform connecting pet owners and vets. Pito is not responsible for issues arising from interactions between users.\n\n5. TERMINATION\nUsers can delete their accounts at any time. Accounts violating rules may be suspended by Pito.`}
                            </Text>
                        </ScrollView>
                        <TouchableOpacity style={[styles.button, {margin: 20}]} onPress={() => setEulaVisible(false)}>
                            <Text style={styles.buttonText}>{t.close}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* GİZLİLİK POLİTİKASI MODALI */}
            <Modal visible={privacyVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t.privacy}</Text>
                            <TouchableOpacity onPress={() => setPrivacyVisible(false)} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={PITO_COLORS.grayText} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
                            <Text style={styles.legalModalText}>
                                {language === 'TR' ? 
                                `1. TOPLANAN VERİLER\nKayıt olurken adınız, e-posta adresiniz ve konum bilgileriniz (İl/İlçe) toplanmaktadır.\n\n2. VERİLERİN KULLANIMI\nBu veriler, size en yakın ilanları göstermek ve uygulama içi iletişimi sağlamak amacıyla kullanılır.\n\n3. VERİ GÜVENLİĞİ\nKişisel verileriniz şifrelenerek saklanır ve yasal zorunluluklar dışında üçüncü şahıslarla paylaşılmaz.\n\n4. ÇEREZLER VE TAKİP\nUygulama performansını artırmak için anonim kullanım verileri toplanabilir.\n\n5. İLETİŞİM\nGizlilikle ilgili sorularınız için petspito@gmail.com adresinden bize ulaşabilirsiniz.` 
                                : 
                                `1. DATA COLLECTED\nWhen registering, your name, email address, and location (Province/District) are collected.\n\n2. USE OF DATA\nThis data is used to show you nearby listings and facilitate in-app communication.\n\n3. DATA SECURITY\nYour personal data is encrypted and stored, and is not shared with third parties except for legal obligations.\n\n4. COOKIES AND TRACKING\nAnonymous usage data may be collected to improve app performance.\n\n5. CONTACT\nFor privacy-related questions, contact us at petspito@gmail.com.`}
                            </Text>
                        </ScrollView>
                        <TouchableOpacity style={[styles.button, {margin: 20}]} onPress={() => setPrivacyVisible(false)}>
                            <Text style={styles.buttonText}>{t.close}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PITO_COLORS.navyBg },
    langSwitchContainer: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 10 },
    langBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: PITO_COLORS.navySurface, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: PITO_COLORS.navyLight },
    langText: { color: PITO_COLORS.cream, fontWeight: '600', marginLeft: 6, fontSize: 12 },
    
    header: { alignItems: 'center', marginTop: 10, marginBottom: 30 },
    logoPlaceholder: { width: 80, height: 80, backgroundColor: PITO_COLORS.navySurface, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: PITO_COLORS.primary },
    title: { fontSize: 28, fontWeight: '800', color: PITO_COLORS.cream, marginBottom: 8, letterSpacing: 0.5 },
    subtitle: { fontSize: 15, color: PITO_COLORS.grayText, fontWeight: '400' },

    form: { paddingHorizontal: 30 },
    inputContainer: { marginBottom: 20 },
    label: { fontSize: 13, color: PITO_COLORS.grayText, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: PITO_COLORS.navySurface, padding: 16, borderRadius: 16, fontSize: 16, color: PITO_COLORS.white, borderWidth: 1, borderColor: PITO_COLORS.navyLight },
    
    passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: PITO_COLORS.navySurface, borderRadius: 16, borderWidth: 1, borderColor: PITO_COLORS.navyLight, paddingRight: 10 },
    passwordInput: { flex: 1, padding: 16, fontSize: 16, color: PITO_COLORS.white },
    eyeIcon: { padding: 10 },

    checkboxContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 25, marginTop: 5 },
    checkbox: { marginRight: 10, marginTop: 2 },
    checkboxTextContainer: { flex: 1 },
    legalText: { fontSize: 13, color: PITO_COLORS.grayText, lineHeight: 20 },
    legalLink: { color: PITO_COLORS.primary, fontWeight: '600' },

    button: { backgroundColor: PITO_COLORS.primary, padding: 18, borderRadius: 16, alignItems: 'center', shadowColor: PITO_COLORS.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    buttonText: { color: PITO_COLORS.navyBg, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    
    linkButton: { marginTop: 25, alignItems: 'center' },
    linkText: { color: PITO_COLORS.grayText, fontSize: 14, fontWeight: '500' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 19, 30, 0.8)', justifyContent: 'flex-end', alignItems: 'center' },
    modalContent: { width: '100%', height: '70%', backgroundColor: PITO_COLORS.navySurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: PITO_COLORS.primary },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: PITO_COLORS.navyLight },
    modalTitle: { fontSize: 18, fontWeight: '700', color: PITO_COLORS.cream },
    closeBtn: { padding: 4 },
    modalBody: { paddingHorizontal: 25, paddingTop: 15 },
    
    modalItem: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: PITO_COLORS.navyLight, flexDirection: 'row', justifyContent: 'space-between' },
    modalItemText: { fontSize: 16, color: PITO_COLORS.cream },
    legalModalText: { fontSize: 15, color: PITO_COLORS.grayText, lineHeight: 24 },

    modalOverlayDark: { flex: 1, backgroundColor: 'rgba(11, 19, 30, 0.85)', justifyContent: 'center', alignItems: 'center' },
    verifyModalContentDark: { width: '85%', backgroundColor: PITO_COLORS.navySurface, borderRadius: 24, padding: 25, borderWidth: 1, borderColor: PITO_COLORS.primary },
    verifyModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    verifyModalTitle: { fontSize: 20, fontWeight: '700', color: PITO_COLORS.cream },
    verifyModalDesc: { textAlign: 'center', marginBottom: 25, color: PITO_COLORS.grayText, fontSize: 15, lineHeight: 22 },
    verifyInputDark: { backgroundColor: PITO_COLORS.navyBg, color: PITO_COLORS.white, textAlign: 'center', fontSize: 32, letterSpacing: 8, fontWeight: 'bold', paddingVertical: 15, borderRadius: 16, borderWidth: 1, borderColor: PITO_COLORS.navyLight },

    successModernCard: { backgroundColor: PITO_COLORS.navySurface, padding: 30, borderRadius: 24, alignItems: 'center', width: '80%', borderWidth: 1, borderColor: PITO_COLORS.primary },
    successIconCircleModern: { width: 64, height: 64, backgroundColor: PITO_COLORS.primary, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    successTitleModern: { fontSize: 20, fontWeight: '700', color: PITO_COLORS.cream, marginBottom: 8 },
    successSubModern: { fontSize: 15, color: PITO_COLORS.grayText, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    successButton: { backgroundColor: PITO_COLORS.primary, paddingVertical: 14, width: '100%', borderRadius: 14, alignItems: 'center' },
    successButtonText: { color: PITO_COLORS.navyBg, fontSize: 16, fontWeight: '900' }
});

export default RegisterScreen;