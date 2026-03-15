import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar, Modal, Animated, Easing, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { GameContext } from '../context/GameContext'; 
import { playSound } from '../utils/SoundManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- OYUN AYARLARI ---
const BOX_HEIGHT = 65; 
const MIN_BOX_SIZE = 65;  // En küçük kutu boyutu
const MAX_BOX_SIZE = 120; // En büyük kutu boyutu
const DROP_HEIGHT = 250;  // Yukarıdan düşme mesafesi
const PERFECT_TOLERANCE = 10; // Kusursuz oturtma payı

const ANIMALS = ['🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐸', '🐵'];

const TRANSLATIONS = {
    TR: {
        title: "Mama Kulesi",
        score: "PUAN",
        best: "REKOR",
        level: "SEVİYE",
        tapToStart: "BAŞLA",
        gameOver: "KULE YIKILDI! 💥",
        perfect: "KUSURSUZ!",
        levelUp: "SEVİYE ATLADIN! 🚀",
        saving: "Kaydediliyor...",
        saved: "Puan Eklendi! 🏆",
        playAgain: "TEKRAR OYNA",
        exit: "Çıkış Yap",
        combo: "KOMBO x"
    },
    AU: {
        title: "Treat Tower",
        score: "SCORE",
        best: "BEST",
        level: "LEVEL",
        tapToStart: "START",
        gameOver: "TOWER COLLAPSED! 💥",
        perfect: "PERFECT!",
        levelUp: "LEVEL UP! 🚀",
        saving: "Saving...",
        saved: "Points Added! 🏆",
        playAgain: "PLAY AGAIN",
        exit: "Exit",
        combo: "COMBO x"
    }
};

