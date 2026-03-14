import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
    View, Text, StyleSheet, Dimensions, TouchableOpacity, 
    Animated, StatusBar 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { GameContext, GAME_IDS } from '../context/GameContext'; 
import { playSound } from '../utils/SoundManager'; 

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- MODERN FİZİK VE OYUN AYARLARI ---
const GRAVITY = 0.5;         
const JUMP = -8.5;           
const OBSTACLE_WIDTH = 70;   
const GAP_SIZE = 200;        
const BIRD_SIZE = 45;        
const BONUS_SIZE = 35;       
const BIRD_X = 60;           
const BASE_SPEED = 3.5;      
const MAX_SPEED = 12;        
const LEVEL_THRESHOLD = 15;  // Her 15 puanda bir seviye atlar

// --- SEVİYE EMOJİLERİ ---
const LEVEL_EMOJIS = ['🐶', '🐱', '🐰', '🦊', '🦁', '🐼', '🐯', '🦄'];

// --- ÇEVİRİLER ---
const TRANSLATIONS = {
    TR: {
        title: "Uçan Pito",
        start: "Başlamak İçin Ekrana Dokun",
        score: "Puan",
        bestScore: "En Yüksek",
        gameOver: "OYUN BİTTİ!",
        newBest: "YENİ REKOR! 🎉",
        savedDb: "Puanlar Hesabına Eklendi! 🪙", 
        restart: "Tekrar Oyna",
        exit: "Çıkış Yap",
        levelUp: "SEVİYE ATLANDI!"
    },
    EN: {
        title: "Flappy Pito",
        start: "Tap Screen to Start",
        score: "Score",
        bestScore: "Best",
        gameOver: "GAME OVER!",
        newBest: "NEW RECORD! 🎉",
        savedDb: "Points Added to Account! 🪙", 
        restart: "Play Again",
        exit: "Exit",
        levelUp: "LEVEL UP!"
    }
};

