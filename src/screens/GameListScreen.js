import React, { useContext, useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, StatusBar, Animated, Platform, UIManager, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { GameContext } from '../context/GameContext'; 

// ÇEVİRİLER
const TRANSLATIONS = {
    TR: {
        headerTitle: "Oyun Dünyası 🎮",
        games: "OYUNLAR",
        showAll: "TÜMÜNÜ GÖSTER",
        play: "BAŞLA",
        game1_title: "Mamaları Yakala",
        game1_sub: "REFLEKS OYUNU",
        game1_desc: "Sağa sola kaydır, lezzetli etleri kap ama bombalara dikkat et! 🍖",
        game2_title: "Pati Eşleştirme",
        game2_sub: "HAFIZA OYUNU",
        game2_desc: "Kartları çevir, aynı hayvan dostlarımızı bul ve hafızanı güçlendir! 🧠",
        game3_title: "Sonsuz Koşu",
        game3_sub: "MACERA",
        game3_desc: "Zıpla, engelleri aş ve en yüksek skoru yaparak rekor kır! 🏃",
        game4_title: "Uçan Pito",
        game4_sub: "YENİ NESİL ARCADE",
        game4_desc: "Ekrana dokun, sütunların arasından geç ve en yüksek skora ulaş! 🐶",
        game5_title: "Pito Bubble",
        game5_sub: "KLASİK NİŞANCI",
        game5_desc: "Nişan al, aynı renkleri vur ve baloncukları patlat! 🔵",
        game6_title: "Mama Kulesi",
        game6_sub: "KULE DİZME",
        game6_desc: "Tam üst üste oturt, kuleyi göklere çıkar ve kombo yap! 🥫",
        game7_title: "Pito Quiz",
        // ✅ YENİ EKLENEN OYUN ÇEVİRİSİ (TR)
        game8_title: "Pito Karoları",
        game8_sub: "BULMACA",
        game8_desc: "Aynı sembolden 3 tanesini biriktir ve tepsiyi boşalt! 🧩",
        usePoints: "PUANLARI KULLAN",
        weeklyRank: "Haftalık Sıralama",
        allTimeRank: "Genel Sıralama",
        yourBalance: "BAKİYENİZ",
        goalTitle: "Özel Teşekkür Hedefi 💌",
        goalDesc: "10.000 Puanla mama bağışla ve özel destekçi maili kazan!",
        goalReached: "Hedefe Ulaştın! Bağış yap ve maili kap! 🎉"
    },
    AU: {
        headerTitle: "Game World 🎮",
        games: "GAMES",
        showAll: "SHOW ALL",
        play: "START",
        game1_title: "Catch the Treats",
        game1_sub: "REFLEX GAME",
        game1_desc: "Slide left or right, catch delicious treats but avoid bombs! 🍖",
        game2_title: "Paw Match",
        game2_sub: "MEMORY GAME",
        game2_desc: "Flip cards, find matching animal friends and boost your memory! 🧠",
        game3_title: "Endless Runner",
        game3_sub: "ADVENTURE",
        game3_desc: "Jump, dodge obstacles and set a new high score record! 🏃",
        game4_title: "Flappy Pito",
        game4_sub: "NEW GEN ARCADE",
        game4_desc: "Tap the screen, fly through the pipes and beat the high score! 🐶",
        game5_title: "Pito Bubble",
        game5_sub: "CLASSIC SHOOTER",
        game5_desc: "Aim, match colors and pop the bubbles! 🔵",
        game6_title: "Treat Tower",
        game6_sub: "TOWER STACK",
        game6_desc: "Stack them perfectly, build to the sky and make combos! 🥫",
        game7_title: "Pito Trivia",
        // ✅ YENİ EKLENEN OYUN ÇEVİRİSİ (AU)
        game8_title: "Pito Tiles",
        game8_sub: "PUZZLE",
        game8_desc: "Match 3 identical tiles to clear the tray! 🧩",
        usePoints: "USE POINTS",
        weeklyRank: "Weekly Rank",
        allTimeRank: "All Time Rank",
        yourBalance: "YOUR BALANCE",
        goalTitle: "Special Thanks Goal 💌",
        goalDesc: "Donate food with 10,000 Points and earn a special supporter email!",
        goalReached: "Goal Reached! Donate and get the email! 🎉"
    }
};

const GameListScreen = ({ navigation }) => {
    const { country } = useContext(AuthContext);
    const { userPoints, fetchUserPoints } = useContext(GameContext); 
    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
    const t = TRANSLATIONS[activeLang];

    // ✨ ÇÖZÜM: Artık listeyi uzatmak yerine Modal (Yeni Sayfa) açacak
    const [modalVisible, setModalVisible] = useState(false);

    // --- ANİMASYON REFI ---
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.08, 
                    duration: 800,
                    useNativeDriver: true
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1, 
                    duration: 800,
                    useNativeDriver: true
                })
            ])
        ).start();
    }, [pulseAnim]);

    useFocusEffect(
        useCallback(() => {
            fetchUserPoints(); 
        }, [])
    );

    // --- 10.000 PUAN HEDEFİ HESAPLAMASI ---
    const GOAL = 10000;
    const progress = Math.min(userPoints / GOAL, 1); 
    const progressPercent = `${(progress * 100).toFixed(0)}%`;

    const GAMES = [
        {
            id: '1',
            title: t.game1_title,
            subtitle: t.game1_sub,
            description: t.game1_desc,
            color: '#FF9F43',
            route: 'Game', 
            imageType: 'emoji',
            emoji: '🐱'
        },
        {
            id: '2',
            title: t.game2_title,
            subtitle: t.game2_sub,
            description: t.game2_desc,
            color: '#54a0ff',
            route: 'MemoryGame', 
            imageType: 'emoji',
            emoji: '🐶'
        },
        {
            id: '3',
            title: t.game3_title,
            subtitle: t.game3_sub,
            description: t.game3_desc,
            color: '#ff6b6b',
            route: 'EndlessRunner', 
            imageType: 'emoji',
            emoji: '🐇'
        },
        {
            id: '4', 
            title: t.game4_title,
            subtitle: t.game4_sub,
            description: t.game4_desc,
            color: '#00cec9', 
            route: 'FlappyPet', 
            imageType: 'flappy'
        },
        {
            id: '5', 
            title: t.game5_title,
            subtitle: t.game5_sub,
            description: t.game5_desc,
            color: '#9b59b6', 
            route: 'BubbleScreen', 
            imageType: 'bubble'
        },
        {
            id: '6', 
            title: t.game6_title,
            subtitle: t.game6_sub,
            description: t.game6_desc,
            color: '#f368e0', 
            route: 'TowerGame', 
            imageType: 'emoji',
            emoji: '🥫' 
        },
        {
            id: '7', 
            title: t.game7_title,
            subtitle: activeLang === 'AU' ? "TRIVIA QUIZ" : "BİLGİ YARIŞMASI",
            description: activeLang === 'AU' ? "Choose your category, answer questions and prove your wit! 🧠" : "Kategorini seç, soruları bil ve zekanı kanıtla! 🧠",
            color: '#0984e3', 
            route: 'QuizGame', 
            imageType: 'emoji',
            emoji: '💡'
        },
        // ✅ YENİ EKLENEN OYUN: TILE MATCH
        {
            id: '8', 
            title: t.game8_title,
            subtitle: t.game8_sub,
            description: t.game8_desc,
            color: '#ff7675', // Tatlı bir mercan kırmızısı
            route: 'TileMatch', 
            imageType: 'emoji',
            emoji: '🧩'
        }
    ];

    const handlePlay = (game) => {
        // Modal açıksa önce onu kapat, sonra oyuna git
        if (modalVisible) setModalVisible(false);
        if (game.route) {
            navigation.navigate(game.route);
        }
    };

    const renderGameCard = ({ item }) => {
        return (
            <TouchableOpacity 
                activeOpacity={0.9} 
                style={[styles.card, { backgroundColor: item.color }]}
                onPress={() => handlePlay(item)}
            >
                <View style={[styles.decorBubble, { backgroundColor: 'rgba(255,255,255,0.2)', width: 100, height: 100, top: -30, right: -20 }]} />
                <View style={[styles.decorBubble, { backgroundColor: 'rgba(0,0,0,0.05)', width: 150, height: 150, bottom: -50, left: -40 }]} />

                <View style={styles.cardInner}>
                    <View style={styles.textContainer}>
                        <View style={styles.subtitleBadge}>
                            <Ionicons name="game-controller" size={12} color={item.color} style={{marginRight:4}} />
                            <Text style={[styles.subtitle, { color: item.color }]}>{item.subtitle}</Text>
                        </View>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.description}>{item.description}</Text>
                        <View style={styles.playButton}>
                            <Text style={[styles.playText, { color: item.color }]}>{t.play}</Text>
                            <Ionicons name="play" size={16} color={item.color} />
                        </View>
                    </View>
                    
                    <View style={styles.imageContainer}>
                        {item.imageType === 'emoji' && (
                            <Text style={styles.emojiImage}>{item.emoji}</Text>
                        )}
                        
                        {item.imageType === 'flappy' && (
                            <View style={styles.flappyGraphic}>
                                <View style={styles.pipeTop} />
                                <Text style={styles.flappyEmoji}>🐶</Text>
                                <View style={styles.pipeBottom} />
                            </View>
                        )}

                        {item.imageType === 'bubble' && (
                            <View style={styles.bubbleGraphic}>
                                <View style={[styles.miniBubble, { backgroundColor: '#ff4757', top: 0, left: 10 }]} />
                                <View style={[styles.miniBubble, { backgroundColor: '#1e90ff', top: 0, left: 40 }]} />
                                <View style={[styles.miniBubble, { backgroundColor: '#2ed573', top: 25, left: 25 }]} />
                                <View style={[styles.miniBubble, { backgroundColor: '#ffa502', bottom: 0, left: 25 }]} />
                                <Ionicons name="arrow-up" size={24} color="rgba(255,255,255,0.7)" style={{ position: 'absolute', bottom: 25, left: 28 }} />
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* ✨ ÇÖZÜM: Morumsu Tema Arka Plan Rengi */}
            <StatusBar barStyle="light-content" backgroundColor="#301955" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.headerTitle}</Text>
                <View style={{width: 45}} /> 
            </View>

            <FlatList 
                data={GAMES.slice(0, 3)} // ✨ Ana ekranda daima sadece ilk 3 oyun görünür
                keyExtractor={item => item.id}
                renderItem={renderGameCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <>
                        <View style={styles.balanceCard}>
                            <View>
                                <Text style={styles.balanceLabel}>{t.yourBalance}</Text>
                                <View style={{flexDirection:'row', alignItems:'center'}}>
                                    <Ionicons name="star" size={24} color="#F1C40F" />
                                    <Text style={styles.balanceText}>{userPoints}</Text>
                                </View>
                            </View>
                            <TouchableOpacity 
                                style={styles.usePointsButton} 
                                onPress={() => navigation.navigate('GameDonate')} 
                            >
                                <Text style={styles.usePointsText}>{t.usePoints}</Text>
                                <Ionicons name="heart" size={16} color="#e74c3c" style={{marginLeft: 5}} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.goalCard}>
                            <View style={styles.goalHeader}>
                                <Ionicons name="mail-open" size={20} color="#00cec9" />
                                <Text style={styles.goalTitle}>{t.goalTitle}</Text>
                            </View>
                            <Text style={styles.goalDesc}>{t.goalDesc}</Text>
                            
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: progressPercent }]} />
                                </View>
                                <Text style={styles.progressText}>{userPoints} / {GOAL}</Text>
                            </View>
                            {userPoints >= GOAL && (
                                <Text style={styles.goalReachedText}>{t.goalReached}</Text>
                            )}
                        </View>

                        <View style={styles.rankButtonContainer}>
                            <TouchableOpacity 
                                style={[styles.rankButton, { backgroundColor: '#0984e3' }]}
                                onPress={() => navigation.navigate('Leaderboard', { type: 'weekly' })}
                            >
                                <Ionicons name="podium" size={20} color="white" />
                                <Text style={styles.rankButtonText}>{t.weeklyRank}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.rankButton, { backgroundColor: '#6c5ce7', marginLeft: 10 }]}
                                onPress={() => navigation.navigate('Leaderboard', { type: 'all_time' })}
                            >
                                <Ionicons name="trophy" size={20} color="white" />
                                <Text style={styles.rankButtonText}>{t.allTimeRank}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.gamesHeaderRow}>
                            <Text style={styles.gamesTitleText}>{t.games}</Text>
                            
                            {/* ✨ ÇÖZÜM: Modal Açan Buton */}
                            <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.8}>
                                <Animated.View style={[styles.showAllAnimButton, { transform: [{ scale: pulseAnim }] }]}>
                                    <Text style={styles.showAllText}>{t.showAll}</Text>
                                    <Ionicons name="chevron-forward" size={18} color="#00cec9" style={{marginLeft: 4}} />
                                </Animated.View>
                            </TouchableOpacity>
                        </View>
                    </>
                }
            />

            {/* ✨ ÇÖZÜM: TÜM OYUNLAR İÇİN TAM EKRAN MODAL EKLENDİ */}
            <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <SafeAreaView style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.backButton}>
                            <Ionicons name="arrow-down" size={28} color="white" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{t.games}</Text>
                        <View style={{width: 45}} /> 
                    </View>
                    
                    <FlatList 
                        data={GAMES}
                        keyExtractor={item => item.id}
                        renderItem={renderGameCard}
                        contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }}
                        showsVerticalScrollIndicator={false}
                    />
                </SafeAreaView>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#301955' }, // ✨ Morumsu Tema
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
    
    balanceCard: { backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20, borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    balanceLabel: { color: '#b2bec3', fontSize: 12, fontWeight: '600', marginBottom: 5 },
    balanceText: { color: 'white', fontSize: 28, fontWeight: '900', marginLeft: 8 },
    usePointsButton: { backgroundColor: 'white', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 25, flexDirection: 'row', alignItems: 'center', elevation: 5 },
    usePointsText: { color: '#2d3436', fontWeight: 'bold', fontSize: 12 },

    goalCard: { backgroundColor: 'rgba(0, 206, 201, 0.1)', marginHorizontal: 20, borderRadius: 15, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0, 206, 201, 0.3)' },
    goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    goalTitle: { color: '#00cec9', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
    goalDesc: { color: '#c8d6e5', fontSize: 12, marginBottom: 10, lineHeight: 18 },
    progressContainer: { flexDirection: 'row', alignItems: 'center' },
    progressBarBg: { flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#00cec9', borderRadius: 5 },
    progressText: { color: 'white', fontSize: 12, fontWeight: 'bold', marginLeft: 10 },
    goalReachedText: { color: '#00b894', fontSize: 12, fontWeight: 'bold', marginTop: 10, textAlign: 'center' },

    rankButtonContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 },
    rankButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 15, elevation: 3 },
    rankButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 13 },

    gamesHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, marginTop: 5 },
    gamesTitleText: { color: 'white', fontSize: 24, fontWeight: '900', letterSpacing: 1 },
    showAllAnimButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 206, 201, 0.15)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(0, 206, 201, 0.5)' },
    showAllText: { color: '#00cec9', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },

    listContent: { paddingBottom: 50 },
    card: { marginHorizontal: 20, borderRadius: 30, marginBottom: 25, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 6, height: 190 },
    decorBubble: { position: 'absolute', borderRadius: 999 },
    cardInner: { flex: 1, flexDirection: 'row', padding: 20, alignItems: 'center' },
    textContainer: { flex: 1.4, justifyContent: 'center' },
    subtitleBadge: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
    subtitle: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
    title: { color: 'white', fontSize: 22, fontWeight: '900', marginBottom: 5, letterSpacing: 0.5 },
    description: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 18, marginBottom: 15, fontWeight: '500' },
    playButton: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, alignSelf: 'flex-start', alignItems: 'center', elevation: 5 },
    playText: { fontWeight: '900', fontSize: 14, marginRight: 5 },
    imageContainer: { flex: 0.6, justifyContent: 'center', alignItems: 'center' },
    emojiImage: { fontSize: 80, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 5 }, textShadowRadius: 10 },

    flappyGraphic: { width: 80, height: 120, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    pipeTop: { position: 'absolute', top: -15, left: 15, width: 20, height: 45, backgroundColor: '#55EFC4', borderWidth: 2, borderColor: '#00B894', borderBottomLeftRadius: 5, borderBottomRightRadius: 5, elevation: 3 },
    pipeBottom: { position: 'absolute', bottom: -15, right: 15, width: 20, height: 55, backgroundColor: '#55EFC4', borderWidth: 2, borderColor: '#00B894', borderTopLeftRadius: 5, borderTopRightRadius: 5, elevation: 3 },
    flappyEmoji: { fontSize: 50, zIndex: 2, transform: [{ rotate: '-15deg' }], textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 5 }, textShadowRadius: 5 },

    bubbleGraphic: { width: 80, height: 110, position: 'relative' },
    miniBubble: { position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', elevation: 5, shadowColor: '#000', shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.4, shadowRadius: 3 }
});

export default GameListScreen;