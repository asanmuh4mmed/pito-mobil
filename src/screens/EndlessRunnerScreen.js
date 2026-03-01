import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
    View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, 
    Modal, Animated, TouchableWithoutFeedback, StatusBar, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext'; 
import { GameContext, GAME_IDS } from '../context/GameContext'; 
import { playSound } from '../utils/SoundManager'; 

const { width, height } = Dimensions.get('window');

// --- OYUN SABİTLERİ ---
const PLAYER_SIZE = 70;
const OBSTACLE_SIZE = 50;
const GROUND_HEIGHT = 100;
const GRAVITY = 0.6; 
const JUMP_FORCE = -13; 
const BASE_SPEED = 6; 

// --- KARAKTER EVRİM AŞAMALARI (Puanlar ilk oyunla eşitlendi) ---
const EVOLUTION_STAGES = [
    { score: 0, emoji: '🐶', name: 'Dog', color: '#feca57' },   
    { score: 50, emoji: '🐱', name: 'Cat', color: '#ff9ff3' },  
    { score: 150, emoji: '🐰', name: 'Rabbit', color: '#00d2d3' }, 
    { score: 300, emoji: '🐆', name: 'Cheetah', color: '#ff6b6b' } 
];

const OBSTACLES = ['🌵', '🪨', '👻', '🔥'];

// --- ÇEVİRİLER ---
const TRANSLATIONS = {
    TR: {
        score: "SKOR",
        gameOver: "YANDIN!",
        start: "KOŞUYA BAŞLA",
        retry: "TEKRAR DENE",
        exit: "ÇIKIŞ",
        desc: "Zıplamak için ekrana dokun. Engellere takılma!",
        levelUp: "SEVİYE ATLADIN!",
        speedUp: "HIZLANIYOR!",
        finalScore: "KAZANILAN PUAN",
        saving: "Liderlik Tablosuna Kaydediliyor...",
        saved: "Puanlar Tabloya Eklendi! 🏆"
    },
    AU: {
        score: "SCORE",
        gameOver: "GAME OVER!",
        start: "START RUN",
        retry: "TRY AGAIN",
        exit: "EXIT",
        desc: "Tap screen to jump. Dodge the obstacles!",
        levelUp: "LEVEL UP!",
        speedUp: "SPEEDING UP!",
        finalScore: "POINTS EARNED",
        saving: "Saving to Leaderboard...",
        saved: "Points Added to Board! 🏆"
    }
};

