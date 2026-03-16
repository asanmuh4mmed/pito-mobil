import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, Linking, Alert, ActivityIndicator, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

    if (loading && !fetchedItem) {
        return (
            <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#6C5CE7" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            
            {/* ÜST RESİM / SLIDER ALANI */}
            <View style={{ height: height * 0.45 }}>
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={({ nativeEvent }) => onScroll(nativeEvent)} scrollEventThrottle={16}>
                    {mediaItems.map((media, index) => (
                        <View key={index} style={{ width: width, height: height * 0.45, backgroundColor: 'black', justifyContent:'center', alignItems:'center' }}>
                            {media.type === 'video' ? (
                                <View style={{alignItems:'center'}}>
                                    <Ionicons name="play-circle" size={60} color="white" style={{opacity:0.8}} />
                                    <Text style={{color:'white', marginTop:10, fontWeight: '600'}}>{t.videoPreview}</Text>
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
                            <View key={i} style={[styles.dot, { backgroundColor: i === activeSlide ? '#6C5CE7' : 'rgba(255,255,255,0.6)', width: i === activeSlide ? 20 : 8 }]} />
                        ))}
                    </View>
                )}
                
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            {/* DETAYLAR ALANI */}
            <View style={[styles.detailsContainer, { backgroundColor: theme.background }]}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    
                    {/* İLAN BAŞLIĞI VE ETİKET */}
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{item.name}</Text>
                            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
                                <Ionicons name="location" size={16} color={theme.subText} />
                                <Text style={[styles.location, { color: theme.subText, marginLeft: 4 }]}>{item.city ? `${item.city}, ${item.district}` : (item.subtitle || '')}</Text>
                            </View>
                        </View>
                        <View style={[styles.genderTag, { backgroundColor: isDarkMode ? '#1E1E2C' : 'rgba(108, 92, 231, 0.1)' }]}>
                            <Ionicons name={isServiceCategory ? "medkit" : "paw"} size={16} color="#6C5CE7" />
                            <Text style={styles.genderText}>{displayCategory}</Text>
                        </View>
                    </View>

                    {/* 3'LÜ İSTATİSTİK KUTULARI */}
                    <View style={styles.statsContainer}>
                        <View style={[styles.statBox, { backgroundColor: theme.cardBg }]}>
                            <Text style={[styles.statLabel, { color: theme.subText }]}>{t.category}</Text>
                            <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{displayCategory}</Text>
                        </View>
                        {isServiceCategory ? (
                            <TouchableOpacity style={[styles.statBox, { backgroundColor: theme.cardBg }]} onPress={handleReviews} activeOpacity={0.8}>
                                <Text style={[styles.statLabel, { color: theme.subText }]}>{t.rating} ({listingReviews.length})</Text>
                                <View style={{flexDirection:'row', alignItems:'center', justifyContent: 'center'}}>
                                    <Ionicons name="star" size={14} color="#FDCB6E" />
                                    <Text style={[styles.statValue, { color: theme.text, marginLeft: 4 }]}>{averageRating}</Text>
                                </View>
                            </TouchableOpacity>
                        ) : (
                            <View style={[styles.statBox, { backgroundColor: theme.cardBg }]}>
                                <Text style={[styles.statLabel, { color: theme.subText }]}>{t.breed}</Text>
                                <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={1}>{item.breed || t.unspecified}</Text>
                            </View>
                        )}
                        <View style={[styles.statBox, { backgroundColor: theme.cardBg }]}>
                            <Text style={[styles.statLabel, { color: theme.subText }]}>{t.date}</Text>
                            <Text style={[styles.statValue, { color: theme.text, fontSize: 12 }]} numberOfLines={1} adjustsFontSizeToFit>{item.date || t.new}</Text>
                        </View>
                    </View>

                    {/* İLAN SAHİBİ KARTI */}
                    <TouchableOpacity style={[styles.ownerContainer, { backgroundColor: theme.cardBg }]} onPress={handleUserProfile} activeOpacity={0.8}>
                        <View style={styles.avatarContainer}>
                            {ownerAvatar ? (
                                <Image source={{ uri: ownerAvatar }} style={styles.avatarImage} />
                            ) : (
                                <View style={{width: '100%', height: '100%', backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center'}}>
                                    <Text style={styles.avatarText}>{ownerName ? ownerName.charAt(0).toUpperCase() : "P"}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.ownerInfo}>
                            <Text style={[styles.ownerName, { color: theme.text }]} numberOfLines={1}>{ownerName}</Text>
                            <Text style={[styles.ownerRole, { color: theme.subText }]}>{isServiceCategory ? t.serviceProvider : t.owner}</Text>
                        </View>
                        
                        {(item.contact || item.phone) ? (
                            <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.8}>
                                <Ionicons name="call" size={20} color="white" />
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.callBtnPlaceholder}>
                                <Ionicons name="chevron-forward" size={20} color={theme.subText} />
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* AÇIKLAMA ALANI */}
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.about}</Text>
                    <Text style={[styles.description, { color: theme.subText }]}>{item.description || t.noInfo}</Text>
                    
                </ScrollView>
            </View>

            {/* ALT BUTONLAR (SABİT EKRANIN ALTINDA) */}
            <View style={[styles.footer, { backgroundColor: theme.background }]}>
                {isServiceCategory ? (
                    <View style={styles.doubleBtnContainer}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FDCB6E', flex: 1, marginRight: 15 }]} onPress={handleReviews} activeOpacity={0.8}>
                            <Ionicons name="star" size={20} color="#333" style={{marginRight:6}} />
                            <Text style={[styles.btnText, {color: '#333'}]}>{t.reviews}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6C5CE7', flex: 1 }]} onPress={handleCall} activeOpacity={0.8}>
                            <Ionicons name="call" size={20} color="white" style={{marginRight:6}} />
                            <Text style={styles.btnText}>{t.call}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    !isMyListing && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, { backgroundColor: item.isFound ? '#ADB5BD' : '#6C5CE7', width: '100%' }]} 
                            onPress={handleMessage}
                            disabled={item.isFound} 
                            activeOpacity={0.8}
                        >
                            <Ionicons name="chatbubble-ellipses" size={22} color="white" style={{ marginRight: 10 }} />
                            <Text style={styles.btnText}>{item.isFound ? t.activeNot : t.message}</Text>
                        </TouchableOpacity>
                    )
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    image: { width: width, height: '100%', resizeMode: 'cover' },
    
    // ŞIK GERİ BUTONU (CAM EFEKTİ GİBİ)
    backBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, left: 20, backgroundColor: 'rgba(255,255,255,0.9)', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2 },
    
    // YENİ NESİL DETAY KUTUSU
    detailsContainer: { flex: 1, marginTop: -35, borderTopLeftRadius: 35, borderTopRightRadius: 35, paddingHorizontal: 20, paddingTop: 30, elevation: 10, shadowColor: '#000', shadowOffset: {width: 0, height: -5}, shadowOpacity: 0.1, shadowRadius: 10 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
    name: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
    location: { fontSize: 13, fontWeight: '500' },
    
    genderTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    genderText: { marginLeft: 6, color: '#6C5CE7', fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
    
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    statBox: { width: '31%', paddingVertical: 18, paddingHorizontal: 10, borderRadius: 20, alignItems: 'center', justifyContent:'center', elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05 },
    statLabel: { fontSize: 11, marginBottom: 6, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    statValue: { fontWeight: '800', fontSize: 14, textAlign: 'center' },
    
    ownerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, padding: 15, borderRadius: 20, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.08 },
    avatarContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    avatarText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    ownerInfo: { flex: 1 },
    ownerName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    ownerRole: { fontSize: 12, fontWeight: '500' },
    callBtn: { backgroundColor: '#FD79A8', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 3 },
    callBtnPlaceholder: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
    description: { lineHeight: 24, fontSize: 15, fontWeight: '500' },
    
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 15, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
    doubleBtnContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    actionBtn: { paddingVertical: 18, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: "#6C5CE7", shadowOffset: {width:0, height:4}, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
    
    pagination: { flexDirection: 'row', position: 'absolute', bottom: 60, alignSelf: 'center' },
    dot: { height: 6, borderRadius: 3, marginHorizontal: 3 },
    
    foundOverlay: { position: 'absolute', top: '35%', alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 15, borderWidth: 4, borderColor: '#00B894', transform: [{ rotate: '-10deg' }], zIndex: 99, elevation: 10, shadowColor: '#00B894', shadowOffset: {width: 0, height: 5}, shadowOpacity: 0.5 },
    foundText: { color: '#00B894', fontSize: 22, fontWeight: '900', letterSpacing: 2 }
});

export default ListingDetailScreen;