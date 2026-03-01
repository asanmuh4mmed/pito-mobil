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
        totalPoints: "Toplam Puan",
        infoBtn: "Puanlarım ile ne yapabilirim?",
        infoTitle: "Puanlar ve Rozetler Hakkında",
        infoMsg: "🐾 **Puanlar:** Pito üzerinden yaptığın bağışlar ve iyilikler sana puan kazandırır.\n\n🏆 **Rozetler:** Puanın arttıkça yeni rozetlerin kilidi açılır. Bu rozetleri profiline takarak toplulukta ne kadar yardımsever olduğunu gösterebilirsin.\n\n✨ **Prestij:** Rozetler herhangi bir maddi karşılık taşımaz, ancak topluluk içindeki güvenilirliğini artırır.",
        ok: "Anladım",
        nextBadge: "Sonraki Rozet:",
        collection: "Rozet Koleksiyonu",
        equipped: "● Kullanılıyor",
        equip: "Profile Ekle",
        equipAlertTitle: "Harika!",
        equipAlertMsg: "rozeti profiline eklendi.",
        pointsReq: "Puan Gerekli"
    },
    AU: {
        header: "My Achievements",
        totalPoints: "Total Points",
        infoBtn: "What can I do with points?",
        infoTitle: "About Points & Badges",
        infoMsg: "🐾 **Points:** Donations and kindness on Pito earn you points.\n\n🏆 **Badges:** As your points increase, new badges unlock. Equip these to show the community your helpfulness.\n\n✨ **Prestige:** Badges have no monetary value but increase your reliability within the community.",
        ok: "Got it",
        nextBadge: "Next Badge:",
        collection: "Badge Collection",
        equipped: "● Equipped",
        equip: "Equip to Profile",
        equipAlertTitle: "Awesome!",
        equipAlertMsg: "badge has been added to your profile.",
        pointsReq: "Points Required"
    }
};

const BadgesScreen = ({ navigation }) => {
    const { theme } = useContext(ThemeContext);
    const { user, equipBadge, country } = useContext(AuthContext);
    
    // Dil Ayarı
    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
    const t = TRANSLATIONS[activeLang];
    const currentBadges = BADGES_DATA[activeLang];

    // Kullanıcının puanı
    const userPoints = user?.points || 0;
    const activeBadgeId = user?.activeBadge?.id;

    // Bir sonraki seviyeye ne kadar kaldı?
    const nextBadge = currentBadges.find(b => b.minPoints > userPoints);
    const progress = nextBadge 
        ? (userPoints / nextBadge.minPoints) * 100 
        : 100;

    // ✅ Rozet Takma İşlemi
    const handleEquip = (item) => {
        equipBadge(item);
        Alert.alert(t.equipAlertTitle, `${item.title} ${t.equipAlertMsg}`);
    };

    // ✅ YENİ BİLGİLENDİRME BUTONU İŞLEVİ
    const handleInfoPress = () => {
        Alert.alert(
            t.infoTitle,
            t.infoMsg,
            [{ text: t.ok, style: "default" }]
        );
    };

    const renderBadge = ({ item }) => {
        const isUnlocked = userPoints >= item.minPoints;
        const isEquipped = activeBadgeId === item.id;

        return (
            <View style={[
                styles.badgeCard, 
                { backgroundColor: theme.cardBg, opacity: isUnlocked ? 1 : 0.6 },
                isEquipped && { borderColor: item.color, borderWidth: 2 } // Seçili ise çerçeve ekle
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
                        <Text style={{color: item.color, fontWeight:'bold', marginTop:5}}>{t.equipped}</Text>
                    ) : isUnlocked ? (
                        <TouchableOpacity style={[styles.equipBtn, {borderColor: item.color}]} onPress={() => handleEquip(item)}>
                            <Text style={{color: item.color, fontSize:12, fontWeight:'bold'}}>{t.equip}</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={[styles.badgeReq, { color: theme.subText }]}>{item.minPoints} {t.pointsReq}</Text>
                    )}
                </View>
                
                {isUnlocked && !isEquipped && <Ionicons name="lock-open-outline" size={24} color="#4CAF50" style={styles.checkIcon} />}
                {isEquipped && <Ionicons name="checkmark-circle" size={24} color={item.color} style={styles.checkIcon} />}
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
                
                {/* ÜST BİLGİ KARTI */}
                <View style={styles.summaryCard}>
                    <View>
                        <Text style={styles.summaryTitle}>{t.totalPoints}</Text>
                        <Text style={styles.pointsText}>{userPoints} ⭐</Text>
                    </View>
                    <Ionicons name="ribbon" size={60} color="white" />
                </View>

                {/* ✅ YENİ BİLGİLENDİRME BUTONU (Premium Kutusu Yerine) */}
                <TouchableOpacity style={styles.infoBtn} onPress={handleInfoPress}>
                    <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
                    <Text style={[styles.infoText, { color: COLORS.primary }]}>{t.infoBtn}</Text>
                </TouchableOpacity>

                {/* İLERLEME ÇUBUĞU */}
                {nextBadge && (
                    <View style={styles.progressContainer}>
                        <Text style={[styles.progressText, { color: theme.text }]}>
                            {t.nextBadge} <Text style={{fontWeight:'bold', color: nextBadge.color}}>{nextBadge.title}</Text>
                        </Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: nextBadge.color }]} />
                        </View>
                        <Text style={{textAlign:'right', fontSize:12, color:theme.subText, marginTop:5}}>
                            {userPoints} / {nextBadge.minPoints}
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
    
    summaryCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        padding: 25,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10, 
        elevation: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    summaryTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
    pointsText: { color: 'white', fontSize: 36, fontWeight: '800', marginTop: 5 },

    // ✅ YENİ BİLGİ BUTONU STİLİ
    infoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginBottom: 25,
    },
    infoText: {
        marginLeft: 5,
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
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
    
    equipBtn: { marginTop: 5, borderWidth: 1, borderRadius: 15, paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start' }
});

export default BadgesScreen;