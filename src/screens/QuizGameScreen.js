import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar, Modal, Animated, Easing, ActivityIndicator, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { GameContext } from '../context/GameContext'; 
import { supabase } from '../lib/supabase'; 
import { playSound } from '../utils/SoundManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- OYUN AYARLARI ---
const QUESTION_TIME = 15; 
const QUESTIONS_PER_LEVEL = 3; 

const CATEGORIES = [
    { id: 'animals', icon: 'paw', color: '#f59e0b', tr: 'Hayvanlar Alemi', au: 'Animal World' },
    { id: 'general', icon: 'earth', color: '#3b82f6', tr: 'Genel Kültür', au: 'General Knowledge' },
    { id: 'science', icon: 'flask', color: '#10b981', tr: 'Bilim & Doğa', au: 'Science & Nature' },
    { id: 'health', icon: 'medkit', color: '#ef4444', tr: 'Sağlık', au: 'Health' } // ✅ Sağlık Eklendi
];

// --- ZEKA SEVİYELERİ ---
const getIntelligenceRank = (level, isAU) => {
    if (level <= 2) return isAU ? { title: "Fish Memory 🐟", desc: "Did you just forget the question?" } : { title: "Balık Hafızası 🐟", desc: "Soruyu okurken unuttun galiba?" };
    if (level <= 4) return isAU ? { title: "Cute Cat 🐱", desc: "Smart when it wants to be!" } : { title: "Keyfi Yerinde Kedi 🐱", desc: "Sadece işine geleni biliyorsun!" };
    if (level <= 6) return isAU ? { title: "Loyal Dog 🐶", desc: "Eager to learn, good boy!" } : { title: "Heyecanlı Köpek 🐶", desc: "Öğrenmeye çok heveslisin!" };
    if (level <= 8) return isAU ? { title: "Sly Fox 🦊", desc: "You are getting tricky!" } : { title: "Kurnaz Tilki 🦊", desc: "Mantığını iyi kullanıyorsun!" };
    if (level <= 10) return isAU ? { title: "Wise Owl 🦉", desc: "A true observer of knowledge." } : { title: "Bilge Baykuş 🦉", desc: "Geceleri ansiklopedi mi okuyorsun?" };
    if (level <= 12) return isAU ? { title: "Smart Dolphin 🐬", desc: "Exceptionally bright mind!" } : { title: "Zeki Yunus 🐬", desc: "Beyninin kıvrımları parlıyor!" };
    if (level <= 14) return isAU ? { title: "Genius Raven 🐦‍⬛", desc: "You solve problems like a pro." } : { title: "Dahi Kuzgun 🐦‍⬛", desc: "Problem çözmek senin işin!" };
    return isAU ? { title: "Galactic Chimp 🦍", desc: "Unstoppable Professor Brain!" } : { title: "Galaktik Şempanze 🦍", desc: "Karşımızda duran bir profesör!" };
};

// Yedek (Fallback) Sorular - Bilmeceler Çıkarıldı, Sağlık Eklendi
const FALLBACK_QUESTIONS = [
    { cat: 'animals', difficulty: 1, tr: { q: "Kediler günün ortalama yüzde kaçını uyuyarak geçirir?", opts: ["%30", "%50", "%70", "%90"], ans: 2 }, au: { q: "Cats spend roughly what percentage of their day sleeping?", opts: ["30%", "50%", "70%", "90%"], ans: 2 } },
    { cat: 'general', difficulty: 1, tr: { q: "Dünyanın en uzun nehri hangisidir?", opts: ["Amazon", "Nil", "Yangtze", "Mississippi"], ans: 1 }, au: { q: "What is the longest river in the world?", opts: ["Amazon", "Nile", "Yangtze", "Mississippi"], ans: 1 } },
    { cat: 'science', difficulty: 1, tr: { q: "Suyun kimyasal formülü nedir?", opts: ["CO2", "H2O", "O2", "NaCl"], ans: 1 }, au: { q: "What is the chemical formula for water?", opts: ["CO2", "H2O", "O2", "NaCl"], ans: 1 } },
    { cat: 'health', difficulty: 1, tr: { q: "İnsan vücudundaki en büyük organ hangisidir?", opts: ["Kalp", "Mide", "Deri", "Beyin"], ans: 2 }, au: { q: "What is the largest organ in the human body?", opts: ["Heart", "Stomach", "Skin", "Brain"], ans: 2 } },
    { cat: 'health', difficulty: 2, tr: { q: "C vitamini eksikliğinde hangi hastalık görülür?", opts: ["Raşitizm", "İskorbüt", "Anemi", "Guatr"], ans: 1 }, au: { q: "Which disease is caused by Vitamin C deficiency?", "opts": ["Rickets", "Scurvy", "Anemia", "Goiter"], "ans": 1 } }
];

