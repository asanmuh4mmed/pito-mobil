import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, StatusBar, Modal, Animated, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { GameContext, GAME_IDS } from '../context/GameContext'; 
import { playSound } from '../utils/SoundManager'; 

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 4; 

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼']; 

const TRANSLATIONS = {
    TR: {
        title: "Pati Eşleştirme",
        moves: "Hamle",
        timeUp: "SÜRE BİTTİ! ⏳",
        congrats: "TEBRİKLER! 🎉",
        totalScore: "TOPLAM PUAN",
        playAgain: "TEKRAR OYNA",
        exit: "Çıkış Yap",
        time: "Süre",
        saving: "Liderlik Tablosuna Kaydediliyor...",
        saved: "Puanlar Tabloya Eklendi! 🏆"
    },
    AU: {
        title: "Paw Match",
        moves: "Moves",
        timeUp: "TIME'S UP! ⏳",
        congrats: "CONGRATS! 🎉",
        totalScore: "TOTAL SCORE",
        playAgain: "PLAY AGAIN",
        exit: "Exit",
        time: "Time",
        saving: "Saving to Leaderboard...",
        saved: "Points Added to Board! 🏆"
    }
};

const Card = ({ item, onPress, isFlipped, isMatched }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(animatedValue, {
            toValue: isFlipped || isMatched ? 180 : 0,
            friction: 8,
            tension: 10,
            useNativeDriver: true,
        }).start();
    }, [isFlipped, isMatched]);

    const frontAnimatedStyle = {
        transform: [{ rotateY: animatedValue.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] }) }]
    };
    const backAnimatedStyle = {
        transform: [{ rotateY: animatedValue.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] }) }]
    };

    return (
        <TouchableOpacity activeOpacity={1} onPress={onPress} style={styles.cardContainer}>
            <Animated.View style={[styles.card, styles.cardBack, frontAnimatedStyle, { backfaceVisibility: 'hidden', position: 'absolute' }]}> 
                <Ionicons name="paw" size={32} color="rgba(255,255,255,0.6)" />
            </Animated.View>

            <Animated.View style={[styles.card, styles.cardFront, backAnimatedStyle, isMatched && styles.cardMatched, { backfaceVisibility: 'hidden' }]}> 
                <Text style={styles.cardEmoji}>{item.emoji}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
};

