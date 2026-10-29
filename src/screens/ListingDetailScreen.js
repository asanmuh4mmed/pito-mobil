import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions, Linking, Alert, Modal, Platform, Share, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListingContext } from '../context/ListingContext';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase'; 

const { width, height } = Dimensions.get('window');

// --- PITO YENİ RENK PALETİ ---
const PITO_COLORS = {
    primary: '#C5A059', 
    primaryDark: '#B08D4B', 
    navyBg: '#0B131E', 
    navySurface: '#1A2533', 
    navyLight: '#243447',
    cream: '#F5F5DC',
    white: '#FFFFFF',
    grayText: '#A0AAB5',
    error: '#FF4757',
    success: '#00B894'
};

const TRANSLATIONS = {
    TR: {
        category: "Kategori", rating: "Puan", breed: "Cins", about: "Hakkında",
        reviews: "Yorumlar", call: "Ara", message: "Mesaj Gönder", activeNot: "İlan Aktif Değil",
        owner: "İlan Sahibi", serviceProvider: "Hizmet Veren", new: "Yeni", other: "Diğer",
        unspecified: "Belirtilmemiş", mateFound: "EŞ BULUNDU", homeFound: "YUVA BULUNDU",
        videoPreview: "Video Önizleme", loginRequired: "Giriş Yapmalısınız",
        loginMsg: "İşlem yapmak için lütfen giriş yapın.", cancel: "İptal", login: "Giriş Yap",
        warning: "Uyarı", ownListingMsg: "Kendi ilanınıza mesaj gönderemezsiniz.",
        noInfo: "Bu ilan için henüz detaylı bir açıklama girilmemiş.", noContact: "İletişim numarası bulunamadı.",
        error: "Hata", userNotFound: "Kullanıcı profili bulunamadı.",
        report: "Şikayet Et", alreadyReported: "Bu ilanı zaten şikayet ettiniz.", reportSuccess: "İlan bildirildi.", reportFail: "Şikayet gönderilemedi.",
        options: "Seçenekler", share: "Paylaş"
    },
    AU: {
        category: "Category", rating: "Rating", breed: "Breed", about: "About",
        reviews: "Reviews", call: "Call", message: "Message", activeNot: "Not Active",
        owner: "Owner", serviceProvider: "Service Provider", new: "New", other: "Other",
        unspecified: "Unspecified", mateFound: "MATE FOUND", homeFound: "HOME FOUND",
        videoPreview: "Video Preview", loginRequired: "Login Required",
        loginMsg: "Please login to perform this action.", cancel: "Cancel", login: "Login",
        warning: "Warning", ownListingMsg: "You cannot message your own listing.",
        noInfo: "No detailed description provided for this listing.", noContact: "Contact number not found.",
        error: "Error", userNotFound: "User profile not found.",
        report: "Report", alreadyReported: "You have already reported this listing.", reportSuccess: "Listing reported.", reportFail: "Failed to send report.",
        options: "Options", share: "Share"
    }
};

