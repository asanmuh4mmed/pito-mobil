import EditListingModal from '../components/EditListingModal';
import React, { useContext, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, Modal, Dimensions, Alert, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native'; 

import { COLORS } from '../constants/colors';
import { AuthContext } from '../context/AuthContext';
import { ListingContext } from '../context/ListingContext';
import { ChatContext } from '../context/ChatContext';
import { ThemeContext } from '../context/ThemeContext';
import { SocialContext } from '../context/SocialContext';
import { ShopContext } from '../context/ShopContext';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useVideoPlayer, VideoView } from 'expo-video'; 

const { width } = Dimensions.get('window');

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

// --- DİL PAKETİ ---
const TRANSLATIONS = {
    TR: {
        myProfile: "Profilim", editProfile: "Profili Düzenle", listings: "İlanlar", followers: "Takipçi", following: "Takip",
        manageListings: "İlan Yönetimi", publishedListings: "Yayındaki İlanlar",
        swipeHint: "(Sola kaydır: SİL | Sağa kaydır: DURUM GÜNCELLE)", noListings: "Henüz hiç ilan yok.", noPosts: "Henüz gönderi yok.",
        noSaved: "Henüz kaydedilen yok.", logout: "Çıkış Yap", logoutTitle: "Çıkış Yap",
        logoutMsg: "Hesabınızdan çıkmak istediğinize emin misiniz?", cancel: "Vazgeç", yesExit: "Evet, Çık", delete: "Sil", remove: "Çıkar",
        undo: "Geri Al (Tekrar Yayına Al)", mateFound: "EŞ BULUNDU", homeFound: "YUVA BULUNDU", completed: "Tamamlandı", active: "Yayında",
        notifications: "Bildirimler", noNotif: "Henüz bildirim yok.", followersTitle: "Takipçiler", followingTitle: "Takip Edilenler",
        switchAccount: "Hesap Değiştir", nobody: "Kimse yok.", removeFollowerTitle: "Takipçiyi Çıkar",
        removeFollowerMsg: "Bu kişiyi çıkarmak istiyor musun?", deleteAdTitle: "İlanı Sil", deleteAdMsg: "Bu ilanı silmek istediğinize emin misiniz?",
        statusTitle: "Durum Güncelleme", statusMsg: "İlan durumunu değiştirmek istiyor musun?", yes: "Evet, Değiştir",
        swipeUserHint: "(Kişiyi çıkarmak için sola kaydır veya basılı tut)", 
        tabListings: "İlanlarım", tabShop: "Mağaza İşlemleri",
        myOrders: "Siparişlerim", myFavs: "Favori Ürünlerim", goToShop: "Mağazaya Git",
        noOrders: "Henüz sipariş vermediniz.", noFavs: "Henüz favori ürününüz yok.",
        orderNo: "Sipariş No:", status: "Durum:", total: "Toplam:", items: "Ürünler",
        modalAdTitle: "Ne İlanı Ekleyeceksin?", adMate: "Eş Arayanlar", adAdopt: "Sahiplendirme", adVet: "Veteriner Klinikleri", adSitter: "Bakıcı",
        addFirst: "İlk İlanını Ekle", addNew: "+ Yeni Ekle",
        orderDetail: "Sipariş Detayı", trackCargo: "Kargo Takip", close: "Kapat",
        deliveryInfo: "Teslimat Bilgileri", recipient: "Alıcı:", phone: "Telefon:", address: "Adres:", cargoLinkText: "🚚 Kargo Takip Linki (Tıkla)",
        order_confirmed: "Sipariş Onaylandı", order_preparing: "Sipariş Hazırlanıyor", order_shipped: "Sipariş Kargoya Verildi", order_delivered: "Sipariş Teslim Edildi", order_cancelled: "Sipariş İptal Edildi",
        saved: "Kaydedilenler", noSavedPosts: "Henüz kaydedilen gönderi yok.",
        adminPanel: "Yönetici Paneli", adminDesc: "Sistem ve kullanıcı yönetimi",
        estDelivery: "Tahmini Teslimat:", notSet: "Belirtilmemiş",
        vaccineCard: "Aşı Karnesi", vaccineDesc: "Evcil hayvanınızın sağlık takvimi"
    },
    AU: {
        myProfile: "My Profile", editProfile: "Edit Profile", listings: "Listings", followers: "Followers", following: "Following",
        manageListings: "Manage Listings", publishedListings: "Active Listings",
        swipeHint: "(Swipe left: DELETE | Swipe right: UPDATE STATUS)", noListings: "No listings yet.", noPosts: "No posts yet.",
        noSaved: "No saved posts.", logout: "Log Out", logoutTitle: "Log Out",
        logoutMsg: "Are you sure you want to log out?", cancel: "Cancel", yesExit: "Yes, Log Out", delete: "Delete", remove: "Remove",
        undo: "Undo (Reactivate)", mateFound: "MATE FOUND", homeFound: "HOME FOUND", completed: "Completed", active: "Active",
        notifications: "Notifications", noNotif: "No notifications yet.", followersTitle: "Followers", followingTitle: "Following",
        switchAccount: "Switch Account", nobody: "No one here.", removeFollowerTitle: "Remove Follower",
        removeFollowerMsg: "Do you want to remove this person?", deleteAdTitle: "Delete Ad", deleteAdMsg: "Are you sure you want to delete this ad?",
        statusTitle: "Update Status", statusMsg: "Do you want to update this ad status?", yes: "Yes, Change",
        swipeUserHint: "(Swipe left or long press to remove user)", 
        tabListings: "Listings", tabShop: "Shop Actions",
        myOrders: "My Orders", myFavs: "Favorite Products", goToShop: "Go to Shop",
        noOrders: "No orders yet.", noFavs: "No favorites yet.",
        orderNo: "Order #", status: "Status:", total: "Total:", items: "Items",
        modalAdTitle: "What will you post?", adMate: "Find Mate", adAdopt: "Adopt", adVet: "Vet Clinics", adSitter: "Pet Sitter",
        addFirst: "Add Your First Ad", addNew: "+ Add New",
        orderDetail: "Order Detail", trackCargo: "Track Cargo", close: "Close",
        deliveryInfo: "Delivery Information", recipient: "Recipient:", phone: "Phone:", address: "Address:", cargoLinkText: "🚚 Cargo Tracking Link (Click)",
        order_confirmed: "Order Confirmed", order_preparing: "Order Preparing", order_shipped: "Order Shipped", order_delivered: "Order Delivered", order_cancelled: "Order Cancelled",
        saved: "Saved", noSavedPosts: "No saved posts yet.",
        adminPanel: "Admin Panel", adminDesc: "System & User Management",
        estDelivery: "Est. Delivery:", notSet: "Not set",
        vaccineCard: "Vaccine Card", vaccineDesc: "Your pet's health schedule"
    }
};