const FlappyPetScreen = ({ navigation }) => {
    const { country } = useContext(AuthContext) || { country: { code: 'TR' } };
    const { saveGameScore } = useContext(GameContext); 
    
    const activeLang = country?.code === 'TR' ? 'TR' : 'EN';
    const t = TRANSLATIONS[activeLang];

    // --- STATE DURUMLARI ---
    const [gameState, setGameState] = useState('START'); 
    const [displayScore, setDisplayScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [isScoreSaved, setIsScoreSaved] = useState(false); 
    
    // Seviye (Level) ve Karakter Durumları
    const [level, setLevel] = useState(1);
    const [birdEmoji, setBirdEmoji] = useState(LEVEL_EMOJIS[0]);

    // --- 60 FPS ANİMASYON DEĞERLERİ ---
    const birdYAnim = useRef(new Animated.Value(SCREEN_HEIGHT / 2)).current;
    const birdRotAnim = useRef(new Animated.Value(0)).current;
    const obsXAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
    const obsTopHeightAnim = useRef(new Animated.Value(200)).current;
    
    const bonusXAnim = useRef(new Animated.Value(-100)).current;
    const bonusYAnim = useRef(new Animated.Value(-100)).current;
    const bonusOpacityAnim = useRef(new Animated.Value(0)).current;

    const modalAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const levelUpAnim = useRef(new Animated.Value(0)).current; // Level up efekti için

    // --- ARKA PLAN FİZİK DEĞERLERİ ---
    const birdYVal = useRef(SCREEN_HEIGHT / 2);
    const birdVelocity = useRef(0);
    const obsXVal = useRef(SCREEN_WIDTH);
    const obsTopHeightVal = useRef(200);
    
    const bonusXVal = useRef(-100);
    const bonusYVal = useRef(-100);
    const bonusActive = useRef(false);

    const scoreRef = useRef(0);      
    const bonusScore = useRef(0);    
    const levelRef = useRef(1); // Oyun döngüsü için level referansı
    const requestRef = useRef();

    useEffect(() => {
        const loadBestScore = async () => {
            const savedScore = await AsyncStorage.getItem('pito_flappy_best');
            if (savedScore) setBestScore(parseInt(savedScore));
        };
        loadBestScore();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
            ])
        ).start();
    }, []);

    // --- SEVİYE KONTROLÜ (Level Up Logic) ---
    const checkLevelUp = (currentTotal) => {
        const newLevel = Math.floor(currentTotal / LEVEL_THRESHOLD) + 1;
        if (newLevel > levelRef.current) {
            levelRef.current = newLevel;
            setLevel(newLevel);
            
            // Yeni Emoji Ayarla (Sırayla değişir, biterse başa sarar)
            setBirdEmoji(LEVEL_EMOJIS[(newLevel - 1) % LEVEL_EMOJIS.length]);
            
            // 🎉 Seviye Atlatma Sesi
            if (playSound) playSound('gamewin');

            // Görsel Efekt (Level Up Yazısı Yanıp Söner)
            Animated.sequence([
                Animated.timing(levelUpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.delay(1500),
                Animated.timing(levelUpAnim, { toValue: 0, duration: 500, useNativeDriver: true })
            ]).start();
        }
    };

    const updateGame = () => {
        if (gameState !== 'PLAYING') return;

        // Hız Level'a ve Puana Göre Artar
        let currentSpeed = BASE_SPEED + (levelRef.current * 0.5) + (scoreRef.current * 0.05);
        if (currentSpeed > MAX_SPEED) currentSpeed = MAX_SPEED;

        birdVelocity.current += GRAVITY;
        birdYVal.current += birdVelocity.current;
        birdYAnim.setValue(birdYVal.current);

        const rotationVal = Math.min(Math.max(birdVelocity.current * 4, -25), 90); 
        birdRotAnim.setValue(rotationVal);

        obsXVal.current -= currentSpeed;
        obsXAnim.setValue(obsXVal.current);

        // --- BONUS (YILDIZ) TOPLAMA KONTROLÜ ---
        if (bonusActive.current) {
            bonusXVal.current -= currentSpeed;
            bonusXAnim.setValue(bonusXVal.current);

            // Çarpışma: Pito Yıldızı Aldı Mı?
            if (
                BIRD_X < bonusXVal.current + BONUS_SIZE &&
                BIRD_X + BIRD_SIZE > bonusXVal.current &&
                birdYVal.current < bonusYVal.current + BONUS_SIZE &&
                birdYVal.current + BIRD_SIZE > bonusYVal.current
            ) {
                bonusActive.current = false;
                bonusOpacityAnim.setValue(0);
                bonusScore.current += 5;
                
                const currentTotal = scoreRef.current + bonusScore.current;
                setDisplayScore(currentTotal);
                
                // ⭐ Yıldız Toplama Sesi
                if (playSound) playSound('score'); 
                
                // Level Up Kontrol
                checkLevelUp(currentTotal);
            }
        }

        // --- SÜTUNLARI GEÇME VE YENİLEME ---
        if (obsXVal.current < -OBSTACLE_WIDTH) {
            obsXVal.current = SCREEN_WIDTH;
            
            const nextHeight = Math.random() * (SCREEN_HEIGHT - GAP_SIZE - 250) + 100;
            obsTopHeightVal.current = nextHeight;
            obsTopHeightAnim.setValue(nextHeight);
            
            scoreRef.current += 1;
            const currentTotal = scoreRef.current + bonusScore.current;
            setDisplayScore(currentTotal);

            // Level Up Kontrol
            checkLevelUp(currentTotal);

            // Yıldız Oluşturma Mantığı (%40 İhtimal)
            if (Math.random() > 0.6) {
                bonusActive.current = true;
                bonusOpacityAnim.setValue(1);
                
                const isOutside = Math.random() > 0.5; 
                if (isOutside) {
                    bonusXVal.current = SCREEN_WIDTH + (OBSTACLE_WIDTH / 2) + 120;
                    bonusYVal.current = Math.random() * (SCREEN_HEIGHT - 300) + 150;
                } else {
                    bonusXVal.current = SCREEN_WIDTH + (OBSTACLE_WIDTH / 2) - (BONUS_SIZE / 2);
                    bonusYVal.current = nextHeight + (GAP_SIZE / 2) - (BONUS_SIZE / 2);
                }
                bonusYAnim.setValue(bonusYVal.current);
            } else {
                bonusActive.current = false;
                bonusOpacityAnim.setValue(0);
            }
        }

        // --- YANMA (OYUN BİTİŞ) KONTROLLERİ ---
        // 1. Tavana veya Yere Çarpma
        if (birdYVal.current < -20 || birdYVal.current > SCREEN_HEIGHT - BIRD_SIZE - 20) {
            triggerGameOver();
            return;
        }

        // 2. Sütunlara Çarpma
        const hitboxMargin = 8;
        const isHittingX = obsXVal.current < BIRD_X + BIRD_SIZE - hitboxMargin && obsXVal.current + OBSTACLE_WIDTH > BIRD_X + hitboxMargin;
        const isHittingTopY = birdYVal.current < obsTopHeightVal.current - hitboxMargin;
        const isHittingBottomY = birdYVal.current + BIRD_SIZE - hitboxMargin > obsTopHeightVal.current + GAP_SIZE;

        if (isHittingX && (isHittingTopY || isHittingBottomY)) {
            triggerGameOver();
            return;
        }

        requestRef.current = requestAnimationFrame(updateGame);
    };

    useEffect(() => {
        if (gameState === 'PLAYING') {
            requestRef.current = requestAnimationFrame(updateGame);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [gameState]);

    // --- ZIPLAMA AKSİYONU ---
    const jump = () => {
        if (gameState === 'START') {
            setGameState('PLAYING');
            if (playSound) playSound('jump'); // 🔊 Zıplama Sesi
        } else if (gameState === 'PLAYING') {
            birdVelocity.current = JUMP;
            if (playSound) playSound('jump'); // 🔊 Zıplama Sesi
        }
    };

    // --- OYUN BİTİŞİ ---
    const triggerGameOver = async () => {
        setGameState('GAMEOVER');
        cancelAnimationFrame(requestRef.current);
        setIsScoreSaved(false);
        
        // 💥 YANMA SESİ
        if (playSound) playSound('gameover');
        
        const totalScore = scoreRef.current + bonusScore.current;
        
        if (totalScore > bestScore) {
            setBestScore(totalScore);
            AsyncStorage.setItem('pito_flappy_best', totalScore.toString());
        }

        Animated.spring(modalAnim, {
            toValue: 1, friction: 5, tension: 40, useNativeDriver: true
        }).start();

        if (totalScore > 0) {
            try {
                await saveGameScore(GAME_IDS.FLAPPY, totalScore);
                setIsScoreSaved(true); 
            } catch (error) {
                console.error("Skor kaydedilirken hata oluştu", error);
            }
        }
    };

    const resetGame = () => {
        birdYVal.current = SCREEN_HEIGHT / 2;
        birdVelocity.current = 0;
        obsXVal.current = SCREEN_WIDTH;
        
        scoreRef.current = 0;
        bonusScore.current = 0;
        
        // Level Sıfırlama
        levelRef.current = 1;
        setLevel(1);
        setBirdEmoji(LEVEL_EMOJIS[0]);
        levelUpAnim.setValue(0);
        
        bonusActive.current = false;
        bonusOpacityAnim.setValue(0);
        
        birdYAnim.setValue(birdYVal.current);
        birdRotAnim.setValue(0);
        obsXAnim.setValue(obsXVal.current);
        
        setDisplayScore(0);
        modalAnim.setValue(0);
        setIsScoreSaved(false);
        setGameState('PLAYING');
    };

    const spin = birdRotAnim.interpolate({
        inputRange: [-25, 90],
        outputRange: ['-25deg', '90deg'],
        extrapolate: 'clamp'
    });

    const bottomObstacleTop = Animated.add(obsTopHeightAnim, GAP_SIZE);

    return (
        <TouchableOpacity activeOpacity={1} style={styles.container} onPress={jump}>
            <StatusBar hidden />

            <View style={[styles.cloud, { top: 80, left: 30, transform: [{scale: 1.5}] }]} />
            <View style={[styles.cloud, { top: 200, left: 250 }]} />
            <View style={[styles.cloud, { top: 450, left: -20, transform: [{scale: 1.2}] }]} />

            {/* SEVİYE ATLANDI ANİMASYONU */}
            <Animated.View style={[styles.levelUpContainer, { opacity: levelUpAnim, transform: [{ scale: levelUpAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]}>
                <Text style={styles.levelUpText}>{t.levelUp}</Text>
                <Text style={styles.levelNumText}>Level {level}</Text>
            </Animated.View>

            {/* --- ARKA PLAN PUAN VE SEVİYE --- */}
            {gameState !== 'START' && (
                <View style={styles.scoreHud}>
                    <Text style={styles.backgroundScore}>{displayScore}</Text>
                    <View style={styles.levelBadge}>
                        <Text style={styles.levelBadgeText}>Lv. {level}</Text>
                    </View>
                </View>
            )}

            {/* --- ÜST SÜTUN --- */}
            <Animated.View style={[styles.obstacle, {
                left: obsXAnim, top: 0, height: obsTopHeightAnim,
                borderBottomLeftRadius: 15, borderBottomRightRadius: 15,
            }]}>
                <View style={styles.obstacleCapBottom} />
            </Animated.View>

            {/* --- ALT SÜTUN --- */}
            <Animated.View style={[styles.obstacle, {
                left: obsXAnim, top: bottomObstacleTop, bottom: 0,
                borderTopLeftRadius: 15, borderTopRightRadius: 15,
            }]}>
                <View style={styles.obstacleCapTop} />
            </Animated.View>

            {/* --- BONUS --- */}
            <Animated.View style={[styles.bonusContainer, {
                left: bonusXAnim, top: bonusYAnim, opacity: bonusOpacityAnim
            }]}>
                <Text style={{ fontSize: BONUS_SIZE }}>⭐</Text>
            </Animated.View>

            {/* --- KARAKTER (Dinamik Emoji) --- */}
            <Animated.View style={[styles.birdContainer, { 
                top: birdYAnim, left: BIRD_X, transform: [{ rotate: spin }]
            }]}>
                <Text style={{ fontSize: BIRD_SIZE }}>{birdEmoji}</Text>
            </Animated.View>

            {gameState === 'START' && (
                <View style={styles.startOverlay}>
                    <Text style={styles.titleText}>{t.title}</Text>
                    <Animated.Text style={[styles.startHint, { transform: [{ scale: pulseAnim }] }]}>
                        👆 {t.start}
                    </Animated.Text>
                </View>
            )}

            {gameState === 'GAMEOVER' && (
                <View style={styles.gameOverOverlay}>
                    <Animated.View style={[styles.modalCard, { 
                        transform: [{ scale: modalAnim }], opacity: modalAnim 
                    }]}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="skull" size={40} color="#FF6B6B" />
                        </View>
                        
                        <Text style={styles.gameOverText}>{t.gameOver}</Text>

                        {displayScore === bestScore && displayScore > 0 && (
                            <View style={styles.newBestBadge}>
                                <Text style={styles.newBestText}>{t.newBest}</Text>
                            </View>
                        )}

                        <View style={styles.scoreBoard}>
                            <View style={styles.scoreCol}>
                                <Text style={styles.scoreLabel}>{t.score}</Text>
                                <Text style={styles.scoreValue}>{displayScore}</Text>
                            </View>
                            <View style={styles.scoreDivider} />
                            <View style={styles.scoreCol}>
                                <Text style={styles.scoreLabel}>{t.bestScore}</Text>
                                <Text style={styles.scoreValue}>{bestScore}</Text>
                            </View>
                        </View>

                        {isScoreSaved && displayScore > 0 && (
                            <View style={styles.dbSavedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#00b894" />
                                <Text style={styles.dbSavedText}>{t.savedDb}</Text>
                            </View>
                        )}

                        <TouchableOpacity style={styles.primaryButton} onPress={resetGame}>
                            <Ionicons name="refresh" size={24} color="white" />
                            <Text style={styles.primaryButtonText}>{t.restart}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
                            <Text style={styles.secondaryButtonText}>{t.exit}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#74B9FF', overflow: 'hidden' },
    cloud: { position: 'absolute', width: 100, height: 40, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 20 },
    
    scoreHud: { position: 'absolute', top: '10%', width: '100%', alignItems: 'center', zIndex: -1 },
    backgroundScore: { fontSize: 120, fontWeight: '900', color: 'rgba(255,255,255,0.2)' },
    levelBadge: { backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginTop: -20 },
    levelBadgeText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

    levelUpContainer: { position: 'absolute', top: '35%', width: '100%', alignItems: 'center', zIndex: 50 },
    levelUpText: { fontSize: 40, fontWeight: '900', color: '#FFD32A', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 2, height: 4 }, textShadowRadius: 5 },
    levelNumText: { fontSize: 24, fontWeight: 'bold', color: 'white', marginTop: 5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3 },

    birdContainer: { position: 'absolute', width: BIRD_SIZE, height: BIRD_SIZE, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
    bonusContainer: { position: 'absolute', width: BONUS_SIZE, height: BONUS_SIZE, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
    obstacle: { position: 'absolute', width: OBSTACLE_WIDTH, backgroundColor: '#00cec9', borderWidth: 3, borderColor: '#00b894', shadowColor: '#000', shadowOffset: { width: -3, height: 0 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
    obstacleCapBottom: { position: 'absolute', bottom: -3, left: -5, right: -5, height: 20, backgroundColor: '#00b894', borderRadius: 10, borderWidth: 3, borderColor: '#00a8ff' },
    obstacleCapTop: { position: 'absolute', top: -3, left: -5, right: -5, height: 20, backgroundColor: '#00b894', borderRadius: 10, borderWidth: 3, borderColor: '#00a8ff' },
    
    startOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
    titleText: { fontSize: 48, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 2, height: 4 }, textShadowRadius: 5, marginBottom: 20 },
    startHint: { fontSize: 22, fontWeight: 'bold', color: '#FDCB6E', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3 },
    
    gameOverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    modalCard: { width: '80%', backgroundColor: '#FFFFFF', borderRadius: 30, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
    iconContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFEAEA', justifyContent: 'center', alignItems: 'center', marginTop: -55, marginBottom: 15, borderWidth: 4, borderColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
    gameOverText: { fontSize: 28, fontWeight: '900', color: '#2D3436', marginBottom: 20 },
    newBestBadge: { position: 'absolute', top: 25, right: -10, backgroundColor: '#FFD32A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, transform: [{ rotate: '15deg' }], elevation: 5 },
    newBestText: { fontSize: 12, fontWeight: '900', color: '#2D3436' },
    
    scoreBoard: { flexDirection: 'row', width: '100%', backgroundColor: '#F8F9FA', borderRadius: 20, paddingVertical: 15, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
    scoreCol: { flex: 1, alignItems: 'center' },
    scoreLabel: { fontSize: 14, color: '#636E72', fontWeight: 'bold', marginBottom: 5 },
    scoreValue: { fontSize: 36, fontWeight: '900', color: '#6C5CE7' },
    scoreDivider: { width: 1, backgroundColor: '#DFE6E9', marginVertical: 10 },
    
    dbSavedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f8f5', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: '#00b894' },
    dbSavedText: { color: '#00b894', fontWeight: 'bold', marginLeft: 6, fontSize: 12 },

    primaryButton: { flexDirection: 'row', backgroundColor: '#6C5CE7', width: '100%', paddingVertical: 16, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12, shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
    primaryButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    secondaryButton: { width: '100%', paddingVertical: 16, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F2F6' },
    secondaryButtonText: { color: '#636E72', fontSize: 16, fontWeight: 'bold' }
});

export default FlappyPetScreen;