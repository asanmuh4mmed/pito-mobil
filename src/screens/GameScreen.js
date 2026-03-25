import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
    View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, 
    Modal, Animated, PanResponder, StatusBar, Easing, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext'; 
import { GameContext, GAME_IDS } from '../context/GameContext'; 
import { playSound } from '../utils/SoundManager'; 
import { supabase } from '../lib/supabase'; 

const { width, height } = Dimensions.get('window');
const PLAYER_SIZE = 90;
const ITEM_SIZE = 60;
const FLOOR_HEIGHT = 100;

// --- EVRİM AŞAMALARI (1 Puanlık sisteme göre oranlandı) ---
const EVOLUTION_STAGES = [
    { threshold: 0, image: 'https://cdn-icons-png.flaticon.com/512/616/616408.png' },   // Köpek
    { threshold: 5, image: 'https://cdn-icons-png.flaticon.com/512/616/616430.png' },   // Kedi
    { threshold: 15, image: 'https://cdn-icons-png.flaticon.com/512/616/616412.png' },  // Tavşan
    { threshold: 30, image: 'https://cdn-icons-png.flaticon.com/512/616/616439.png' }   // Kaplan
];

// --- VARLIKLAR ---
const ASSETS = {
    good: ['🍖', '🐟', '🥛', '🥫'],
    bad: ['💣', '🌵', '✂️']
};

// --- ÇEVİRİLER ---
const TRANSLATIONS = {
    TR: {
        score: "PUAN",
        gameOver: "Oyun Bitti!",
        catchTitle: "Mamaları Yakala",
        tryAgain: "Tekrar denemek ister misin?",
        desc: "Parmağınla karakteri kaydır, lezzetli mamaları topla ama bombalara dikkat et!",
        playAgain: "TEKRAR OYNA",
        startGame: "OYUNA BAŞLA",
        exit: "Çıkış Yap",
        finalScore: "TOPLAM PUAN",
        levelUp: "SEVİYE ATLADIN!",
        saving: "Liderlik Tablosuna Kaydediliyor...",
        saved: "Puanlar Tabloya Eklendi! 🏆",
        best: "Rekor:"
    },
    AU: {
        score: "SCORE",
        gameOver: "Game Over!",
        catchTitle: "Catch The Treats",
        tryAgain: "Do you want to try again?",
        desc: "Slide the character with your finger, catch tasty treats but avoid bombs!",
        playAgain: "PLAY AGAIN",
        startGame: "START GAME",
        exit: "Exit",
        finalScore: "TOTAL SCORE",
        levelUp: "LEVEL UP!",
        saving: "Saving to Leaderboard...",
        saved: "Points Added to Board! 🏆",
        best: "Best:"
    }
};

// --- FEEDBACK BİLEŞENİ ---
const FeedbackItem = ({ x, y, text, color, onComplete }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }), 
            Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.exp) }) 
        ]).start(() => onComplete());
    }, []);

    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -100] });
    const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
    const scale = anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 1.2, 1] });

    return (
        <Animated.View style={[styles.feedbackItem, { left: x, top: y, transform: [{ translateY }, { scale }], opacity }]}>
            <Text style={[styles.feedbackText, { color: color, textShadowColor: color }]}>{text}</Text>
        </Animated.View>
    );
};

