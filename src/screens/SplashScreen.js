import React, { useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { AuthContext } from '../context/AuthContext'; 
import { Ionicons } from '@expo/vector-icons';

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

const SplashScreen = ({ navigation }) => {
  // ✅ GLOBAL DİL STATE'İ EKLENDİ
  const { language } = useContext(AuthContext) || { language: 'TR' };
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  // --- DİL SEÇİMİ ---
  const sloganText = language === 'EN' ? "FIND YOUR BEST FRIENDS" : "CAN DOSTLARINI BUL";

  useEffect(() => {
    // 1. Splash Animasyonlarını Başlat (Daha yumuşak ve modern geçiş)
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();

    // 2. Kullanıcının İlk Girişi mi Kontrol Et
    const checkAppStatus = async () => {
        try {
            const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
            
            if (hasSeenOnboarding === 'true') {
                // Önceden tanıtımı geçmiş -> Direkt Ana Sayfaya (Home) gönder
                navigation.replace('Home'); 
            } else {
                // İlk defa giriyor -> Tanıtım Ekranına gönder
                navigation.replace('Onboarding');
            }
        } catch (error) {
            console.log("Hafıza kontrol hatası:", error);
            navigation.replace('Onboarding'); // Hata olursa güvenli liman olarak tanıtıma at
        }
    };

    // Bekleme Süresi (Daha akıcı bir deneyim için 3 saniyeye çekildi)
    const timer = setTimeout(() => {
      checkAppStatus(); 
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* --- PİTO LOGO VE SLOGAN --- */}
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        
        {/* Modern ve Lüks İkon Kutusu */}
        <View style={styles.iconBox}>
            <Ionicons name="paw" size={60} color={PITO_COLORS.primary} />
        </View>

        <Text style={styles.title}>P I T O</Text>
        <Text style={styles.slogan}>{sloganText}</Text>
      </Animated.View>

      {/* --- FOOTER: POWERED BY OXPİ --- */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <Text style={styles.poweredBy}>POWERED BY</Text>
        <View style={styles.brandContainer}>
            <Text style={styles.brandName}>OXPİ</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: PITO_COLORS.navyBg, // Premium Pito Laciverti
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  logoContainer: { 
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50 
  },
  iconBox: {
    width: 120,
    height: 120,
    backgroundColor: PITO_COLORS.navySurface,
    borderRadius: 40, // Squircle hissiyatı veren yumuşak modern köşeler
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(197, 160, 89, 0.4)', // Yarı şeffaf altın sarısı çerçeve
    elevation: 20,
    shadowColor: PITO_COLORS.primary, // Altın rengi dış ışıma (glow) efekti
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 25
  },
  title: { 
    fontSize: 52, 
    fontWeight: '900',
    color: PITO_COLORS.cream, 
    letterSpacing: 16,
    marginLeft: 16 // Harf aralığından kaynaklı sağa kaymayı ortalar
  },
  slogan: {
    color: PITO_COLORS.primaryDark,
    fontSize: 14,
    letterSpacing: 5,
    marginTop: 15,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center'
  },
  poweredBy: {
    color: PITO_COLORS.grayText,
    fontSize: 11,
    marginBottom: 6,
    fontWeight: '700',
    letterSpacing: 2,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandName: {
    color: PITO_COLORS.primary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
    marginLeft: 4
  }
});

export default SplashScreen;