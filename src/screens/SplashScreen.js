import React, { useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { AuthContext } from '../context/AuthContext'; 

const SplashScreen = ({ navigation }) => {
  const { country } = useContext(AuthContext) || { country: { code: 'TR' } };
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // --- DİL SEÇİMİ ---
  const activeLang = country?.code || 'TR';
  const sloganText = activeLang === 'TR' ? "Can Dostlarını Bul" : "Find Your Best Friends";

  useEffect(() => {
    // 1. Splash Animasyonlarını Başlat
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();

    // 2. Kullanıcının İlk Girişi mi Kontrol Et
    const checkAppStatus = async () => {
        try {
            const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
            
            if (hasSeenOnboarding === 'true') {
                // Önceden tanıtımı geçmiş -> Direkt Login veya Home'a gönder
                navigation.replace('Login'); 
            } else {
                // İlk defa giriyor -> 7 sayfalık modern Tanıtım Ekranına gönder
                navigation.replace('Onboarding');
            }
        } catch (error) {
            console.log("Hafıza kontrol hatası:", error);
            navigation.replace('Onboarding'); // Hata olursa güvenli liman olarak tanıtıma at
        }
    };

    // 4 Saniyelik Görsel Şölen Süresi
    const timer = setTimeout(() => {
      checkAppStatus(); 
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* --- ARKA PLAN FOTOĞRAFI --- */}
      <Image
        source={{ uri: 'https://i.pinimg.com/736x/32/27/d2/3227d213df471d313717e925aa1353ca.jpg' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Siyah Yarı Saydam Perde */}
      <View style={styles.overlay} />

      {/* --- PİTO LOGO VE SLOGAN --- */}
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.title}>P İ T O</Text>
        <Text style={styles.slogan}>{sloganText}</Text>
      </Animated.View>

      {/* --- FOOTER: POWERED BY OXPİ --- */}
      <View style={styles.footer}>
        <Text style={styles.poweredBy}>Powered by</Text>
        <View style={styles.brandContainer}>
            <Image 
                source={require('../../assets/oxpi.png')} 
                style={styles.brandLogo} 
            />
            <Text style={styles.brandName}>OXPİ</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'black',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject, 
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', 
  },
  logoContainer: { 
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 80 
  },
  title: { 
    fontSize: 60, 
    fontWeight: '900',
    color: '#FFFFFF', 
    letterSpacing: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  slogan: {
    color: '#EEE',
    fontSize: 16,
    letterSpacing: 2,
    marginTop: 5,
    fontWeight: '300'
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center'
  },
  poweredBy: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 5,
    fontStyle: 'italic'
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  brandLogo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginRight: 10
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2
  }
});

export default SplashScreen;