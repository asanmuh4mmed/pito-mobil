import React, { useContext, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; // ✅ YENİ EKLENDİ (Ekran yenileme için)
import { AuthContext } from '../context/AuthContext';
import { GameContext } from '../context/GameContext'; 

// ÇEVİRİLER
const TRANSLATIONS = {
    TR: {
        headerTitle: "Oyun Dünyası 🎮",
        welcome: "Hangi oyunu oynamak istersin?",
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
        usePoints: "PUANLARI KULLAN",
        weeklyRank: "Haftalık Sıralama",
        allTimeRank: "Genel Sıralama",
        yourBalance: "BAKİYENİZ"
    },
    AU: {
        headerTitle: "Game World 🎮",
        welcome: "Which game do you want to play?",
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
        usePoints: "USE POINTS",
        weeklyRank: "Weekly Rank",
        allTimeRank: "All Time Rank",
        yourBalance: "YOUR BALANCE"
    }
};

const GameListScreen = ({ navigation }) => {
    const { country } = useContext(AuthContext);
    // ✅ YENİ: Puan çekme fonksiyonunu da Context'ten alıyoruz
    const { userPoints, fetchUserPoints } = useContext(GameContext); 
    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
    const t = TRANSLATIONS[activeLang];

    // ✅ YENİ EKLENDİ: Ekran her açıldığında puanı veri tabanından tazeler
    useFocusEffect(
        useCallback(() => {
            fetchUserPoints(); 
        }, [])
    );

    const GAMES = [
        {
            id: '1',
            title: t.game1_title,
            subtitle: t.game1_sub,
            description: t.game1_desc,
            icon: 'nutrition', 
            color: '#FF9F43',
            accent: '#F368E0',
            route: 'Game', 
            imageEmoji: '🐱'
        },
        {
            id: '2',
            title: t.game2_title,
            subtitle: t.game2_sub,
            description: t.game2_desc,
            icon: 'grid', 
            color: '#54a0ff',
            accent: '#00d2d3',
            route: 'MemoryGame', 
            imageEmoji: '🐶'
        },
        {
            id: '3',
            title: t.game3_title,
            subtitle: t.game3_sub,
            description: t.game3_desc,
            icon: 'paw', 
            color: '#ff6b6b',
            accent: '#ee5253',
            route: 'EndlessRunner', 
            imageEmoji: '🐇'
        }
    ];

    const handlePlay = (game) => {
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
                        <Text style={styles.emojiImage}>{item.imageEmoji}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#222f3e" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.headerTitle}</Text>
                <View style={{width: 45}} /> 
            </View>

            {/* Puan Kartı */}
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

            {/* Sıralama Butonları */}
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

            <Text style={styles.welcomeText}>{t.welcome}</Text>

            <FlatList 
                data={GAMES}
                keyExtractor={item => item.id}
                renderItem={renderGameCard}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#222f3e' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backButton: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
    
    // Puan Kartı
    balanceCard: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    balanceLabel: { color: '#b2bec3', fontSize: 12, fontWeight: '600', marginBottom: 5 },
    balanceText: { color: 'white', fontSize: 28, fontWeight: '900', marginLeft: 8 },
    usePointsButton: { 
        backgroundColor: 'white', 
        paddingHorizontal: 15, 
        paddingVertical: 10, 
        borderRadius: 25, 
        flexDirection: 'row', 
        alignItems: 'center',
        elevation: 5
    },
    usePointsText: { color: '#2d3436', fontWeight: 'bold', fontSize: 12 },

    // Sıralama Butonları
    rankButtonContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 },
    rankButton: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingVertical: 12, 
        borderRadius: 15,
        elevation: 3 
    },
    rankButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 13 },

    welcomeText: { color: '#c8d6e5', fontSize: 16, paddingHorizontal: 25, marginBottom: 15, fontWeight: '500' },
    listContent: { paddingHorizontal: 20, paddingBottom: 50 },
    card: { borderRadius: 30, marginBottom: 25, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 6, height: 190 },
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
    emojiImage: { fontSize: 80, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 5 }, textShadowRadius: 10 }
});

export default GameListScreen;