const EndlessRunnerScreen = ({ navigation }) => {
    const { country } = useContext(AuthContext);
    const { saveGameScore } = useContext(GameContext); 
    const t = TRANSLATIONS[country?.code === 'AU' ? 'AU' : 'TR'];

    const [score, setScore] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [isSaving, setIsSaving] = useState(false); 
    const [isSaved, setIsSaved] = useState(false);   
    const [character, setCharacter] = useState(EVOLUTION_STAGES[0]);
    const [obstacleEmoji, setObstacleEmoji] = useState('🌵');
    const [notification, setNotification] = useState(''); 

    const playerYAnim = useRef(new Animated.Value(0)).current;
    const obstacleXAnim = useRef(new Animated.Value(width)).current;

    const requestRef = useRef(); 
    const playerY = useRef(0); 
    const playerVelocity = useRef(0); 
    const obstacleX = useRef(width); 
    const gameSpeed = useRef(BASE_SPEED); 
    const isJumping = useRef(false); 
    const scoreRef = useRef(0); 

    const startGame = () => {
        playSound('game_start'); 
        setScore(0);
        scoreRef.current = 0;
        playerY.current = 0;
        playerVelocity.current = 0;
        obstacleX.current = width;
        gameSpeed.current = BASE_SPEED;
        isJumping.current = false;
        
        setCharacter(EVOLUTION_STAGES[0]); 
        setGameOver(false);
        setIsPlaying(true);
        setIsSaving(false);
        setIsSaved(false);
        setNotification('');

        playerYAnim.setValue(0);
        obstacleXAnim.setValue(width);

        requestRef.current = requestAnimationFrame(gameLoop);
    };

    // ✅ OYUN BİTİRME VE ANINDA KAYIT (ASYNC)
    const handleGameOver = async (finalScore = 0) => {
        setGameOver(true);
        setIsPlaying(false);
        cancelAnimationFrame(requestRef.current);
        playSound('game_over'); 

        // Eğer puan 0'dan büyükse veritabanına kaydet
        if (finalScore > 0) {
            setIsSaving(true);
            try {
                await saveGameScore(GAME_IDS.RUNNER, finalScore);
                setIsSaved(true);
            } catch (error) {
                console.log("Skor kaydedilirken hata:", error);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const gameLoop = () => {
        playerVelocity.current += GRAVITY;
        playerY.current += playerVelocity.current;

        if (playerY.current >= 0) {
            playerY.current = 0;
            playerVelocity.current = 0;
            isJumping.current = false;
        }

        obstacleX.current -= gameSpeed.current;

        if (obstacleX.current < -OBSTACLE_SIZE) {
            obstacleX.current = width; 
            
            // ✅ PUANLAMA İLK OYUNLA AYNI HALE GETİRİLDİ (+10)
            scoreRef.current += 10;
            setScore(scoreRef.current); 
            
            setObstacleEmoji(OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)]);
            gameSpeed.current += 0.2; 
            
            checkEvolution(scoreRef.current);
        }

        const playerHitbox = { x: 50, y: height - GROUND_HEIGHT - PLAYER_SIZE + playerY.current, w: PLAYER_SIZE - 20, h: PLAYER_SIZE - 20 };
        const obstacleHitbox = { x: obstacleX.current + 10, y: height - GROUND_HEIGHT - OBSTACLE_SIZE + 10, w: OBSTACLE_SIZE - 20, h: OBSTACLE_SIZE - 20 };

        if (
            playerHitbox.x < obstacleHitbox.x + obstacleHitbox.w &&
            playerHitbox.x + playerHitbox.w > obstacleHitbox.x &&
            playerHitbox.y < obstacleHitbox.y + obstacleHitbox.h &&
            playerHitbox.h + playerHitbox.y > obstacleHitbox.y
        ) {
            // ✅ EKSİK PUAN GİTMESİN DİYE DİREKT PARAMETRE YOLUYORUZ
            handleGameOver(scoreRef.current);
            return; 
        }

        playerYAnim.setValue(playerY.current);
        obstacleXAnim.setValue(obstacleX.current);

        requestRef.current = requestAnimationFrame(gameLoop);
    };

    const checkEvolution = (currentScore) => {
        const stage = [...EVOLUTION_STAGES].reverse().find(s => currentScore >= s.score);
        
        if (stage && stage.name !== character.name) {
            setCharacter(stage); 
            showNotification(`${t.levelUp} ${stage.emoji}`);
            playSound('match_success'); 
        } else if (currentScore % 100 === 0 && currentScore > 0) { // Puanlamaya göre uyarlandı
            showNotification(t.speedUp);
        }
    };

    const showNotification = (text) => {
        setNotification(text);
        setTimeout(() => setNotification(''), 1500);
    };

    const handleJump = () => {
        if (!isPlaying || gameOver || isSaving) return; 
        
        if (!isJumping.current) {
            playSound('jump'); 
            playerVelocity.current = JUMP_FORCE;
            isJumping.current = true;
        }
    };

    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return (
        <TouchableWithoutFeedback onPress={handleJump}>
            <SafeAreaView style={[styles.container, { backgroundColor: character.color + '40' }]}>
                <StatusBar hidden />
                
                <View style={styles.topHud}>
                    <Text style={[styles.scoreText, { color: character.color }]}>{t.score}: {score}</Text>
                    {notification ? (
                        <Animated.View style={styles.notifBadge}>
                            <Text style={styles.notifText}>{notification}</Text>
                        </Animated.View>
                    ) : null}
                </View>

                <View style={styles.sky}>
                    <Ionicons name="cloud" size={100} color="rgba(255,255,255,0.6)" style={{position:'absolute', top: 50, right: 40}} />
                    <Ionicons name="cloud" size={60} color="rgba(255,255,255,0.4)" style={{position:'absolute', top: 150, left: 20}} />
                </View>

                <View style={styles.gameArea}>
                    
                    <Animated.View style={[
                        styles.player, 
                        { transform: [{ translateY: playerYAnim }] }
                    ]}>
                        <Text style={{fontSize: PLAYER_SIZE}}>{character.emoji}</Text>
                    </Animated.View>

                    <Animated.View style={[
                        styles.obstacle, 
                        { transform: [{ translateX: obstacleXAnim }] }
                    ]}>
                        <Text style={{fontSize: OBSTACLE_SIZE}}>{obstacleEmoji}</Text>
                    </Animated.View>

                    <View style={[styles.ground, { borderColor: character.color }]}>
                        <View style={styles.grassTop} />
                        <Text style={styles.groundText}>RUN {character.name.toUpperCase()} RUN</Text>
                    </View>
                </View>

                <Modal transparent={true} animationType="fade" visible={!isPlaying}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.menuBox}>
                            <View style={[styles.iconCircle, { backgroundColor: character.color }]}>
                                <Ionicons name={gameOver ? "skull" : "paw"} size={50} color="white" />
                            </View>

                            <Text style={styles.title}>{gameOver ? t.gameOver : "SONSUZ KOŞU"}</Text>
                            
                            {gameOver && (
                                <View style={{alignItems:'center', marginVertical:10}}>
                                    <Text style={styles.finalLabel}>{t.finalScore}</Text>
                                    <Text style={[styles.finalScore, { color: character.color }]}>{score}</Text>
                                    
                                    {/* ✅ Kayıt Animasyonu ve Bildirimi */}
                                    {isSaving ? (
                                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 10}}>
                                            <ActivityIndicator size="small" color={character.color} />
                                            <Text style={{marginLeft: 8, color: '#747d8c', fontWeight: 'bold'}}>{t.saving}</Text>
                                        </View>
                                    ) : isSaved ? (
                                        <Text style={{marginTop: 10, color: '#2ed573', fontWeight: 'bold'}}>{t.saved}</Text>
                                    ) : null}
                                </View>
                            )}

                            <Text style={styles.desc}>
                                {gameOver ? `${character.emoji} yoruldu!` : t.desc}
                            </Text>

                            <TouchableOpacity 
                                style={[styles.playBtn, { backgroundColor: isSaving ? '#ccc' : character.color }]} 
                                onPress={startGame}
                                disabled={isSaving}
                            >
                                <Text style={styles.playText}>{gameOver ? t.retry : t.start}</Text>
                                <Ionicons name="play" size={24} color="white" style={{marginLeft:10}} />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.exitBtn} 
                                onPress={() => navigation.goBack()}
                                disabled={isSaving}
                            >
                                <Text style={styles.exitText}>{t.exit}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#81ECEC' },
    
    topHud: { position: 'absolute', top: 40, width: '100%', alignItems: 'center', zIndex: 50 },
    scoreText: { fontSize: 32, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.2)', textShadowRadius: 5 },
    notifBadge: { marginTop: 10, backgroundColor: '#FFD700', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15, elevation: 5 },
    notifText: { color: 'black', fontWeight: 'bold', fontSize: 14 },

    gameArea: { flex: 1, position: 'relative' },
    sky: { position:'absolute', width:'100%', height:'100%' },

    player: {
        position: 'absolute',
        left: 50, 
        bottom: GROUND_HEIGHT, 
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },

    obstacle: {
        position: 'absolute',
        bottom: GROUND_HEIGHT, 
        left: 0, 
        width: OBSTACLE_SIZE,
        height: OBSTACLE_SIZE,
        zIndex: 9,
        justifyContent: 'center',
        alignItems: 'center'
    },

    ground: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: GROUND_HEIGHT,
        backgroundColor: '#57606f',
        borderTopWidth: 5,
        justifyContent: 'center',
        alignItems: 'center'
    },
    grassTop: {
        position: 'absolute',
        top: 0,
        width: '100%',
        height: 15,
        backgroundColor: '#2ed573' 
    },
    groundText: { color: 'rgba(255,255,255,0.1)', fontSize: 24, fontWeight: '900', letterSpacing: 2 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    menuBox: { width: '85%', backgroundColor: 'white', padding: 30, borderRadius: 30, alignItems: 'center', elevation: 20 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginTop: -70, marginBottom: 15, borderWidth: 5, borderColor: 'white' },
    title: { fontSize: 28, fontWeight: '900', color: '#2f3542', marginBottom: 5 },
    desc: { textAlign: 'center', color: '#747d8c', marginBottom: 25, fontSize: 15, lineHeight: 22 },
    
    finalLabel: { fontSize: 12, fontWeight: 'bold', color: '#a4b0be' },
    finalScore: { fontSize: 50, fontWeight: '900' },

    playBtn: { flexDirection: 'row', width: '100%', paddingVertical: 16, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 5, marginBottom: 15 },
    playText: { color: 'white', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 },
    exitBtn: { padding: 10 },
    exitText: { color: '#a4b0be', fontWeight: 'bold', fontSize: 16 }
});

export default EndlessRunnerScreen;