const TRANSLATIONS = {
    TR: {
        title: "Pito Bilgi Yarışı",
        chooseCat: "Kategori Seç",
        score: "PUAN",
        best: "REKORUNUZ",
        level: "SEVİYE",
        gameOver: "OYUN BİTTİ! 💥",
        levelUp: "SEVİYE ATLADIN! 🚀",
        saving: "Kaydediliyor...",
        saved: "Puan Eklendi! 🏆",
        playAgain: "TEKRAR OYNA",
        exit: "Çıkış Yap",
        loading: "Sorular Yükleniyor...",
        outOfQuestions: "Tüm soruları bildin!"
    },
    AU: {
        title: "Pito Trivia",
        chooseCat: "Choose Category",
        score: "SCORE",
        best: "YOUR BEST",
        level: "LEVEL",
        gameOver: "GAME OVER! 💥",
        levelUp: "LEVEL UP! 🚀",
        saving: "Saving...",
        saved: "Points Added! 🏆",
        playAgain: "PLAY AGAIN",
        exit: "Exit",
        loading: "Loading Questions...",
        outOfQuestions: "You answered all questions!"
    }
};

const QuizGameScreen = ({ navigation }) => {
    const { country } = useContext(AuthContext);
    const { saveGameScore } = useContext(GameContext);
    
    const isAU = country?.code === 'AU';
    const t = TRANSLATIONS[isAU ? 'AU' : 'TR'];

    // --- STATE'LER ---
    const [gameState, setGameState] = useState('CATEGORY_SELECT'); 
    const [allQuestions, setAllQuestions] = useState([]); 
    const [activeQuestion, setActiveQuestion] = useState(null);
    
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [correctCount, setCorrectCount] = useState(0); 
    const [lives, setLives] = useState(3); // ✅ 3 CAN SİSTEMİ
    
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [isAnswered, setIsAnswered] = useState(false);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [intelRank, setIntelRank] = useState(null);

    // --- ANİMASYON VE TAKİP REFLERİ ---
    const timerAnimWidth = useRef(new Animated.Value(SCREEN_WIDTH - 40)).current; 
    const levelUpAnim = useRef(new Animated.Value(0)).current;
    const cardScaleAnim = useRef(new Animated.Value(0.9)).current;
    const timerRef = useRef(null);
    
    // Asenkron işlemlerde güncel kalmaları için Referanslar
    const levelRef = useRef(1);
    const livesRef = useRef(3);
    const usedQuestionsRef = useRef([]); // ✅ ÇIKAN SORULARI TUTAN HAFIZA

    useEffect(() => {
        loadBestScore();
        return () => clearInterval(timerRef.current);
    }, []);

    const loadBestScore = async () => {
        const saved = await AsyncStorage.getItem('pito_quiz_best');
        if (saved) setBestScore(parseInt(saved));
    };

    const fetchQuestions = async (catId) => {
        setGameState('LOADING');
        try {
            const { data, error } = await supabase
                .from('quiz_questions')
                .select('*')
                .eq('category', catId);
                
            let loadedData = [];
            if (error || !data || data.length === 0) {
                console.log("Supabase'den çekilemedi, yedek sorular kullanılıyor.");
                loadedData = FALLBACK_QUESTIONS.filter(q => q.cat === catId);
            } else {
                loadedData = data;
            }
            
            setAllQuestions(loadedData);
            startGame(loadedData);

        } catch (err) {
            const fallbackData = FALLBACK_QUESTIONS.filter(q => q.cat === catId);
            setAllQuestions(fallbackData);
            startGame(fallbackData);
        }
    };

    const selectCategory = (catId) => {
        playSound('button_click');
        fetchQuestions(catId);
    };

    const startGame = (fetchedQuestions) => {
        setScore(0);
        setLevel(1);
        levelRef.current = 1;
        setCorrectCount(0);
        setLives(3);
        livesRef.current = 3;
        usedQuestionsRef.current = []; // Hafızayı sıfırla
        setIsSaved(false);
        setGameState('PLAYING');
        
        loadNextQuestion(1, fetchedQuestions); 
    };

    const loadNextQuestion = (currentLevel, directData = null) => {
        setIsAnswered(false);
        setSelectedAnswer(null);
        setTimeLeft(QUESTION_TIME);
        
        const sourceData = directData || allQuestions;

        // ✅ 1. KURAL: ÇIKAN SORULARI FİLTRELE
        const unusedQuestions = sourceData.filter(q => {
            const identifier = q.id || q.tr.q; // ID yoksa soru metnini baz al
            return !usedQuestionsRef.current.includes(identifier);
        });

        // Eğer o kategorideki tüm sorular bittiyse (Harika oynadı!)
        if (unusedQuestions.length === 0) {
            triggerGameOver(currentLevel, true);
            return;
        }

        // ✅ 2. KURAL: ZORLUK SEVİYESİNE GÖRE FİLTRELE
        let targetDifficulty = 1; 
        if (currentLevel >= 6 && currentLevel <= 10) targetDifficulty = 2; 
        if (currentLevel > 10) targetDifficulty = 3; 

        let availableQuestions = unusedQuestions.filter(q => q.difficulty === targetDifficulty);
        
        // Eğer o zorlukta soru kalmadıysa, kalanlardan rastgele ver
        if (availableQuestions.length === 0) {
            availableQuestions = unusedQuestions;
        }

        // Rastgele seç ve Hafızaya Kaydet
        const randomQ = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        setActiveQuestion(randomQ);
        
        const qIdentifier = randomQ.id || randomQ.tr.q;
        usedQuestionsRef.current.push(qIdentifier);
        
        cardScaleAnim.setValue(0.8);
        Animated.spring(cardScaleAnim, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }).start();

        timerAnimWidth.setValue(SCREEN_WIDTH - 40);
        Animated.timing(timerAnimWidth, {
            toValue: 0,
            duration: QUESTION_TIME * 1000,
            easing: Easing.linear,
            useNativeDriver: false
        }).start();

        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    setIsAnswered(true); // Tıklamayı engelle
                    handleWrongAnswer(); // Süre bitince yanlış sayılır
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // ✅ CAN KAYBETME MANTIĞI
    const handleWrongAnswer = () => {
        livesRef.current -= 1;
        setLives(livesRef.current);
        
        if (livesRef.current <= 0) {
            playSound('gameover');
            setTimeout(() => triggerGameOver(levelRef.current), 1000);
        } else {
            playSound('bubble_pop'); // Yanlış bildi, canı gitti sesi
            setTimeout(() => loadNextQuestion(levelRef.current), 1200);
        }
    };

    const handleAnswer = (index) => {
        if (isAnswered || !activeQuestion) return;
        setIsAnswered(true);
        clearInterval(timerRef.current); 
        timerAnimWidth.stopAnimation();

        setSelectedAnswer(index);
        const correctIndex = isAU ? activeQuestion.au.ans : activeQuestion.tr.ans;

        if (index === correctIndex) {
            playSound('success1'); 
            const newScore = score + 10;
            setScore(newScore);
            
            const newCorrectCount = correctCount + 1;
            setCorrectCount(newCorrectCount);

            let nextLevel = levelRef.current;

            if (newCorrectCount % QUESTIONS_PER_LEVEL === 0) {
                nextLevel += 1;
                setLevel(nextLevel);
                levelRef.current = nextLevel;
                showLevelUpAnimation();
                playSound('success2'); 
                setScore(s => s + 50); 
            }

            setTimeout(() => loadNextQuestion(nextLevel), 1200);

        } else {
            handleWrongAnswer(); // Yanlış cevabı işleyen yeni fonksiyon
        }
    };

    const triggerGameOver = async (finalLevel, isWin = false) => {
        setIntelRank(getIntelligenceRank(finalLevel, isAU));
        // Eğer tüm soruları bilip kazanırsa farklı bir state kullanılabilir, şimdilik Gameover ekranı
        setGameState('GAMEOVER');
        
        if (score > bestScore) {
            setBestScore(score);
            AsyncStorage.setItem('pito_quiz_best', score.toString());
        }

        if (score > 0 && saveGameScore) {
            setIsSaving(true);
            try {
                await saveGameScore('7', score);
                setIsSaved(true);
            } catch (err) {
                console.log(err);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const showLevelUpAnimation = () => {
        levelUpAnim.setValue(0);
        Animated.sequence([
            Animated.timing(levelUpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(levelUpAnim, { toValue: 0, duration: 500, delay: 1000, useNativeDriver: true })
        ]).start();
    };

    // --- RENDER FONKSİYONLARI ---

    const renderCategorySelect = () => (
        <View style={styles.centerContainer}>
            
            {/* ✅ ANA EKRAN REKOR GÖSTERİMİ */}
            <View style={styles.bestScoreContainer}>
                <Ionicons name="trophy" size={24} color="#f59e0b" />
                <View style={{ marginLeft: 10 }}>
                    <Text style={styles.bestScoreLabel}>{t.best}</Text>
                    <Text style={styles.bestScoreValue}>{bestScore} {t.score}</Text>
                </View>
            </View>

            <View style={styles.pulseCircle}>
                <Ionicons name="brain" size={50} color="#38bdf8" />
            </View>
            <Text style={styles.titleText}>{t.chooseCat}</Text>
            
            <View style={styles.gridContainer}>
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity 
                        key={cat.id} 
                        style={[styles.catCard, { borderColor: cat.color }]} 
                        activeOpacity={0.8}
                        onPress={() => selectCategory(cat.id)}
                    >
                        <View style={[styles.iconBg, { backgroundColor: `${cat.color}20` }]}>
                            <Ionicons name={cat.icon} size={32} color={cat.color} />
                        </View>
                        <Text style={styles.catText}>{isAU ? cat.au : cat.tr}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderLoading = () => (
        <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={[styles.titleText, { marginTop: 20 }]}>{t.loading}</Text>
        </View>
    );

    const renderPlaying = () => {
        if (!activeQuestion) return null;
        const qData = isAU ? activeQuestion.au : activeQuestion.tr;
        const barColor = timerAnimWidth.interpolate({
            inputRange: [0, (SCREEN_WIDTH - 40) / 2, SCREEN_WIDTH - 40],
            outputRange: ['#ef4444', '#f59e0b', '#10b981']
        });

        return (
            <View style={styles.playingContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => { clearInterval(timerRef.current); setGameState('CATEGORY_SELECT'); }} style={styles.iconBtn}>
                        <Ionicons name="close" size={26} color="white" />
                    </TouchableOpacity>
                    
                    {/* ✅ CAN (KALP) GÖSTERGESİ */}
                    <View style={styles.livesContainer}>
                        {[1, 2, 3].map((heart) => (
                            <Ionicons 
                                key={heart} 
                                name={heart <= lives ? "heart" : "heart-outline"} 
                                size={28} 
                                color={heart <= lives ? "#ef4444" : "rgba(255,255,255,0.3)"} 
                                style={{ marginHorizontal: 3 }}
                            />
                        ))}
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={styles.levelBox}>
                            <Ionicons name="star" size={14} color="#38bdf8" />
                            <Text style={styles.levelText}>{t.level} {level}</Text>
                        </View>
                        <View style={styles.scoreBox}>
                            <Text style={styles.scoreText}>{score}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.timerContainer}>
                    <Animated.View style={[styles.timerBar, { width: timerAnimWidth, backgroundColor: barColor }]} />
                </View>

                <Animated.View style={[styles.levelUpBanner, { opacity: levelUpAnim, transform: [{ scale: levelUpAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }] }]}>
                    <Text style={styles.levelUpText}>{t.levelUp}</Text>
                </Animated.View>

                <Animated.View style={[styles.questionCard, { transform: [{ scale: cardScaleAnim }] }]}>
                    <Text style={styles.questionText}>{qData.q}</Text>
                </Animated.View>

                <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                    {qData.opts.map((opt, index) => {
                        let btnStyle = styles.optionBtn;
                        let textStyle = styles.optionText;
                        
                        if (isAnswered) {
                            if (index === qData.ans) {
                                btnStyle = [styles.optionBtn, styles.optionCorrect]; 
                                textStyle = [styles.optionText, { color: 'white' }];
                            } else if (index === selectedAnswer) {
                                btnStyle = [styles.optionBtn, styles.optionWrong]; 
                                textStyle = [styles.optionText, { color: 'white' }];
                            }
                        }

                        return (
                            <TouchableOpacity 
                                key={index} 
                                style={btnStyle} 
                                activeOpacity={0.7}
                                disabled={isAnswered}
                                onPress={() => handleAnswer(index)}
                            >
                                <Text style={textStyle}>{opt}</Text>
                                {isAnswered && index === qData.ans && <Ionicons name="checkmark-circle" size={24} color="white" style={{position:'absolute', right: 20}} />}
                                {isAnswered && index === selectedAnswer && index !== qData.ans && <Ionicons name="close-circle" size={24} color="white" style={{position:'absolute', right: 20}} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            
            <View style={styles.starsBg}>
                {[...Array(15)].map((_, i) => (
                    <View key={i} style={[styles.star, { left: Math.random()*SCREEN_WIDTH, top: Math.random()*SCREEN_HEIGHT, opacity: Math.random() }]} />
                ))}
            </View>

            {gameState === 'CATEGORY_SELECT' && renderCategorySelect()}
            {gameState === 'LOADING' && renderLoading()}
            {gameState === 'PLAYING' && renderPlaying()}

            {/* OYUN BİTTİ & ZEKA SONUCU MODALI */}
            <Modal transparent={true} visible={gameState === 'GAMEOVER'} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        
                        {intelRank && (
                            <View style={styles.rankContainer}>
                                <Text style={styles.rankTitle}>{intelRank.title}</Text>
                                <Text style={styles.rankDesc}>{intelRank.desc}</Text>
                            </View>
                        )}
                        
                        <View style={styles.modalScoreRow}>
                            <View style={styles.modalScoreCol}>
                                <Text style={styles.modalScoreLabel}>{t.score}</Text>
                                <Text style={styles.modalScoreValue}>{score}</Text>
                            </View>
                            <View style={styles.modalScoreDivider} />
                            <View style={styles.modalScoreCol}>
                                <Text style={styles.modalScoreLabel}>{t.level}</Text>
                                <Text style={[styles.modalScoreValue, {color: '#f59e0b'}]}>{level}</Text>
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

                        <TouchableOpacity style={styles.btnPrimary} onPress={() => setGameState('CATEGORY_SELECT')} disabled={isSaving}>
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
    starsBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0f172a', zIndex: -1 },
    star: { position: 'absolute', width: 4, height: 4, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2 },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    
    // YENİ: Rekor Gösterimi
    bestScoreContainer: { flexDirection: 'row', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.4)', position: 'absolute', top: 50, alignItems: 'center' },
    bestScoreLabel: { color: '#f59e0b', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
    bestScoreValue: { color: 'white', fontSize: 24, fontWeight: '900' },

    pulseCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(56, 189, 248, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#38bdf8', marginBottom: 20, marginTop: 60 },
    titleText: { color: 'white', fontSize: 26, fontWeight: '900', letterSpacing: 1, marginBottom: 30, textAlign: 'center' },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%' },
    catCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 25, alignItems: 'center', marginBottom: 15, borderWidth: 1 },
    iconBg: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    catText: { color: 'white', fontWeight: 'bold', fontSize: 14, textAlign: 'center' },

    playingContainer: { flex: 1, padding: 20, paddingTop: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 10 },
    iconBtn: { width: 45, height: 45, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    
    // YENİ: Can Göstergesi
    livesContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: 8 },

    statsContainer: { alignItems: 'flex-end' },
    levelBox: { flexDirection: 'row', backgroundColor: 'rgba(56, 189, 248, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.4)' },
    levelText: { color: '#38bdf8', fontWeight: 'bold', marginLeft: 5, fontSize: 12 },
    scoreBox: { alignItems: 'flex-end', paddingRight: 5 },
    scoreText: { color: 'white', fontSize: 28, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },

    timerContainer: { height: 8, width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, marginTop: 20, overflow: 'hidden' },
    timerBar: { height: '100%', borderRadius: 4 },

    questionCard: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 30, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginTop: 40, marginBottom: 40, minHeight: 180, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 10 },
    questionText: { color: 'white', fontSize: 22, fontWeight: 'bold', textAlign: 'center', lineHeight: 32 },

    optionBtn: { width: '100%', backgroundColor: 'rgba(255,255,255,0.9)', paddingVertical: 20, paddingHorizontal: 15, borderRadius: 20, marginBottom: 15, justifyContent: 'center', alignItems: 'center', elevation: 3 },
    optionText: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' },
    optionCorrect: { backgroundColor: '#10b981', borderWidth: 0 }, 
    optionWrong: { backgroundColor: '#ef4444', borderWidth: 0 }, 

    levelUpBanner: { position: 'absolute', top: SCREEN_HEIGHT * 0.3, width: '100%', alignItems: 'center', zIndex: 20 },
    levelUpText: { color: '#f472b6', fontSize: 38, fontWeight: '900', textShadowColor: 'rgba(244, 114, 182, 0.6)', textShadowRadius: 20, textAlign: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#1e293b', borderRadius: 35, padding: 30, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', elevation: 20 },
    
    rankContainer: { alignItems: 'center', marginBottom: 25, backgroundColor: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    rankTitle: { fontSize: 24, fontWeight: '900', color: '#f59e0b', marginBottom: 8, textAlign: 'center' },
    rankDesc: { fontSize: 14, color: '#cbd5e1', textAlign: 'center', fontStyle: 'italic' },

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

export default QuizGameScreen;