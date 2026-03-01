import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
    View, Text, StyleSheet, FlatList, Image, TouchableOpacity, 
    ActivityIndicator, StatusBar, RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase'; // Veritabanı bağlantısı

// ÇEVİRİLER
const TRANSLATIONS = {
    TR: {
        title: "Liderlik Tablosu 🏆",
        weekly: "Haftalık",
        allTime: "Tüm Zamanlar",
        points: "Puan",
        noData: "Henüz veri yok.",
        rank: "Sıra"
    },
    AU: {
        title: "Leaderboard 🏆",
        weekly: "Weekly",
        allTime: "All Time",
        points: "Pts",
        noData: "No data yet.",
        rank: "Rank"
    }
};

const LeaderboardScreen = ({ navigation, route }) => {
    const { country, user } = useContext(AuthContext);
    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
    const t = TRANSLATIONS[activeLang];

    // Gelen parametreye göre başlangıç sekmesi (GameList'ten gelen)
    const initialType = route.params?.type || 'weekly';

    const [activeTab, setActiveTab] = useState(initialType); // 'weekly' | 'all_time'
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // --- VERİ ÇEKME FONKSİYONU ---
    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            let query;

            if (activeTab === 'weekly') {
                // Haftalık View'dan çek
                query = supabase
                    .from('weekly_leaderboard')
                    .select('*')
                    .order('total_weekly_score', { ascending: false })
                    .limit(50);
            } else {
                // Tüm Zamanlar View'dan çek
                query = supabase
                    .from('all_time_leaderboard')
                    .select('*')
                    .order('total_score', { ascending: false })
                    .limit(50);
            }

            const { data, error } = await query;

            if (error) throw error;
            setLeaders(data || []);

        } catch (error) {
            console.error("Sıralama çekme hatası:", error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, [activeTab]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchLeaderboard();
    }, [activeTab]);

    // --- LİSTE ELEMANI RENDER ---
    const renderItem = ({ item, index }) => {
        const rank = index + 1;
        const isMe = user && item.user_id === user.id; // Kendim miyim?
        
        // İlk 3 için özel renkler
        let rankColor = '#b2bec3'; // Varsayılan gri
        let rankIcon = null;
        let badgeColor = 'transparent';

        if (rank === 1) {
            rankColor = '#F1C40F'; // Altın
            rankIcon = 'trophy';
            badgeColor = 'rgba(241, 196, 15, 0.15)';
        } else if (rank === 2) {
            rankColor = '#BDC3C7'; // Gümüş
            rankIcon = 'medal';
            badgeColor = 'rgba(189, 195, 199, 0.15)';
        } else if (rank === 3) {
            rankColor = '#E67E22'; // Bronz
            rankIcon = 'medal';
            badgeColor = 'rgba(230, 126, 34, 0.15)';
        }

        // Puan alanını dinamik belirle (Tablo isimleri farklı)
        const score = activeTab === 'weekly' ? item.total_weekly_score : item.total_score;

        return (
            <View style={[styles.rankItem, isMe && styles.myRankItem, { backgroundColor: badgeColor }]}>
                {/* Sıralama Numarası / İkonu */}
                <View style={styles.rankIndex}>
                    {rank <= 3 ? (
                        <Ionicons name={rankIcon} size={24} color={rankColor} />
                    ) : (
                        <Text style={styles.rankNumber}>{rank}</Text>
                    )}
                </View>

                {/* Avatar */}
                <Image 
                    source={{ uri: item.avatar || 'https://via.placeholder.com/150' }} 
                    style={[styles.avatar, rank <= 3 && { borderWidth: 2, borderColor: rankColor }]} 
                />

                {/* İsim */}
                <View style={styles.userInfo}>
                    <Text style={[styles.userName, isMe && { color: '#6C5CE7' }]} numberOfLines={1}>
                        {item.fullname || 'Unknown User'} {isMe ? '(Sen)' : ''}
                    </Text>
                </View>

                {/* Puan */}
                <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{score}</Text>
                    <Text style={styles.scoreLabel}>{t.points}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#222f3e" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.title}</Text>
                <View style={{width: 40}} /> 
            </View>

            {/* Tabs (Sekmeler) */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'weekly' && styles.activeTab]} 
                    onPress={() => setActiveTab('weekly')}
                >
                    <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>
                        {t.weekly}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'all_time' && styles.activeTab]} 
                    onPress={() => setActiveTab('all_time')}
                >
                    <Text style={[styles.tabText, activeTab === 'all_time' && styles.activeTabText]}>
                        {t.allTime}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Liste */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#F1C40F" />
                </View>
            ) : (
                <FlatList
                    data={leaders}
                    keyExtractor={(item) => item.user_id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>{t.noData}</Text>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#222f3e' }, // Koyu Tema
    
    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },

    // Tabs
    tabsContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, padding: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
    activeTab: { backgroundColor: '#6C5CE7' }, // Aktif Sekme Rengi (Mor)
    tabText: { color: '#a4b0be', fontWeight: '600' },
    activeTabText: { color: 'white', fontWeight: 'bold' },

    // Liste
    listContent: { paddingHorizontal: 20, paddingBottom: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#636e72', textAlign: 'center', marginTop: 50, fontSize: 16 },

    // Liste Elemanı
    rankItem: { 
        flexDirection: 'row', alignItems: 'center', 
        backgroundColor: '#2d3436', // Kart Rengi
        marginBottom: 10, padding: 15, borderRadius: 18,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'
    },
    myRankItem: { borderColor: '#6C5CE7', borderWidth: 1.5, backgroundColor: 'rgba(108, 92, 231, 0.1)' },
    
    rankIndex: { width: 30, alignItems: 'center', justifyContent: 'center' },
    rankNumber: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    
    avatar: { width: 45, height: 45, borderRadius: 22.5, marginHorizontal: 15 },
    
    userInfo: { flex: 1 },
    userName: { color: 'white', fontWeight: 'bold', fontSize: 15 },
    
    scoreBadge: { alignItems: 'flex-end' },
    scoreText: { color: '#F1C40F', fontWeight: '900', fontSize: 18 },
    scoreLabel: { color: '#636e72', fontSize: 10, fontWeight: '600' }
});

export default LeaderboardScreen;