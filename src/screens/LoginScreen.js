import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator, ImageBackground, Modal, KeyboardAvoidingView, Platform, Animated, Easing } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { sendVerificationEmail } from '../utils/EmailService';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

const LoginScreen = ({ navigation }) => {
    const { login, isLoading, updateCountry, country: globalCountry, checkEmailExists, resetPassword } = useContext(AuthContext); 

    const [localCountry, setLocalCountry] = useState('TR'); 
    const [email, setEmail] = useState(''); 
    const [password, setPassword] = useState('');
    
    const [rememberMe, setRememberMe] = useState(false);

    // Şifre Göster/Gizle State'leri
    const [showPassword, setShowPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

    // --- ANİMASYON STATE'LERİ ---
    const [showSuccessAnim, setShowSuccessAnim] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current; 
    const scaleAnim = useRef(new Animated.Value(0.5)).current; 
    const checkAnim = useRef(new Animated.Value(0)).current;

    // --- ŞİFREMI UNUTTUM STATE'LERİ ---
    const [fpModalVisible, setFpModalVisible] = useState(false);
    const [fpStep, setFpStep] = useState(1);
    const [fpEmail, setFpEmail] = useState('');
    const [fpCode, setFpCode] = useState('');
    const [generatedCode, setGeneratedCode] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isResetting, setIsResetting] = useState(false); 

    useEffect(() => {
        if(globalCountry?.code) {
            setLocalCountry(globalCountry.code);
        }
        loadRememberedUser(); 
    }, [globalCountry]);

    const loadRememberedUser = async () => {
        try {
            const savedCreds = await AsyncStorage.getItem('rememberedUser');
            if (savedCreds) {
                const { email: savedEmail, password: savedPass } = JSON.parse(savedCreds);
                setEmail(savedEmail);
                setPassword(savedPass);
                setRememberMe(true);
            }
        } catch (error) {
            // Log temizlendi
        }
    };

    const TEXTS = {
        TR: {
            title: "Tekrar Hoşgeldin!",
            subtitle: "Pito hesabına giriş yap.",
            labelUser: "E-posta Adresi", 
            labelPass: "Şifre",
            btnLogin: "Giriş Yap",
            linkRegister: "Hesabın yok mu? Kayıt Ol",
            linkForgot: "Şifremi Unuttum",
            errFill: "Lütfen e-posta ve şifrenizi giriniz.", 
            errFail: "Giriş Başarısız",
            fpTitle: "Şifre Sıfırlama",
            fpStep1: "E-posta adresini gir, sana bir kod gönderelim.",
            fpStep2: "E-postana gelen 6 haneli kodu gir.",
            fpStep3: "Yeni şifreni belirle.",
            btnSend: "Kod Gönder",
            btnVerify: "Doğrula",
            btnReset: "Şifreyi Güncelle",
            errEmail: "Bu e-posta adresi kayıtlı değil.",
            errCode: "Hatalı kod!",
            errMatch: "Şifreler uyuşmuyor!",
            successReset: "Şifren başarıyla güncellendi! Şimdi giriş yapabilirsin.",
            welcomeBack: "Hoşgeldin,",
            successLogin: "Giriş Başarılı!",
            rememberMe: "Beni Hatırla"
        },
        AU: {
            title: "Welcome Back!",
            subtitle: "Login to your Pito account.",
            labelUser: "E-mail Address", 
            labelPass: "Password",
            btnLogin: "Login",
            linkRegister: "Don't have an account? Sign Up",
            linkForgot: "Forgot Password?",
            errFill: "Please enter your email and password.", 
            errFail: "Login Failed",
            fpTitle: "Reset Password",
            fpStep1: "Enter your email to receive a verification code.",
            fpStep2: "Enter the 6-digit code sent to your email.",
            fpStep3: "Set your new password.",
            btnSend: "Send Code",
            btnVerify: "Verify",
            btnReset: "Update Password",
            errEmail: "This email is not registered.",
            errCode: "Invalid code!",
            errMatch: "Passwords do not match!",
            successReset: "Password updated successfully! You can login now.",
            welcomeBack: "Welcome back,",
            successLogin: "Login Successful!",
            rememberMe: "Remember Me"
        }
    };

    const t = TEXTS[localCountry];

    const handleCountrySwitch = (code) => {
        setLocalCountry(code);
        updateCountry(code === 'TR' ? { name: 'Türkiye', code: 'TR', flag: '🇹🇷' } : { name: 'Australia', code: 'AU', flag: '🇦🇺' });
    };

    const handleLogin = async () => {
        const cleanEmail = email ? email.trim() : "";
        const cleanPassword = password ? password : ""; 

        if (!cleanEmail || !cleanPassword) {
            Alert.alert(localCountry === 'TR' ? "Hata" : "Error", t.errFill);
            return;
        }
        
        const result = await login(cleanEmail, cleanPassword);

        if (result.success) {
            if (rememberMe) {
                await AsyncStorage.setItem('rememberedUser', JSON.stringify({ email: cleanEmail, password: cleanPassword }));
            } else {
                await AsyncStorage.removeItem('rememberedUser');
            }

            setShowSuccessAnim(true);
            
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    useNativeDriver: true,
                })
            ]).start(() => {
                Animated.spring(checkAnim, {
                    toValue: 1,
                    friction: 4,
                    tension: 40,
                    useNativeDriver: true
                }).start();
            });

            setTimeout(() => {
                navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
            }, 2200); 

        } else {
            Alert.alert(t.errFail, result.message);
        }
    };

    const handleSendCode = async () => {
        const cleanFpEmail = fpEmail ? fpEmail.trim() : "";

        if (!cleanFpEmail) return;
        const exists = await checkEmailExists(cleanFpEmail); 
        if (!exists) {
            Alert.alert("Hata", t.errEmail);
            return;
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedCode(code);
        setIsSending(true);
        const response = await sendVerificationEmail(cleanFpEmail, "Kullanıcı", code);
        setIsSending(false);
        if (response.success) {
            setFpStep(2);
        } else {
            Alert.alert("Hata", "Mail gönderilemedi.");
        }
    };

    const handleVerifyCode = () => {
        if (fpCode === generatedCode) {
            setFpStep(3);
        } else {
            Alert.alert("Hata", t.errCode);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || !confirmNewPassword) {
            Alert.alert("Hata", "Lütfen tüm alanları doldurunuz.");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            Alert.alert("Hata", t.errMatch);
            return;
        }

        setIsResetting(true);
        const cleanFpEmail = fpEmail ? fpEmail.trim() : "";
        const result = await resetPassword(cleanFpEmail, newPassword);
        setIsResetting(false);

        if (result.success) {
            Alert.alert("Başarılı", t.successReset, [
                { text: "OK", onPress: () => {
                    setFpModalVisible(false);
                    setFpStep(1);
                    setFpEmail('');
                    setFpCode('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setEmail(cleanFpEmail);
                    setPassword('');
                }}
            ]);
        } else {
            Alert.alert("Hata", result.message || "Güncelleme yapılamadı.");
        }
    };

    return (
        <ImageBackground 
            source={{ uri: 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?q=80&w=2070&auto=format&fit=crop' }} 
            style={styles.backgroundImage}
        >
            <View style={styles.overlay}>
                <SafeAreaView style={styles.container}>
                
                <View style={styles.countrySwitchContainer}>
                    <TouchableOpacity 
                        style={[styles.countryBtn, localCountry === 'TR' && styles.countryBtnActive]} 
                        onPress={() => handleCountrySwitch('TR')}
                    >
                        <Text style={styles.flag}>🇹🇷</Text>
                        <Text style={[styles.countryText, localCountry === 'TR' && styles.countryTextActive]}>TR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.countryBtn, localCountry === 'AU' && styles.countryBtnActive]} 
                        onPress={() => handleCountrySwitch('AU')}
                    >
                        <Text style={styles.flag}>🇦🇺</Text>
                        <Text style={[styles.countryText, localCountry === 'AU' && styles.countryTextActive]}>AU</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t.title}</Text>
                        <Text style={styles.subtitle}>{t.subtitle}</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t.labelUser}</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="ornek@email.com"
                                placeholderTextColor="#aaa"
                                autoCapitalize="none"
                                keyboardType="email-address" 
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>{t.labelPass}</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput 
                                    style={styles.passwordInput} 
                                    placeholder="******"
                                    placeholderTextColor="#aaa"
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.optionsRow}>
                            <TouchableOpacity style={styles.rememberMeContainer} onPress={() => setRememberMe(!rememberMe)}>
                                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                                    {rememberMe && <Ionicons name="checkmark" size={14} color="white" />}
                                </View>
                                <Text style={styles.rememberMeText}>{t.rememberMe}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setFpModalVisible(true)}>
                                <Text style={styles.forgotText}>{t.linkForgot}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            style={styles.button}
                            onPress={handleLogin} 
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.buttonText}>{t.btnLogin}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.linkButton}
                            onPress={() => navigation.navigate('Register')}
                        >
                            <Text style={styles.linkText}>{t.linkRegister}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* GİRİŞ BAŞARILI EKRANI */}
                {showSuccessAnim && (
                    <View style={styles.successOverlayAbsolute}>
                        <Animated.View style={[styles.successModernCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                            <Animated.View style={[styles.successIconCircleModern, { transform: [{ scale: checkAnim }] }]}>
                                <Ionicons name="checkmark" size={50} color="white" />
                            </Animated.View>
                            <Text style={styles.successTitleModern}>{t.successLogin}</Text>
                            <Text style={styles.successSubModern}>{t.welcomeBack} {email.trim()}!</Text>
                        </Animated.View>
                    </View>
                )}

                {/* ŞİFRE SIFIRLAMA MODALI */}
                <Modal visible={fpModalVisible} transparent={true} animationType="fade">
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <View style={{flexDirection:'row', alignItems:'center'}}>
                                    <Ionicons name="lock-closed-outline" size={24} color="#6200EE" style={{marginRight:8}} />
                                    <Text style={styles.modalTitle}>{t.fpTitle}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setFpModalVisible(false)} style={styles.closeBtn}>
                                    <Ionicons name="close" size={20} color="#555" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalBody}>
                                {fpStep === 1 && (
                                    <>
                                        <Text style={styles.modalDesc}>{t.fpStep1}</Text>
                                        <TextInput 
                                            style={styles.modalInput} 
                                            placeholder="E-mail" 
                                            placeholderTextColor="#999"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            value={fpEmail}
                                            onChangeText={setFpEmail}
                                        />
                                        <TouchableOpacity style={styles.modalBtn} onPress={handleSendCode} disabled={isSending}>
                                            {isSending ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t.btnSend}</Text>}
                                        </TouchableOpacity>
                                    </>
                                )}

                                {fpStep === 2 && (
                                    <>
                                        <Text style={styles.modalDesc}>{t.fpStep2}</Text>
                                        <TextInput 
                                            style={[styles.modalInput, { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight:'bold' }]} 
                                            placeholder="XXXXXX" 
                                            placeholderTextColor="#ddd"
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            value={fpCode}
                                            onChangeText={setFpCode}
                                        />
                                        <TouchableOpacity style={styles.modalBtn} onPress={handleVerifyCode}>
                                            <Text style={styles.buttonText}>{t.btnVerify}</Text>
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
                                                placeholderTextColor="#999"
                                                secureTextEntry={!showNewPassword}
                                                value={newPassword}
                                                onChangeText={setNewPassword}
                                            />
                                            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                                                <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#666" />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.passwordContainerModal}>
                                            <TextInput 
                                                style={styles.passwordInputModal} 
                                                placeholder="Yeni Şifre (Tekrar)" 
                                                placeholderTextColor="#999"
                                                secureTextEntry={!showConfirmNewPassword}
                                                value={confirmNewPassword}
                                                onChangeText={setConfirmNewPassword}
                                            />
                                            <TouchableOpacity onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)} style={styles.eyeIcon}>
                                                <Ionicons name={showConfirmNewPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#666" />
                                            </TouchableOpacity>
                                        </View>

                                        <TouchableOpacity 
                                            style={{ backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 }} 
                                            onPress={handleResetPassword}
                                            disabled={isResetting}
                                        >
                                            {isResetting ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{t.btnReset}</Text>}
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                </SafeAreaView>
            </View>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    backgroundImage: { flex: 1, width: '100%', height: '100%' },
    overlay: { flex: 1, backgroundColor: 'rgba(243, 229, 245, 0.85)' }, 
    container: { flex: 1 },
    countrySwitchContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    countryBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', marginHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.8)' },
    countryBtnActive: { borderColor: '#6200EE', backgroundColor: '#F3E5F5' },
    flag: { fontSize: 20, marginRight: 5 },
    countryText: { fontWeight: 'bold', color: '#666' },
    countryTextActive: { color: '#6200EE' },
    contentContainer: { flex: 1, justifyContent: 'center' },
    header: { marginBottom: 30, paddingHorizontal: 30 },
    title: { fontSize: 36, fontWeight: 'bold', color: '#3700B3', marginBottom: 5 },
    subtitle: { fontSize: 18, color: '#7E57C2' },
    form: { paddingHorizontal: 30 },
    inputContainer: { marginBottom: 15 },
    label: { fontSize: 16, color: '#3700B3', marginBottom: 8, fontWeight: '700' },
    input: { backgroundColor: 'white', padding: 15, borderRadius: 15, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0', shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: "#000",
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        paddingRight: 10
    },
    passwordInput: {
        flex: 1,
        padding: 15,
        fontSize: 16,
        color: '#333', // ÇÖZÜM: Metin rengi eklendi
    },
    eyeIcon: {
        padding: 5,
    },

    optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    rememberMeContainer: { flexDirection: 'row', alignItems: 'center' },
    checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: '#7E57C2', marginRight: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    checkboxChecked: { backgroundColor: '#6200EE', borderColor: '#6200EE' },
    rememberMeText: { color: '#7E57C2', fontSize: 14, fontWeight: '500' },
    forgotText: { color: '#6200EE', fontSize: 14, fontWeight: '600' },

    button: { backgroundColor: '#6200EE', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10, elevation: 5, shadowColor: '#6200EE', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 5 },
    buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    linkButton: { marginTop: 20, alignItems: 'center' },
    linkText: { color: '#6200EE', fontSize: 16, fontWeight: '600' },
    
    successOverlayAbsolute: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 999, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    successModernCard: { backgroundColor: 'white', paddingVertical: 40, paddingHorizontal: 50, borderRadius: 30, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOffset: {width:0, height:10}, shadowOpacity: 0.3, shadowRadius: 20 },
    successIconCircleModern: { width: 80, height: 80, backgroundColor: '#4CAF50', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 10, shadowColor: '#4CAF50', shadowOffset: {width:0, height:5}, shadowOpacity: 0.5, shadowRadius: 10 },
    successTitleModern: { fontSize: 26, fontWeight: 'bold', color: '#3700B3', marginBottom: 10 },
    successSubModern: { fontSize: 18, color: '#666', fontWeight: '500' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 25, padding: 0, elevation: 20, shadowColor: '#000', shadowOffset: {width:0,height:5}, shadowOpacity:0.3, shadowRadius:10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#f9f9f9', borderTopLeftRadius: 25, borderTopRightRadius: 25 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#3700B3' },
    closeBtn: { padding: 5, backgroundColor: '#eee', borderRadius: 20 },
    modalBody: { padding: 25 },
    modalDesc: { fontSize: 15, color: '#666', marginBottom: 20, lineHeight: 22 },
    
    modalInput: { backgroundColor: '#F5F7FA', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E1E8ED', fontSize: 16, marginBottom: 15, color: '#333' },
    passwordContainerModal: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F7FA',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E1E8ED',
        marginBottom: 15,
        paddingRight: 10
    },
    passwordInputModal: {
        flex: 1,
        padding: 16,
        fontSize: 16,
        color: '#333'
    },
    modalBtn: { backgroundColor: '#6200EE', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 5, elevation: 3 }
});

export default LoginScreen;