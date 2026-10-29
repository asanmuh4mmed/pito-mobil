import React, { useState, useContext, useEffect, useRef } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, 
    Modal, KeyboardAvoidingView, Platform, Animated, StatusBar
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

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

const LoginScreen = ({ navigation }) => {
    const { login, isLoading } = useContext(AuthContext); 

    const [language, setLanguage] = useState('TR'); 
    
    const [email, setEmail] = useState(''); 
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

    const [showSuccessAnim, setShowSuccessAnim] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current; 
    const scaleAnim = useRef(new Animated.Value(0.8)).current; 

    const [fpModalVisible, setFpModalVisible] = useState(false);
    const [fpStep, setFpStep] = useState(1);
    const [fpEmail, setFpEmail] = useState('');
    const [fpCode, setFpCode] = useState('');
    const recoveryClient = useRef(null);
    const recoveryEmail = useRef('');
    const recoveredId = useRef(null);
    const busyRef = useRef(false);
    const mounted = useRef(true);
    const loginLock = useRef(false);
    const [loginBusy, setLoginBusy] = useState(false);
    const loginTimer = useRef(null);
    const getRecoveryClient = () => {
        if (!recoveryClient.current) {
            recoveryClient.current = createClient(
                process.env.EXPO_PUBLIC_SUPABASE_URL,
                process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
                { auth: { persistSession: false, autoRefreshToken: false,
                    detectSessionInUrl: false, storageKey: 'pito-recovery-memory' } }
            );
        }
        return recoveryClient.current;
    };
    const closeRecovery = () => {
        if (busyRef.current) return;
        const client = recoveryClient.current;
        recoveryClient.current = null;
        recoveredId.current = null;
        recoveryEmail.current = '';
        if (client) client.auth.signOut({ scope: 'local' }).catch(() => {});
        setFpModalVisible(false); setFpStep(1); setFpEmail(''); setFpCode('');
        setNewPassword(''); setConfirmNewPassword('');
    };
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            clearTimeout(loginTimer.current);
            recoveryClient.current?.auth.signOut({ scope: 'local' }).catch(() => {});
        };
    }, []);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isResetting, setIsResetting] = useState(false); 

    useEffect(() => {
        loadRememberedUser(); 
    }, []);

    const loadRememberedUser = async () => {
        try {
            const savedCreds = await AsyncStorage.getItem('rememberedUser');
            if (savedCreds) {
                const { email: savedEmail } = JSON.parse(savedCreds);
                if (typeof savedEmail !== 'string') return;
                await AsyncStorage.setItem('rememberedUser', JSON.stringify({ email: savedEmail }));
                if (!mounted.current) return;
                setEmail(savedEmail);
                setRememberMe(true);
            }
        } catch (error) {}
    };

    const TEXTS = {
        TR: {
            title: "Hoş Geldiniz",
            subtitle: "Pito hesabınızla devam edin",
            labelUser: "E-posta Adresi", 
            labelPass: "Şifre",
            btnLogin: "Giriş Yap",
            linkRegister: "Hesabınız yok mu? Kayıt Olun",
            linkForgot: "Şifremi Unuttum",
            errFill: "Lütfen e-posta ve şifrenizi giriniz.", 
            errFail: "Giriş Başarısız",
            fpTitle: "Şifre Sıfırlama",
            fpStep1: "Kayıtlı e-posta adresinize şifre kurtarma kodu gönderilecektir.",
            fpStep2: "E-postanıza gelen doğrulama kodunu girin.",
            fpStep3: "Yeni şifrenizi belirleyin.",
            btnSend: "Kod Gönder",
            btnVerify: "Doğrula",
            btnReset: "Şifreyi Güncelle",
            errEmail: "Bu e-posta adresi kayıtlı değil.",
            errCode: "Kod geçersiz veya süresi dolmuş.",
            errMatch: "Şifreler uyuşmuyor!",
            successReset: "Şifreniz başarıyla güncellendi! Şimdi giriş yapabilirsiniz.",
            welcomeBack: "Hoşgeldiniz,",
            successLogin: "Giriş Başarılı!",
            rememberMe: "E-postamı Hatırla",
            errTitle: "Hata",
            successTitle: "Başarılı",
            errMailSend: "Mail gönderilemedi.",
            errUpdate: "Güncelleme yapılamadı."
        },
        EN: {
            title: "Welcome Back",
            subtitle: "Continue with your Pito account",
            labelUser: "Email Address", 
            labelPass: "Password",
            btnLogin: "Sign In",
            linkRegister: "Don't have an account? Sign Up",
            linkForgot: "Forgot Password?",
            errFill: "Please enter your email and password.", 
            errFail: "Login Failed",
            fpTitle: "Reset Password",
            fpStep1: "Enter your email to receive a verification code.",
            fpStep2: "Enter the verification code sent to your email.",
            fpStep3: "Set your new password.",
            btnSend: "Send Code",
            btnVerify: "Verify",
            btnReset: "Update Password",
            errEmail: "This email is not registered.",
            errCode: "Invalid or expired code!",
            errMatch: "Passwords do not match!",
            successReset: "Password updated successfully! You can login now.",
            welcomeBack: "Welcome back,",
            successLogin: "Login Successful!",
            rememberMe: "Remember Email",
            errTitle: "Error",
            successTitle: "Success",
            errMailSend: "Could not send email.",
            errUpdate: "Update failed."
        }
    };

    const t = TEXTS[language];

    const handleLogin = async () => {
        if (loginLock.current) return;
        const cleanEmail = email ? email.trim() : "";
        const cleanPassword = password ? password : ""; 

        if (!cleanEmail || !cleanPassword) {
            Alert.alert(t.errTitle, t.errFill);
            return;
        }
        
        loginLock.current = true; setLoginBusy(true);
        let result;
        try { result = await login(cleanEmail, cleanPassword); }
        catch (error) { result = { success: false, message: error.message }; }
        if (!mounted.current) return;

        if (result.success) {
            try {
            if (rememberMe) {
                await AsyncStorage.setItem('rememberedUser', JSON.stringify({ email: cleanEmail }));
            } else {
                await AsyncStorage.removeItem('rememberedUser');
            }
            } catch { /* Sign-in is independent of remembered email storage. */ }

            setShowSuccessAnim(true);
            
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true })
            ]).start();

            loginTimer.current = setTimeout(() => {
                navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
            }, 1500); 

        } else {
            loginLock.current = false; setLoginBusy(false);
            Alert.alert(t.errFail, result.message);
        }
    };

    const handleSendCode = async () => {
        if (busyRef.current) return;
        const target = fpEmail.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
            Alert.alert(t.errTitle, language === 'TR' ? 'Geçerli bir e-posta adresi girin.' : 'Enter a valid email address.');
            return;
        }
        busyRef.current = true; setIsSending(true);
        try {
            const client = getRecoveryClient();
            const { error } = await client.auth.resetPasswordForEmail(target);
            if (error) throw error;
            recoveryEmail.current = target; recoveredId.current = null;
            if (mounted.current) { setFpCode(''); setFpStep(2); }
        } catch (error) {
            if (mounted.current) Alert.alert(t.errTitle, error.message || t.errMailSend);
        } finally {
            busyRef.current = false;
            if (mounted.current) setIsSending(false);
        }
    };

    const handleVerifyCode = async () => {
        if (busyRef.current) return;
        const token = fpCode.replace(/\s/g, '');
        if (!/^\d{6,10}$/.test(token) || !recoveryEmail.current) {
            Alert.alert(t.errTitle, t.errCode); return;
        }
        busyRef.current = true; setIsSending(true);
        try {
            const { data, error } = await getRecoveryClient().auth.verifyOtp({
                email: recoveryEmail.current, token, type: 'recovery',
            });
            if (error || !data?.session || !data?.user) throw new Error(t.errCode);
            recoveredId.current = data.user.id;
            if (mounted.current) { setFpCode(''); setFpStep(3); }
        } catch (error) {
            recoveredId.current = null;
            if (mounted.current) Alert.alert(t.errTitle, error.message || t.errCode);
        } finally {
            busyRef.current = false;
            if (mounted.current) setIsSending(false);
        }
    };

    const handleResetPassword = async () => {
        if (busyRef.current) return;
        if (!newPassword || newPassword.length < 8) {
            Alert.alert(t.errTitle, language === 'TR' ? 'En az 8 karakterli bir şifre belirleyin.' : 'Use at least 8 characters.'); return;
        }
        if (newPassword !== confirmNewPassword) { Alert.alert(t.errTitle, t.errMatch); return; }
        if (!recoveredId.current) { Alert.alert(t.errTitle, t.errCode); return; }
        busyRef.current = true; setIsResetting(true);
        let completed = false;
        const target = recoveryEmail.current;
        try {
            const client = getRecoveryClient();
            const { data: verified, error: identityError } = await client.auth.getUser();
            if (identityError || verified?.user?.id !== recoveredId.current) throw new Error(t.errCode);
            const { data, error } = await client.auth.updateUser({ password: newPassword });
            if (error) throw error;
            if (data?.user?.id !== recoveredId.current) throw new Error(t.errUpdate);
            completed = true;
        } catch (error) {
            if (mounted.current) Alert.alert(t.errTitle, error.message || t.errUpdate);
        } finally {
            busyRef.current = false;
            if (mounted.current) setIsResetting(false);
        }
        if (completed && mounted.current) {
            closeRecovery();
            setEmail(target); setPassword('');
            Alert.alert(t.successTitle, t.successReset);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={PITO_COLORS.navyBg} />
            
            <View style={styles.langSwitchContainer}>
                <TouchableOpacity style={styles.langBtn} onPress={() => setLanguage(language === 'TR' ? 'EN' : 'TR')}>
                    <Ionicons name="globe-outline" size={18} color={PITO_COLORS.grayText} />
                    <Text style={styles.langText}>{language}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.header}>
                    <View style={styles.logoPlaceholder}>
                        <Ionicons name="paw" size={40} color={PITO_COLORS.primary} />
                    </View>
                    <Text style={styles.title}>{t.title}</Text>
                    <Text style={styles.subtitle}>{t.subtitle}</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t.labelUser}</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="mail@ornek.com"
                            placeholderTextColor={PITO_COLORS.grayText}
                            autoCapitalize="none"
                            keyboardType="email-address" 
                            value={email}
                            onChangeText={setEmail}
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

                    <View style={styles.optionsRow}>
                        <TouchableOpacity style={styles.rememberMeContainer} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.8}>
                            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                {rememberMe && <Ionicons name="checkmark" size={12} color={PITO_COLORS.navyBg} />}
                            </View>
                            <Text style={styles.rememberMeText}>{t.rememberMe}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setFpModalVisible(true)} activeOpacity={0.7}>
                            <Text style={styles.forgotText}>{t.linkForgot}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={[styles.button, (!email || !password) && styles.buttonDisabled]}
                        onPress={handleLogin} 
                        disabled={isLoading || loginBusy || !email || !password}
                        activeOpacity={0.8}
                    >
                        {isLoading || loginBusy ? (
                            <ActivityIndicator color={PITO_COLORS.navyBg} />
                        ) : (
                            <Text style={styles.buttonText}>{t.btnLogin}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
                        <Text style={styles.linkText}>{t.linkRegister}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* GİRİŞ BAŞARILI EKRANI (MİNİMAL) */}
            {showSuccessAnim && (
                <View style={styles.successOverlayAbsolute}>
                    <Animated.View style={[styles.successModernCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                        <View style={styles.successIconCircleModern}>
                            <Ionicons name="checkmark" size={40} color={PITO_COLORS.navyBg} />
                        </View>
                        <Text style={styles.successTitleModern}>{t.successLogin}</Text>
                    </Animated.View>
                </View>
            )}

            {/* ŞİFRE SIFIRLAMA MODALI (SADELEŞTİRİLMİŞ) */}
            <Modal visible={fpModalVisible} transparent={true} animationType="fade" onRequestClose={closeRecovery}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t.fpTitle}</Text>
                            <TouchableOpacity onPress={closeRecovery} disabled={isSending || isResetting} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={PITO_COLORS.grayText} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            {fpStep === 1 && (
                                <>
                                    <Text style={styles.modalDesc}>{t.fpStep1}</Text>
                                    <TextInput 
                                        style={styles.modalInput} 
                                        placeholder="E-mail" 
                                        placeholderTextColor={PITO_COLORS.grayText}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={fpEmail}
                                        onChangeText={setFpEmail}
                                        selectionColor={PITO_COLORS.primary}
                                    />
                                    <TouchableOpacity style={styles.modalBtn} onPress={handleSendCode} disabled={isSending}>
                                        {isSending ? <ActivityIndicator color={PITO_COLORS.navyBg} /> : <Text style={styles.modalBtnText}>{t.btnSend}</Text>}
                                    </TouchableOpacity>
                                </>
                            )}

                            {fpStep === 2 && (
                                <>
                                    <Text style={styles.modalDesc}>{t.fpStep2}</Text>
                                    <TextInput 
                                        style={[styles.modalInput, { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight:'bold' }]} 
                                        placeholder="••••••" 
                                        placeholderTextColor={PITO_COLORS.navyLight}
                                        keyboardType="number-pad"
                                        maxLength={10}
                                        value={fpCode}
                                        onChangeText={value => setFpCode(value.replace(/[^0-9]/g, ''))}
                                        selectionColor={PITO_COLORS.primary}
                                    />
                                    <TouchableOpacity style={styles.modalBtn} onPress={handleVerifyCode} disabled={isSending}>
                                        {isSending ? <ActivityIndicator color={PITO_COLORS.navyBg} /> : <Text style={styles.modalBtnText}>{t.btnVerify}</Text>}
                                    </TouchableOpacity>
                                </>
                            )}

                            {fpStep === 3 && (
                                <>
                                    <Text style={styles.modalDesc}>{t.fpStep3}</Text>
                                    <View style={styles.passwordContainerModal}>
                                        <TextInput 
                                            style={styles.passwordInputModal} 
                                            placeholder="Yeni Şifre" 
                                            placeholderTextColor={PITO_COLORS.grayText}
                                            secureTextEntry={!showNewPassword}
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            selectionColor={PITO_COLORS.primary}
                                        />
                                        <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                                            <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={20} color={PITO_COLORS.grayText} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.passwordContainerModal}>
                                        <TextInput 
                                            style={styles.passwordInputModal} 
                                            placeholder="Yeni Şifre (Tekrar)" 
                                            placeholderTextColor={PITO_COLORS.grayText}
                                            secureTextEntry={!showConfirmNewPassword}
                                            value={confirmNewPassword}
                                            onChangeText={setConfirmNewPassword}
                                            selectionColor={PITO_COLORS.primary}
                                        />
                                        <TouchableOpacity onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)} style={styles.eyeIcon}>
                                            <Ionicons name={showConfirmNewPassword ? "eye-off-outline" : "eye-outline"} size={20} color={PITO_COLORS.grayText} />
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity style={styles.modalBtn} onPress={handleResetPassword} disabled={isResetting}>
                                        {isResetting ? <ActivityIndicator color={PITO_COLORS.navyBg} /> : <Text style={styles.modalBtnText}>{t.btnReset}</Text>}
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PITO_COLORS.navyBg }, 
    langSwitchContainer: { flexDirection: 'row', justifyContent: 'flex-end', padding: 20 },
    langBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: PITO_COLORS.navySurface, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: PITO_COLORS.navyLight },
    langText: { color: PITO_COLORS.cream, fontWeight: '600', marginLeft: 6, fontSize: 12 },
    
    contentContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 50 },
    header: { marginBottom: 40, alignItems: 'center' },
    logoPlaceholder: { width: 80, height: 80, backgroundColor: PITO_COLORS.navySurface, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: PITO_COLORS.primary },
    title: { fontSize: 28, fontWeight: '800', color: PITO_COLORS.cream, marginBottom: 8, letterSpacing: 0.5 },
    subtitle: { fontSize: 15, color: PITO_COLORS.grayText, fontWeight: '400' },
    
    form: { width: '100%' },
    inputContainer: { marginBottom: 20 },
    label: { fontSize: 13, color: PITO_COLORS.grayText, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: PITO_COLORS.navySurface, padding: 16, borderRadius: 16, fontSize: 16, color: PITO_COLORS.white, borderWidth: 1, borderColor: PITO_COLORS.navyLight },
    
    passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: PITO_COLORS.navySurface, borderRadius: 16, borderWidth: 1, borderColor: PITO_COLORS.navyLight, paddingRight: 10 },
    passwordInput: { flex: 1, padding: 16, fontSize: 16, color: PITO_COLORS.white },
    eyeIcon: { padding: 10 },

    optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, marginTop: 5 },
    rememberMeContainer: { flexDirection: 'row', alignItems: 'center' },
    checkbox: { width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, borderColor: PITO_COLORS.grayText, marginRight: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
    checkboxChecked: { backgroundColor: PITO_COLORS.primary, borderColor: PITO_COLORS.primary },
    rememberMeText: { color: PITO_COLORS.grayText, fontSize: 13, fontWeight: '500' },
    forgotText: { color: PITO_COLORS.primary, fontSize: 13, fontWeight: '600' },

    button: { backgroundColor: PITO_COLORS.primary, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: PITO_COLORS.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    buttonDisabled: { backgroundColor: PITO_COLORS.navyLight, shadowOpacity: 0, elevation: 0 },
    buttonText: { color: PITO_COLORS.navyBg, fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    
    linkButton: { marginTop: 25, alignItems: 'center' },
    linkText: { color: PITO_COLORS.grayText, fontSize: 14, fontWeight: '500' },
    
    successOverlayAbsolute: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 999, backgroundColor: 'rgba(11, 19, 30, 0.85)', justifyContent: 'center', alignItems: 'center' },
    successModernCard: { backgroundColor: PITO_COLORS.navySurface, padding: 30, borderRadius: 24, alignItems: 'center', width: '70%', borderWidth: 1, borderColor: PITO_COLORS.primary },
    successIconCircleModern: { width: 64, height: 64, backgroundColor: PITO_COLORS.primary, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    successTitleModern: { fontSize: 18, fontWeight: '700', color: PITO_COLORS.cream },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 19, 30, 0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: PITO_COLORS.navySurface, borderRadius: 24, padding: 0, borderWidth: 1, borderColor: PITO_COLORS.primary },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: PITO_COLORS.navyLight },
    modalTitle: { fontSize: 18, fontWeight: '700', color: PITO_COLORS.cream },
    closeBtn: { padding: 4 },
    modalBody: { padding: 25 },
    modalDesc: { fontSize: 14, color: PITO_COLORS.grayText, marginBottom: 20, lineHeight: 20 },
    
    modalInput: { backgroundColor: PITO_COLORS.navyBg, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: PITO_COLORS.navyLight, fontSize: 16, marginBottom: 15, color: PITO_COLORS.white },
    passwordContainerModal: { flexDirection: 'row', alignItems: 'center', backgroundColor: PITO_COLORS.navyBg, borderRadius: 14, borderWidth: 1, borderColor: PITO_COLORS.navyLight, marginBottom: 15, paddingRight: 10 },
    passwordInputModal: { flex: 1, padding: 16, fontSize: 16, color: PITO_COLORS.white },
    modalBtn: { backgroundColor: PITO_COLORS.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10 },
    modalBtnText: { color: PITO_COLORS.navyBg, fontSize: 16, fontWeight: '900' }
});

export default LoginScreen;