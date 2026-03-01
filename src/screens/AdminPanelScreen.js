import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const AdminPanelScreen = ({ navigation }) => {
    const { theme } = useContext(ThemeContext);
    const { user, country } = useContext(AuthContext);
    
    const [stats, setStats] = useState({ 
        userCount: 0, 
        listingCount: 0, 
        totalRevenue: 0, 
        totalSoldItems: 0,
        totalDonations: 0 // YENİ: Toplam Bağış
    });
    const [bestSeller, setBestSeller] = useState(null);
    const [recentDonations, setRecentDonations] = useState([]); // YENİ: Son Bağışlar Listesi
    const [loading, setLoading] = useState(true);

    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';

    const TEXTS = {
        TR: {
            title: "Yönetici Paneli",
            welcome: "Hoş geldin, Patron",
            financials: "Finansal Durum",
            revenue: "Toplam Ciro",
            sold: "Satılan Ürün",
            donations: "Toplam Bağış", // YENİ
            recentDonations: "Son Bağışlar", // YENİ
            database: "Veritabanı (Detaylar için tıkla)",
            users: "Kullanıcı",
            listings: "İlan",
            bestSeller: "Günün Yıldızı 🏆",
            bestSellerSub: "En çok tercih edilen ürün",
            soldCount: "Adet Satıldı",
            share: "Pazar Payı",
            shopManager: "Mağaza Yönetimi",
            shopDesc: "Siparişleri ve ürünleri yönet",
            accessDenied: "Erişim Reddedildi",
            accessMsg: "Yetkiniz yok.",
            currency: "TL",
            noDonations: "Henüz bir bağış yapılmadı."
        },
        AU: {
            title: "Admin Dashboard",
            welcome: "Welcome, Boss",
            financials: "Financial Overview",
            revenue: "Total Revenue",
            sold: "Items Sold",
            donations: "Total Donations", // YENİ
            recentDonations: "Recent Donations", // YENİ
            database: "Database (Click for details)",
            users: "Users",
            listings: "Listings",
            bestSeller: "Top Performer 🏆",
            bestSellerSub: "Most popular product",
            soldCount: "Sold",
            share: "Sales Share",
            shopManager: "Shop Manager",
            shopDesc: "Manage orders & products",
            accessDenied: "Access Denied",
            accessMsg: "Unauthorized access.",
            currency: "AUD",
            noDonations: "No donations made yet."
        }
    };

    const t = TEXTS[activeLang];

    useEffect(() => {
        if (!user || !user.is_admin) {
            Alert.alert(t.accessDenied, t.accessMsg);
            navigation.goBack();
            return;
        }
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // 1. Basit Sayımlar
            const { count: uCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
            const { count: lCount } = await supabase.from('listings').select('*', { count: 'exact', head: true });

            // 2. Finansal Hesaplama (Siparişler)
            const { data: ordersData } = await supabase.from('orders').select('*'); 

            let revenue = 0;
            let soldItems = 0;
            let productMap = {}; 

            if (ordersData) {
                ordersData.forEach(order => {
                    revenue += parseFloat(order.total_price || 0);
                    if (order.items && Array.isArray(order.items)) {
                        order.items.forEach(item => {
                            soldItems += item.quantity || 1;
                            if (productMap[item.name]) {
                                productMap[item.name].qty += (item.quantity || 1);
                            } else {
                                productMap[item.name] = {
                                    name: item.name,
                                    qty: (item.quantity || 1),
                                    img: item.img,
                                    price: item.price
                                };
                            }
                        });
                    }
                });
            }

            // En çok satanı belirle
            let topProduct = null;
            let maxQty = 0;
            Object.values(productMap).forEach(prod => {
                if (prod.qty > maxQty) {
                    maxQty = prod.qty;
                    topProduct = prod;
                }
            });

            // 3. BAĞIŞ VERİLERİNİ ÇEK (YENİ EKLENDİ)
            // Bağış tablosundan verileri alırken aynı zamanda kullanıcılar tablosundan bağış yapanın adını ve profil fotosunu birleştiriyoruz.
            const { data: donationsData, error: donationError } = await supabase
                .from('donations')
                .select(`
                    *,
                    users (fullname, profile_image)
                `)
                .eq('status', 'success')
                .order('created_at', { ascending: false });

            let totalDonationAmount = 0;
            let formattedDonations = [];

            if (!donationError && donationsData) {
                donationsData.forEach(donation => {
                    totalDonationAmount += parseFloat(donation.amount || 0);
                });
                
                // En son yapılan 10 bağışı listele
                formattedDonations = donationsData.slice(0, 10);
            }

            // 4. Tüm Statları Güncelle
            setBestSeller(topProduct);
            setRecentDonations(formattedDonations);
            setStats({
                userCount: uCount || 0,
                listingCount: lCount || 0,
                totalRevenue: revenue.toFixed(2),
                totalSoldItems: soldItems,
                totalDonations: totalDonationAmount.toFixed(2) // Toplam bağış miktarını kaydet
            });

        } catch (error) {
            console.log("Dashboard Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Kullanıcı Detayına Git (Bağış listesindeki kişiye tıklanırsa)
    const handleDonatorClick = (userId) => {
        if(userId) {
            navigation.navigate('UserProfile', { userId: userId });
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, {backgroundColor: theme.background, justifyContent:'center', alignItems:'center'}]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
                <View style={{width:40}}/>
            </View>

            <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 50}} showsVerticalScrollIndicator={false}>
                
                <Text style={{color: theme.subText, marginBottom: 15, fontSize: 16}}>{t.welcome} 👋</Text>

                {/* --- FİNANSAL KARTLAR (YATAY SCROLL İLE 3 KART) --- */}
                <Text style={[styles.sectionTitle, {color: theme.text}]}>{t.financials}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
                    
                    {/* Ciro Kartı */}
                    <View style={[styles.bigCard, { backgroundColor: '#E8F5E9', marginRight: 15, width: width * 0.42 }]}>
                        <View style={[styles.iconCircle, { backgroundColor: '#C8E6C9' }]}>
                            <Text style={{fontSize: 22}}>💰</Text>
                        </View>
                        <Text style={styles.bigCardValue}>{stats.totalRevenue} <Text style={{fontSize:14}}>{t.currency}</Text></Text>
                        <Text style={styles.bigCardLabel}>{t.revenue}</Text>
                    </View>

                    {/* Satış Kartı */}
                    <View style={[styles.bigCard, { backgroundColor: '#E3F2FD', marginRight: 15, width: width * 0.42 }]}>
                        <View style={[styles.iconCircle, { backgroundColor: '#BBDEFB' }]}>
                            <Text style={{fontSize: 22}}>📦</Text>
                        </View>
                        <Text style={styles.bigCardValue}>{stats.totalSoldItems}</Text>
                        <Text style={styles.bigCardLabel}>{t.sold}</Text>
                    </View>

                    {/* YENİ: Toplam Bağış Kartı */}
                    <View style={[styles.bigCard, { backgroundColor: '#FFF3E0', marginRight: 15, width: width * 0.42 }]}>
                        <View style={[styles.iconCircle, { backgroundColor: '#FFE0B2' }]}>
                            <Text style={{fontSize: 22}}>❤️</Text>
                        </View>
                        <Text style={styles.bigCardValue}>{stats.totalDonations} <Text style={{fontSize:14}}>{t.currency}</Text></Text>
                        <Text style={styles.bigCardLabel}>{t.donations}</Text>
                    </View>

                </ScrollView>

                {/* --- SON BAĞIŞ YAPANLAR LİSTESİ (YENİ EKLENDİ) --- */}
                <Text style={[styles.sectionTitle, {color: theme.text, marginTop: 10}]}>{t.recentDonations}</Text>
                <View style={[styles.donationsCard, { backgroundColor: theme.cardBg }]}>
                    {recentDonations.length === 0 ? (
                        <Text style={{color: theme.subText, textAlign: 'center', padding: 15}}>{t.noDonations}</Text>
                    ) : (
                        recentDonations.map((donation, index) => (
                            <TouchableOpacity 
                                key={donation.id || index} 
                                style={[styles.donationItem, index !== recentDonations.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
                                onPress={() => handleDonatorClick(donation.user_id)}
                            >
                                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                    {donation.users?.profile_image ? (
                                        <Image source={{uri: donation.users.profile_image}} style={styles.donatorImg} />
                                    ) : (
                                        <View style={[styles.donatorImg, {backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center'}]}>
                                            <Ionicons name="person" color="white" size={20} />
                                        </View>
                                    )}
                                    <View style={{marginLeft: 12}}>
                                        <Text style={[styles.donatorName, {color: theme.text}]}>{donation.users?.fullname || 'Gizli Kahraman'}</Text>
                                        <Text style={{fontSize: 12, color: theme.subText}}>
                                            {new Date(donation.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.donationAmountBadge}>
                                    <Text style={styles.donationAmountText}>{donation.amount} {donation.currency}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
{/* --- EN ÇOK SATAN (BEST SELLER) --- */}
                {bestSeller && (
                    <>
                        <Text style={[styles.sectionTitle, {color: theme.text, marginTop: 25}]}>{t.bestSeller}</Text>
                        <View style={[styles.bestSellerCard, { backgroundColor: theme.cardBg, borderColor: COLORS.primary }]}>
                            <View style={styles.bestSellerContent}>
                                <Image source={{ uri: bestSeller.img }} style={styles.bestSellerImg} />
                                <View style={{flex:1, paddingLeft: 15}}>
                                    <Text style={[styles.bsName, {color:theme.text}]} numberOfLines={2}>{bestSeller.name}</Text>
                                    <View style={styles.bsStatsRow}>
                                        <View style={styles.bsStatItem}>
                                            <Text style={styles.bsStatVal}>{bestSeller.qty}</Text>
                                            <Text style={styles.bsStatLbl}>{t.soldCount}</Text>
                                        </View>
                                        <View style={styles.bsStatItem}>
                                            <Text style={styles.bsStatVal}>%{((bestSeller.qty / stats.totalSoldItems) * 100).toFixed(1)}</Text>
                                            <Text style={styles.bsStatLbl}>{t.share}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressBarFill, { width: `${(bestSeller.qty / stats.totalSoldItems) * 100}%` }]} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </> 
                )}

                {/* --- MAĞAZA YÖNETİMİ BUTONU --- */}
                <TouchableOpacity 
                    style={styles.shopAdminBtn}
                    onPress={() => navigation.navigate('ShopAdmin')} 
                >
                    <View style={styles.shopAdminIcon}>
                        <Ionicons name="storefront" size={28} color="white" />
                    </View>
                    <View style={{flex:1}}>
                        <Text style={styles.shopAdminTitle}>{t.shopManager}</Text>
                        <Text style={styles.shopAdminDesc}>{t.shopDesc}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="white" />
                </TouchableOpacity>

                {/* --- VERİTABANI İSTATİSTİKLERİ --- */}
                <Text style={[styles.sectionTitle, {color: theme.text, marginTop: 25}]}>{t.database}</Text>
                <View style={styles.statsRow}>
                    <TouchableOpacity 
                        style={[styles.smallCard, { backgroundColor: theme.cardBg, borderColor: '#9C27B0', borderWidth: 1 }]} 
                        onPress={() => navigation.navigate('AdminUsers')}
                    >
                        <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', width:'100%'}}>
                            <Ionicons name="people" size={24} color="#9C27B0" />
                            <Ionicons name="arrow-forward-circle" size={20} color="#9C27B0" />
                        </View>
                        <Text style={[styles.smallCardValue, {color: theme.text}]}>{stats.userCount}</Text>
                        <Text style={styles.smallCardLabel}>{t.users}</Text>
                    </TouchableOpacity>

                    <View style={[styles.smallCard, { backgroundColor: theme.cardBg }]}>
                        <Ionicons name="layers" size={24} color="#FF9800" />
                        <Text style={[styles.smallCardValue, {color: theme.text}]}>{stats.listingCount}</Text>
                        <Text style={styles.smallCardLabel}>{t.listings}</Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
    title: { fontSize: 22, fontWeight: 'bold' },
    
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 5 },
    
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    
    // Büyük Finansal Kartlar
    bigCard: { padding: 15, borderRadius: 20, alignItems: 'flex-start', elevation: 2, shadowColor:'#000', shadowOpacity:0.1, shadowOffset:{width:0, height:2} },
    iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    bigCardValue: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    bigCardLabel: { fontSize: 13, color: '#666', marginTop: 4, fontWeight: '500' },

    // YENİ: Bağış Listesi Tasarımı
    donationsCard: { borderRadius: 20, paddingHorizontal: 15, marginBottom: 20, elevation: 1, shadowColor:'#000', shadowOpacity:0.05 },
    donationItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15 },
    donatorImg: { width: 40, height: 40, borderRadius: 20 },
    donatorName: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
    donationAmountBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    donationAmountText: { color: '#EF6C00', fontWeight: 'bold', fontSize: 14 },

    // Best Seller Kartı
    bestSellerCard: { padding: 15, borderRadius: 20, borderWidth: 1, marginBottom: 20, borderLeftWidth: 5 },
    bestSellerContent: { flexDirection: 'row', alignItems: 'center' },
    bestSellerImg: { width: 70, height: 70, borderRadius: 10, backgroundColor: '#eee' },
    bsName: { fontWeight: 'bold', fontSize: 15, marginBottom: 5 },
    bsStatsRow: { flexDirection: 'row', gap: 15, marginBottom: 8 },
    bsStatItem: { alignItems: 'flex-start' },
    bsStatVal: { fontWeight: 'bold', fontSize: 14, color: COLORS.primary },
    bsStatLbl: { fontSize: 10, color: '#888' },
    progressBarBg: { height: 6, backgroundColor: '#eee', borderRadius: 3, width: '100%' },
    progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },

    // Shop Admin Butonu
    shopAdminBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF9800', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 4 },
    shopAdminIcon: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    shopAdminTitle: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    shopAdminDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },

    // Küçük İstatistik Kartları
    smallCard: { width: '48%', padding: 15, borderRadius: 15, elevation: 1, height: 110, justifyContent: 'space-between' },
    smallCardValue: { fontSize: 24, fontWeight: 'bold' },
    smallCardLabel: { fontSize: 12, color: '#999' },
});

export default AdminPanelScreen;