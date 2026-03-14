import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, StatusBar, Modal, Animated, ActivityIndicator, Easing 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { GameContext, GAME_IDS } from '../context/GameContext'; 
import { playSound } from '../utils/SoundManager'; 

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 4; 

// --- SEVİYE AYARLARI VE TEMALAR ---
const LEVELS = [
    { level: 1, time: 120, emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'], bg: '#FF7675', cardBg: '#6C5CE7', title: "Hayvan Dostlar" },
    { level: 2, time: 60, emojis: ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🍑', '🍍'], bg: '#00b894', cardBg: '#e17055', title: "Meyve Sepeti" },
    { level: 3, time: 45, emojis: ['🍔', '🍕', '🍟', '🌭', '🍿', '🍩', '🍪', '🍫'], bg: '#0984e3', cardBg: '#fdcb6e', title: "Fast Food" },
    { level: 4, time: 35, emojis: ['🌍', '🌕', '🌞', '⭐', '☄️', '🪐', '🚀', '🛸'], bg: '#2d3436', cardBg: '#00cec9', title: "Uzay Macerası" },
    { level: 5, time: 20, emojis: ['🔥', '⚡', '💥', '🧨', '💣', '🐉', '🦖', '👹'], bg: '#d63031', cardBg: '#2d3436', title: "Ateşli Final", isFire: true }
];

const TRANSLATIONS = {
    TR: {
        moves: "Hamle",
        timeUp: "SÜRE BİTTİ! ⏳",
        congrats: "SEVİYE TAMAMLANDI! 🎉",
        gameFinish: "MÜKEMMEL ZAFER! 🏆",
        totalScore: "KAZANILAN PUAN",
        playAgain: "BAŞA DÖN VE OYNA",
        nextLevel: "SONRAKİ SEVİYE (+100 Puan)",
        exit: "Çıkış Yap",
        time: "Süre",
        saving: "Kaydediliyor...",
        saved: "Skor Hesabına Eklendi! 🏆",
        jackpot: "+1000 PUAN JACKPOT!"
    },
    AU: {
        moves: "Moves",
        timeUp: "TIME'S UP! ⏳",
        congrats: "LEVEL CLEARED! 🎉",
        gameFinish: "FLAWLESS VICTORY! 🏆",
        totalScore: "EARNED SCORE",
        playAgain: "RESTART GAME",
        nextLevel: "NEXT LEVEL (+100 Pts)",
        exit: "Exit",
        time: "Time",
        saving: "Saving...",
        saved: "Score Added to Account! 🏆",
        jackpot: "+1000 POINTS JACKPOT!"
    }
};

// --- ANİMASYONLU KART BİLEŞENİ ---
const Card = ({ item, index, onPress, isFlipped, isMatched, currentLevelData }) => {
    const flipAnim = useRef(new Animated.Value(0)).current;
    const enterAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(enterAnim, {
            toValue: 1,
            duration: 400,
            delay: index * 50, 
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
        }).start();
    }, [currentLevelData]);

    useEffect(() => {
        Animated.spring(flipAnim, {
            toValue: isFlipped || isMatched ? 180 : 0,
            friction: 8,
            tension: 10,
            useNativeDriver: true,
        }).start();
    }, [isFlipped, isMatched]);

    const frontAnimatedStyle = {
        transform: [{ rotateY: flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] }) }]
    };
    const backAnimatedStyle = {
        transform: [{ rotateY: flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] }) }]
    };

    const translateY = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });
    const scale = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

    return (
        <Animated.View style={[styles.cardContainer, { transform: [{ translateY }, { scale }], opacity: enterAnim }]}>
            <TouchableOpacity activeOpacity={1} onPress={onPress} style={{ width: '100%', height: '100%' }}>
                
                <Animated.View style={[
                    styles.card, frontAnimatedStyle, 
                    { backgroundColor: currentLevelData.cardBg, backfaceVisibility: 'hidden', position: 'absolute', borderColor: currentLevelData.isFire ? '#ff7675' : 'rgba(255,255,255,0.2)' }
                ]}> 
                    <Ionicons name={currentLevelData.isFire ? "flame" : "paw"} size={32} color={currentLevelData.isFire ? "#ff7675" : "rgba(255,255,255,0.6)"} />
                </Animated.View>

                <Animated.View style={[styles.card, styles.cardFront, backAnimatedStyle, isMatched && styles.cardMatched, { backfaceVisibility: 'hidden' }]}> 
                    <Text style={styles.cardEmoji}>{item.emoji}</Text>
                </Animated.View>

            </TouchableOpacity>
        </Animated.View>
    );
};

