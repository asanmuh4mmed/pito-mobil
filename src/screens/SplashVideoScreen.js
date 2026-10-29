import React, { useEffect, useContext } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext'; 

const { width, height } = Dimensions.get('screen');

const SplashVideoScreen = ({ navigation }) => {
    const { user } = useContext(AuthContext); 
    
    const videoSource = require('../../assets/pito-splash.mp4'); 

    const player = useVideoPlayer(videoSource, player => {
        player.loop = false;
        player.play(); 
    });

    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                // ✅ BU SATIR ÇOK KRİTİK: Kullanıcının videoyu izlediğini hafızaya kazı
                await AsyncStorage.setItem('hasSeenVideoSplash', 'true');
            } catch (e) { console.log(e); }

            // ✅ MİSAFİR MODU AKTİF: Oturum durumuna bakmaksızın herkesi doğrudan Ana Sayfaya yönlendiriyoruz.
            navigation.replace('Home');
            
        }, 8000); // 8 saniye sonra yönlendir

        return () => clearTimeout(timer);
    }, [navigation]);

    return (
        // Arka planı siyah yapıyoruz ki videonun arkası şık dursun
        <View style={styles.container}>
            <VideoView 
                player={player} 
                style={styles.video} 
                // ✅ VİDEONUN KESİLMEMESİ İÇİN "contain" YAPILDI
                contentFit="contain" 
                nativeControls={false} 
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: 'black', // Video tam sığdığında altta üstte kalacak boşluklar siyah olsun (Sinema modu)
        justifyContent: 'center',
        alignItems: 'center'
    },
    video: { 
        width: width, 
        height: height 
    }
});

export default SplashVideoScreen;