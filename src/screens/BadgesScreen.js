import React, { useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

// ✅ ÇOKLU DİL DESTEĞİ İÇİN VERİLER
const BADGES_DATA = {
    TR: [
        { id: 1, minPoints: 1, title: 'İyilik Elçisi', icon: 'heart', color: '#FF6B6B', desc: 'İlk bağışını yaptın.' },
        { id: 2, minPoints: 5, title: 'Sadık Dost', icon: 'paw', color: '#FF9F43', desc: '5 kez canlara umut oldun.' },
        { id: 3, minPoints: 10, title: 'Bronz Pati', icon: 'medal', color: '#CD7F32', desc: '10 bağış ile bronz rozet kazandın.' },
        { id: 4, minPoints: 20, title: 'Gümüş Pati', icon: 'trophy', color: '#C0C0C0', desc: '20 bağış ile gümüş rozet sahibi oldun.' },
        { id: 5, minPoints: 50, title: 'Altın Kalp', icon: 'star', color: '#FFD700', desc: '50 bağış! Sen gerçek bir kahramansın.' },
        { id: 6, minPoints: 100, title: 'Efsane', icon: 'diamond', color: '#00D2D3', desc: '100 bağış. Sözün bittiği yer.' },
    ],
    AU: [
        { id: 1, minPoints: 1, title: 'Kindness Ambassador', icon: 'heart', color: '#FF6B6B', desc: 'You made your first donation.' },
        { id: 2, minPoints: 5, title: 'Loyal Friend', icon: 'paw', color: '#FF9F43', desc: 'You gave hope to pets 5 times.' },
        { id: 3, minPoints: 10, title: 'Bronze Paw', icon: 'medal', color: '#CD7F32', desc: 'Earned bronze badge with 10 donations.' },
        { id: 4, minPoints: 20, title: 'Silver Paw', icon: 'trophy', color: '#C0C0C0', desc: 'Earned silver badge with 20 donations.' },
        { id: 5, minPoints: 50, title: 'Golden Heart', icon: 'star', color: '#FFD700', desc: '50 donations! You are a true hero.' },
        { id: 6, minPoints: 100, title: 'Legend', icon: 'diamond', color: '#00D2D3', desc: '100 donations. Beyond words.' },
    ]
};

const TRANSLATIONS = {
    TR: {
        header: "Başarılarım",
        earnedBadges: "Kazanılan Rozetler", // ✅ Güncellendi
        infoBtn: "Rozetlerim ne işe yarar?", // ✅ Güncellendi
        infoTitle: "Bağışlar ve Rozetler", // ✅ Güncellendi
        infoMsg: "🐾 **Bağışlar:** Pito üzerinden yaptığın her mama bağışı, patili dostlarımıza umut olur ve sistemde kayıt altına alınır.\n\n🏆 **Rozetler:** Bağış sayın arttıkça yeni rozetlerin kilidi açılır. Bu rozetleri profiline takarak toplulukta ne kadar yardımsever olduğunu gösterebilirsin.\n\n✨ **Prestij:** Rozetler profilini süsler ve diğer hayvanseverlere ilham kaynağı olmanı sağlar.", // ✅ Güncellendi
        ok: "Anladım",
        nextBadge: "Sonraki Rozet:",
        collection: "Rozet Koleksiyonu",
        equipped: "● Kullanılıyor",
        equip: "Profile Ekle",
        equipAlertTitle: "Harika!",
        equipAlertMsg: "rozeti profiline eklendi.",
        pointsReq: "Bağış",
        noBadgesYet: "Henüz rozetin yok" // ✅ Eklendi
    },
    AU: {
        header: "My Achievements",
        earnedBadges: "Earned Badges",
        infoBtn: "What do my badges do?",
        infoTitle: "Donations & Badges",
        infoMsg: "🐾 **Donations:** Every food donation you make on Pito brings hope to our furry friends and is recorded in the system.\n\n🏆 **Badges:** As your donation count increases, new badges unlock. Equip these to show the community your helpfulness.\n\n✨ **Prestige:** Badges decorate your profile and inspire other animal lovers.",
        ok: "Got it",
        nextBadge: "Next Badge:",
        collection: "Badge Collection",
        equipped: "● Equipped",
        equip: "Equip to Profile",
        equipAlertTitle: "Awesome!",
        equipAlertMsg: "badge has been added to your profile.",
        pointsReq: "Donations",
        noBadgesYet: "No badges yet"
    }
};

const BadgesScreen = ({ navigation }) => {
    const { theme } = useContext(ThemeContext);
    const { user, equipBadge, country } = useContext(AuthContext);
    
    // Dil Ayarı
    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
    const t = TRANSLATIONS[activeLang];
    const currentBadges = BADGES_DATA[activeLang];

    // Kullanıcının bağış sayısı (Rozet kilitlerini açmak için)
    const userDonations = user?.donation_count || 0;
    const activeBadgeId = user?.activeBadge?.id;

    // ✅ Kazanılan rozetleri hesapla
    const earnedBadges = currentBadges.filter(b => userDonations >= b.minPoints);
    const earnedBadgesCount = earnedBadges.length;

    // Bir sonraki seviyeye ne kadar kaldı?
    const nextBadge = currentBadges.find(b => b.minPoints > userDonations);
    const progress = nextBadge 
        ? (userDonations / nextBadge.minPoints) * 100 
        : 100;

    // Rozet Takma İşlemi
    const handleEquip = (item) => {
        equipBadge(item);
        Alert.alert(t.equipAlertTitle, `${item.title} ${t.equipAlertMsg}`);
    };

    // Bilgilendirme Butonu İşlevi
    const handleInfoPress = () => {
        Alert.alert(
            t.infoTitle,
            t.infoMsg,
            [{ text: t.ok, style: "default" }]
        );
    };

    const renderBadge = ({ item }) => {
        const isUnlocked = userDonations >= item.minPoints;
        const isEquipped = activeBadgeId === item.id;

        return (
            <View style={[
                styles.badgeCard, 
                { backgroundColor: theme.cardBg, opacity: isUnlocked ? 1 : 0.6 },
                isEquipped && { borderColor: '#6C5CE7', borderWidth: 2 } // ✅ Seçili çerçeve rengi mor yapıldı
            ]}>
                <View style={[styles.iconContainer, { backgroundColor: isUnlocked ? item.color + '20' : '#ccc' }]}>
                    <Ionicons 
                        name={isUnlocked ? item.icon : 'lock-closed'} 
                        size={32} 
                        color={isUnlocked ? item.color : '#666'} 
                    />
                </View>
                <View style={styles.badgeInfo}>
                    <Text style={[styles.badgeTitle, { color: theme.text }]}>{item.title}</Text>
                    <Text style={[styles.badgeDesc, { color: theme.subText }]}>{item.desc}</Text>
                    
                    {/* Durum Metni veya Buton */}
                    {isEquipped ? (
                        <Text style={{color: '#6C5CE7', fontWeight:'bold', marginTop:5}}>{t.equipped}</Text> // ✅ Renk mor
                    ) : isUnlocked ? (
                        <TouchableOpacity style={[styles.equipBtn, {borderColor: '#6C5CE7'}]} onPress={() => handleEquip(item)}>
                            <Text style={{color: '#6C5CE7', fontSize:12, fontWeight:'bold'}}>{t.equip}</Text> 
                        </TouchableOpacity>
                    ) : (
                        <Text style={[styles.badgeReq, { color: theme.subText }]}>{item.minPoints} {t.pointsReq}</Text>
                    )}
                </View>
                
                {isUnlocked && !isEquipped && <Ionicons name="lock-open-outline" size={24} color="#6C5CE7" style={styles.checkIcon} />}
                {isEquipped && <Ionicons name="checkmark-circle" size={24} color="#6C5CE7" style={styles.checkIcon} />}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t.header}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                
                {/* ✅ YENİ ÜST BİLGİ KARTI (Mor Tema & Rozet İkonları) */}
                <View style={styles.summaryCard}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.summaryTitle}>{t.earnedBadges}</Text>
                        <Text style={styles.pointsText}>{earnedBadgesCount} 🏆</Text>
                        
                        <View style={styles.earnedBadgesRow}>
                            {earnedBadgesCount === 0 ? (
                                <Text style={styles.noBadgesText}>{t.noBadgesYet}</Text>
                            ) : (
                                earnedBadges.map((badge) => (
                                    <View key={badge.id} style={[styles.smallBadgeIcon, { borderColor: badge.color }]}>
                                        <Ionicons name={badge.icon} size={14} color={badge.color} />
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                    <Ionicons name="ribbon-outline" size={70} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', right: 20, top: 20 }} />
                </View>

                {/* ✅ YENİ BİLGİLENDİRME BUTONU */}
                <TouchableOpacity style={styles.infoBtn} onPress={handleInfoPress}>
                    <Ionicons name="information-circle-outline" size={20} color="#6C5CE7" />
                    <Text style={[styles.infoText, { color: "#6C5CE7" }]}>{t.infoBtn}</Text>
                </TouchableOpacity>

                {/* İLERLEME ÇUBUĞU */}
                {nextBadge && (
                    <View style={styles.progressContainer}>
                        <Text style={[styles.progressText, { color: theme.text }]}>
                            {t.nextBadge} <Text style={{fontWeight:'bold', color: nextBadge.color}}>{nextBadge.title}</Text>
                        </Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: '#6C5CE7' }]} />
                        </View>
                        <Text style={{textAlign:'right', fontSize:12, color:theme.subText, marginTop:5}}>
                            {userDonations} / {nextBadge.minPoints}
                        </Text>
                    </View>
                )}

                <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.collection}</Text>

                <FlatList
                    data={currentBadges}
                    renderItem={renderBadge}
                    keyExtractor={item => item.id.toString()}
                    scrollEnabled={false}
                />

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 20, paddingBottom: 50 },
    
    // ✅ Mor temalı yeni kart stili
    summaryCard: {
        backgroundColor: '#6C5CE7', // Ana Pito mor rengi
        borderRadius: 20,
        padding: 25,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10, 
        elevation: 10,
        shadowColor: '#6C5CE7',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        position: 'relative',
        overflow: 'hidden'
    },
    summaryTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
    pointsText: { color: 'white', fontSize: 36, fontWeight: '800', marginTop: 5 },
    
    // ✅ Kazanılan rozet ikonları sırası
    earnedBadgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 15,
        alignItems: 'center'
    },
    smallBadgeIcon: {
        backgroundColor: 'white',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
        marginBottom: 6,
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2
    },
    noBadgesText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontStyle: 'italic'
    },

    infoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginBottom: 25,
        backgroundColor: 'rgba(108, 92, 231, 0.1)', // Morumsu arka plan
        borderRadius: 15,
        marginHorizontal: 10
    },
    infoText: {
        marginLeft: 5,
        fontSize: 14,
        fontWeight: 'bold',
    },

    progressContainer: { marginBottom: 30 },
    progressText: { fontSize: 14, marginBottom: 10 },
    progressBarBg: { height: 10, backgroundColor: '#E0E0E0', borderRadius: 5, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 5 },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },

    badgeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
    },
    iconContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    badgeInfo: { flex: 1 },
    badgeTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    badgeDesc: { fontSize: 12, marginBottom: 5 },
    badgeReq: { fontSize: 12, fontWeight: 'bold' },
    checkIcon: { marginLeft: 10 },
    
    equipBtn: { marginTop: 5, borderWidth: 1, borderRadius: 15, paddingVertical: 5, paddingHorizontal: 15, alignSelf: 'flex-start', backgroundColor: 'rgba(108, 92, 231, 0.05)' }
});

export default BadgesScreen;