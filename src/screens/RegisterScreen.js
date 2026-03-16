import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, FlatList, ImageBackground, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { AuthContext } from '../context/AuthContext';
import { CITY_DATA } from '../constants/cities'; 

const RegisterScreen = ({ navigation }) => {
  const { register, verifyEmail, isLoading, updateCountry } = useContext(AuthContext);

  // --- STATE'LER ---
  const [localCountry, setLocalCountry] = useState('TR');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Şifre Göster/Gizle State'leri (YENİ)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Lokasyon State'leri
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');

  // Modal Kontrolleri
  const [modalVisible, setModalVisible] = useState(false);
  const [selectionType, setSelectionType] = useState(null); 
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [userCode, setUserCode] = useState(''); 
  const [isVerifying, setIsVerifying] = useState(false); 

  // Başarı Modalı Kontrolleri
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Yasal Metin Modalları & Checkbox
  const [eulaVisible, setEulaVisible] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [isAgreed, setIsAgreed] = useState(false); 

  // --- ANİMASYON ETKİLEŞİMİ ---
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

  // --- DİL PAKETİ ---
  const TEXTS = {
      TR: {
          title: "Aramıza Katıl!",
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
          goLogin: "Giriş Yap"
      },
      AU: {
          title: "Join Us!",
          subtitle: "Create an account to find your best friends.",
          labelUser: "Username",
          labelName: "Full Name",
          labelEmail: "Email",
          labelPass: "Password",
          labelPassConfirm: "Confirm Password",
          labelCity: "Select State",
          labelDistrict: "Select Suburb",
          btnRegister: "Sign Up",
          linkLogin: "Already have an account? Login",
          errFill: "Please fill in all fields.",
          errSpace: "Username cannot contain spaces.",
          errPass: "Passwords do not match.",
          errAgreed: "Please read and accept the Terms of Use and Privacy Policy to register.", 
          successTitle: "Congratulations! 🎉",
          successMsg: "Account verified successfully. You can login now.",
          modalCity: "Select State",
          modalDistrict: "Select Suburb",
          city: "State",
          dist: "Suburb",
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
          goLogin: "Login"
      }
  };

  const t = TEXTS[localCountry]; 

  // --- LOGIC ---
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
          Alert.alert(localCountry === 'TR' ? "Uyarı" : "Warning", localCountry === 'TR' ? "Önce şehir seçmelisiniz." : "Please select a state first.");
          return;
      }
      setSelectionType(type);
      setModalVisible(true);
  };

  const getListData = () => {
      const countryData = CITY_DATA[localCountry] || {};
      if (selectionType === 'city') {
          return Object.keys(countryData).sort();
      } else {
          return countryData[city]?.sort() || [];
      }
  };

  const handleCountrySwitch = (code) => {
      setLocalCountry(code);
      setCity('');
      setDistrict('');
      updateCountry(code === 'TR' ? { name: 'Türkiye', code: 'TR', flag: '🇹🇷' } : { name: 'Australia', code: 'AU', flag: '🇦🇺' });
  };

  const handleUsernameChange = (text) => {
      const formattedText = text.replace(/\s/g, '').toLowerCase();
      setUsername(formattedText);
  };

  // 1️⃣ KAYIT OL
  const handleRegister = async () => {
    if (!isAgreed) {
        Alert.alert(localCountry === 'TR' ? "Onay Gerekli" : "Agreement Required", t.errAgreed);
        return;
    }

    const cleanEmail = email ? email.trim() : "";
    
    if (!username || !name || !cleanEmail || !password || !confirmPassword || !city || !district) {
      Alert.alert(localCountry === 'TR' ? 'Eksik Bilgi' : 'Missing Info', t.errFill);
      return;
    }

    if (username.includes(' ')) {
        Alert.alert(localCountry === 'TR' ? 'Hata' : 'Error', t.errSpace);
        return;
    }

    if (password !== confirmPassword) {
      Alert.alert(localCountry === 'TR' ? 'Hata' : 'Error', t.errPass);
      return;
    }

    const result = await register(username, name, cleanEmail, password, localCountry, city, district);

    if (result.success) {
        if (!result.session) {
            setVerifyModalVisible(true);
            Alert.alert(t.codeSentTitle, `${cleanEmail} ${t.codeSentMsg}`);
        } else {
            navigation.navigate('Login');
        }
    } else {
        Alert.alert(localCountry === 'TR' ? 'Hata' : 'Error', result.message);
    }
  };

  // 2️⃣ KODU DOĞRULA
  const handleVerify = async () => {
      if (!userCode || userCode.length < 6) {
          Alert.alert(localCountry === 'TR' ? 'Hata' : 'Error', t.errCode);
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
          Alert.alert(localCountry === 'TR' ? 'Hata' : 'Error', result.message || t.errCode);
      }
  };

  return (
    <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?q=80&w=2030&auto=format&fit=crop' }} 
        style={styles.backgroundImage}
    >
        <View style={styles.overlay}>
            <SafeAreaView style={styles.container}>
                {/* KLAVYE KAYDIRMA KONTROLÜ (YENİ) */}
                <KeyboardAvoidingView 
                    style={{ flex: 1 }} 
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <ScrollView 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }} 
                        keyboardShouldPersistTaps="handled"
                    >
                        
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

                        <View style={styles.header}>
                            <Text style={styles.title}>{t.title}</Text>
                            <Text style={styles.subtitle}>{t.subtitle}</Text>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>{t.labelUser}</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="..." 
                                    placeholderTextColor="#999" 
                                    value={username} 
                                    onChangeText={handleUsernameChange} 
                                    autoCapitalize="none" 
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>{t.labelName}</Text>
                                <TextInput style={styles.input} placeholder="..." placeholderTextColor="#999" value={name} onChangeText={setName} />
                            </View>

                            <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                                <View style={[styles.inputContainer, {width:'48%'}]}>
                                    <Text style={styles.label}>{t.city}</Text>
                                    <TouchableOpacity style={styles.input} onPress={() => openModal('city')}>
                                        <Text style={{color: city ? 'black' : '#999'}}>{city || t.labelCity}</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={[styles.inputContainer, {width:'48%'}]}>
                                    <Text style={styles.label}>{t.dist}</Text>
                                    <TouchableOpacity style={styles.input} onPress={() => openModal('district')}>
                                        <Text style={{color: district ? 'black' : '#999'}}>{district || t.labelDistrict}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>{t.labelEmail}</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="..." 
                                    placeholderTextColor="#999" 
                                    keyboardType="email-address" 
                                    value={email} 
                                    onChangeText={setEmail} 
                                    autoCapitalize="none" 
                                />
                            </View>

                            {/* ŞİFRE ALANI - GÖZ İKONLU (YENİ) */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>{t.labelPass}</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput 
                                        style={styles.passwordInput} 
                                        placeholder="******" 
                                        placeholderTextColor="#999" 
                                        secureTextEntry={!showPassword} 
                                        value={password} 
                                        onChangeText={setPassword} 
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#666" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* ŞİFRE TEKRAR ALANI - GÖZ İKONLU (YENİ) */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>{t.labelPassConfirm}</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput 
                                        style={styles.passwordInput} 
                                        placeholder="******" 
                                        placeholderTextColor="#999" 
                                        secureTextEntry={!showConfirmPassword} 
                                        value={confirmPassword} 
                                        onChangeText={setConfirmPassword} 
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                                        <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#666" />
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
                                        size={26} 
                                        color={isAgreed ? COLORS.primary : "#666"} 
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
                                style={[styles.button, { opacity: isAgreed ? 1 : 0.6 }]} 
                                onPress={handleRegister} 
                                disabled={isLoading}
                            >
                                {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t.btnRegister}</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
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
                            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="black" /></TouchableOpacity>
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

            {/* ✅ DOĞRULAMA KODU MODALI (YENİ DARK TEMA) */}
            <Modal visible={verifyModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlayDark}>
                    <View style={styles.verifyModalContentDark}>
                        <View style={styles.verifyModalHeader}>
                            <Text style={styles.verifyModalTitle}>{t.verifyTitle}</Text>
                            <TouchableOpacity onPress={() => setVerifyModalVisible(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.verifyModalDesc}>
                            {t.verifyMsg}
                        </Text>

                        <TextInput 
                            style={styles.verifyInputDark}
                            placeholder="XXXXXX"
                            placeholderTextColor="#666"
                            maxLength={6}
                            keyboardType="number-pad"
                            value={userCode}
                            onChangeText={setUserCode}
                        />

                        <TouchableOpacity 
                            style={[styles.button, { marginTop: 25, backgroundColor: COLORS.primary, paddingVertical: 15 }]} 
                            onPress={handleVerify}
                            disabled={isVerifying}
                        >
                            {isVerifying ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t.btnVerify}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* BAŞARI MODALI */}
            <Modal visible={successModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <Animated.View style={[styles.successModalContent, { transform: [{ scale: scaleAnim }] }]}>
                        <View style={styles.successIconContainer}>
                            <Ionicons name="checkmark-circle" size={80} color="#10b981" />
                        </View>
                        <Text style={styles.successModalTitle}>{t.successTitle}</Text>
                        <Text style={styles.successModalText}>{t.successMsg}</Text>
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

            {/* EULA (KULLANIM KOŞULLARI) MODALI */}
            <Modal visible={eulaVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t.eula}</Text>
                            <TouchableOpacity onPress={() => setEulaVisible(false)}><Ionicons name="close" size={24} color="black" /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.legalModalText}>
                                {localCountry === 'TR' ? 
                                `1. GİRİŞ\nBu uygulamayı (Pito) kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız. Lütfen dikkatlice okuyunuz.\n\n2. HESAP GÜVENLİĞİ\nKullanıcılar hesaplarının güvenliğinden sorumludur. Şifrenizi kimseyle paylaşmayınız.\n\n3. İÇERİK POLİTİKASI\nUygulamada paylaşılan içerikler genel ahlak kurallarına uygun olmalıdır. Nefret söylemi, şiddet içeren veya yasa dışı içerikler yasaktır ve hesabın silinmesine neden olabilir.\n\n4. HİZMETİN KAPSAMI\nPito, hayvan sahiplerini ve veterinerleri bir araya getiren bir platformdur. Kullanıcılar arasındaki etkileşimlerden (sahiplendirme, eş bulma vb.) doğacak sorunlardan Pito sorumlu tutulamaz.\n\n5. ÜYELİK İPTALİ\nKullanıcılar diledikleri zaman hesaplarını silebilirler. Kurallara uymayan hesaplar Pito tarafından askıya alınabilir.` 
                                : 
                                `1. INTRODUCTION\nBy using this application (Pito), you agree to the following terms. Please read carefully.\n\n2. ACCOUNT SECURITY\nUsers are responsible for the security of their accounts. Do not share your password.\n\n3. CONTENT POLICY\nContent shared in the application must comply with general moral rules. Hate speech, violent, or illegal content is prohibited and may result in account deletion.\n\n4. SCOPE OF SERVICE\nPito is a platform connecting pet owners and vets. Pito is not responsible for issues arising from interactions between users.\n\n5. TERMINATION\nUsers can delete their accounts at any time. Accounts violating rules may be suspended by Pito.`}
                            </Text>
                        </ScrollView>
                        <TouchableOpacity style={[styles.button, {marginTop:10}]} onPress={() => setEulaVisible(false)}>
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
                            <TouchableOpacity onPress={() => setPrivacyVisible(false)}><Ionicons name="close" size={24} color="black" /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.legalModalText}>
                                {localCountry === 'TR' ? 
                                `1. TOPLANAN VERİLER\nKayıt olurken adınız, e-posta adresiniz ve konum bilgileriniz (İl/İlçe) toplanmaktadır.\n\n2. VERİLERİN KULLANIMI\nBu veriler, size en yakın ilanları göstermek ve uygulama içi iletişimi sağlamak amacıyla kullanılır.\n\n3. VERİ GÜVENLİĞİ\nKişisel verileriniz şifrelenerek saklanır ve yasal zorunluluklar dışında üçüncü şahıslarla paylaşılmaz.\n\n4. ÇEREZLER VE TAKİP\nUygulama performansını artırmak için anonim kullanım verileri toplanabilir.\n\n5. İLETİŞİM\nGizlilikle ilgili sorularınız için petspito@gmail.com adresinden bize ulaşabilirsiniz.` 
                                : 
                                `1. DATA COLLECTED\nWhen registering, your name, email address, and location (State/Suburb) are collected.\n\n2. USE OF DATA\nThis data is used to show you nearby listings and facilitate in-app communication.\n\n3. DATA SECURITY\nYour personal data is encrypted and stored, and is not shared with third parties except for legal obligations.\n\n4. COOKIES AND TRACKING\nAnonymous usage data may be collected to improve app performance.\n\n5. CONTACT\nFor privacy-related questions, contact us at petspito@gmail.com.`}
                            </Text>
                        </ScrollView>
                        <TouchableOpacity style={[styles.button, {marginTop:10}]} onPress={() => setPrivacyVisible(false)}>
                            <Text style={styles.buttonText}>{t.close}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            </SafeAreaView>
        </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.65)' },
  container: { flex: 1 },
  countrySwitchContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  countryBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ccc', marginHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.8)' },
  countryBtnActive: { borderColor: COLORS.primary, backgroundColor: '#E3F2FD' },
  flag: { fontSize: 20, marginRight: 5 },
  countryText: { fontWeight: 'bold', color: '#666' },
  countryTextActive: { color: COLORS.primary },
  header: { marginTop: 20, marginBottom: 30, paddingHorizontal: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10 },
  subtitle: { fontSize: 18, color: COLORS.gray },
  form: { paddingHorizontal: 20, paddingBottom: 20 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 16, color: COLORS.dark, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 15, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0', shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  
  // ✅ YENİ: ŞİFRE ALANI TASARIMI (Göz İkonlu)
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
  },
  eyeIcon: {
      padding: 5,
  },

  button: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10, elevation: 5, shadowColor: COLORS.primary, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 5 },
  buttonText: { color: COLORS.light, fontSize: 18, fontWeight: 'bold' },
  linkButton: { marginTop: 20, alignItems: 'center' },
  linkText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', height: '60%', backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.dark },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16 },
  
  checkboxContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, paddingHorizontal: 5 },
  checkbox: { marginRight: 10, marginTop: 2 },
  checkboxTextContainer: { flex: 1 },
  legalText: { fontSize: 12, color: '#666', lineHeight: 18 },
  legalLink: { color: COLORS.primary, fontWeight: 'bold', textDecorationLine: 'underline' },
  legalModalText: { fontSize: 14, color: '#333', lineHeight: 22 },

  // ✅ YENİ: DOĞRULAMA KODU MODALI (DARK TEMA)
  modalOverlayDark: {
      flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center'
  },
  verifyModalContentDark: {
      width: '85%', backgroundColor: '#1E1E1E', borderRadius: 24, padding: 25, elevation: 10,
      borderWidth: 1, borderColor: '#333'
  },
  verifyModalHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15,
  },
  verifyModalTitle: {
      fontSize: 20, fontWeight: 'bold', color: 'white'
  },
  verifyModalDesc: {
      textAlign:'center', marginBottom: 25, color: '#AAA', fontSize: 14, lineHeight: 20
  },
  verifyInputDark: {
      backgroundColor: '#2A2A2A', color: 'white', textAlign: 'center', fontSize: 32, letterSpacing: 8, fontWeight: 'bold',
      paddingVertical: 15, borderRadius: 15, borderWidth: 1, borderColor: '#444'
  },

  // BAŞARI MODALI STİLLERİ
  successModalContent: {
      width: '80%',
      backgroundColor: 'white',
      borderRadius: 24,
      padding: 30,
      alignItems: 'center',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
  },
  successIconContainer: {
      marginBottom: 20,
      backgroundColor: '#d1fae5',
      borderRadius: 50,
      padding: 5,
  },
  successModalTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: 10,
      textAlign: 'center',
  },
  successModalText: {
      fontSize: 16,
      color: '#6b7280',
      textAlign: 'center',
      marginBottom: 25,
      lineHeight: 22,
  },
  successButton: {
      backgroundColor: '#10b981',
      paddingVertical: 14,
      paddingHorizontal: 40,
      borderRadius: 16,
      width: '100%',
      alignItems: 'center',
      elevation: 3,
  },
  successButtonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
  }
});

export default RegisterScreen;