const ProfileScreen = ({ navigation, route }) => {
    const { user, logout, allUsers, removeFollower, deleteNotification, updateUser, language } = useContext(AuthContext); 
    const { urgentList, mateList, vetList, sitterList, deleteListing, updateListing, fetchListings, error: listingError, loading: listingsLoading } = useContext(ListingContext);
    const { theme: appTheme, isDarkMode } = useContext(ThemeContext);
    // Local visual palette only; the saved application theme is unchanged.
    const theme = isDarkMode ? appTheme : {
        ...appTheme, background: '#F8F5EF', cardBg: '#FFFFFF',
        text: '#142239', subText: '#727989', border: '#EAE4D8'
    };
    const { posts, savedPostIds } = useContext(SocialContext);
    const { orders, products, favorites } = useContext(ShopContext);

    const [editingListing, setEditingListing] = useState(null);
    const [pendingListings, setPendingListings] = useState({});
    const listingLocks = useRef(new Set());
    const profileRuntime = useRef({ live: true, userId: user?.id });
    profileRuntime.current.userId = user?.id;
    useEffect(() => {
        profileRuntime.current.live = true;
        return () => { profileRuntime.current.live = false; };
    }, []);
    useEffect(() => {
        setEditingListing(null);
        setPendingListings({});
    }, [user?.id]);
    const [modalVisible, setModalVisible] = useState(false);
    const [userListModalVisible, setUserListModalVisible] = useState(false);
    const [notificationsVisible, setNotificationsVisible] = useState(false);
    const [accountMenuVisible, setAccountMenuVisible] = useState(false);
    const [orderDetailVisible, setOrderDetailVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [activeTab, setActiveTab] = useState('listings'); 
    const [shopSubTab, setShopSubTab] = useState(null); 
    const [userListType, setUserListType] = useState(''); 
    const [userListData, setUserListData] = useState([]);

    const scaleAnim = useRef(new Animated.Value(1)).current;
    
    const t = TRANSLATIONS[language] || TRANSLATIONS['TR'];

    const onPressIn = () => { Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start(); };
    const onPressOut = () => { Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start(); };

    const params = route.params || {};
    const isMyProfile = !params.userId || (user && String(params.userId) === String(user.id));
    const viewUser = isMyProfile ? user : (allUsers.find(u => String(u.id) === String(params.userId)) || params.viewUser);

    useFocusEffect(
        useCallback(() => {
            if (fetchListings) {
                fetchListings();
            }
        }, [fetchListings])
    );

    if (!viewUser) return null;

    const unreadNotifCount = user && user.notifications ? user.notifications.filter(n => !n.read).length : 0;
    
    const allListings = [...(urgentList || []), ...(mateList || []), ...(vetList || []), ...(sitterList || [])];
    const displayedListings = (viewUser && allListings.length > 0) 
        ? allListings.filter(item => (item.ownerId || item.owner_id) && String(item.ownerId || item.owner_id).trim() === String(viewUser.id).trim())
        : [];

    const myOrders = orders.filter(o => String(o.user_id || o.userId) === String(viewUser.id));
    const myFavoriteProducts = products.filter(p => favorites.some(fav => (typeof fav === 'object' ? (fav.userId === viewUser.id && fav.productId === p.id) : fav === p.id)));

    const getLocalizedStatus = (status) => { if (!status) return t.order_preparing; if (status.includes('Onaylandı') || status.includes('Confirmed')) return t.order_confirmed; if (status.includes('Hazırlanıyor') || status.includes('Preparing')) return t.order_preparing; if (status.includes('Kargoya') || status.includes('Shipped')) return t.order_shipped; if (status.includes('Teslim') || status.includes('Delivered')) return t.order_delivered; if (status.includes('İptal') || status.includes('Cancelled')) return t.order_cancelled; return status; };
    const getStatusColor = (status) => { if (!status) return PITO_COLORS.primary; if (status.includes('İptal') || status.includes('Cancelled')) return PITO_COLORS.error; if (status.includes('Teslim') || status.includes('Delivered')) return PITO_COLORS.success; if (status.includes('Kargo') || status.includes('Shipped')) return PITO_COLORS.primaryDark; return PITO_COLORS.primary; };
    
    const getLocalizedCategoryName = (catName) => { if (!catName) return ''; if (language === 'TR') return catName; if (catName.includes('Eş')) return 'Find Mate'; if (catName.includes('Sahiplendirme')) return 'Adoption'; if (catName.includes('Veteriner')) return 'Vet Clinics'; if (catName.includes('Bakıcı')) return 'Pet Sitter'; return catName; };

    const handleLogout = () => { Alert.alert(t.logoutTitle, t.logoutMsg, [{ text: t.cancel, style: "cancel" }, { text: t.yesExit, style: "destructive", onPress: () => { logout(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); }}]); };
    const handleSwitchAccount = () => { setAccountMenuVisible(false); logout(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); };
    const handleNotificationPress = () => { if(!user) return; setNotificationsVisible(true); };
    
    const handleNotificationClick = async (item) => {
        setNotificationsVisible(false);
        if (!item.read && user) {
            const updatedNotifications = user.notifications.map(n => n.id === item.id ? { ...n, read: true } : n);
            await updateUser({ notifications: updatedNotifications });
        }
        if (item.type === 'order_success') { setActiveTab('shop'); setShopSubTab('orders'); } 
        else { navigation.push('UserProfile', { userId: item.fromUserId, userName: item.fromUser, userAvatar: item.fromUserAvatar }); }
    };

    const handleOpenUserList = (type) => {
        const idList = type === 'followers' ? (viewUser.followers || []) : (viewUser.following || []);
        if (!idList || idList.length === 0) {
            setUserListData([]); 
        } else {
            const usersData = allUsers.filter(u => idList.includes(String(u.id)));
            setUserListData(usersData);
        }
        setUserListType(type); 
        setUserListModalVisible(true);
    };

    const handleRemoveFollower = (followerId) => {
        Alert.alert(t.removeFollowerTitle, t.removeFollowerMsg, [{ text: t.cancel, style: "cancel" }, { text: t.remove, style: "destructive", onPress: () => { removeFollower(followerId); const updatedList = userListData.filter(u => u.id !== followerId); setUserListData(updatedList); }}]);
    };

    const ownsListing = item => !!user?.id && isMyProfile &&
        String(item?.owner_id || item?.ownerId || '') === String(user.id);

    const runListingAction = async (item, action, actorId) => {
        const runtime = profileRuntime.current;
        const id = String(item?.id || '');
        if (!id || !ownsListing(item) || !runtime.live || runtime.userId !== actorId) return;
        const lockKey = `${actorId}:${id}`;
        if (listingLocks.current.has(lockKey)) return;
        listingLocks.current.add(lockKey);
        setPendingListings(previous => ({ ...previous, [id]: true }));
        try {
            const result = action === 'delete'
                ? await deleteListing(item.id)
                : await updateListing(item.id, { isFound: !Boolean(item.is_found) });
            if (!runtime.live || runtime.userId !== actorId) return;
            if (!result?.success) {
                Alert.alert(language === 'TR' ? 'İşlem tamamlanamadı' : 'Action failed',
                    language === 'TR' ? 'İşlem doğrulanamadı. Bağlantını ve ilanın hâlâ yayında olduğunu kontrol edip tekrar dene.' : 'The action could not be confirmed. Check your connection and listing, then retry.');
                return;
            }
            if (action === 'delete') setEditingListing(previous => String(previous?.id) === id ? null : previous);
        } catch {
            if (runtime.live && runtime.userId === actorId) Alert.alert('Pito', language === 'TR' ? 'İşlem tamamlanamadı. Lütfen tekrar dene.' : 'The action failed. Please try again.');
        } finally {
            listingLocks.current.delete(lockKey);
            if (runtime.live && runtime.userId === actorId) setPendingListings(previous => {
                const next = { ...previous }; delete next[id]; return next;
            });
        }
    };

    const handleDelete = id => {
        const item = displayedListings.find(row => String(row.id) === String(id));
        if (!ownsListing(item) || pendingListings[String(id)]) return;
        const actorId = user.id;
        Alert.alert(t.deleteAdTitle, t.deleteAdMsg, [
            { text: t.cancel, style: 'cancel' },
            { text: t.delete, style: 'destructive', onPress: () => runListingAction(item, 'delete', actorId) },
        ]);
    };

    const handleMarkAsFound = item => {
        if (!ownsListing(item) || pendingListings[String(item.id)]) return;
        const actorId = user.id;
        const statusText = /Eş|Mate/.test(item.category || '') ? t.mateFound : t.homeFound;
        Alert.alert(t.statusTitle, `${t.statusMsg}\n(${item.is_found ? t.active : statusText})`, [
            { text: t.cancel, style: 'cancel' },
            { text: t.yes, onPress: () => runListingAction(item, 'status', actorId) },
        ]);
    };

    const handleEditListing = item => {
        if (!ownsListing(item) || pendingListings[String(item.id)]) return;
        setEditingListing(item);
    };

    const handleListingSaved = async saved => {
        const actorId = user?.id;
        if (!saved?.id || !ownsListing(saved) || !profileRuntime.current.live || profileRuntime.current.userId !== actorId) return;
        // Kalıcı bir yerel kopya tutma: kartlar ortak ListingContext verisini izlesin.
        // Gerçek kayıt başarısı EditListingModal içinde doğrulanmalıdır.
        setEditingListing(null);
        try {
            const result = await fetchListings();
            if (result?.success === false && !result.stale && profileRuntime.current.live && profileRuntime.current.userId === actorId) {
                Alert.alert('Pito', language === 'TR' ? 'Değişiklik kaydedildi; liste henüz yenilenemedi. Tekrar dene düğmesiyle listeyi yenileyebilirsin.' : 'Changes were saved, but the list could not refresh. Tap Retry.');
            }
        } catch {
            if (profileRuntime.current.live && profileRuntime.current.userId === actorId) Alert.alert('Pito', language === 'TR' ? 'Liste yenilenemedi. Lütfen tekrar dene.' : 'Could not refresh the list. Please retry.');
        }
    };

    const navigateToAdd = (val) => {
        setModalVisible(false);
        let backendCategoryName = val;
        if (val === 'Find Mate') backendCategoryName = 'Eş Arayanlar'; else if (val === 'Adopt') backendCategoryName = 'Sahiplendirme'; else if (val === 'Vet Clinics') backendCategoryName = 'Veteriner Klinikleri'; else if (val === 'Pet Sitter') backendCategoryName = 'Bakıcı'; else if (language === 'TR') backendCategoryName = val;
        navigation.navigate('AddListing', { category: backendCategoryName });
    };

    const handleOrderPress = (order) => { 
        setSelectedOrder(order); 
        setOrderDetailVisible(true); 
    };

    const getEstimatedDeliveryDate = (dateString) => {
        if (!dateString) return t.notSet;
        const date = new Date(dateString);
        date.setDate(date.getDate() + 3); 
        return date.toLocaleDateString();
    };

    const renderFollowerRightActions = (followerId) => ( <TouchableOpacity activeOpacity={0.7} style={styles.deleteAction} onPress={() => handleRemoveFollower(followerId)}><Ionicons name="person-remove-outline" size={24} color={PITO_COLORS.white} /><Text style={styles.actionTextDelete}>{t.remove}</Text></TouchableOpacity> );
    const renderNotificationRightActions = (id) => ( <TouchableOpacity activeOpacity={0.7} style={styles.deleteAction} onPress={() => deleteNotification(id)}><Ionicons name="trash-outline" size={24} color={PITO_COLORS.white} /><Text style={styles.actionTextDelete}>{t.delete}</Text></TouchableOpacity> );

    const renderListingItem = ({ item: sourceItem }) => {
        const item = sourceItem;
        const isPending = !!pendingListings[String(item.id)];
        const foundLabel = item.category.includes('Eş') ? t.mateFound : t.homeFound;
        const actionLabel = item.is_found ? t.undo : foundLabel;

        return (
            <TouchableOpacity 
                style={[styles.card, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, opacity: item.is_found ? 0.7 : 1, flexDirection: 'column', alignItems: 'stretch' }]} 
                onPress={() => navigation.navigate('ListingDetail', { item })} 
                activeOpacity={0.9}
            >
                {/* Üst Kısım: Resim ve Bilgiler */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image source={{ uri: item.img }} style={styles.cardImage} />
                    
                    {item.is_found && (
                        <View style={styles.foundOverlay}>
                            <Text style={styles.foundText}>
                                {item.category.includes('Eş') ? t.mateFound : t.homeFound}
                            </Text>
                        </View>
                    )}

                    <View style={styles.cardInfo}>
                        <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.cardSub, { color: theme.subText }]} numberOfLines={1}>{getLocalizedCategoryName(item.category)}</Text>
                        
                        <View style={[styles.statusBadge, { backgroundColor: item.is_found ? PITO_COLORS.primary : 'rgba(197, 160, 89, 0.1)' }]}>
                            <Text style={[styles.statusText, { color: item.is_found ? PITO_COLORS.navyBg : PITO_COLORS.primary }]}>
                                {item.is_found ? t.completed : t.active}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Alt Kısım: Butonlar */}
                {isMyProfile && (
                    <View style={[styles.cardActionRow, { opacity: isPending ? 0.5 : 1, flexWrap: 'wrap', gap: 8, borderTopColor: isDarkMode ? PITO_COLORS.navyLight : '#eee' }]}>
                        <TouchableOpacity activeOpacity={0.7} style={[styles.cardActionBtn, { backgroundColor: 'rgba(197,160,89,0.12)', paddingHorizontal: 12 }]} disabled={isPending} onPress={() => handleEditListing(item)}><Ionicons name="create-outline" size={18} color={PITO_COLORS.primary} /><Text style={[styles.cardActionBtnText, { color: theme.text }]}>{language === 'EN' ? 'Edit' : 'Düzenle'}</Text></TouchableOpacity>
                        {!item.category.includes('Veteriner') && !item.category.includes('Bakıcı') && (
                            <TouchableOpacity activeOpacity={0.7} 
                                style={[styles.cardActionBtn, { backgroundColor: item.is_found ? (isDarkMode ? PITO_COLORS.navyLight : '#eee') : PITO_COLORS.primary, flex: 1, marginRight: 10 }]} 
                                disabled={isPending} onPress={() => handleMarkAsFound(item)}
                            >
                                <Ionicons name={item.is_found ? "refresh-outline" : "checkmark-circle-outline"} size={18} color={item.is_found ? theme.text : PITO_COLORS.navyBg} />
                                <Text style={[styles.cardActionBtnText, { color: item.is_found ? theme.text : PITO_COLORS.navyBg }]}>{actionLabel}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity activeOpacity={0.7} 
                            style={[styles.cardActionBtn, { backgroundColor: 'rgba(255, 71, 87, 0.1)', flex: item.category.includes('Veteriner') || item.category.includes('Bakıcı') ? 1 : 0.5 }]} 
                            disabled={isPending} onPress={() => handleDelete(item.id)}
                        >
                            <Ionicons name="trash-outline" size={18} color={PITO_COLORS.error} />
                            <Text style={[styles.cardActionBtnText, { color: PITO_COLORS.error }]}>{isPending ? (language === 'TR' ? 'Bekleyin…' : 'Please wait…') : t.delete}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.background }]}>
            
            <View style={[styles.header, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.background }]}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>

                <View style={styles.headerBrand}><Ionicons name="paw" size={23} color={PITO_COLORS.primary} /><Text style={[styles.headerTitle, { color: theme.text }]}>{t.myProfile}</Text></View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {isMyProfile && (
                        <>
                            <TouchableOpacity activeOpacity={0.7} style={styles.iconBtn} onPress={handleNotificationPress}>
                                <Ionicons name="notifications" size={26} color={PITO_COLORS.primary} />
                                {unreadNotifCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadNotifCount}</Text></View>}
                            </TouchableOpacity>
                            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}>
                                <Ionicons name="options-outline" size={26} color={theme.text} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
                
                {/* Identity: compact avatar and text, with a full-width edit action. */}
                <View style={styles.profileSection}>
                    <View style={styles.identityRow}>
                        <View style={styles.avatarContainer}>
                            {viewUser.avatar ? <Image source={{ uri: viewUser.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.avatarText}>{viewUser.fullname?.charAt(0)}</Text></View>}
                            {viewUser.isPremium && <View style={styles.premiumBadgeAvatar}><Ionicons name="checkmark-circle" size={19} color={PITO_COLORS.white} /></View>}
                        </View>
                        <View style={styles.identityText}>
                            <View style={styles.nameRow}><Text style={[styles.userName, { color: theme.text }]}>{viewUser.fullname}</Text>{viewUser.is_founder && <Ionicons name="checkmark-circle" size={20} color={PITO_COLORS.primary} />}</View>
                            {!!viewUser.bio && <Text style={[styles.userBio, { color: theme.subText }]}>{viewUser.bio}</Text>}
                        </View>
                    </View>
                    {isMyProfile && <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%' }}>
                        <TouchableOpacity style={styles.editBtnModern} onPress={() => navigation.navigate('EditProfile')} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={0.75}>
                            <Ionicons name="create-outline" size={19} color={PITO_COLORS.primaryDark} /><Text style={styles.editBtnTextModern}>{t.editProfile}</Text>
                        </TouchableOpacity>
                    </Animated.View>}
                </View>

                {/* YENİLENMİŞ AŞI KARNESİ BUTONU */}
                {isMyProfile && (
                    <TouchableOpacity 
                        style={[styles.vaccineBtn, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border }]} 
                        onPress={() => navigation.navigate('VaccineReport')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.vaccineIconBox}>
                            <Ionicons name="document-text" size={24} color={PITO_COLORS.navyBg} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 15 }}>
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{t.vaccineCard}</Text>
                            <Text style={{ fontSize: 12, color: theme.subText }}>{t.vaccineDesc}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={PITO_COLORS.primary} />
                    </TouchableOpacity>
                )}

                {/* YENİLENMİŞ TABS */}
                <View style={[styles.tabBar, { borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border }]}>
                    <TouchableOpacity activeOpacity={0.7} style={[styles.tabItem, activeTab === 'listings' && { backgroundColor: PITO_COLORS.primary }]} onPress={() => setActiveTab('listings')}>
                        <Ionicons name="grid" size={24} color={activeTab === 'listings' ? '#FFFFFF' : theme.subText} />
                        <Text style={[styles.tabText, {color: activeTab === 'listings' ? '#FFFFFF' : theme.subText}]}>{t.tabListings}</Text>
                    </TouchableOpacity>
                    {isMyProfile && (
                        <TouchableOpacity activeOpacity={0.7} style={[styles.tabItem, activeTab === 'shop' && { backgroundColor: PITO_COLORS.primary }]} onPress={() => { setActiveTab('shop'); setShopSubTab(null); }}>
                            <Ionicons name="bag-handle" size={24} color={activeTab === 'shop' ? '#FFFFFF' : theme.subText} />
                            <Text style={[styles.tabText, {color: activeTab === 'shop' ? '#FFFFFF' : theme.subText}]}>{t.tabShop}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {activeTab === 'listings' && listingError && (
                    <View style={{ marginHorizontal: 20, marginVertical: 12, padding: 14, borderRadius: 14, backgroundColor: theme.cardBg }}>
                        <Text style={{ color: theme.subText }}>{language === 'TR' ? 'İlanlar yenilenemedi. Bağlantını kontrol edip tekrar dene.' : 'Could not refresh listings. Check your connection and retry.'}</Text>
                        <TouchableOpacity disabled={listingsLoading} onPress={() => fetchListings()} style={{ paddingTop: 10 }}>
                            <Text style={{ color: PITO_COLORS.primary, fontWeight: '700' }}>{language === 'TR' ? 'Tekrar dene' : 'Retry'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {/* İLANLAR LİSTESİ */}
                {activeTab === 'listings' ? (
                    <View>
                        {displayedListings.length === 0 ? (
                            <View style={[styles.emptyContainer, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: theme.border }]}>
                                <View style={styles.emptyIllustration}>
                                    <View style={styles.emptyHalo}><Ionicons name="paw" size={49} color={PITO_COLORS.primary} /></View>
                                    <Ionicons name="leaf-outline" size={29} color="#D5BF91" style={styles.emptyLeafLeft} />
                                    <Ionicons name="leaf-outline" size={24} color="#D5BF91" style={styles.emptyLeafRight} />
                                    <View style={styles.emptyGround} />
                                </View>
                                <Text style={[styles.emptyText, { color: theme.text }]}>{t.noListings}</Text>
                                <Text style={[styles.emptyCaption, { color: theme.subText }]}>{language === 'TR' ? 'Yeni hikâyeler burada başlayacak.' : 'New stories will begin here.'}</Text>
                            </View>
                        ) : (
                            <GestureHandlerRootView>
                                <FlatList data={displayedListings} extraData={pendingListings} renderItem={renderListingItem} keyExtractor={item => String(item.id)} scrollEnabled={false} contentContainerStyle={{paddingHorizontal: 20, paddingTop: 15}} />
                            </GestureHandlerRootView>
                        )}
                    </View>
                ) : (
                    // MAĞAZA İŞLEMLERİ (SHOP) EKRANI
                    <View style={{padding: 20}}>
                        {!shopSubTab ? (
                            <View>
                                <TouchableOpacity style={[styles.shopOptionCard, {backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg}]} onPress={() => setShopSubTab('orders')} activeOpacity={0.8}>
                                    <View style={[styles.iconCircle, {backgroundColor: 'rgba(197, 160, 89, 0.15)'}]}><Ionicons name="cube" size={26} color={PITO_COLORS.primary} /></View>
                                    <Text style={[styles.shopOptionText, {color: theme.text}]}>{t.myOrders}</Text>
                                    <Ionicons name="chevron-forward" size={22} color={theme.subText} />
                                </TouchableOpacity>
                                
                                <TouchableOpacity style={[styles.shopOptionCard, {backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg}]} onPress={() => setShopSubTab('favorites')} activeOpacity={0.8}>
                                    <View style={[styles.iconCircle, {backgroundColor: 'rgba(255, 71, 87, 0.15)'}]}><Ionicons name="heart" size={26} color={PITO_COLORS.error} /></View>
                                    <Text style={[styles.shopOptionText, {color: theme.text}]}>{t.myFavs}</Text>
                                    <Ionicons name="chevron-forward" size={22} color={theme.subText} />
                                </TouchableOpacity>
                                
                                <TouchableOpacity style={[styles.shopOptionCard, {backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg}]} onPress={() => navigation.navigate('Shop')} activeOpacity={0.8}>
                                    <View style={[styles.iconCircle, {backgroundColor: 'rgba(0, 184, 148, 0.15)'}]}><Ionicons name="storefront" size={26} color={PITO_COLORS.success} /></View>
                                    <Text style={[styles.shopOptionText, {color: theme.text}]}>{t.goToShop}</Text>
                                    <Ionicons name="arrow-forward" size={22} color={theme.subText} />
                                </TouchableOpacity>

                                {user && (user.is_admin || user.is_founder) && (
                                    <TouchableOpacity 
                                        style={[styles.shopOptionCard, {backgroundColor: isDarkMode ? PITO_COLORS.navyLight : 'rgba(176, 141, 75, 0.05)', borderWidth: 1, borderColor: PITO_COLORS.primaryDark}]} 
                                        onPress={() => navigation.navigate('AdminPanel')} 
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.iconCircle, {backgroundColor:'rgba(176, 141, 75, 0.15)'}]}>
                                            <Ionicons name="shield-checkmark" size={26} color={PITO_COLORS.primaryDark} />
                                        </View>
                                        <View style={{flex:1}}>
                                            <Text style={[styles.shopOptionText, {color: PITO_COLORS.primaryDark}]}>{t.adminPanel}</Text>
                                            <Text style={{fontSize:12, color:theme.subText}}>{t.adminDesc}</Text>
                                        </View>
                                        <Ionicons name="lock-open" size={22} color={PITO_COLORS.primaryDark} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : shopSubTab === 'orders' ? (
                            <View>
                                <TouchableOpacity activeOpacity={0.7} onPress={() => setShopSubTab(null)} style={{flexDirection:'row', alignItems:'center', marginBottom:15}}>
                                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                                    <Text style={{marginLeft:10, fontSize:18, fontWeight:'bold', color:theme.text}}>{t.myOrders}</Text>
                                </TouchableOpacity>
                                {myOrders.length === 0 ? <View style={[styles.shopEmpty, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]}><Ionicons name="cube-outline" size={38} color={PITO_COLORS.primary} /><Text style={[styles.emptyCaption, { color: theme.subText }]}>{t.noOrders}</Text></View> : (
                                    myOrders.map(order => {
                                        const statusColor = getStatusColor(order.status);
                                        return (
                                            <TouchableOpacity activeOpacity={0.7} key={String(order.id)} style={[styles.orderCard, {backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderLeftColor: statusColor}]} onPress={() => handleOrderPress(order)}>
                                                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:5}}>
                                                    <Text style={{fontWeight:'bold', color:theme.text, fontSize:16}}>{t.orderNo} {order.id.toString().slice(0,8)}...</Text>
                                                    <Text style={{color: statusColor, fontWeight:'bold', fontSize:12}}>{getLocalizedStatus(order.status)}</Text>
                                                </View>
                                                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                                                    <Text style={{color:theme.subText, fontSize:12}}>{order.date ? new Date(order.date).toLocaleDateString() : ''}</Text>
                                                    <Text style={{fontWeight:'bold', color: PITO_COLORS.primary, fontSize:16}}>{order.totalPrice || order.total_price} {language === 'EN' ? 'AUD' : 'TL'}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </View>
                        ) : (
                            <View>
                                <TouchableOpacity activeOpacity={0.7} onPress={() => setShopSubTab(null)} style={{flexDirection:'row', alignItems:'center', marginBottom:15}}>
                                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                                    <Text style={{marginLeft:10, fontSize:18, fontWeight:'bold', color:theme.text}}>{t.myFavs}</Text>
                                </TouchableOpacity>
                                {myFavoriteProducts.length === 0 ? <View style={[styles.shopEmpty, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]}><Ionicons name="heart-outline" size={38} color={PITO_COLORS.primary} /><Text style={[styles.emptyCaption, { color: theme.subText }]}>{t.noFavs}</Text></View> : (
                                    <View style={{flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between'}}>
                                            {myFavoriteProducts.map(item => (
                                                <TouchableOpacity activeOpacity={0.7} key={String(item.id)} style={[styles.favItem, {backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg}]} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
                                                    <Image source={{ uri: item.img }} style={{width:'100%', height:120, borderRadius:10, marginBottom:5}} resizeMode="cover" />
                                                    <Text numberOfLines={1} style={{fontWeight:'bold', color:theme.text}}>{item.name}</Text>
                                                    <Text style={{color: PITO_COLORS.primary, fontWeight:'bold'}}>{item.price}</Text>
                                                </TouchableOpacity>
                                            ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {isMyProfile && activeTab === 'listings' && (
                    <TouchableOpacity activeOpacity={0.7} style={styles.logoutBtn} onPress={handleLogout}><Ionicons name="log-out-outline" size={19} color={PITO_COLORS.error} /><Text style={{color: PITO_COLORS.error, fontWeight:'600', fontSize: 13}}>{t.logout}</Text></TouchableOpacity>
                )}
            </ScrollView>

            <EditListingModal listing={editingListing} onClose={() => setEditingListing(null)} onSaved={handleListingSaved} />
                <Modal visible={orderDetailVisible} animationType="slide" transparent={true} onRequestClose={() => setOrderDetailVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, {backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.cardBg, height: '70%'}]}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, {color: theme.text}]}>{t.orderDetail}</Text>
                            <TouchableOpacity activeOpacity={0.7} onPress={() => setOrderDetailVisible(false)}><Ionicons name="close" size={24} color={theme.text}/></TouchableOpacity>
                        </View>
                        {selectedOrder && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={{marginBottom:15, borderBottomWidth:1, borderBottomColor: isDarkMode ? PITO_COLORS.navyLight : '#eee', paddingBottom:10}}>
                                    <Text style={{color:theme.text, fontSize:16, fontWeight:'bold'}}>{t.orderNo} {selectedOrder.id.toString().slice(0,8)}</Text>
                                    <Text style={{color:theme.subText, fontSize:14}}>{new Date(selectedOrder.date).toLocaleDateString()}</Text>
                                    <Text style={{color: getStatusColor(selectedOrder.status), fontWeight:'bold', marginTop:5}}>{t.status} {getLocalizedStatus(selectedOrder.status)}</Text>
                                    
                                    <View style={{flexDirection:'row', alignItems:'center', marginTop:5}}>
                                        <Ionicons name="time-outline" size={14} color={theme.subText} style={{marginRight:5}} />
                                        <Text style={{fontSize:12, color:theme.subText}}>
                                            {t.estDelivery} <Text style={{fontWeight:'bold', color: PITO_COLORS.primary}}>{getEstimatedDeliveryDate(selectedOrder.date)}</Text>
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.userInfoSection, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : 'rgba(197, 160, 89, 0.05)' }]}>
                                    <Text style={[styles.sectionHeader, {color: theme.text}]}>{t.deliveryInfo}</Text>
                                    <Text style={[styles.infoText, {color: theme.subText}]}>
                                        {t.recipient} {selectedOrder.user_name || user.fullname || t.notSet}
                                    </Text>
                                    <Text style={[styles.infoText, {color: theme.subText}]}>
                                        {t.phone} {selectedOrder.user_phone || user.phone || t.notSet}
                                    </Text>
                                    <Text style={[styles.infoText, {color: theme.subText}]}>
                                        {t.address} {selectedOrder.user_address || (user.address ? `${user.address} ${user.district || ''}/${user.city || ''}` : t.notSet)}
                                    </Text>
                                </View>

                                {(selectedOrder.status === 'Kargoda' || selectedOrder.status === 'Shipped' || selectedOrder.status === 'Sipariş Kargoya Verildi') && (
                                    <TouchableOpacity activeOpacity={0.7} style={[styles.cargoLinkBox, { backgroundColor: 'rgba(0, 184, 148, 0.1)' }]} onPress={() => {}}>
                                        <Text style={[styles.cargoLinkText, { color: PITO_COLORS.success }]}>{t.cargoLinkText}</Text>
                                    </TouchableOpacity>
                                )}
                                <View style={[styles.divider, { backgroundColor: isDarkMode ? PITO_COLORS.navyLight : '#EEE' }]} />
                                <Text style={{color:theme.text, fontWeight:'bold', marginBottom:10}}>{t.items}:</Text>
                                {selectedOrder.items && selectedOrder.items.map((item, index) => (
                                    <View key={index} style={{flexDirection:'row', marginBottom:10, alignItems:'center'}}>
                                            <Image source={{uri: item.img}} style={{width:50, height:50, borderRadius:12, marginRight:10, backgroundColor: isDarkMode ? PITO_COLORS.navyLight : '#eee'}} />
                                            <View><Text style={{color:theme.text, fontWeight:'600'}}>{item.name}</Text><Text style={{color:theme.subText}}>{item.price} x {item.quantity}</Text></View>
                                    </View>
                                ))}
                                <View style={{marginTop:20, borderTopWidth:1, borderTopColor: isDarkMode ? PITO_COLORS.navyLight : '#eee', paddingTop:10}}>
                                    <Text style={{color:theme.text, fontSize:18, fontWeight:'bold', textAlign:'right'}}>{t.total} {selectedOrder.totalPrice || selectedOrder.total_price}</Text>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            <Modal transparent={true} visible={accountMenuVisible} onRequestClose={() => setAccountMenuVisible(false)}>
                <TouchableOpacity activeOpacity={0.7} style={styles.modalOverlay} onPress={() => setAccountMenuVisible(false)}>
                    <View style={[styles.accountMenu, {backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg}]}>
                        <TouchableOpacity activeOpacity={0.7} style={styles.menuItem} onPress={handleSwitchAccount}>
                            <Ionicons name="people-outline" size={20} color={theme.text} />
                            <Text style={{marginLeft:10, color:theme.text}}>{t.switchAccount}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal animationType="slide" transparent={true} visible={userListModalVisible} onRequestClose={() => setUserListModalVisible(false)}>
                <GestureHandlerRootView style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '60%', backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.cardBg }]}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>{userListType === 'followers' ? t.followersTitle : t.followingTitle}</Text>
                            <TouchableOpacity activeOpacity={0.7} onPress={() => setUserListModalVisible(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
                        </View>
                        {isMyProfile && userListType === 'followers' && <Text style={{textAlign:'center', fontSize:10, color:theme.subText, marginBottom:5}}>{t.swipeUserHint}</Text>}
                        <FlatList 
                            data={userListData}
                            keyExtractor={item => String(item.id)}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20, color: theme.subText}}>{t.nobody}</Text>}
                            renderItem={({ item }) => {
                                const row = (
                                    <TouchableOpacity activeOpacity={0.7} style={[styles.userListItem, { borderBottomColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]} onPress={() => { setUserListModalVisible(false); navigation.push('UserProfile', { userId: item.id, userName: item.fullname, userAvatar: item.avatar }); }}>
                                        <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
                                            <View style={[styles.listAvatar, { backgroundColor: PITO_COLORS.primary }]} >{item.avatar ? <Image source={{uri: item.avatar}} style={{width:'100%', height:'100%'}} /> : <Text style={{color: PITO_COLORS.navyBg, fontWeight:'bold'}}>{item.fullname?.charAt(0) || "?"}</Text>}</View>
                                            <Text style={[styles.listName, { color: theme.text }]}>{item.fullname}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                                return isMyProfile && userListType === 'followers' ? <Swipeable renderRightActions={() => renderFollowerRightActions(item.id)}>{row}</Swipeable> : row;
                            }}
                        />
                    </View>
                </GestureHandlerRootView>
            </Modal>

            <Modal animationType="fade" transparent={true} visible={notificationsVisible} onRequestClose={() => setNotificationsVisible(false)}>
                <GestureHandlerRootView style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '60%', backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.cardBg }]}>
                        <View style={styles.sheetHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.notifications}</Text>
                            <TouchableOpacity activeOpacity={0.7} onPress={() => setNotificationsVisible(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
                        </View>
                        {user && user.notifications && user.notifications.length > 0 ? (
                            <FlatList 
                                data={user.notifications}
                                keyExtractor={(item) => String(item.id)}
                                renderItem={({ item }) => (
                                    <Swipeable renderRightActions={() => renderNotificationRightActions(item.id)}>
                                            <TouchableOpacity activeOpacity={0.7} style={[styles.notificationItem, { borderBottomColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]} onPress={() => handleNotificationClick(item)}>
                                                {!item.read && <View style={[styles.unreadDot, { backgroundColor: PITO_COLORS.primary }]} />}
                                                <View style={{marginRight:15}}>
                                                    {item.fromUserAvatar ? <Image source={{ uri: item.fromUserAvatar }} style={{width:40, height:40, borderRadius:20, borderWidth: 1, borderColor: PITO_COLORS.primary}} /> : <View style={{width:40, height:40, borderRadius:20, justifyContent:'center', alignItems:'center', backgroundColor:'rgba(197, 160, 89, 0.1)'}}><Ionicons name="notifications" size={20} color={PITO_COLORS.primary} /></View>}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{color: theme.text, fontSize:14, fontWeight: !item.read ? 'bold' : 'normal'}}>{item.message}</Text>
                                                    <Text style={{ fontSize: 10, color: theme.subText, marginTop: 3 }}>{new Date(item.date).toLocaleDateString()}</Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={16} color={theme.subText} />
                                            </TouchableOpacity>
                                    </Swipeable>
                                )}
                            />
                        ) : (
                            <View style={{ alignItems: 'center', marginTop: 50 }}>
                                <Ionicons name="notifications-off-outline" size={50} color={theme.subText} />
                                <Text style={{ marginTop: 10, color: theme.subText }}>{t.noNotif}</Text>
                            </View>
                        )}
                    </View>
                </GestureHandlerRootView>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    
    
    
    badge: { position: 'absolute', top: 5, right: 5, backgroundColor: PITO_COLORS.error, borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    
    
    
    
    
    
    
    
    
    

    
    userEmail: { fontSize: 14, marginTop: 2, marginBottom: 10 },
    
    
    
    
    
    
    
    
    hintText: { textAlign: 'center', fontSize: 10, color: '#999', marginVertical: 10 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    gridItem: { width: width / 3, height: width / 3, padding: 1 },
    gridImage: { width: '100%', height: '100%' },
    gridOverlay: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center', backgroundColor:'rgba(11, 19, 30, 0.6)', padding:3, borderRadius:5 },
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    deleteAction: { backgroundColor: PITO_COLORS.error, justifyContent: 'center', alignItems: 'center', width: 90, borderTopRightRadius: 20, borderBottomRightRadius: 20, height: 110, marginBottom: 15 },
    foundAction: { backgroundColor: PITO_COLORS.primary, justifyContent: 'center', alignItems: 'center', width: 110, borderTopLeftRadius: 20, borderBottomLeftRadius: 20, height: 110, marginBottom: 15 },
    actionTextDelete: { color: 'white', fontWeight: 'bold', fontSize: 12, marginTop: 5 },
    actionTextFound: { color: PITO_COLORS.navyBg, fontWeight: 'bold', fontSize: 12, marginTop: 5 },
    
    
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 5 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    
    
    
    
    
    
    
    
    
    
    
     
    
    
    
    divider: { height: 1, marginVertical: 15 },
    
    
    
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
    headerBrand: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 },
    headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    iconBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(154,151,140,0.09)', marginLeft: 5, justifyContent: 'center', alignItems: 'center' },
    profileSection: { paddingHorizontal: 20, paddingTop: 23, paddingBottom: 22 },
    identityRow: { flexDirection: 'row', alignItems: 'center', gap: 17, marginBottom: 24 },
    identityText: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    userName: { fontSize: 23, fontWeight: '800', letterSpacing: -0.7, flexShrink: 1, lineHeight: 29 },
    avatarContainer: { position: 'relative', width: 92, height: 92 },
    avatar: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: '#FFFFFF' },
    avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9DAB9' },
    avatarText: { fontSize: 35, fontWeight: '700', color: PITO_COLORS.navyBg },
    premiumBadgeAvatar: { position: 'absolute', top: -2, right: -2, backgroundColor: PITO_COLORS.primary, borderRadius: 12, padding: 2, borderWidth: 2, borderColor: '#FFFFFF' },
    userBio: { fontSize: 12, lineHeight: 19, marginTop: 8, fontStyle: 'italic' },
    editBtnModern: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 14, borderRadius: 17, borderWidth: 1, borderColor: PITO_COLORS.primary, backgroundColor: 'rgba(197,160,89,0.035)' },
    editBtnTextModern: { fontSize: 14, fontWeight: '700', color: PITO_COLORS.primaryDark },
    vaccineBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 22, padding: 15, borderRadius: 22, borderWidth: 1, shadowColor: '#9A7C45', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.055, shadowRadius: 12 },
    vaccineIconBox: { width: 45, height: 45, borderRadius: 14, backgroundColor: '#EADAB6', alignItems: 'center', justifyContent: 'center' },
    tabBar: { flexDirection: 'row', marginHorizontal: 20, padding: 4, borderWidth: 1, borderRadius: 19, marginBottom: 7 },
    tabItem: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 5, borderRadius: 15 },
    tabText: { fontSize: 10, fontWeight: '600', flexShrink: 1 },
    emptyContainer: { alignItems: 'center', marginHorizontal: 20, marginTop: 14, paddingVertical: 30, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1, minHeight: 240 },
    emptyIllustration: { width: 170, height: 113, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyHalo: { width: 94, height: 94, borderRadius: 47, backgroundColor: 'rgba(197,160,89,0.08)', alignItems: 'center', justifyContent: 'center' },
    emptyLeafLeft: { position: 'absolute', bottom: 9, left: 16, transform: [{ rotate: '-35deg' }] },
    emptyLeafRight: { position: 'absolute', bottom: 12, right: 16, transform: [{ rotate: '25deg' }] },
    emptyGround: { position: 'absolute', bottom: 1, width: 150, height: 6, borderRadius: 20, backgroundColor: 'rgba(197,160,89,0.08)' },
    emptyText: { fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 23 },
    emptyCaption: { fontSize: 12, textAlign: 'center', lineHeight: 20, marginTop: 9 },
    shopEmpty: { alignItems: 'center', padding: 32, borderRadius: 22, marginTop: 10 },
    logoutBtn: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 25, paddingHorizontal: 20, paddingVertical: 13 },
    shopOptionCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 19, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(197,160,89,0.16)' },
    shopOptionText: { flex: 1, fontSize: 15, fontWeight: '700' },
    iconCircle: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    orderCard: { padding: 17, borderRadius: 18, marginBottom: 12, borderLeftWidth: 3 },
    favItem: { width: '48%', padding: 12, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(197,160,89,0.15)' },
    card: { borderRadius: 20, marginBottom: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(197,160,89,0.16)' },
    cardImage: { width: 76, height: 76, borderRadius: 15, backgroundColor: '#EAE4D8' },
    cardInfo: { flex: 1, marginLeft: 12 },
    cardName: { fontSize: 16, fontWeight: '700' },
    cardSub: { fontSize: 11, marginTop: 5 },
    cardActionRow: { flexDirection: 'row', marginTop: 14, paddingTop: 13, borderTopWidth: 1 },
    cardActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 6, borderRadius: 12 },
    cardActionBtnText: { fontWeight: '700', fontSize: 10, marginLeft: 5, flexShrink: 1, textAlign: 'center' },
    foundOverlay: { position: 'absolute', top: 0, left: 0, width: 76, height: 76, backgroundColor: 'rgba(11,19,30,0.65)', justifyContent: 'center', alignItems: 'center', borderRadius: 15 },
    foundText: { color: PITO_COLORS.cream, fontSize: 8, fontWeight: '800', textAlign: 'center', paddingHorizontal: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(11,19,30,0.55)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 11, paddingBottom: 32 },
    sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 3, backgroundColor: '#AFA897', opacity: 0.5, marginBottom: 21 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 21, fontWeight: '800', letterSpacing: -0.5, flex: 1 },
    optionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
    iconBox: { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    optionText: { flex: 1, fontSize: 14, fontWeight: '600' },
    accountMenu: { position: 'absolute', bottom: 25, right: 20, left: 20, borderRadius: 21, padding: 20 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
    userListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 13, borderBottomWidth: 0, borderRadius: 16, marginBottom: 8 },
    listAvatar: { width: 43, height: 43, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
    listName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
    notificationItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 17, borderBottomWidth: 0, marginBottom: 9, position: 'relative' },
    unreadDot: { width: 6, height: 6, borderRadius: 3, position: 'absolute', top: 10, left: 8 },
    userInfoSection: { padding: 17, borderRadius: 17, marginBottom: 17 },
    sectionHeader: { fontSize: 15, fontWeight: '700', marginBottom: 11 },
    infoText: { fontSize: 13, lineHeight: 21, marginBottom: 7 },
    cargoLinkBox: { padding: 16, borderRadius: 15, marginBottom: 15, alignItems: 'center' },
    cargoLinkText: { fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' }

});

export default ProfileScreen;