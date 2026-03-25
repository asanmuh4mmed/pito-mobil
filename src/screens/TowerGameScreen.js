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
const MIN_BOX_SIZE = 65;  
const MAX_BOX_SIZE = 120; 
const DROP_HEIGHT = 250;  
const PERFECT_TOLERANCE = 10; 

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
    const [gameState, setGameState] = useState('START'); 
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [level, setLevel] = useState(1);
    const [countdown, setCountdown] = useState(1); // Geri sayım 1'e düşürüldü
    const [stack, setStack] = useState([]); 
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
    const boxScaleAnim = useRef(new Animated.Value(1)).current; // Kutu animasyonu için eklendi

    useEffect(() => {
        loadBestScore();
        initBaseTower();
    }, []);

    const loadBestScore = async () => {
        const saved = await AsyncStorage.getItem('pito_tower_best');
        if (saved) setBestScore(parseInt(saved));
    };

    const getRandomAnimal = () => ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const getBoxColor = (index) => `hsl(${(index * 35) % 360}, 85%, 65%)`; // Açık tema için doygunluk ayarı
    const getRandomSize = (currentLevel) => {
        // Seviye arttıkça maksimum kutu boyutu küçülür (Zorluk artışı)
        let dynamicMax = MAX_BOX_SIZE - (currentLevel * 3);
        if (dynamicMax < MIN_BOX_SIZE + 10) dynamicMax = MIN_BOX_SIZE + 10;
        return Math.floor(Math.random() * (dynamicMax - MIN_BOX_SIZE + 1)) + MIN_BOX_SIZE;
    };

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
        boxScaleAnim.setValue(1);
    };

    // --- 1'DEN GERİ SAYIM ---
    const startCountdown = () => {
        playSound('button_click');
        setGameState('COUNTDOWN');
        setCountdown(1);
        let current = 1;

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
        }, 800);
    };

    // --- YENİ KUTU OLUŞTURMA VE ZORLUK (HIZ) ARTIŞI ---
    const spawnNewBox = (currentStackLength, currentLevel) => {
        const newSize = getRandomSize(currentLevel);
        setCurrentBoxSize(newSize);

        // Zorluk Modeli: Seviye arttıkça hareket süresi kısalır (hızlanır)
        let duration = 2000 - (currentLevel * 180);
        if (duration < 600) duration = 600; 

        const startSide = 0; 
        const targetSide = SCREEN_WIDTH - newSize; 

        const dropStartHeight = currentStackLength * BOX_HEIGHT + DROP_HEIGHT;
        fallingBoxY.setValue(dropStartHeight);
        movingBoxX.setValue(startSide);
        fallOffRot.setValue(0); 

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

    const evaluateDrop = (currentX) => {
        const topBox = stack[stack.length - 1];
        
        const currentCenter = currentX + (currentBoxSize / 2);
        const topBoxLeft = topBox.x;
        const topBoxRight = topBox.x + topBox.size;

        if (currentCenter < topBoxLeft || currentCenter > topBoxRight) {
            triggerGameOver(currentX, topBox.x + (topBox.size/2));
            return;
        }

        let finalX = currentX;
        const diffCenter = Math.abs(currentCenter - (topBoxLeft + topBox.size / 2));

        if (diffCenter <= PERFECT_TOLERANCE) {
            finalX = topBoxLeft + (topBox.size / 2) - (currentBoxSize / 2);
            showPerfectAnimation();
            setCombo(c => c + 1);
        } else {
            setCombo(0);
        }

        playSound('jump');

        // PUAN SİSTEMİ 1 OLARAK GÜNCELLENDİ
        const newScore = score + 1;
        setScore(newScore);

        // SEVİYE SİSTEMİ: Her 5 puanda 1 seviye atlar
        const calculatedLevel = Math.floor(newScore / 5) + 1; 
        let currentLevel = level;
        
        if (calculatedLevel > level) {
            currentLevel = calculatedLevel;
            setLevel(currentLevel);
            showLevelUpAnimation();
            
            // SEVİYE ATLAMA SESİ VE KUTU ANİMASYONU
            playSound('match_success'); 
            triggerBoxLevelUpAnimation();
        }

        const newBox = { id: stack.length, x: finalX, size: currentBoxSize, color: getBoxColor(stack.length), animal: getRandomAnimal() };
        const newStack = [...stack, newBox];
        setStack(newStack);

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

    const triggerGameOver = async (boxX, targetCenter) => {
        setGameState('GAMEOVER');
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

        if (score > 0 && saveGameScore) {
            setIsSaving(true);
            try {
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

    // YENİ: SEVİYE ATLAYINCA KUTULARIN ZIPLAMASI
    const triggerBoxLevelUpAnimation = () => {
        boxScaleAnim.setValue(1);
        Animated.sequence([
            Animated.timing(boxScaleAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
            Animated.timing(boxScaleAnim, { toValue: 1, duration: 150, useNativeDriver: true })
        ]).start();
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#E0F2FE" />
            
            <TouchableOpacity style={styles.gameArea} activeOpacity={1} onPress={handleTap}>
                
                {/* AÇIK RENK ARKAPLAN (GÖKYÜZÜ) */}
                <View style={styles.starsBg}>
                    {/* Bulut Efekti (Yuvarlak Şekiller) */}
                    <View style={[styles.cloud, { top: 50, left: 20, width: 100, height: 40 }]} />
                    <View style={[styles.cloud, { top: 150, right: 30, width: 120, height: 50 }]} />
                    <View style={[styles.cloud, { top: 300, left: -20, width: 90, height: 35 }]} />
                    <View style={[styles.cloud, { top: 450, right: -10, width: 150, height: 60 }]} />
                </View>

                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <Ionicons name="arrow-back" size={26} color="#0f172a" />
                    </TouchableOpacity>
                    
                    <View style={styles.scoreBox}>
                        <Text style={styles.scoreText}>{score}</Text>
                        <Text style={styles.scoreLabel}>{t.score}</Text>
                    </View>
                    
                    <View style={styles.statsContainer}>
                        <View style={styles.levelBox}>
                            <Ionicons name="star" size={14} color="#0284c7" />
                            <Text style={styles.levelText}>{t.level} {level}</Text>
                        </View>
                        <View style={styles.bestBox}>
                            <Ionicons name="trophy" size={14} color="#d97706" />
                            <Text style={styles.bestText}>{bestScore}</Text>
                        </View>
                    </View>
                </View>

                {/* BİLDİRİMLER */}
                <Animated.View style={[styles.notificationBanner, { opacity: perfectAnim, transform: [{ scale: perfectAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }] }]}>
                    <Text style={styles.perfectText}>{t.perfect}</Text>
                    {combo > 1 && <Text style={styles.comboText}>{t.combo}{combo}</Text>}
                </Animated.View>

                <Animated.View style={[styles.notificationBanner, { top: SCREEN_HEIGHT * 0.35, opacity: levelUpAnim, transform: [{ scale: levelUpAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }] }]}>
                    <Text style={styles.levelUpText}>{t.levelUp}</Text>
                </Animated.View>

                {/* KULE */}
                <Animated.View style={[styles.camera, { transform: [{ translateY: cameraY }] }]}>
                    
                    {/* YERLEŞMİŞ KUTULAR */}
                    {stack.map((box) => (
                        <Animated.View 
                            key={box.id} 
                            style={[
                                styles.box, 
                                { left: box.x, width: box.size, bottom: box.id * BOX_HEIGHT, backgroundColor: box.color },
                                { transform: [{ scale: boxScaleAnim }] } // Level atlama animasyonu buraya bağlandı
                            ]}
                        >
                            <View style={styles.boxInnerGlow} />
                            <Text style={styles.boxEmoji}>{box.animal}</Text>
                        </Animated.View>
                    ))}

                    {/* HAREKETLİ KUTU */}
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
                            <Ionicons name="play" size={50} color="#0284c7" style={{marginLeft: 8}} />
                        </View>
                        <Text style={styles.startText}>{t.tapToStart}</Text>
                    </View>
                )}

                {/* GERİ SAYIM */}
                {gameState === 'COUNTDOWN' && (
                    <View style={styles.overlay}>
                        <Text style={styles.countdownText}>{countdown}</Text>
                    </View>
                )}
            </TouchableOpacity>

            {/* OYUN BİTTİ MODALI (Açık Tema) */}
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
                                <ActivityIndicator color="#0284c7" />
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
    container: { flex: 1, backgroundColor: '#E0F2FE' }, // Gökyüzü Mavisi
    gameArea: { flex: 1, overflow: 'hidden' },
    
    starsBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#E0F2FE', zIndex: -1 },
    cloud: { position: 'absolute', backgroundColor: 'rgba(255, 255, 255, 0.6)', borderRadius: 50 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, zIndex: 10, paddingTop: 40 },
    iconBtn: { width: 45, height: 45, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.6)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
    scoreBox: { alignItems: 'center' },
    scoreText: { color: '#0f172a', fontSize: 46, fontWeight: '900', textShadowColor: 'rgba(255,255,255,0.8)', textShadowRadius: 10 },
    scoreLabel: { color: '#0284c7', fontSize: 14, fontWeight: 'bold', letterSpacing: 2 },
    
    statsContainer: { alignItems: 'flex-end' },
    levelBox: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, alignItems: 'center', marginBottom: 8, elevation: 2 },
    levelText: { color: '#0284c7', fontWeight: 'bold', marginLeft: 5, fontSize: 13 },
    bestBox: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, alignItems: 'center', elevation: 2 },
    bestText: { color: '#d97706', fontWeight: 'bold', marginLeft: 5, fontSize: 13 },

    notificationBanner: { position: 'absolute', top: SCREEN_HEIGHT * 0.25, width: '100%', alignItems: 'center', zIndex: 20 },
    perfectText: { color: '#10b981', fontSize: 36, fontWeight: '900', textShadowColor: 'white', textShadowRadius: 8 },
    comboText: { color: '#f59e0b', fontSize: 24, fontWeight: 'bold', marginTop: 5, textShadowColor: 'white', textShadowRadius: 5 },
    levelUpText: { color: '#e11d48', fontSize: 40, fontWeight: '900', textShadowColor: 'white', textShadowRadius: 10 },

    camera: { flex: 1, position: 'absolute', bottom: 100, width: '100%', height: SCREEN_HEIGHT },

    box: { 
        position: 'absolute', 
        height: BOX_HEIGHT, 
        borderRadius: 12, 
        borderWidth: 3, 
        borderColor: 'rgba(255,255,255,0.95)', 
        justifyContent: 'center', 
        alignItems: 'center', 
        elevation: 8, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.2, 
        shadowRadius: 4 
    },
    boxInnerGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%', backgroundColor: 'rgba(255,255,255,0.4)', borderTopLeftRadius: 8, borderTopRightRadius: 8 },
    boxEmoji: { fontSize: 28, textShadowColor: 'rgba(255,255,255,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(224, 242, 254, 0.85)', zIndex: 30 },
    pulseCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#38bdf8', marginBottom: 20, elevation: 5 },
    startText: { color: '#0284c7', fontSize: 28, fontWeight: '900', letterSpacing: 2 },
    countdownText: { color: '#0284c7', fontSize: 140, fontWeight: '900', textShadowColor: 'white', textShadowRadius: 15 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 35, padding: 30, alignItems: 'center', elevation: 20 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginTop: -70, marginBottom: 15, borderWidth: 4, borderColor: 'white', elevation: 5 },
    modalTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a', marginBottom: 25 },
    modalScoreRow: { flexDirection: 'row', width: '100%', backgroundColor: '#f1f5f9', borderRadius: 20, paddingVertical: 20, marginBottom: 25 },
    modalScoreCol: { flex: 1, alignItems: 'center' },
    modalScoreLabel: { color: '#64748b', fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
    modalScoreValue: { color: '#0ea5e9', fontSize: 44, fontWeight: '900' },
    modalScoreDivider: { width: 2, backgroundColor: '#e2e8f0' },
    
    saveContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    saveText: { color: '#64748b', marginLeft: 10, fontWeight: 'bold' },
    savedSuccessText: { color: '#10b981', fontWeight: 'bold', marginBottom: 15, fontSize: 16 },
    
    btnPrimary: { flexDirection: 'row', width: '100%', backgroundColor: '#0ea5e9', paddingVertical: 18, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12, elevation: 4 },
    btnText: { color: 'white', fontSize: 18, fontWeight: '900', marginRight: 10 },
    btnSecondary: { width: '100%', paddingVertical: 15, justifyContent: 'center', alignItems: 'center' },
    btnSecText: { color: '#64748b', fontSize: 16, fontWeight: 'bold' }
});

export default TowerGameScreen;