const ListingDetailScreen = ({ navigation, route }) => {
    const paramsItem = route.params?.item;
    const listingId = paramsItem?.id || route.params?.listingId; 
    
    const { reviews } = useContext(ListingContext); 
    const { user, country } = useContext(AuthContext); 
    const { theme, isDarkMode } = useContext(ThemeContext);

    const activeLang = country?.code || 'TR';
    const t = TRANSLATIONS[activeLang] || TRANSLATIONS.TR;

    const [fetchedItem, setFetchedItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);

    const [loadError, setLoadError] = useState(null);
    const [likeBusy, setLikeBusy] = useState(false);
    const likeLock = useRef(false);
    const runtime = useRef({ active: false, request: 0, id: listingId, userId: user?.id });
    runtime.current.id = listingId;
    runtime.current.userId = user?.id;
    const viewed = useRef(new Set());

    const fetchListingDetails = useCallback(async () => {
        const state = runtime.current;
        const request = ++state.request;
        const current = () => state.active && request === state.request && state.id === listingId && state.userId === user?.id;
        if (!listingId) {
            if (current()) { setFetchedItem(null); setLoadError('missing'); setLoading(false); }
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.from('listings')
                .select('*, users:pito_public_profiles ( fullname, avatar, id ), likes ( id, user_id )')
                .eq('id', listingId).maybeSingle();
            if (!current()) return;
            if (error) throw error;
            if (!data) { setFetchedItem(null); setLoadError('missing'); return; }
            const urls = Array.isArray(data.images) && data.images.length ? data.images : data.img ? [data.img] : [];
            setActiveSlide(0);
            setFetchedItem({
                ...data, ownerId: data.owner_id,
                ownerName: data.users?.fullname, ownerAvatar: data.users?.avatar,
                media: urls.map(uri => ({ uri, type: 'image' })),
                isFound: Boolean(data.is_found),
                likeCount: Array.isArray(data.likes) ? data.likes.length : 0,
                isLikedByMe: Array.isArray(data.likes) && data.likes.some(like => like.user_id === user?.id),
                rawDate: data.created_at,
            });
            setLoadError(null);
        } catch (error) {
            if (current()) setLoadError('network');
            console.log('[Listing detail] Okuma tamamlanamadı', { code: error?.code || 'request' });
        } finally { if (current()) setLoading(false); }
    }, [listingId, user?.id]);

    useFocusEffect(useCallback(() => {
        runtime.current.active = true;
        setIsMenuVisible(false);
        setLikeBusy(false);
        setActiveSlide(0);
        fetchListingDetails();
        const channel = listingId ? supabase.channel(`listing-detail:${listingId}:${user?.id || 'guest'}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'listings', filter: `id=eq.${listingId}` }, () => { fetchListingDetails(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `listing_id=eq.${listingId}` }, () => { fetchListingDetails(); })
            .subscribe() : null;
        return () => {
            runtime.current.active = false;
            runtime.current.request++;
            if (channel) supabase.removeChannel(channel);
        };
    }, [fetchListingDetails, listingId, user?.id]));

    useEffect(() => {
        if (!listingId || viewed.current.has(listingId)) return;
        viewed.current.add(listingId);
        (async () => {
            try {
                const { error } = await supabase.rpc('increment_view_count', { row_id: listingId });
                if (error) console.log('[Listing detail] Görüntülenme kaydedilemedi');
            } catch { console.log('[Listing detail] Görüntülenme kaydedilemedi'); }
        })();
    }, [listingId]);

    const handleLikeToggle = async () => {
        if (!user) { Alert.alert(t.loginRequired, t.loginMsg); return; }
        if (likeLock.current || loading || loadError || !fetchedItem || String(fetchedItem.id) !== String(listingId)) return;
        const actorId = user.id;
        const targetId = listingId;
        const state = runtime.current;
        const current = () => state.active && state.id === targetId && state.userId === actorId;
        likeLock.current = true;
        setLikeBusy(true);
        try {
            let result;
            if (fetchedItem.isLikedByMe) {
                result = await supabase.from('likes').delete().eq('listing_id', targetId).eq('user_id', actorId).select('id');
                if (result.error) throw result.error;
                if (!Array.isArray(result.data) || !result.data.length) throw new Error('Like deletion not confirmed');
            } else {
                result = await supabase.from('likes').insert({ listing_id: targetId, user_id: actorId }).select('id').single();
                if (result.error) throw result.error;
                if (!result.data?.id) throw new Error('Like insert not confirmed');
            }
            if (current()) await fetchListingDetails();
        } catch {
            if (current()) { Alert.alert(t.error, activeLang === 'TR' ? 'Pati işlemi doğrulanamadı. Lütfen tekrar dene.' : 'The like could not be confirmed. Please retry.'); await fetchListingDetails(); }
        } finally { likeLock.current = false; if (current()) setLikeBusy(false); }
    };

    const handleShare = async () => {
        try {
            const iosUrl = "https://apps.apple.com/tr/app/pito-hayvan-sahiplendirme/id6769795005?l=tr";
            const androidUrl = "https://play.google.com/store/apps/details?id=com.oxpi.pito&pcampaignid=web_share";
            
            const primaryUrl = Platform.OS === 'ios' ? iosUrl : androidUrl;

            const shareMessage = activeLang === 'TR' 
                ? `🐾 ${item.name} ilanına Pito'dan göz at!\n\n${item.description ? item.description.substring(0, 60) + '...' : ''}\n\nUygulamayı indir ve can dostlarımıza yuva ol:\n📱 App Store: ${iosUrl}\n🤖 Play Store: ${androidUrl}`
                : `🐾 Check out ${item.name} on Pito!\n\nDownload the app:\n📱 App Store: ${iosUrl}\n🤖 Play Store: ${androidUrl}`;

            await Share.share({
                message: shareMessage,
                url: primaryUrl,
                title: item.name
            });
        } catch (error) {
            console.log('Share error:', error.message);
        }
    };

    // Rota parametresindeki eski veriyi doğrulanmış ilan yerine gösterme.
    if (loading || loadError || !fetchedItem || String(fetchedItem.id) !== String(listingId)) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.background }]}>
                <TouchableOpacity style={{ padding: 22 }} onPress={() => navigation.goBack()} accessibilityLabel={activeLang === 'TR' ? 'Geri' : 'Back'}><Ionicons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
                    {loading ? <ActivityIndicator size="large" color={PITO_COLORS.primary} /> : <>
                        <Ionicons name="paw-outline" size={48} color={PITO_COLORS.primary} />
                        <Text style={{ color: theme.text, textAlign: 'center', fontSize: 17, marginTop: 16 }}>{loadError === 'missing'
                            ? (activeLang === 'TR' ? 'Bu ilan artık erişilebilir değil.' : 'This listing is no longer available.')
                            : (activeLang === 'TR' ? 'İlan bilgileri alınamadı. Bağlantını kontrol et.' : 'Could not load the listing. Check your connection.')}</Text>
                        <TouchableOpacity style={{ padding: 18, marginTop: 12 }} onPress={fetchListingDetails}><Text style={{ color: PITO_COLORS.primary, fontWeight: '700' }}>{activeLang === 'TR' ? 'Tekrar dene' : 'Retry'}</Text></TouchableOpacity>
                    </>}
                </View>
            </SafeAreaView>
        );
    }
    const item = fetchedItem;

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
    
    const isServiceCategory = item.category ? (item.category.includes('Veteriner') || item.category.includes('Bakıcı') || item.category.includes('Vet') || item.category.includes('Sitter')) : false;
    const listingReviews = reviews ? reviews.filter(r => r.listingId === item.id) : [];
    const averageRating = listingReviews.length > 0 ? (listingReviews.reduce((sum, r) => sum + r.rating, 0) / listingReviews.length).toFixed(1) : t.new;
    const mediaItems = item.media?.length ? item.media : (item.images ? item.images.map(uri => ({ uri, type: 'image' })) : [{ uri: item.img, type: 'image' }]);

    const onScroll = (nativeEvent) => {
        if(nativeEvent) {
            const slide = Math.max(0, Math.min(mediaItems.length - 1, Math.round(nativeEvent.contentOffset.x / Math.max(1, nativeEvent.layoutMeasurement.width))));
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
            if (item.contact || item.phone) Linking.openURL(`tel:${String(item.contact || item.phone).replace(/[^0-9+*#]/g, '')}`).catch(() => Alert.alert(t.error, t.noContact));
            else Alert.alert(t.warning, t.noContact);
        });
    };

    const handleMessage = () => {
        checkAuth(() => {
            if (isMyListing) {
                Alert.alert(t.warning, t.ownListingMsg);
                return;
            }
            if (item.isFound) return Alert.alert(t.warning, t.activeNot);
            if (!ownerId) return Alert.alert(t.error, t.userNotFound);
            navigation.navigate('ChatDetail', { 
                targetUser: { id: ownerId, fullname: ownerName, avatar: ownerAvatar },
                listingId: item.id,
                listingName: item.name
            });
        });
    };

    const handleReviews = () => {
        navigation.navigate('Reviews', { listingId: item.id, listingName: item.name });
    };

    const handleUserProfile = () => {
        if (isMyListing) navigation.navigate('Profile');
        else if (ownerId) navigation.navigate('UserProfile', { userId: ownerId, userName: ownerName, userAvatar: ownerAvatar });
        else Alert.alert(t.error, t.userNotFound);
    };

    const handleReportListing = async () => {
        checkAuth(async () => {
            try {
                const { error } = await supabase.from('reports').insert([
                    { listing_id: item.id, reporter_id: user.id, reason: 'Topluluk Kuralları İhlali' }
                ]);
                if (error) {
                    if (error.code === '23505') Alert.alert(t.warning, t.alreadyReported);
                    else throw error;
                } else {
                    Alert.alert(activeLang === 'TR' ? "Başarılı" : "Success", t.reportSuccess);
                }
            } catch (err) {
                Alert.alert(t.error, t.reportFail);
            }
        });
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.background }]}>
            <View style={styles.toolbar}>
                <TouchableOpacity style={[styles.toolButton, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={activeLang === 'TR' ? 'Geri' : 'Back'}>
                    <Ionicons name="arrow-back" size={22} color={theme.text} />
                </TouchableOpacity>
                <View style={styles.brand}><Text style={[styles.brandText, { color: theme.text }]}>Pito</Text><Ionicons name="paw" size={20} color={PITO_COLORS.primary} /></View>
                <View style={styles.toolbarActions}>
                    <TouchableOpacity style={[styles.toolButton, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]} onPress={handleShare} accessibilityRole="button" accessibilityLabel={t.share}>
                        <Ionicons name="share-outline" size={22} color={PITO_COLORS.primary} />
                    </TouchableOpacity>
                    {!isMyListing && <TouchableOpacity style={[styles.toolButton, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]} onPress={() => setIsMenuVisible(true)} accessibilityRole="button" accessibilityLabel={t.options}>
                        <Ionicons name="ellipsis-horizontal" size={22} color={theme.text} />
                    </TouchableOpacity>}
                </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={[styles.gallery, { backgroundColor: PITO_COLORS.navySurface }]}>
                    <ScrollView key={mediaItems.map(media => media.uri).join('|')} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={({ nativeEvent }) => onScroll(nativeEvent)} scrollEventThrottle={16}>
                        {mediaItems.map((media, index) => (
                            <View key={index} style={styles.mediaFrame}>
                                {media.type === 'video' ? <View style={styles.mediaPlaceholder}>
                                    <Ionicons name="play-circle-outline" size={62} color={PITO_COLORS.cream} />
                                    <Text style={styles.videoLabel}>{t.videoPreview}</Text>
                                </View> : media.uri ? <Image source={{ uri: media.uri }} style={[styles.image, { opacity: item.isFound ? 0.6 : 1 }]} resizeMode="cover" /> : <View style={styles.mediaPlaceholder}><Ionicons name="paw-outline" size={70} color={PITO_COLORS.primary} /></View>}
                            </View>
                        ))}
                    </ScrollView>
                    {item.isFound && <View style={styles.foundOverlay}><Ionicons name="checkmark-circle" size={16} color={PITO_COLORS.navyBg} /><Text style={styles.foundText}>{item.category?.includes('Eş') || item.category?.includes('Mate') ? t.mateFound : t.homeFound}</Text></View>}
                    {mediaItems.length > 1 && <>
                        <View style={styles.photoCounter}><Ionicons name="images-outline" size={13} color="white" /><Text style={styles.photoCounterText}>{activeSlide + 1} / {mediaItems.length}</Text></View>
                        <View style={styles.pagination}>{mediaItems.map((_, index) => <View key={index} style={[styles.dot, index === activeSlide && styles.activeDot]} />)}</View>
                    </>}
                </View>
                <View style={styles.detailsContainer}>
                    <View style={styles.categoryRow}>
                        <View style={styles.categoryTag}><Ionicons name={isServiceCategory ? 'medkit-outline' : 'paw-outline'} size={14} color={PITO_COLORS.primary} /><Text style={styles.categoryText}>{displayCategory}</Text></View>
                        <TouchableOpacity style={[styles.pawActionBtn, { borderColor: theme.border }]} disabled={likeBusy} onPress={handleLikeToggle} accessibilityRole="button" accessibilityLabel={activeLang === 'TR' ? 'Pati ver' : 'Like'}>
                            <Ionicons name={item.isLikedByMe ? 'paw' : 'paw-outline'} size={19} color={item.isLikedByMe ? PITO_COLORS.primary : theme.subText} />
                            <Text style={[styles.pawCount, { color: item.isLikedByMe ? PITO_COLORS.primary : theme.subText }]}>{item.likeCount || 0}</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                    <View style={styles.locationRow}><Ionicons name="location-outline" size={16} color={PITO_COLORS.primary} /><Text style={[styles.location, { color: theme.subText }]}>{[item.city, item.district].filter(Boolean).join(', ') || item.subtitle || t.unspecified}</Text></View>
                    <View style={styles.statsContainer}>
                        <View style={[styles.statBox, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: theme.border }]}>
                            <Ionicons name="grid-outline" size={19} color={PITO_COLORS.primary} />
                            <Text style={[styles.statLabel, { color: theme.subText }]}>{t.category}</Text>
                            <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={2}>{displayCategory}</Text>
                        </View>
                        {isServiceCategory ? <TouchableOpacity style={[styles.statBox, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: theme.border }]} onPress={handleReviews}>
                            <Ionicons name="star-outline" size={19} color={PITO_COLORS.primary} />
                            <Text style={[styles.statLabel, { color: theme.subText }]}>{t.rating} ({listingReviews.length})</Text>
                            <Text style={[styles.statValue, { color: theme.text }]}>{averageRating}</Text>
                        </TouchableOpacity> : <View style={[styles.statBox, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: theme.border }]}>
                            <Ionicons name="paw-outline" size={19} color={PITO_COLORS.primary} />
                            <Text style={[styles.statLabel, { color: theme.subText }]}>{t.breed}</Text>
                            <Text style={[styles.statValue, { color: theme.text }]} numberOfLines={2}>{item.breed || t.unspecified}</Text>
                        </View>}
                    </View>
                    {!isServiceCategory && (item.age !== undefined && item.age !== null || !!item.gender) && <View style={styles.petDetails}>
                        {item.age !== undefined && item.age !== null && <View style={styles.petTag}><Ionicons name="calendar-outline" size={14} color={PITO_COLORS.primary} /><Text style={[styles.petTagText, { color: theme.text }]}>{activeLang === 'TR' ? 'Yaş: ' : 'Age: '}{String(item.age)}</Text></View>}
                        {!!item.gender && <View style={styles.petTag}><Ionicons name="paw-outline" size={14} color={PITO_COLORS.primary} /><Text style={[styles.petTagText, { color: theme.text }]}>{item.gender}</Text></View>}
                    </View>}
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.about}</Text>
                    <View style={[styles.aboutCard, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: theme.border }]}>
                        <Text selectable style={[styles.description, { color: theme.text }]}>{item.description || t.noInfo}</Text>
                    </View>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{isServiceCategory ? t.serviceProvider : t.owner}</Text>
                    <View style={[styles.ownerContainer, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: theme.border }]}>
                        <TouchableOpacity style={styles.ownerProfile} onPress={handleUserProfile} accessibilityRole="button">
                            <View style={styles.avatarContainer}>{ownerAvatar ? <Image source={{ uri: ownerAvatar }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{ownerName ? ownerName.charAt(0).toUpperCase() : 'P'}</Text>}</View>
                            <View style={styles.ownerInfo}><Text style={[styles.ownerName, { color: theme.text }]} numberOfLines={1}>{ownerName}</Text><Text style={[styles.ownerRole, { color: theme.subText }]}>{isServiceCategory ? t.serviceProvider : t.owner}</Text></View>
                            <Ionicons name="chevron-forward" size={17} color={theme.subText} />
                        </TouchableOpacity>
                        {!!(item.contact || item.phone) && <TouchableOpacity style={styles.callBtn} onPress={handleCall} accessibilityRole="button" accessibilityLabel={t.call}><Ionicons name="call-outline" size={20} color={PITO_COLORS.primary} /></TouchableOpacity>}
                    </View>
                </View>
            </ScrollView>
            {isServiceCategory ? <View style={[styles.footer, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.cardBg, borderColor: theme.border }]}>
                <TouchableOpacity style={styles.secondaryAction} onPress={handleReviews}><Ionicons name="star-outline" size={19} color={PITO_COLORS.primary} /><Text style={styles.secondaryActionText}>{t.reviews}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.primaryAction} onPress={handleCall}><Ionicons name="call-outline" size={19} color={PITO_COLORS.navyBg} /><Text style={styles.btnText}>{t.call}</Text></TouchableOpacity>
            </View> : !isMyListing && <View style={[styles.footer, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.cardBg, borderColor: theme.border }]}>
                <TouchableOpacity style={[styles.primaryAction, item.isFound && { backgroundColor: PITO_COLORS.grayText }]} onPress={handleMessage} disabled={item.isFound} accessibilityRole="button" accessibilityState={{ disabled: !!item.isFound }}><Ionicons name="chatbubble-ellipses-outline" size={20} color={PITO_COLORS.navyBg} /><Text style={styles.btnText}>{item.isFound ? t.activeNot : t.message}</Text><Ionicons name="arrow-forward" size={18} color={PITO_COLORS.navyBg} /></TouchableOpacity>
            </View>}
            <Modal visible={isMenuVisible} transparent animationType="fade" onRequestClose={() => setIsMenuVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsMenuVisible(false)}>
                    <View style={[styles.modalContent, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]}>
                        <View style={styles.modalHandle} />
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{t.options}</Text>
                        <TouchableOpacity style={styles.modalBtnReport} onPress={() => { setIsMenuVisible(false); handleReportListing(); }}>
                            <View style={styles.modalIconBg}><Ionicons name="flag-outline" size={22} color={PITO_COLORS.error} /></View><Text style={styles.modalBtnTextReport}>{t.report}</Text><Ionicons name="chevron-forward" size={18} color={theme.subText} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalBtnCancel, { backgroundColor: isDarkMode ? PITO_COLORS.navyLight : '#F5F5F5' }]} onPress={() => setIsMenuVisible(false)}><Text style={[styles.modalBtnTextCancel, { color: theme.text }]}>{t.cancel}</Text></TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
    toolButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    toolbarActions: { flexDirection: 'row', gap: 8 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 30 },
    brandText: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
    scrollContent: { paddingTop: 8, paddingBottom: 22 },
    gallery: { marginHorizontal: 20, height: Math.min(height * 0.42, 380), borderRadius: 26, overflow: 'hidden' },
    mediaFrame: { width: width - 40, height: Math.min(height * 0.42, 380), justifyContent: 'center', alignItems: 'center' },
    image: { width: '100%', height: '100%' },
    mediaPlaceholder: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
    videoLabel: { color: PITO_COLORS.cream, fontSize: 13, marginTop: 10 },
    photoCounter: { position: 'absolute', bottom: 14, right: 14, backgroundColor: 'rgba(11,19,30,0.72)', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11 },
    photoCounterText: { color: 'white', fontSize: 11, fontWeight: '600' },
    pagination: { position: 'absolute', bottom: 22, alignSelf: 'center', flexDirection: 'row', gap: 5 },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.65)' },
    activeDot: { width: 17, backgroundColor: PITO_COLORS.primary },
    foundOverlay: { position: 'absolute', top: 14, left: 14, right: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: PITO_COLORS.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
    foundText: { fontSize: 12, fontWeight: '800', color: PITO_COLORS.navyBg, letterSpacing: 0.5 },
    detailsContainer: { paddingHorizontal: 20, paddingTop: 20 },
    categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 },
    categoryTag: { flexDirection: 'row', flexShrink: 1, alignItems: 'center', gap: 6, backgroundColor: 'rgba(197,160,89,0.12)', borderRadius: 11, paddingVertical: 9, paddingHorizontal: 11 },
    categoryText: { color: PITO_COLORS.primary, fontWeight: '700', fontSize: 11, flexShrink: 1 },
    pawActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, minHeight: 40, paddingHorizontal: 12 },
    pawCount: { fontSize: 12, fontWeight: '700' },
    name: { fontSize: 30, lineHeight: 37, fontWeight: '800', letterSpacing: -0.8 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 9, marginBottom: 23 },
    location: { flex: 1, fontSize: 12, lineHeight: 18 },
    statsContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    statBox: { flex: 1, paddingVertical: 17, paddingHorizontal: 12, borderWidth: 1, borderRadius: 19, alignItems: 'center', justifyContent: 'center', minHeight: 112 },
    statLabel: { fontSize: 10, marginTop: 9, marginBottom: 6, fontWeight: '500' },
    statValue: { fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
    petDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
    petTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(154,166,182,0.1)', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11 },
    petTagText: { fontSize: 11 },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 7, marginBottom: 12, letterSpacing: -0.3 },
    aboutCard: { padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 22 },
    description: { fontSize: 14, lineHeight: 24, fontWeight: '400' },
    ownerContainer: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, borderWidth: 1, marginBottom: 8 },
    ownerProfile: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarContainer: { width: 48, height: 48, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: PITO_COLORS.primary, marginRight: 11 },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { color: PITO_COLORS.navyBg, fontSize: 21, fontWeight: '800' },
    ownerInfo: { flex: 1, paddingRight: 5 },
    ownerName: { fontSize: 14, fontWeight: '700' },
    ownerRole: { fontSize: 11, marginTop: 4 },
    callBtn: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginLeft: 10, backgroundColor: 'rgba(197,160,89,0.12)' },
    footer: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1 },
    primaryAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: PITO_COLORS.primary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 16, minHeight: 52 },
    secondaryAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: 'rgba(197,160,89,0.12)', borderRadius: 16, paddingVertical: 16 },
    secondaryActionText: { color: PITO_COLORS.primary, fontSize: 13, fontWeight: '700' },
    btnText: { color: PITO_COLORS.navyBg, fontSize: 14, fontWeight: '800', flexShrink: 1 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,10,18,0.7)' },
    modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, alignItems: 'center' },
    modalHandle: { width: 36, height: 4, borderRadius: 3, backgroundColor: PITO_COLORS.grayText, opacity: 0.4, marginBottom: 22 },
    modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
    modalBtnReport: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 12, marginBottom: 15 },
    modalIconBg: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,71,87,0.12)', marginRight: 12 },
    modalBtnTextReport: { flex: 1, fontSize: 15, fontWeight: '600', color: PITO_COLORS.error },
    modalBtnCancel: { width: '100%', borderRadius: 15, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    modalBtnTextCancel: { fontSize: 14, fontWeight: '600' }
});

export default ListingDetailScreen;