const GameScreen = ({ navigation }) => {
    // --- CONTEXT ---
    const { user, country } = useContext(AuthContext);
    const { saveGameScore } = useContext(GameContext); 
    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
    const t = TRANSLATIONS[activeLang];

    // --- STATE ---
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [items, setItems] = useState([]); 
    const [gameOver, setGameOver] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playerImage, setPlayerImage] = useState(EVOLUTION_STAGES[0].image); 
    const [feedbacks, setFeedbacks] = useState([]); 

    const [isSaving, setIsSaving] = useState(false); 
    const [isSaved, setIsSaved] = useState(false);   

    // --- REFS ---
    const scoreRef = useRef(0);
    const livesRef = useRef(3);
    const itemsRef = useRef([]); 
    const playerPosRef = useRef(width / 2 - PLAYER_SIZE / 2);
    const lastSpawnTime = useRef(0);
    const speedMultiplier = useRef(1);
    const requestRef = useRef(); 
    
    // ✨ ÇÖZÜM: Karakterin anlık evrim resmini tutacak hızlı hafıza eklendi
    const playerImageRef = useRef(EVOLUTION_STAGES[0].image); 

    // --- ANIMASYON ---
    const playerX = useRef(new Animated.Value(width / 2 - PLAYER_SIZE / 2)).current;
    const gameAreaPan = useRef(new Animated.ValueXY()).current; 

    // --- REKOR ÇEKME ---
    useEffect(() => {
        const fetchHighScore = async () => {
            if (!user?.id) return;
            try {
                const { data } = await supabase
                    .from('game_scores')
                    .select('score')
                    .eq('user_id', user.id)
                    .eq('game_id', GAME_IDS.CATCH)
                    .order('score', { ascending: false })
                    .limit(1)
                    .single();
                
                if (data) setHighScore(data.score);
            } catch (error) {
                // Hata yok sayıldı
            }
        };
        fetchHighScore();
    }, [user?.id, isSaved]);

    // --- DOKUNMATİK KONTROL ---
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => true,
            onPanResponderMove: (evt, gestureState) => {
                if (livesRef.current <= 0) return;
                let newX = gestureState.moveX - (PLAYER_SIZE / 2);
                if (newX < 0) newX = 0;
                if (newX > width - PLAYER_SIZE) newX = width - PLAYER_SIZE;
                playerPosRef.current = newX;
                playerX.setValue(newX); 
            },
        })
    ).current;

    // --- OYUN FONKSİYONLARI ---
    const startGame = () => {
        scoreRef.current = 0;
        livesRef.current = 3;
        itemsRef.current = [];
        speedMultiplier.current = 1;
        playerImageRef.current = EVOLUTION_STAGES[0].image; // ✨ Hafızayı da sıfırla
        
        setScore(0);
        setLives(3);
        setItems([]);
        setGameOver(false);
        setIsPlaying(true);
        setPlayerImage(EVOLUTION_STAGES[0].image);
        setFeedbacks([]);
        setIsSaving(false);
        setIsSaved(false);

        lastSpawnTime.current = Date.now();
        playSound('game_start'); 

        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    const stopGame = async (finalScore = 0) => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        setIsPlaying(false);
        setGameOver(true);
        playSound('gameover');
        
        if (finalScore > 0) {
            setIsSaving(true);
            try {
                await saveGameScore(GAME_IDS.CATCH, finalScore);
                setIsSaved(true);
                if (finalScore > highScore) setHighScore(finalScore);
            } catch (error) {
                console.log("Skor kaydedilirken hata:", error);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const triggerFeedback = (x, y, text, color) => {
        const id = Date.now() + Math.random();
        setFeedbacks(prev => [...prev, { id, x, y, text, color }]);
    };

    const removeFeedback = (id) => {
        setFeedbacks(prev => prev.filter(item => item.id !== id));
    };

    const checkEvolution = (currentScore) => {
        const stage = [...EVOLUTION_STAGES].reverse().find(s => currentScore >= s.threshold);
        
        // ✨ ÇÖZÜM: State (playerImage) yerine, anlık Ref (playerImageRef) ile kontrol ediyoruz
        if (stage && stage.image !== playerImageRef.current) {
            playerImageRef.current = stage.image; // Gördüğü an hafızayı kilitler
            setPlayerImage(stage.image);          // UI'ı günceller
            playSound('gamewin');                 // Sesi sadece BİR KEZ çalar
        }
    };

    const shakeScreen = () => {
        Animated.sequence([
            Animated.timing(gameAreaPan, { toValue: { x: 15, y: 0 }, duration: 50, useNativeDriver: true }),
            Animated.timing(gameAreaPan, { toValue: { x: -15, y: 0 }, duration: 50, useNativeDriver: true }),
            Animated.timing(gameAreaPan, { toValue: { x: 15, y: 0 }, duration: 50, useNativeDriver: true }),
            Animated.timing(gameAreaPan, { toValue: { x: 0, y: 0 }, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const spawnItem = () => {
        const id = Date.now().toString() + Math.random().toString();
        const isBad = Math.random() > 0.7; 
        const type = isBad ? 'bad' : 'good';
        const list = isBad ? ASSETS.bad : ASSETS.good;
        const emoji = list[Math.floor(Math.random() * list.length)];
        const startX = Math.random() * (width - ITEM_SIZE);
        itemsRef.current.push({ id, x: startX, y: -100, type, emoji });
    };

    const gameLoop = () => {
        const now = Date.now();
        speedMultiplier.current = 1 + (scoreRef.current / 5) * 0.15; 
        const spawnRate = Math.max(350, 1200 - (scoreRef.current * 40)); 

        if (now - lastSpawnTime.current > spawnRate) {
            spawnItem();
            lastSpawnTime.current = now;
        }

        itemsRef.current = itemsRef.current.filter(item => {
            item.y += 4 * speedMultiplier.current;
            
            const playerTop = height - FLOOR_HEIGHT - 65; 
            const playerBottom = playerTop + 45; 
            
            const collisionY = item.y + ITEM_SIZE > playerTop && item.y < playerBottom;
            const collisionX = item.x + ITEM_SIZE > playerPosRef.current + 25 && item.x < playerPosRef.current + PLAYER_SIZE - 25;

            if (collisionY && collisionX) {
                if (item.type === 'good') {
                    scoreRef.current += 1;
                    setScore(scoreRef.current);
                    checkEvolution(scoreRef.current); 
                    triggerFeedback(item.x, playerTop - 30, "+1", "#FFD700"); 
                    playSound('score'); 
                } else {
                    livesRef.current -= 1;
                    setLives(livesRef.current); 
                    shakeScreen();
                    triggerFeedback(item.x, playerTop - 30, "💔", "#FF4757"); 
                    playSound('error'); 
                    
                    if (livesRef.current <= 0) {
                        stopGame(scoreRef.current);
                        return false; 
                    }
                }
                return false; 
            }
            if (item.y > height) return false; 
            return true; 
        });

        if (livesRef.current > 0) {
            setItems([...itemsRef.current]); 
            requestRef.current = requestAnimationFrame(gameLoop); 
        }
    };

    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar hidden />
            
            <Animated.View style={[styles.gameArea, { transform: gameAreaPan.getTranslateTransform() }]} {...panResponder.panHandlers}>
                <View style={styles.sky}>
                    <Ionicons name="cloud" size={120} color="rgba(255,255,255,0.3)" style={{position:'absolute', top: 50, left: -20}} />
                    <Ionicons name="cloud" size={90} color="rgba(255,255,255,0.2)" style={{position:'absolute', top: 180, right: 30}} />
                </View>
                
                {/* Düşen Nesneler */}
                {items.map(item => (
                    <View key={item.id} style={[styles.item, { left: item.x, top: item.y }]}>
                        <Text style={{fontSize: 42}}>{item.emoji}</Text>
                    </View>
                ))}

                {/* Feedback Animasyonları */}
                {feedbacks.map(fb => (
                    <FeedbackItem 
                        key={fb.id} 
                        x={fb.x} 
                        y={fb.y} 
                        text={fb.text} 
                        color={fb.color} 
                        onComplete={() => removeFeedback(fb.id)} 
                    />
                ))}

                {/* Oyuncu */}
                <Animated.View style={[styles.player, { transform: [{ translateX: playerX }] }]}>
                    <Image source={{ uri: playerImage }} style={{width: '100%', height: '100%', resizeMode:'contain'}} />
                </Animated.View>
                
                <View style={styles.floor}>
                    <Text style={styles.floorText}>P I T O   G A M E S</Text>
                </View>
            </Animated.View>

            {/* UI: Skor ve Canlar */}
            <View style={styles.uiContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} disabled={isSaving}>
                    <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
                <View style={styles.scoreBox}>
                    <Text style={styles.scoreLabel}>{t.score}</Text>
                    <Text style={styles.scoreValue}>{score}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <View style={styles.livesBoard}>
                        {[1, 2, 3].map((h) => (
                            <Ionicons key={h} name="heart" size={28} color={h <= lives ? "#FF4757" : "rgba(0,0,0,0.2)"} style={{marginLeft: 2}} />
                        ))}
                    </View>
                    <Text style={styles.highScoreText}>{t.best} {highScore}</Text>
                </View>
            </View>

            {/* Modal: Oyun Sonu / Başlangıç */}
            <Modal transparent={true} animationType="fade" visible={!isPlaying}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconBox}>
                            <Ionicons name={gameOver ? "trophy" : "game-controller"} size={50} color="white" />
                        </View>
                        <Text style={styles.modalTitle}>{gameOver ? t.gameOver : t.catchTitle}</Text>
                        
                        {gameOver && (
                            <View style={{alignItems:'center', marginVertical:15}}>
                                <Text style={styles.finalScoreLabel}>{t.finalScore}</Text>
                                <Text style={[styles.finalScoreValue, {marginBottom: isSaving || isSaved ? 5 : 20}]}>{score}</Text>

                                {isSaving ? (
                                    <View style={styles.savingContainer}>
                                        <ActivityIndicator size="small" color="#6C5CE7" />
                                        <Text style={styles.savingText}>{t.saving}</Text>
                                    </View>
                                ) : isSaved ? (
                                    <Text style={styles.savedText}>{t.saved}</Text>
                                ) : null}

                            </View>
                        )}

                        <Text style={styles.modalDesc}>{gameOver ? t.tryAgain : t.desc}</Text>

                        <TouchableOpacity 
                            style={[styles.playButton, { backgroundColor: isSaving ? '#ccc' : '#6C5CE7' }]} 
                            onPress={startGame}
                            disabled={isSaving}
                        >
                            <Text style={styles.playButtonText}>{gameOver ? t.playAgain : t.startGame}</Text>
                            <Ionicons name="play-circle" size={24} color="white" style={{marginLeft: 10}} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.exitButton} 
                            onPress={() => navigation.goBack()}
                            disabled={isSaving}
                        >
                            <Text style={styles.exitButtonText}>{t.exit}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#74b9ff' },
    gameArea: { flex: 1, width: '100%', height: '100%' },
    sky: { flex: 1 },
    floor: { height: FLOOR_HEIGHT, backgroundColor: '#55efc4', borderTopWidth: 8, borderTopColor: '#00b894', justifyContent: 'center', alignItems: 'center', zIndex: 5 },
    floorText: { color: 'rgba(0,0,0,0.1)', fontSize: 20, fontWeight: '900', letterSpacing: 2, marginTop: 20 },
    player: { position: 'absolute', bottom: FLOOR_HEIGHT - 25, left: 0, width: PLAYER_SIZE, height: PLAYER_SIZE, zIndex: 20 },
    item: { position: 'absolute', width: ITEM_SIZE, height: ITEM_SIZE, justifyContent: 'center', alignItems: 'center', zIndex: 15 },
    
    feedbackItem: { position: 'absolute', zIndex: 50, alignItems: 'center', justifyContent: 'center' },
    feedbackText: { fontSize: 32, fontWeight: '900', textShadowOffset: {width: 2, height: 2}, textShadowRadius: 3 },

    uiContainer: { position: 'absolute', top: 20, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 100 },
    backBtn: { width: 45, height: 45, borderRadius: 25, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 5, marginTop: 5 },
    scoreBox: { backgroundColor: 'white', paddingVertical: 8, paddingHorizontal: 30, borderRadius: 25, alignItems: 'center', elevation: 5, borderWidth: 3, borderColor: '#6C5CE7' },
    scoreLabel: { fontSize: 10, fontWeight: '900', color: '#6C5CE7' },
    scoreValue: { fontSize: 26, fontWeight: '900', color: '#2d3436' },
    livesBoard: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.9)', padding: 8, borderRadius: 20, elevation: 5 },
    highScoreText: { fontSize: 14, fontWeight: '900', color: 'white', marginTop: 6, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2, marginRight: 5 },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 30, padding: 30, alignItems: 'center', elevation: 20 },
    modalIconBox: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: -75, borderWidth: 6, borderColor: 'white' },
    modalTitle: { fontSize: 28, fontWeight: '900', color: '#2d3436', marginBottom: 10 },
    modalDesc: { textAlign: 'center', color: '#636e72', fontSize: 16, marginBottom: 30, lineHeight: 24 },
    finalScoreLabel: { fontSize: 14, fontWeight: 'bold', color: '#b2bec3', letterSpacing: 1 },
    finalScoreValue: { fontSize: 60, fontWeight: '900', color: '#6C5CE7' },
    
    savingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    savingText: { marginLeft: 8, color: '#747d8c', fontWeight: 'bold' },
    savedText: { marginBottom: 15, color: '#00b894', fontWeight: 'bold' },

    playButton: { flexDirection: 'row', backgroundColor: '#6C5CE7', width: '100%', paddingVertical: 18, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 5 },
    playButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
    exitButton: { padding: 10 },
    exitButtonText: { color: '#b2bec3', fontWeight: 'bold', fontSize: 16 }
});

export default GameScreen;