const MemoryGameScreen = ({ navigation }) => {
    const { country } = useContext(AuthContext);
    const { saveGameScore } = useContext(GameContext); 
    const t = TRANSLATIONS[country?.code === 'AU' ? 'AU' : 'TR'];

    const [cards, setCards] = useState([]);
    const [flippedIndices, setFlippedIndices] = useState([]); 
    const [matchedIds, setMatchedIds] = useState([]); 
    const [score, setScore] = useState(0);
    const [moves, setMoves] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [isSaving, setIsSaving] = useState(false); 
    const [isSaved, setIsSaved] = useState(false);   

    const timerRef = useRef(null);

    useEffect(() => {
        startNewGame();
        return () => clearInterval(timerRef.current);
    }, []);

    useEffect(() => {
        if (timeLeft > 0 && !gameOver && !gameWon) {
            timerRef.current = setInterval(() => setTimeLeft(p => p - 1), 1000);
        } else if (timeLeft === 0) {
            clearInterval(timerRef.current);
            handleGameOver(false); 
        }
        return () => clearInterval(timerRef.current);
    }, [timeLeft, gameOver, gameWon]);

    const handleGameOver = async (isWin, finalScore = 0) => {
        clearInterval(timerRef.current);
        if (isWin) {
            setGameWon(true);
            playSound('game_win');
            
            if (finalScore > 0) {
                setIsSaving(true);
                try {
                    await saveGameScore(GAME_IDS.MEMORY, finalScore); 
                    setIsSaved(true);
                } catch (error) {
                    console.log("Skor kaydedilirken hata:", error);
                } finally {
                    setIsSaving(false);
                }
            }
        } else {
            setGameOver(true);
            playSound('game_over');
            
            // Eğer süre bitip yandıysa ama yinede bir şeyler eşleştirdiyse o puanı da kaydet
            if (score > 0) {
                setIsSaving(true);
                try {
                    await saveGameScore(GAME_IDS.MEMORY, score); 
                    setIsSaved(true);
                } catch (error) {
                    console.log("Skor kaydedilirken hata:", error);
                } finally {
                    setIsSaving(false);
                }
            }
        }
    };

    const startNewGame = () => {
        const gameCards = [...EMOJIS, ...EMOJIS]
            .sort(() => Math.random() - 0.5)
            .map((emoji, index) => ({ id: index, emoji, isMatched: false }));

        setCards(gameCards);
        setFlippedIndices([]);
        setMatchedIds([]);
        setScore(0);
        setMoves(0);
        setTimeLeft(60);
        setGameOver(false);
        setGameWon(false);
        setIsProcessing(false);
        setIsSaving(false);
        setIsSaved(false);
    };

    const handleCardPress = (index) => {
        if (gameOver || gameWon || isProcessing || isSaving || flippedIndices.includes(index) || matchedIds.includes(cards[index].id)) return;

        playSound('card_flip'); 
        const newFlipped = [...flippedIndices, index];
        setFlippedIndices(newFlipped);

        if (newFlipped.length === 2) {
            setIsProcessing(true);
            setMoves(m => m + 1);

            const [first, second] = newFlipped;
            if (cards[first].emoji === cards[second].emoji) {
                playSound('match_success'); 
                setMatchedIds(prev => [...prev, cards[first].id, cards[second].id]);
                
                // ✅ PUANLAMA DEĞİŞTİ: Diğer oyunlarla aynı olması için HER EŞLEŞTİRME 10 PUAN
                // Eğer istersen bitişte süre bonusu ekleyebilirsin ama temel puan 10 oldu.
                const newScore = score + 10;
                setScore(newScore);
                
                setFlippedIndices([]);
                setIsProcessing(false);

                if (matchedIds.length + 2 === cards.length) {
                    // Tüm kartlar eşleştiğinde oyunu bitir ve kalan süreyi de puan olarak ekle (Opsiyonel: Kalan her saniye = 1 Puan)
                    const timeBonus = timeLeft; 
                    const totalFinalScore = newScore + timeBonus;
                    setScore(totalFinalScore); // Ekranda görünsün diye güncelliyoruz
                    handleGameOver(true, totalFinalScore); 
                }
            } else {
                setTimeout(() => {
                    setFlippedIndices([]);
                    setIsProcessing(false);
                }, 800);
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#FF7675" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} disabled={isSaving}>
                    <Ionicons name="arrow-back" size={24} color="#FF7675" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>{t.title}</Text>
                    <Text style={styles.subtitle}>{moves} {t.moves}</Text>
                </View>
                <View style={[styles.timerBadge, timeLeft < 10 && styles.timerWarning]}>
                    <Ionicons name="time" size={16} color="white" />
                    <Text style={styles.timerText}>{timeLeft}</Text>
                </View>
            </View>

            <View style={styles.gridContainer}>
                <FlatList 
                    data={cards}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item, index }) => (
                        <Card 
                            item={item} 
                            index={index} 
                            onPress={() => handleCardPress(index)}
                            isFlipped={flippedIndices.includes(index)}
                            isMatched={matchedIds.includes(item.id)}
                        />
                    )}
                    numColumns={4}
                    scrollEnabled={false}
                    columnWrapperStyle={styles.columnWrapper}
                />
            </View>

            <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>SKOR</Text>
                <Text style={styles.scoreText}>{score}</Text>
            </View>

            <Modal transparent={true} animationType="slide" visible={gameOver || gameWon}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.iconCircle, { backgroundColor: gameWon ? '#55EFC4' : '#FF7675' }]}>
                            <Ionicons name={gameWon ? "trophy" : "time"} size={50} color="white" />
                        </View>
                        
                        <Text style={styles.modalTitle}>{gameWon ? t.congrats : t.timeUp}</Text>
                        <Text style={styles.modalScoreLabel}>{t.totalScore}</Text>
                        <Text style={[styles.modalScoreValue, { color: gameWon ? '#00B894' : '#D63031', marginBottom: isSaving || isSaved ? 5 : 20 }]}>
                            {score}
                        </Text>

                        {isSaving ? (
                            <View style={styles.savingContainer}>
                                <ActivityIndicator size="small" color="#00B894" />
                                <Text style={styles.savingText}>{t.saving}</Text>
                            </View>
                        ) : isSaved ? (
                            <Text style={styles.savedText}>{t.saved}</Text>
                        ) : null}

                        <View style={styles.statRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statVal}>{moves}</Text>
                                <Text style={styles.statLabel}>{t.moves}</Text>
                            </View>
                            <View style={[styles.statItem, { borderLeftWidth:1, borderColor:'#eee' }]}>
                                <Text style={styles.statVal}>{60 - timeLeft}s</Text>
                                <Text style={styles.statLabel}>{t.time}</Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[styles.modalBtn, { backgroundColor: isSaving ? '#ccc' : (gameWon ? '#00B894' : '#FF7675') }]} 
                            onPress={startNewGame}
                            disabled={isSaving}
                        >
                            <Text style={styles.modalBtnText}>{t.playAgain}</Text>
                            <Ionicons name="refresh" size={20} color="white" style={{marginLeft: 8}} />
                        </TouchableOpacity>

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
    container: { flex: 1, backgroundColor: '#FF7675' }, 

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 3 },
    headerInfo: { alignItems: 'center' },
    title: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
    timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    timerWarning: { backgroundColor: '#D63031' },
    timerText: { color: 'white', fontWeight: 'bold', marginLeft: 5, fontSize: 16 },

    gridContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
    columnWrapper: { justifyContent: 'space-between', marginBottom: 15 },
    
    cardContainer: { width: CARD_SIZE, height: CARD_SIZE, marginHorizontal: 5 },
    card: { width: '100%', height: '100%', borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset:{width:0, height:3}, shadowOpacity:0.2 },
    cardBack: { backgroundColor: '#6C5CE7', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
    cardFront: { backgroundColor: 'white' },
    cardMatched: { backgroundColor: '#55EFC4', opacity: 0.8 },
    cardEmoji: { fontSize: 38 },

    scoreContainer: { alignItems: 'center', paddingBottom: 30, paddingTop: 10 },
    scoreLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    scoreText: { color: 'white', fontSize: 36, fontWeight: '900', textShadowColor:'rgba(0,0,0,0.2)', textShadowRadius: 5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 30, padding: 30, alignItems: 'center', elevation: 20 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginTop: -70, marginBottom: 15, borderWidth: 5, borderColor: 'white' },
    modalTitle: { fontSize: 24, fontWeight: '900', color: '#2D3436', marginBottom: 10 },
    modalScoreLabel: { fontSize: 12, fontWeight: 'bold', color: '#B2BEC3', letterSpacing: 1 },
    modalScoreValue: { fontSize: 48, fontWeight: '900' },
    
    savingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    savingText: { marginLeft: 8, color: '#747d8c', fontWeight: 'bold' },
    savedText: { marginBottom: 15, color: '#00B894', fontWeight: 'bold' },

    statRow: { flexDirection: 'row', width: '100%', marginBottom: 25, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee', paddingVertical: 15 },
    statItem: { flex: 1, alignItems: 'center' },
    statVal: { fontSize: 20, fontWeight: 'bold', color: '#2D3436' },
    statLabel: { fontSize: 12, color: '#636E72' },
    modalBtn: { flexDirection: 'row', width: '100%', paddingVertical: 16, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 5, marginBottom: 15 },
    modalBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
    modalExitBtn: { padding: 10 },
    modalExitText: { color: '#B2BEC3', fontWeight: 'bold' }
});

export default MemoryGameScreen;