import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, Linking, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { ListingContext } from '../context/ListingContext';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase'; // DB Bağlantısı

const { width, height } = Dimensions.get('window');

const TRANSLATIONS = {
    TR: {
        category: "Kategori", rating: "Puan", breed: "Cins", date: "Tarih", about: "Hakkında",
        reviews: "Yorumlar", call: "Ara", message: "Mesaj Gönder", activeNot: "İlan Aktif Değil",
        owner: "İlan Sahibi", serviceProvider: "Hizmet Veren", new: "Yeni", other: "Diğer",
        unspecified: "Belirtilmemiş", mateFound: "EŞ BULUNDU", homeFound: "YUVA BULUNDU",
        videoPreview: "Video Önizleme", loginRequired: "Giriş Yapmalısınız",
        loginMsg: "İşlem yapmak için lütfen giriş yapın.", cancel: "İptal", login: "Giriş Yap",
        warning: "Uyarı", ownListingMsg: "Kendi ilanınıza mesaj gönderemezsiniz.",
        noInfo: "Bu ilan için henüz detaylı bir açıklama girilmemiş.", noContact: "İletişim numarası bulunamadı.",
        error: "Hata", userNotFound: "Kullanıcı profili bulunamadı."
    },
    AU: {
        category: "Category", rating: "Rating", breed: "Breed", date: "Date", about: "About",
        reviews: "Reviews", call: "Call", message: "Message", activeNot: "Not Active",
        owner: "Owner", serviceProvider: "Service Provider", new: "New", other: "Other",
        unspecified: "Unspecified", mateFound: "MATE FOUND", homeFound: "HOME FOUND",
        videoPreview: "Video Preview", loginRequired: "Login Required",
        loginMsg: "Please login to perform this action.", cancel: "Cancel", login: "Login",
        warning: "Warning", ownListingMsg: "You cannot message your own listing.",
        noInfo: "No detailed description provided for this listing.", noContact: "Contact number not found.",
        error: "Error", userNotFound: "User profile not found."
    }
};