const MemoryGameScreen = ({ navigation }) => {
    const { country } = useContext(AuthContext);
    const { saveGameScore } = useContext(GameContext); 
    const t = TRANSLATIONS[country?.code === 'AU' ? 'AU' : 'TR'];

    const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
    const currentLevelData = LEVELS[currentLevelIndex];

    const [cards, setCards] = useState([]);
    const [flippedIndices, setFlippedIndices] = useState([]); 
    const [matchedIds, setMatchedIds] = useState([]); 
    const [score, setScore] = useState(0); // Sadece o levelin skorunu tutar
    const [moves, setMoves] = useState(0);
    const [timeLeft, setTimeLeft] = useState(currentLevelData.time);
    
    const [levelCompleted, setLevelCompleted] = useState(false);
    const [gameOver, setGameOver] = useState(false); 
    const [gameWon, setGameWon] = useState(false);   
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false); 
    const [isSaved, setIsSaved] = useState(false);   

    const timerRef = useRef(null);
    const scoreRef = useRef(0); // O bölümdeki toplam geçici skoru tutar

    // --- SEVİYE BAŞLATICI ---
    useEffect(() => {
        startLevel(currentLevelIndex);
        return () => clearInterval(timerRef.current);
    }, [currentLevelIndex]);

    const startLevel = (index) => {
        const lvlData = LEVELS[index];
        const gameCards = [...lvlData.emojis, ...lvlData.emojis]
            .sort(() => Math.random() - 0.5)
            .map((emoji, i) => ({ id: i, emoji, isMatched: false }));

        setCards(gameCards);
        setFlippedIndices([]);
        setMatchedIds([]);
        setMoves(0);
        setTimeLeft(lvlData.time);
        
        scoreRef.current = 0; // Her yeni levelde o levelin skoru sıfırdan başlar
        setScore(0);
        
        setLevelCompleted(false);
        setGameOver(false);
        setGameWon(false);
        setIsProcessing(false);
        setIsSaving(false);
        setIsSaved(false);
    };

    // --- ZAMANLAYICI ---
    useEffect(() => {
        if (timeLeft > 0 && !gameOver && !levelCompleted && !gameWon) {
            timerRef.current = setInterval(() => setTimeLeft(p => p - 1), 1000);
        } else if (timeLeft === 0 && !levelCompleted && !gameWon) {
            clearInterval(timerRef.current);
            handleGameOver(); 
        }
        return () => clearInterval(timerRef.current);
    }, [timeLeft, gameOver, levelCompleted, gameWon]);

    // --- OYUN BİTİŞ (YANMA) ---
    const handleGameOver = async () => {
        clearInterval(timerRef.current);
        setGameOver(true);
        playSound('gameover'); 
        
        if (scoreRef.current > 0) {
            setIsSaving(true);
            try {
                await saveGameScore(GAME_IDS.MEMORY, scoreRef.current); 
                setIsSaved(true);
            } catch (error) {
                console.log("Skor kaydedilirken hata:", error);
            } finally {
                setIsSaving(false);
            }
        }
    };

    // --- SEVİYE TAMAMLAMA ---
    const handleLevelComplete = async () => {
        clearInterval(timerRef.current);
        playSound('match_success'); 

        // Kalan Süre Bonusu
        const timeBonus = timeLeft * 2; 
        scoreRef.current += timeBonus;
        
        // Eğer 5. Seviyeyse (Son Seviye) JACKPOT!
        if (currentLevelIndex === LEVELS.length - 1) {
            scoreRef.current += 1000; // Jackpot eklendi
            setScore(scoreRef.current);
            setGameWon(true);
            playSound('success2'); 
            
            // Tüm oyun bitti, final skoru kaydet
            setIsSaving(true);
            try {
                await saveGameScore(GAME_IDS.MEMORY, scoreRef.current); 
                setIsSaved(true);
            } catch (error) {
                console.log("Skor kaydedilirken hata:", error);
            } finally {
                setIsSaving(false);
            }
        } else {
            // Ara seviye bittiğinde SADECE bekle, "Sonraki Seviye" butonuna basınca kaydedecek
            setScore(scoreRef.current);
            setLevelCompleted(true);
        }
    };

    // --- KART TIKLAMA ---
    const handleCardPress = (index) => {
        if (gameOver || levelCompleted || gameWon || isProcessing || flippedIndices.includes(index) || matchedIds.includes(cards[index].id)) return;

        playSound('card_flip'); 
        const newFlipped = [...flippedIndices, index];
        setFlippedIndices(newFlipped);

        if (newFlipped.length === 2) {
            setIsProcessing(true);
            setMoves(m => m + 1);

            const [first, second] = newFlipped;
            if (cards[first].emoji === cards[second].emoji) {
                playSound('success1'); 
                setMatchedIds(prev => [...prev, cards[first].id, cards[second].id]);
                
                scoreRef.current += 20; // Eşleşme 20 Puan
                setScore(scoreRef.current);
                
                setFlippedIndices([]);
                setIsProcessing(false);

                // TÜM KARTLAR BİTTİ Mİ?
                if (matchedIds.length + 2 === cards.length) {
                    handleLevelComplete();
                }
            } else {
                setTimeout(() => {
                    setFlippedIndices([]);
                    setIsProcessing(false);
                }, 700);
            }
        }
    };

    // ✅ YENİ: SONRAKİ SEVİYEYE GEÇİŞ VE PUAN KAYDETME
    const nextLevel = async () => {
        if (isSaving) return;
        
        // Oynanan Seviyenin Skoru + Seviye Atlama Ödülü (+100) veritabanına kaydedilir
        const levelBonus = 100;
        const totalLevelScore = scoreRef.current + levelBonus;
        
        setIsSaving(true);
        try {
            await saveGameScore(GAME_IDS.MEMORY, totalLevelScore);
            // Kayıt başarılıysa sonraki seviyeye geç
            if (currentLevelIndex < LEVELS.length - 1) {
                setCurrentLevelIndex(prev => prev + 1);
            }
        } catch (error) {
            console.log("Seviye puanı kaydedilemedi", error);
        } finally {
            setIsSaving(false);
        }
    };

    const restartFullGame = () => {
        scoreRef.current = 0;
        setScore(0);
        setCurrentLevelIndex(0);
        startLevel(0);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentLevelData.bg }]}>
            <StatusBar barStyle="light-content" backgroundColor={currentLevelData.bg} />

            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} disabled={isSaving}>
                    <Ionicons name="close" size={24} color={currentLevelData.bg} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>Seviye {currentLevelData.level}: {currentLevelData.title}</Text>
                    <Text style={styles.subtitle}>{moves} {t.moves}</Text>
                </View>
                <View style={[styles.timerBadge, timeLeft <= 10 && styles.timerWarning]}>
                    <Ionicons name="time" size={16} color="white" />
                    <Text style={styles.timerText}>{timeLeft}</Text>
                </View>
            </View>

            {/* OYUN ALANI (GRID) */}
            <View style={styles.gridContainer}>
                <FlatList 
                    key={currentLevelIndex} 
                    data={cards}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item, index }) => (
                        <Card 
                            item={item} 
                            index={index} 
                            onPress={() => handleCardPress(index)}
                            isFlipped={flippedIndices.includes(index)}
                            isMatched={matchedIds.includes(item.id)}
                            currentLevelData={currentLevelData}
                        />
                    )}
                    numColumns={4}
                    scrollEnabled={false}
                    columnWrapperStyle={styles.columnWrapper}
                />
            </View>

            {/* MEVCUT SEVİYE SKORU */}
            <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>{t.totalScore}</Text>
                <Text style={styles.scoreText}>{score}</Text>
            </View>

            {/* MODAL */}
            <Modal transparent={true} animationType="fade" visible={gameOver || levelCompleted || gameWon}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, gameWon && { borderColor: '#FFD700', borderWidth: 4 }]}>
                        
                        <View style={[styles.iconCircle, { backgroundColor: gameOver ? '#d63031' : (gameWon ? '#FFD700' : currentLevelData.bg) }]}>
                            <Ionicons name={gameOver ? "skull" : "trophy"} size={45} color="white" />
                        </View>
                        
                        <Text style={styles.modalTitle}>
                            {gameOver ? t.timeUp : (gameWon ? t.gameFinish : t.congrats)}
                        </Text>

                        {gameWon && (
                            <Text style={styles.jackpotText}>{t.jackpot}</Text>
                        )}

                        <Text style={styles.modalScoreLabel}>{t.totalScore}</Text>
                        <Text style={[styles.modalScoreValue, { color: gameOver ? '#d63031' : '#00b894', marginBottom: isSaving || isSaved ? 5 : 20 }]}>
                            {score}
                        </Text>

                        {(gameOver || gameWon || isSaving) && (
                            <>
                                {isSaving ? (
                                    <View style={styles.savingContainer}>
                                        <ActivityIndicator size="small" color="#00B894" />
                                        <Text style={styles.savingText}>{t.saving}</Text>
                                    </View>
                                ) : isSaved ? (
                                    <Text style={styles.savedText}>{t.saved}</Text>
                                ) : null}
                            </>
                        )}

                        {/* BUTONLAR */}
                        {levelCompleted && !gameWon ? (
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: LEVELS[currentLevelIndex + 1]?.bg }]} 
                                onPress={nextLevel}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <Text style={styles.modalBtnText}>{t.nextLevel}</Text>
                                        <Ionicons name="arrow-forward" size={20} color="white" style={{marginLeft: 8}} />
                                    </>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity 
                                style={[styles.modalBtn, { backgroundColor: '#6C5CE7' }]} 
                                onPress={restartFullGame}
                                disabled={isSaving}
                            >
                                <Text style={styles.modalBtnText}>{t.playAgain}</Text>
                                <Ionicons name="refresh" size={20} color="white" style={{marginLeft: 8}} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity 
                            style={styles.modalExitBtn} 
                            onPress={() => navigation.goBack()}
                            disabled={isSaving}
                        >
                            <Text style={styles.modalExitText}>{t.exit}</Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, transition: 'background-color 0.5s' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 3 },
    headerInfo: { alignItems: 'center' },
    title: { color: 'white', fontSize: 18, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 2 },
    subtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 'bold' },
    
    timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    timerWarning: { backgroundColor: '#d63031', borderColor: '#ff7675' },
    timerText: { color: 'white', fontWeight: 'bold', marginLeft: 5, fontSize: 16 },

    gridContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
    columnWrapper: { justifyContent: 'space-between', marginBottom: 15 },
    
    cardContainer: { width: CARD_SIZE, height: CARD_SIZE, marginHorizontal: 5 },
    card: { width: '100%', height: '100%', borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset:{width:0, height:3}, shadowOpacity:0.3, borderWidth: 2 },
    cardFront: { backgroundColor: 'white', borderColor: '#eee' },
    cardMatched: { backgroundColor: '#55EFC4', borderColor: '#00b894', opacity: 0.9 },
    cardEmoji: { fontSize: 36 },

    scoreContainer: { alignItems: 'center', paddingBottom: 30, paddingTop: 10 },
    scoreLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
    scoreText: { color: 'white', fontSize: 42, fontWeight: '900', textShadowColor:'rgba(0,0,0,0.3)', textShadowRadius: 5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 30, padding: 30, alignItems: 'center', elevation: 20 },
    iconCircle: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginTop: -75, marginBottom: 15, borderWidth: 6, borderColor: 'white', elevation: 10 },
    modalTitle: { fontSize: 24, fontWeight: '900', color: '#2D3436', marginBottom: 5, textAlign: 'center' },
    jackpotText: { color: '#e17055', fontWeight: 'bold', fontSize: 16, marginBottom: 10, textAlign: 'center' },
    modalScoreLabel: { fontSize: 12, fontWeight: 'bold', color: '#B2BEC3', letterSpacing: 1, marginTop: 10 },
    modalScoreValue: { fontSize: 50, fontWeight: '900' },
    
    savingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    savingText: { marginLeft: 8, color: '#747d8c', fontWeight: 'bold' },
    savedText: { marginBottom: 15, color: '#00B894', fontWeight: 'bold' },

    modalBtn: { flexDirection: 'row', width: '100%', paddingVertical: 18, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 5, marginBottom: 15 },
    modalBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold', letterSpacing: 1 },
    modalExitBtn: { padding: 10 },
    modalExitText: { color: '#B2BEC3', fontWeight: 'bold', fontSize: 15 }
});

export default MemoryGameScreen;