const TowerGameScreen = ({ navigation }) => {
    const { country } = useContext(AuthContext);
    const { saveGameScore } = useContext(GameContext);
    const t = TRANSLATIONS[country?.code === 'AU' ? 'AU' : 'TR'];

    // --- STATE'LER ---
    const [gameState, setGameState] = useState('START'); // START, COUNTDOWN, PLAYING, DROPPING, GAMEOVER
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [level, setLevel] = useState(1);
    const [countdown, setCountdown] = useState(3);
    const [stack, setStack] = useState([]); // Yerdeki kutular
    const [currentBoxSize, setCurrentBoxSize] = useState(MAX_BOX_SIZE);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // --- ANİMASYON REFLERİ ---
    const cameraY = useRef(new Animated.Value(0)).current; 
    const movingBoxX = useRef(new Animated.Value(0)).current; 
    const fallingBoxY = useRef(new Animated.Value(0)).current; 
    
    const perfectAnim = useRef(new Animated.Value(0)).current;
    const levelUpAnim = useRef(new Animated.Value(0)).current;
    const fallOffRot = useRef(new Animated.Value(0)).current; 

    useEffect(() => {
        loadBestScore();
        initBaseTower();
    }, []);

    const loadBestScore = async () => {
        const saved = await AsyncStorage.getItem('pito_tower_best');
        if (saved) setBestScore(parseInt(saved));
    };

    const getRandomAnimal = () => ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const getBoxColor = (index) => `hsl(${(index * 35) % 360}, 85%, 55%)`; 
    const getRandomSize = () => Math.floor(Math.random() * (MAX_BOX_SIZE - MIN_BOX_SIZE + 1)) + MIN_BOX_SIZE;

    const initBaseTower = () => {
        movingBoxX.stopAnimation();
        fallingBoxY.stopAnimation();
        
        const startX = (SCREEN_WIDTH - MAX_BOX_SIZE) / 2;
        
        setStack([{ id: 0, x: startX, size: MAX_BOX_SIZE, color: getBoxColor(0), animal: getRandomAnimal() }]);
        setScore(0);
        setCombo(0);
        setLevel(1);
        setCurrentBoxSize(MAX_BOX_SIZE);
        setGameState('START');
        setIsSaving(false);
        setIsSaved(false);

        movingBoxX.setValue(startX);
        cameraY.setValue(0);
        fallOffRot.setValue(0);
    };

    // --- 3, 2, 1 GERİ SAYIM ---
    const startCountdown = () => {
        playSound('button_click');
        setGameState('COUNTDOWN');
        setCountdown(3);
        let current = 3;

        const interval = setInterval(() => {
            current -= 1;
            if (current > 0) {
                setCountdown(current);
                playSound('button_click');
            } else {
                clearInterval(interval);
                playSound('game_start');
                setGameState('PLAYING');
                spawnNewBox(0, 1); 
            }
        }, 1000);
    };

    // --- YENİ KUTU OLUŞTURMA VE SÜREKLİ HAREKET (PİNG-PONG) ---
    const spawnNewBox = (currentStackLength, currentLevel) => {
        const newSize = getRandomSize();
        setCurrentBoxSize(newSize);

        // Seviyeye göre hızı hesapla
        let duration = 2000 - (currentLevel * 150);
        if (duration < 700) duration = 700; 

        const startSide = 0; 
        const targetSide = SCREEN_WIDTH - newSize; 

        // Kutuyu havaya yerleştir
        const dropStartHeight = currentStackLength * BOX_HEIGHT + DROP_HEIGHT;
        fallingBoxY.setValue(dropStartHeight);
        movingBoxX.setValue(startSide);
        fallOffRot.setValue(0); 

        // Sürekli Sola-Sağa Gidip Gelme Animasyonu (Ping-Pong)
        Animated.loop(
            Animated.sequence([
                Animated.timing(movingBoxX, {
                    toValue: targetSide,
                    duration: duration,
                    easing: Easing.linear, 
                    useNativeDriver: false 
                }),
                Animated.timing(movingBoxX, {
                    toValue: startSide,
                    duration: duration,
                    easing: Easing.linear,
                    useNativeDriver: false
                })
            ])
        ).start();
    };

    // --- EKRANA DOKUNMA (DÜŞÜŞ) ---
    const handleTap = () => {
        if (gameState === 'START') {
            startCountdown();
            return;
        }
        if (gameState !== 'PLAYING') return;

        setGameState('DROPPING');
        
        movingBoxX.stopAnimation((currentX) => {
            const targetY = stack.length * BOX_HEIGHT;

            Animated.timing(fallingBoxY, {
                toValue: targetY,
                duration: 350, 
                easing: Easing.in(Easing.quad), 
                useNativeDriver: false
            }).start(() => evaluateDrop(currentX));
        });
    };

    // --- DÜŞÜŞ SONRASI FİZİK VE ÇARPIŞMA KONTROLÜ ---
    const evaluateDrop = (currentX) => {
        const topBox = stack[stack.length - 1];
        
        // Ağırlık Merkezi Hesaplaması
        const currentCenter = currentX + (currentBoxSize / 2);
        const topBoxLeft = topBox.x;
        const topBoxRight = topBox.x + topBox.size;

        // 1. DURUM: AĞIRLIK MERKEZİ DIŞARIDA (DEVRİLİR)
        if (currentCenter < topBoxLeft || currentCenter > topBoxRight) {
            triggerGameOver(currentX, topBox.x + (topBox.size/2));
            return;
        }

        // 2. DURUM: BAŞARILI YERLEŞTİRME
        let finalX = currentX;
        const diffCenter = Math.abs(currentCenter - (topBoxLeft + topBox.size / 2));

        if (diffCenter <= PERFECT_TOLERANCE) {
            // Kusursuz Oturtma
            finalX = topBoxLeft + (topBox.size / 2) - (currentBoxSize / 2);
            showPerfectAnimation();
            setCombo(c => c + 1);
        } else {
            // Normal Oturtma
            setCombo(0);
        }

        // ✅ BAŞARILI HAMLE SESİ (Her Başarılı Hamlede Çalar)
        playSound('jump');

        // ✅ HER HAMLEDE SABİT 5 PUAN ARTIŞI
        const earnedPoints = 5;
        const newScore = score + earnedPoints;
        setScore(newScore);

        // SEVİYE (LEVEL) KONTROLÜ (Her 25 puanda / 5 hamlede bir level atlar)
        const calculatedLevel = Math.floor(newScore / 25) + 1; 
        let currentLevel = level;
        
        if (calculatedLevel > level) {
            currentLevel = calculatedLevel;
            setLevel(currentLevel);
            showLevelUpAnimation();
            
            // ✅ SEVİYE ATLAMA SESİ
            playSound('match_success'); 
        }

        // Kutuyu kuleye ekle
        const newBox = { id: stack.length, x: finalX, size: currentBoxSize, color: getBoxColor(stack.length), animal: getRandomAnimal() };
        const newStack = [...stack, newBox];
        setStack(newStack);

        // KAMERA KAYDIRMA (Kule Yükseldikçe Aşağı İner)
        if (newStack.length > 3) {
            Animated.timing(cameraY, {
                toValue: (newStack.length - 3) * BOX_HEIGHT, 
                duration: 350,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true 
            }).start();
        }

        setGameState('PLAYING');
        spawnNewBox(newStack.length, currentLevel);
    };

    // --- DEVRİLME ANİMASYONU VE OYUN BİTİŞİ ---
    const triggerGameOver = async (boxX, targetCenter) => {
        setGameState('GAMEOVER');
        
        // ✅ OYUN BİTTİ (YANMA) SESİ
        playSound('gameover');
        
        const fallDirection = boxX + (currentBoxSize/2) > targetCenter ? 1 : -1;

        Animated.parallel([
            Animated.timing(fallingBoxY, { 
                toValue: -300, 
                duration: 1200, 
                easing: Easing.in(Easing.quad), 
                useNativeDriver: false 
            }),
            Animated.timing(movingBoxX, { 
                toValue: boxX + (150 * fallDirection), 
                duration: 1200, 
                useNativeDriver: false 
            }),
            Animated.timing(fallOffRot, { 
                toValue: fallDirection, 
                duration: 1200, 
                useNativeDriver: false 
            })
        ]).start();

        if (score > bestScore) {
            setBestScore(score);
            AsyncStorage.setItem('pito_tower_best', score.toString());
        }

        // Skor 0'dan büyükse veritabanına kaydet
        if (score > 0 && saveGameScore) {
            setIsSaving(true);
            try {
                // Skoru 5'er 5'er artan net sayıyla doğrudan veritabanına (haftalık/toplam) kaydeder
                await saveGameScore('6', score);
                setIsSaved(true);
            } catch (err) {
                console.log(err);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const showPerfectAnimation = () => {
        perfectAnim.setValue(0);
        Animated.sequence([
            Animated.timing(perfectAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(perfectAnim, { toValue: 0, duration: 500, delay: 500, useNativeDriver: true })
        ]).start();
    };

    const showLevelUpAnimation = () => {
        levelUpAnim.setValue(0);
        Animated.sequence([
            Animated.timing(levelUpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(levelUpAnim, { toValue: 0, duration: 500, delay: 1000, useNativeDriver: true })
        ]).start();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            
            <TouchableOpacity style={styles.gameArea} activeOpacity={1} onPress={handleTap}>
                
                {/* ARKAPLAN EFEKTİ */}
                <View style={styles.starsBg}>
                    {[...Array(15)].map((_, i) => (
                        <View key={i} style={[styles.star, { left: Math.random()*SCREEN_WIDTH, top: Math.random()*SCREEN_HEIGHT, opacity: Math.random() }]} />
                    ))}
                </View>

                {/* HEADER (SKOR BİLGİSİ) */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <Ionicons name="arrow-back" size={26} color="white" />
                    </TouchableOpacity>
                    
                    <View style={styles.scoreBox}>
                        <Text style={styles.scoreText}>{score}</Text>
                        <Text style={styles.scoreLabel}>{t.score}</Text>
                    </View>
                    
                    <View style={styles.statsContainer}>
                        <View style={styles.levelBox}>
                            <Ionicons name="star" size={14} color="#38bdf8" />
                            <Text style={styles.levelText}>{t.level} {level}</Text>
                        </View>
                        <View style={styles.bestBox}>
                            <Ionicons name="trophy" size={14} color="#f59e0b" />
                            <Text style={styles.bestText}>{bestScore}</Text>
                        </View>
                    </View>
                </View>

                {/* BİLDİRİMLER (PERFECT & LEVEL UP) */}
                <Animated.View style={[styles.notificationBanner, { opacity: perfectAnim, transform: [{ scale: perfectAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }] }]}>
                    <Text style={styles.perfectText}>{t.perfect}</Text>
                    {combo > 1 && <Text style={styles.comboText}>{t.combo}{combo}</Text>}
                </Animated.View>

                <Animated.View style={[styles.notificationBanner, { top: SCREEN_HEIGHT * 0.35, opacity: levelUpAnim, transform: [{ scale: levelUpAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }] }]}>
                    <Text style={styles.levelUpText}>{t.levelUp}</Text>
                </Animated.View>

                {/* KULE (KAMERA - Yükseldikçe aşağı doğru translate olur) */}
                <Animated.View style={[styles.camera, { transform: [{ translateY: cameraY }] }]}>
                    
                    {/* YERLEŞMİŞ KUTULAR */}
                    {stack.map((box) => (
                        <View 
                            key={box.id} 
                            style={[styles.box, { left: box.x, width: box.size, bottom: box.id * BOX_HEIGHT, backgroundColor: box.color }]}
                        >
                            <View style={styles.boxInnerGlow} />
                            <Text style={styles.boxEmoji}>{box.animal}</Text>
                        </View>
                    ))}

                    {/* HAREKETLİ VE DÜŞEN KUTU */}
                    {(gameState === 'PLAYING' || gameState === 'DROPPING' || gameState === 'GAMEOVER') && stack.length > 0 && (
                        <Animated.View 
                            style={[
                                styles.box, 
                                { 
                                    left: movingBoxX,
                                    width: currentBoxSize,
                                    bottom: fallingBoxY, 
                                    backgroundColor: getBoxColor(stack.length),
                                    zIndex: 10,
                                    transform: [
                                        { rotate: fallOffRot.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-45deg', '0deg', '45deg'] }) }
                                    ]
                                }
                            ]}
                        >
                            <View style={styles.boxInnerGlow} />
                            <Text style={styles.boxEmoji}>{getRandomAnimal()}</Text>
                        </Animated.View>
                    )}

                </Animated.View>

                {/* BAŞLANGIÇ EKRANI */}
                {gameState === 'START' && (
                    <View style={styles.overlay}>
                        <View style={styles.pulseCircle}>
                            <Ionicons name="play" size={50} color="white" style={{marginLeft: 8}} />
                        </View>
                        <Text style={styles.startText}>{t.tapToStart}</Text>
                    </View>
                )}

                {/* GERİ SAYIM (3, 2, 1) */}
                {gameState === 'COUNTDOWN' && (
                    <View style={styles.overlay}>
                        <Text style={styles.countdownText}>{countdown}</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* OYUN BİTTİ MODALI */}
            <Modal transparent={true} visible={gameState === 'GAMEOVER'} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="warning" size={45} color="#ef4444" />
                        </View>
                        <Text style={styles.modalTitle}>{t.gameOver}</Text>
                        
                        <View style={styles.modalScoreRow}>
                            <View style={styles.modalScoreCol}>
                                <Text style={styles.modalScoreLabel}>{t.score}</Text>
                                <Text style={styles.modalScoreValue}>{score}</Text>
                            </View>
                            <View style={styles.modalScoreDivider} />
                            <View style={styles.modalScoreCol}>
                                <Text style={styles.modalScoreLabel}>{t.best}</Text>
                                <Text style={styles.modalScoreValue}>{bestScore}</Text>
                            </View>
                        </View>

                        {isSaving ? (
                            <View style={styles.saveContainer}>
                                <ActivityIndicator color="#3b82f6" />
                                <Text style={styles.saveText}>{t.saving}</Text>
                            </View>
                        ) : isSaved ? (
                            <Text style={styles.savedSuccessText}>{t.saved}</Text>
                        ) : null}

                        <TouchableOpacity style={styles.btnPrimary} onPress={initBaseTower} disabled={isSaving}>
                            <Text style={styles.btnText}>{t.playAgain}</Text>
                            <Ionicons name="refresh" size={20} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.goBack()} disabled={isSaving}>
                            <Text style={styles.btnSecText}>{t.exit}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    gameArea: { flex: 1, overflow: 'hidden' },
    
    starsBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0f172a', zIndex: -1 },
    star: { position: 'absolute', width: 4, height: 4, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 2 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, zIndex: 10, paddingTop: 40 },
    iconBtn: { width: 45, height: 45, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    scoreBox: { alignItems: 'center' },
    scoreText: { color: 'white', fontSize: 42, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
    scoreLabel: { color: '#38bdf8', fontSize: 13, fontWeight: 'bold', letterSpacing: 2 },
    
    statsContainer: { alignItems: 'flex-end' },
    levelBox: { flexDirection: 'row', backgroundColor: 'rgba(56, 189, 248, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.4)' },
    levelText: { color: '#38bdf8', fontWeight: 'bold', marginLeft: 5, fontSize: 12 },
    bestBox: { flexDirection: 'row', backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.4)' },
    bestText: { color: '#f59e0b', fontWeight: 'bold', marginLeft: 5, fontSize: 12 },

    notificationBanner: { position: 'absolute', top: SCREEN_HEIGHT * 0.25, width: '100%', alignItems: 'center', zIndex: 20 },
    perfectText: { color: '#10b981', fontSize: 34, fontWeight: '900', textShadowColor: 'rgba(16, 185, 129, 0.5)', textShadowRadius: 15 },
    comboText: { color: '#f59e0b', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
    levelUpText: { color: '#f472b6', fontSize: 38, fontWeight: '900', textShadowColor: 'rgba(244, 114, 182, 0.6)', textShadowRadius: 20 },

    camera: { flex: 1, position: 'absolute', bottom: 100, width: '100%', height: SCREEN_HEIGHT },

    // KARE VE FARKLI BOYUTLARDA KUTU TASARIMI
    box: { 
        position: 'absolute', 
        height: BOX_HEIGHT, 
        borderRadius: 12, 
        borderWidth: 3, 
        borderColor: 'rgba(255,255,255,0.9)', 
        justifyContent: 'center', 
        alignItems: 'center', 
        elevation: 10, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 5 }, 
        shadowOpacity: 0.4, 
        shadowRadius: 5 
    },
    boxInnerGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', backgroundColor: 'rgba(255,255,255,0.3)', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
    boxEmoji: { fontSize: 28, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3 },

    // OVERLAY (Geri Sayım & Başlangıç)
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 30 },
    pulseCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(56, 189, 248, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#38bdf8', marginBottom: 20 },
    startText: { color: 'white', fontSize: 26, fontWeight: '900', letterSpacing: 2 },
    countdownText: { color: 'white', fontSize: 130, fontWeight: '900', textShadowColor: '#38bdf8', textShadowRadius: 25 },

    // MODAL TASARIMI
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#1e293b', borderRadius: 35, padding: 30, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', elevation: 20 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginTop: -70, marginBottom: 15, borderWidth: 4, borderColor: '#1e293b' },
    modalTitle: { fontSize: 26, fontWeight: '900', color: 'white', marginBottom: 25 },
    modalScoreRow: { flexDirection: 'row', width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, paddingVertical: 20, marginBottom: 25 },
    modalScoreCol: { flex: 1, alignItems: 'center' },
    modalScoreLabel: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold', marginBottom: 5 },
    modalScoreValue: { color: '#38bdf8', fontSize: 40, fontWeight: '900' },
    modalScoreDivider: { width: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
    
    saveContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    saveText: { color: '#94a3b8', marginLeft: 10, fontWeight: 'bold' },
    savedSuccessText: { color: '#10b981', fontWeight: 'bold', marginBottom: 15, fontSize: 16 },
    
    btnPrimary: { flexDirection: 'row', width: '100%', backgroundColor: '#38bdf8', paddingVertical: 18, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12, elevation: 5 },
    btnText: { color: '#0f172a', fontSize: 18, fontWeight: '900', marginRight: 10 },
    btnSecondary: { width: '100%', paddingVertical: 15, justifyContent: 'center', alignItems: 'center' },
    btnSecText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold' }
});

export default TowerGameScreen;