const ListingDetailScreen = ({ navigation, route }) => {
    const { item: paramsItem } = route.params; 
    
    const { reviews } = useContext(ListingContext); 
    const { user, country } = useContext(AuthContext); 
    const { theme, isDarkMode } = useContext(ThemeContext);

    const activeLang = country?.code || 'TR';
    const t = TRANSLATIONS[activeLang];

    const [fetchedItem, setFetchedItem] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchListingDetails();
    }, [paramsItem.id]);

    const fetchListingDetails = async () => {
        try {
            // ✅ products yerine listings tablosundan çekiyoruz
            const { data, error } = await supabase
                .from('listings')
                .select('*, users ( fullname, avatar, id )')
                .eq('id', paramsItem.id)
                .single();

            if (data) {
                setFetchedItem({
                    ...data,
                    name: data.name,
                    ownerId: data.owner_id,
                    ownerName: data.users?.fullname,
                    ownerAvatar: data.users?.avatar,
                    // images dizisi varsa onu kullan, yoksa img'yi kullan
                    media: data.images ? data.images.map(url => ({ uri: url, type: 'image' })) : [{ uri: data.img, type: 'image' }],
                    isFound: data.is_found,
                    date: new Date(data.created_at).toLocaleDateString()
                });
            }
        } catch (e) {
            console.log("Detay çekme hatası:", e);
        } finally {
            setLoading(false);
        }
    };

    const item = fetchedItem || paramsItem;

    const getLocalizedCategoryName = (catName) => {
        if (!catName) return t.other;
        if (activeLang === 'TR') return catName;
        if (catName.includes('Eş Arayanlar')) return 'Find Mate';
        if (catName.includes('Sahiplendirme')) return 'Adoption';
        if (catName.includes('Veteriner')) return 'Vet Clinic';
        if (catName.includes('Kuaför')) return 'Pet Grooming';
        if (catName.includes('Bakıcı')) return 'Pet Sitter';
        return catName;
    };

    const displayCategory = getLocalizedCategoryName(item.category);
    const ownerName = item.ownerName || item.users?.fullname || "Pito Kullanıcısı";
    const ownerAvatar = item.ownerAvatar || item.users?.avatar;
    const ownerId = item.ownerId || item.owner_id;
    const isMyListing = user && String(user.id) === String(ownerId);
    const [activeSlide, setActiveSlide] = useState(0);
    const isServiceCategory = item.category ? (item.category.includes('Veteriner') || item.category.includes('Bakıcı') || item.category.includes('Vet') || item.category.includes('Sitter')) : false;
    const listingReviews = reviews ? reviews.filter(r => r.listingId === item.id) : [];
    const averageRating = listingReviews.length > 0 ? (listingReviews.reduce((sum, r) => sum + r.rating, 0) / listingReviews.length).toFixed(1) : t.new;
    const mediaItems = item.media || (item.images ? item.images.map(uri => ({ uri, type: 'image' })) : [{ uri: item.img, type: 'image' }]);

    const onScroll = (nativeEvent) => {
        if(nativeEvent) {
            const slide = Math.ceil(nativeEvent.contentOffset.x / nativeEvent.layoutMeasurement.width);
            if (slide !== activeSlide) setActiveSlide(slide);
        }
    };

    const checkAuth = (action) => {
        if (!user) {
            Alert.alert(t.loginRequired, t.loginMsg, [
                { text: t.cancel, style: "cancel" },
                { text: t.login, onPress: () => navigation.navigate('Login') }
            ]);
            return;
        }
        action();
    };

    const handleCall = () => {
        checkAuth(() => {
            if (item.contact || item.phone) Linking.openURL(`tel:${item.contact || item.phone}`);
            else Alert.alert(t.warning, t.noContact);
        });
    };

    const handleMessage = () => {
        checkAuth(() => {
            if (isMyListing) {
                Alert.alert(t.warning, t.ownListingMsg);
                return;
            }
            navigation.navigate('ChatDetail', { 
                targetUser: { 
                    id: ownerId, 
                    fullname: ownerName, 
                    avatar: ownerAvatar 
                },
                listingId: item.id,
                listingName: item.name
            });
        });
    };

    const handleReviews = () => {
        navigation.navigate('Reviews', { listingId: item.id, listingName: item.name });
    };

    const handleUserProfile = () => {
        if (isMyListing) {
            navigation.navigate('Profile');
        } else if (ownerId) {
            navigation.navigate('UserProfile', { 
                userId: ownerId, 
                userName: ownerName,
                userAvatar: ownerAvatar
            });
        } else {
            Alert.alert(t.error, t.userNotFound);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={{ height: height * 0.45 }}>
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={({ nativeEvent }) => onScroll(nativeEvent)} scrollEventThrottle={16}>
                    {mediaItems.map((media, index) => (
                        <View key={index} style={{ width: width, height: height * 0.45, backgroundColor: 'black', justifyContent:'center', alignItems:'center' }}>
                            {media.type === 'video' ? (
                                <View style={{alignItems:'center'}}>
                                    <Ionicons name="play-circle" size={60} color="white" style={{opacity:0.8}} />
                                    <Text style={{color:'white', marginTop:10}}>{t.videoPreview}</Text>
                                </View>
                            ) : (
                                <Image source={{ uri: media.uri }} style={[styles.image, { opacity: item.isFound ? 0.6 : 1 }]} />
                            )}
                        </View>
                    ))}
                </ScrollView>
                {item.isFound && (
                    <View style={styles.foundOverlay}>
                        <Text style={styles.foundText}>{(item.category.includes('Eş') || item.category.includes('Mate')) ? t.mateFound : t.homeFound}</Text>
                    </View>
                )}
                {mediaItems.length > 1 && (
                    <View style={styles.pagination}>
                        {mediaItems.map((_, i) => (
                            <View key={i} style={[styles.dot, { backgroundColor: i === activeSlide ? COLORS.primary : 'rgba(255,255,255,0.5)' }]} />
                        ))}
                    </View>
                )}
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
                </TouchableOpacity>
            </View>

            <View style={[styles.detailsContainer, { backgroundColor: theme.cardBg }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                            <Text style={[styles.location, { color: theme.subText }]}>📍 {item.city ? `${item.city}, ${item.district}` : (item.subtitle || '')}</Text>
                        </View>
                        <View style={[styles.genderTag, { backgroundColor: isDarkMode ? '#333' : '#FFF3E0' }]}>
                            <Ionicons name={isServiceCategory ? "medkit" : "paw"} size={20} color={COLORS.primary} />
                            <Text style={styles.genderText}>{displayCategory}</Text>
                        </View>
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={[styles.statBox, { backgroundColor: theme.background }]}>
                            <Text style={[styles.statLabel, { color: theme.subText }]}>{t.category}</Text>
                            <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{displayCategory}</Text>
                        </View>
                        {isServiceCategory ? (
                            <TouchableOpacity style={[styles.statBox, { backgroundColor: theme.background }]} onPress={handleReviews}>
                                <Text style={[styles.statLabel, { color: theme.subText }]}>{t.rating} ({listingReviews.length})</Text>
                                <View style={{flexDirection:'row', alignItems:'center'}}>
                                    <Ionicons name="star" size={14} color="#FFD700" />
                                    <Text style={[styles.statValue, { color: theme.text }]}> {averageRating}</Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={[styles.statBox, { backgroundColor: theme.background }]}>
                                <Text style={[styles.statLabel, { color: theme.subText }]}>{t.breed}</Text>
                                <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{item.breed || t.unspecified}</Text>
                            </View>
                        )}
                        <View style={[styles.statBox, { backgroundColor: theme.background }]}>
                            <Text style={[styles.statLabel, { color: theme.subText }]}>{t.date}</Text>
                            <Text style={[styles.statValue, { color: theme.text, fontSize: 12 }]} numberOfLines={1} adjustsFontSizeToFit>{item.date || t.new}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.ownerContainer, { backgroundColor: theme.background }]} onPress={handleUserProfile} activeOpacity={0.8}>
                        <View style={styles.avatarContainer}>
                            {ownerAvatar ? (
                                <Image source={{ uri: ownerAvatar }} style={styles.avatarImage} />
                            ) : (
                                <Text style={styles.avatarText}>{ownerName ? ownerName.charAt(0).toUpperCase() : "P"}</Text>
                            )}
                        </View>
                        <View style={styles.ownerInfo}>
                            <Text style={[styles.ownerName, { color: theme.text }]}>{ownerName}</Text>
                            <Text style={[styles.ownerRole, { color: theme.subText }]}>{isServiceCategory ? t.serviceProvider : t.owner}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.subText} style={{marginRight: 10}} />
                        {(item.contact || item.phone) && (
                            <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
                                <Ionicons name="call" size={20} color="white" />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>

                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.about}</Text>
                    <Text style={[styles.description, { color: theme.subText }]}>{item.description || t.noInfo}</Text>
                    <View style={{ height: 120 }} />
                </ScrollView>

                <View style={styles.footer}>
                    {isServiceCategory ? (
                        <View style={styles.doubleBtnContainer}>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFB74D', flex: 1, marginRight: 10 }]} onPress={handleReviews}>
                                <Ionicons name="star" size={20} color="white" style={{marginRight:5}} />
                                <Text style={styles.btnText}>{t.reviews}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary, flex: 1 }]} onPress={handleCall}>
                                <Ionicons name="call" size={20} color="white" style={{marginRight:5}} />
                                <Text style={styles.btnText}>{t.call}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        !isMyListing && (
                            <TouchableOpacity 
                                style={[styles.actionBtn, { backgroundColor: item.isFound ? '#999' : COLORS.primary, width: '100%' }]} 
                                onPress={handleMessage}
                                disabled={item.isFound} 
                            >
                                <Ionicons name="chatbubble-ellipses" size={24} color="white" style={{ marginRight: 10 }} />
                                <Text style={styles.btnText}>{item.isFound ? t.activeNot : t.message}</Text>
                            </TouchableOpacity>
                        )
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    image: { width: width, height: '100%', resizeMode: 'cover' },
    backBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(255,255,255,0.8)', padding: 10, borderRadius: 12 },
    detailsContainer: { flex: 1, marginTop: -40, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 20, paddingTop: 30 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    name: { fontSize: 28, fontWeight: 'bold' },
    location: { fontSize: 14, marginTop: 5 },
    genderTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    genderText: { marginLeft: 5, color: COLORS.primary, fontWeight: 'bold' },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    statBox: { width: '30%', padding: 15, borderRadius: 15, alignItems: 'center', justifyContent:'center' },
    statLabel: { fontSize: 12, marginBottom: 5 },
    statValue: { fontWeight: 'bold', fontSize: 14, textAlign: 'center' },
    ownerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, padding: 10, borderRadius: 15 },
    avatarContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    avatarText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    ownerInfo: { flex: 1 },
    ownerName: { fontSize: 16, fontWeight: 'bold' },
    ownerRole: { fontSize: 12 },
    callBtn: { backgroundColor: '#4ECDC4', padding: 12, borderRadius: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    description: { lineHeight: 22, fontSize: 15 },
    footer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
    doubleBtnContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    actionBtn: { padding: 16, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity: 0.2, elevation: 3 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    pagination: { flexDirection: 'row', position: 'absolute', bottom: 50, alignSelf: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
    foundOverlay: { position: 'absolute', top: '40%', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.9)', padding: 15, borderRadius: 10, borderWidth: 3, borderColor: '#4CAF50', transform: [{ rotate: '-15deg' }], zIndex: 99 },
    foundText: { color: '#4CAF50', fontSize: 24, fontWeight: 'bold', letterSpacing: 2 }
});

export default ListingDetailScreen;