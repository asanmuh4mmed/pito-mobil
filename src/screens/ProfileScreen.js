import React, { useContext, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, Modal, Dimensions, Alert, Animated } from 'react-native';
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

// 👑 KURUCU (FOUNDER) E-POSTA ADRESİ 👑
// Kendi kayıtlı e-posta adresini buraya yaz.
const KURUCU_EMAIL = "asanmuh4mmed@gmail.com"; 

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
        tabListings: "İlanlarım", tabPetsgram: "Petsgram", tabShop: "Mağaza",
        myOrders: "Siparişlerim", myFavs: "Favorilerim", goToShop: "Mağazaya Git",
        noOrders: "Henüz sipariş vermediniz.", noFavs: "Henüz favori ürününüz yok.",
        orderNo: "Sipariş No:", status: "Durum:", total: "Toplam:", items: "Ürünler",
        modalAdTitle: "Ne İlanı Ekleyeceksin?", adMate: "Eş Arayanlar", adAdopt: "Sahiplendirme", adVet: "Veteriner Klinikleri", adSitter: "Bakıcı",
        addFirst: "İlk İlanını Ekle", addNew: "+ Yeni Ekle",
        orderDetail: "Sipariş Detayı", trackCargo: "Kargo Takip", close: "Kapat",
        donationPoints: "Bağış ve Rozetler", totalPoints: "Yapılan Bağış:", points: "Kez",
        deliveryInfo: "Teslimat Bilgileri", recipient: "Alıcı:", phone: "Telefon:", address: "Adres:", cargoLinkText: "🚚 Kargo Takip Linki (Tıkla)",
        order_confirmed: "Sipariş Onaylandı", order_preparing: "Sipariş Hazırlanıyor", order_shipped: "Sipariş Kargoya Verildi", order_delivered: "Sipariş Teslim Edildi", order_cancelled: "Sipariş İptal Edildi",
        saved: "Kaydedilenler", noSavedPosts: "Henüz kaydedilen gönderi yok.",
        adminPanel: "Yönetici Paneli", adminDesc: "Sistem ve kullanıcı yönetimi",
        estDelivery: "Tahmini Teslimat:", notSet: "Belirtilmemiş",
        badgeBronze: "Bronz Pati", badgeSilver: "Gümüş Pati", badgeGold: "Altın Pati", badgeDiamond: "Elmas Pati", nextBadge: "Sonraki Rozet", maxBadge: "En yüksek rozettesin!"
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
        tabListings: "Listings", tabPetsgram: "Petsgram", tabShop: "Shop",
        myOrders: "My Orders", myFavs: "My Favorites", goToShop: "Go to Shop",
        noOrders: "No orders yet.", noFavs: "No favorites yet.",
        orderNo: "Order #", status: "Status:", total: "Total:", items: "Items",
        modalAdTitle: "What will you post?", adMate: "Find Mate", adAdopt: "Adopt", adVet: "Vet Clinics", adSitter: "Pet Sitter",
        addFirst: "Add Your First Ad", addNew: "+ Add New",
        orderDetail: "Order Detail", trackCargo: "Track Cargo", close: "Close",
        donationPoints: "Donation & Badges", totalPoints: "Donations Made:", points: "Times", 
        deliveryInfo: "Delivery Information", recipient: "Recipient:", phone: "Phone:", address: "Address:", cargoLinkText: "🚚 Cargo Tracking Link (Click)",
        order_confirmed: "Order Confirmed", order_preparing: "Order Preparing", order_shipped: "Order Shipped", order_delivered: "Order Delivered", order_cancelled: "Order Cancelled",
        saved: "Saved", noSavedPosts: "No saved posts yet.",
        adminPanel: "Admin Panel", adminDesc: "System & User Management",
        estDelivery: "Est. Delivery:", notSet: "Not set",
        badgeBronze: "Bronze Paw", badgeSilver: "Silver Paw", badgeGold: "Gold Paw", badgeDiamond: "Diamond Paw", nextBadge: "Next Badge", maxBadge: "Max badge reached!"
    }
};

// ✅ Izgara Görünümü İçin Tekil Öğe
const GridItem = ({ post, navigation, onPress }) => {
    const player = useVideoPlayer(post.type === 'video' ? post.image : null, player => {
        player.muted = true; 
        player.loop = true;
    });

    return (
        <TouchableOpacity 
            style={styles.gridItem} 
            onPress={onPress ? onPress : () => navigation.navigate('Petsgram', { initialPostId: post.id })}
        >
            {post.type === 'video' ? (
                <View style={{flex: 1, backgroundColor: 'black', justifyContent:'center', alignItems:'center'}}>
                    <VideoView 
                        player={player} 
                        style={{width: '100%', height: '100%', opacity: 0.8}} 
                        contentFit="cover"
                        nativeControls={false}
                    />
                    <View style={[StyleSheet.absoluteFill, {justifyContent:'center', alignItems:'center'}]}>
                        <Ionicons name="play-circle" size={30} color="rgba(255,255,255,0.8)" />
                    </View>
                </View>
            ) : (
                <Image source={{ uri: post.image }} style={styles.gridImage} resizeMode="cover" />
            )}

            <View style={styles.gridOverlay}>
                <View style={{flexDirection:'row', alignItems:'center', marginRight:8}}>
                    <Ionicons name="heart" size={10} color="white" />
                    <Text style={{color:'white', fontSize:9, marginLeft:2, fontWeight:'bold'}}>{post.likes || 0}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const ProfileScreen = ({ navigation, route }) => {
    const { user, logout, allUsers, removeFollower, deleteNotification, updateUser, country } = useContext(AuthContext); 
    const { urgentList, mateList, vetList, sitterList, deleteListing, updateListing, fetchListings } = useContext(ListingContext);
    const { getUnreadCount } = useContext(ChatContext);
    const { theme } = useContext(ThemeContext);
    const { posts, savedPostIds } = useContext(SocialContext);
    const { orders, products, favorites } = useContext(ShopContext);

    const [modalVisible, setModalVisible] = useState(false);
    const [userListModalVisible, setUserListModalVisible] = useState(false);
    const [notificationsVisible, setNotificationsVisible] = useState(false);
    const [savedModalVisible, setSavedModalVisible] = useState(false);
    const [accountMenuVisible, setAccountMenuVisible] = useState(false);
    const [orderDetailVisible, setOrderDetailVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [activeTab, setActiveTab] = useState('listings'); 
    const [shopSubTab, setShopSubTab] = useState(null); 
    const [userListType, setUserListType] = useState(''); 
    const [userListData, setUserListData] = useState([]);

    const scaleAnim = useRef(new Animated.Value(1)).current;
    const activeLang = country?.code || 'TR';
    const t = TRANSLATIONS[activeLang];

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
        }, [])
    );

    if (!viewUser) return null;

    // ✅ DİNAMİK ROZET HESAPLAYICI
    const calculateDynamicBadge = (points) => {
        const p = points || 0;
        if (p >= 50) return { name: t.badgeDiamond, icon: 'diamond', color: '#00cec9' };
        if (p >= 15) return { name: t.badgeGold, icon: 'star', color: '#f1c40f' };
        if (p >= 5) return { name: t.badgeSilver, icon: 'medal', color: '#bdc3c7' };
        if (p >= 1) return { name: t.badgeBronze, icon: 'paw', color: '#e17055' };
        return null; 
    };

    const getBadgeProgress = (points) => {
        const p = points || 0;
        if (p < 1) return { next: 1, current: p, name: t.badgeBronze };
        if (p < 5) return { next: 5, current: p, name: t.badgeSilver };
        if (p < 15) return { next: 15, current: p, name: t.badgeGold };
        if (p < 50) return { next: 50, current: p, name: t.badgeDiamond };
        return { next: p, current: p, name: t.badgeDiamond, max: true }; 
    };

    const displayBadge = viewUser.activeBadge || calculateDynamicBadge(viewUser.donation_points);
    const badgeProgressInfo = getBadgeProgress(user?.donation_points || 0);
    const badgeProgressPercent = badgeProgressInfo.max ? 100 : (badgeProgressInfo.current / badgeProgressInfo.next) * 100;

    const unreadCount = user ? getUnreadCount(user.id) : 0;
    const unreadNotifCount = user && user.notifications ? user.notifications.filter(n => !n.read).length : 0;
    
    const allListings = [...(urgentList || []), ...(mateList || []), ...(vetList || []), ...(sitterList || [])];
    const displayedListings = (viewUser && allListings.length > 0) 
        ? allListings.filter(item => item.ownerId && String(item.ownerId).trim() === String(viewUser.id).trim())
        : [];

    const userPosts = posts.filter(p => String(p.userId) === String(viewUser.id));
    const savedPostsList = posts.filter(p => savedPostIds.includes(p.id));
    const myOrders = orders.filter(o => String(o.user_id || o.userId) === String(viewUser.id));
    const myFavoriteProducts = products.filter(p => favorites.some(fav => (typeof fav === 'object' ? (fav.userId === viewUser.id && fav.productId === p.id) : fav === p.id)));

    const getLocalizedStatus = (status) => { if (!status) return t.order_preparing; if (status.includes('Onaylandı') || status.includes('Confirmed')) return t.order_confirmed; if (status.includes('Hazırlanıyor') || status.includes('Preparing')) return t.order_preparing; if (status.includes('Kargoya') || status.includes('Shipped')) return t.order_shipped; if (status.includes('Teslim') || status.includes('Delivered')) return t.order_delivered; if (status.includes('İptal') || status.includes('Cancelled')) return t.order_cancelled; return status; };
    const getStatusColor = (status) => { if (!status) return '#FF9800'; if (status.includes('İptal') || status.includes('Cancelled')) return '#FF3B30'; if (status.includes('Teslim') || status.includes('Delivered')) return '#4CAF50'; if (status.includes('Kargo') || status.includes('Shipped')) return '#2196F3'; return '#FF9800'; };
    const getLocalizedCategoryName = (catName) => { if (!catName) return ''; if (activeLang === 'TR') return catName; if (catName.includes('Eş')) return 'Find Mate'; if (catName.includes('Sahiplendirme')) return 'Adoption'; if (catName.includes('Veteriner')) return 'Vet Clinics'; if (catName.includes('Bakıcı')) return 'Pet Sitter'; return catName; };

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

    const handleDelete = (id) => { 
        Alert.alert(t.deleteAdTitle, t.deleteAdMsg, [
            { text: t.cancel, style: "cancel" }, 
            { text: t.delete, style: "destructive", onPress: async () => {
                await deleteListing(id); 
                if (fetchListings) fetchListings(); 
            }} 
        ]); 
    };

    const handleMarkAsFound = (item) => {
        const currentStatus = item.is_found; 
        const newStatus = !currentStatus;
        
        const statusText = item.category.includes('Eş') || item.category.includes('Mate') ? t.mateFound : t.homeFound;
        const confirmMsg = `${t.statusMsg} \n(${newStatus ? statusText : t.active})`;

        Alert.alert(t.statusTitle, confirmMsg, [
            { text: t.cancel, style: "cancel" }, 
            { text: t.yes, onPress: async () => { 
                if(updateListing) { 
                    await updateListing(item.id, { isFound: newStatus }); 
                    if (fetchListings) fetchListings(); 
                } 
            }}
        ]);
    };

    const navigateToAdd = (val) => {
        setModalVisible(false);
        let backendCategoryName = val;
        if (val === 'Find Mate') backendCategoryName = 'Eş Arayanlar'; else if (val === 'Adopt') backendCategoryName = 'Sahiplendirme'; else if (val === 'Vet Clinics') backendCategoryName = 'Veteriner Klinikleri'; else if (val === 'Pet Sitter') backendCategoryName = 'Bakıcı'; else if (activeLang === 'TR') backendCategoryName = val;
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

    const renderListingRightActions = (id) => ( 
        <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(id)}>
            <Ionicons name="trash-outline" size={24} color="white" />
            <Text style={styles.actionText}>{t.delete}</Text>
        </TouchableOpacity> 
    );
    
    const renderListingLeftActions = (item) => { 
        if (item.category.includes('Veteriner') || item.category.includes('Bakıcı')) return null; 
        
        const label = item.category.includes('Eş') ? t.mateFound : t.homeFound; 
        const actionLabel = item.is_found ? t.undo : label; 

        return ( 
            <TouchableOpacity style={styles.foundAction} onPress={() => handleMarkAsFound(item)}>
                <Ionicons name={item.is_found ? "refresh-circle-outline" : "checkmark-circle-outline"} size={24} color="white" />
                <Text style={styles.actionText}>{actionLabel}</Text>
            </TouchableOpacity> 
        ); 
    };

    const renderFollowerRightActions = (followerId) => ( <TouchableOpacity style={styles.deleteAction} onPress={() => handleRemoveFollower(followerId)}><Ionicons name="person-remove-outline" size={24} color="white" /><Text style={styles.actionText}>{t.remove}</Text></TouchableOpacity> );
    const renderNotificationRightActions = (id) => ( <TouchableOpacity style={styles.deleteAction} onPress={() => deleteNotification(id)}><Ionicons name="trash-outline" size={24} color="white" /><Text style={styles.actionText}>{t.delete}</Text></TouchableOpacity> );

    const renderListingItem = ({ item }) => (
        <Swipeable 
            renderRightActions={() => isMyProfile ? renderListingRightActions(item.id) : null} 
            renderLeftActions={() => isMyProfile ? renderListingLeftActions(item) : null} 
        >
            <TouchableOpacity 
                style={[styles.card, { backgroundColor: theme.cardBg, opacity: item.is_found ? 0.7 : 1 }]} 
                onPress={() => navigation.navigate('ListingDetail', { item })} 
                activeOpacity={0.9}
            >
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
                    
                    <View style={[styles.statusBadge, { backgroundColor: item.is_found ? '#4CAF50' : '#E3FCEC' }]}>
                        <Text style={[styles.statusText, { color: item.is_found ? 'white' : '#28C76F' }]}>
                            {item.is_found ? t.completed : t.active}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </Swipeable>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            
            {/* HEADER */}
            <View style={[styles.header, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
                {isMyProfile ? (
                    <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn}><Ionicons name="settings-outline" size={24} color={theme.icon} /></TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}><Ionicons name="arrow-back" size={24} color={theme.icon} /></TouchableOpacity>
                )}
                
                <TouchableOpacity onPress={() => isMyProfile && setAccountMenuVisible(true)} activeOpacity={0.7} style={{flexDirection:'row', alignItems:'center'}}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>{viewUser.username ? `@${viewUser.username}` : viewUser.fullname}</Text>
                    {isMyProfile && <Ionicons name="chevron-down" size={16} color={theme.text} style={{marginLeft:5}} />}
                </TouchableOpacity>

                <View style={{ flexDirection: 'row' }}>
                    {isMyProfile && (
                        <>
                            <TouchableOpacity style={styles.iconBtn} onPress={handleNotificationPress}>
                                <Ionicons name="notifications-outline" size={24} color={theme.icon} />
                                {unreadNotifCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadNotifCount}</Text></View>}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('ChatList')}>
                                <Ionicons name="paper-plane-outline" size={24} color={theme.icon} />
                                {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
                            </TouchableOpacity>
                        </>
                    )}
                    {!isMyProfile && <View style={{ width: 40 }} />}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
                
                {/* PROFİL KARTI */}
                <View style={[styles.profileSection, { backgroundColor: theme.cardBg }]}>
                    <View style={styles.avatarContainer}>
                        {viewUser.avatar ? (
                            <Image 
                                key={viewUser.avatar} 
                                source={{ uri: `${viewUser.avatar}?t=${new Date().getTime()}` }} 
                                style={styles.avatar} 
                            />
                        ) : (
                            <View style={[styles.avatar, {backgroundColor: COLORS.primary, justifyContent:'center', alignItems:'center'}]}>
                                <Text style={styles.avatarText}>{viewUser.fullname?.charAt(0)}</Text>
                            </View>
                        )}
                        {viewUser.isPremium && (
                            <View style={styles.premiumBadgeAvatar}><Ionicons name="checkmark-circle" size={22} color="white" /></View>
                        )}
                    </View>
                    
                    <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                        <Text style={[styles.userName, { color: theme.text }]}>{viewUser.fullname}</Text>
                        
                        {/* 👑 KURUCU (FOUNDER) ROZETİ EKLENDİ 👑 */}
                        {(viewUser.email === KURUCU_EMAIL) && (
                            <Ionicons 
                                name="checkmark-circle" 
                                size={22} 
                                color="#1DA1F2" 
                                style={{ marginLeft: 6, marginTop: 4 }} 
                            />
                        )}

                        {/* ✅ DİNAMİK ROZET GÖSTERİMİ */}
                        {displayBadge && (
                            <View style={{marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: displayBadge.color + '20', borderRadius: 12, marginTop: 4}}>
                                <Ionicons name={displayBadge.icon} size={14} color={displayBadge.color} />
                                <Text style={{fontSize: 10, fontWeight: 'bold', color: displayBadge.color, marginLeft: 4}}>{displayBadge.name}</Text>
                            </View>
                        )}
                    </View>

                    <Text style={[styles.userEmail, { color: theme.subText }]}>{viewUser.username ? `@${viewUser.username}` : viewUser.email}</Text>
                    {viewUser.bio && <Text style={[styles.userBio, { color: theme.text }]}>{viewUser.bio}</Text>}
                    
                    {isMyProfile && (
                        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                            <TouchableOpacity style={styles.editBtnModern} onPress={() => navigation.navigate('EditProfile')} onPressIn={onPressIn} onPressOut={onPressOut} activeOpacity={0.9}>
                                <Ionicons name="create-outline" size={18} color="white" style={{marginRight:5}} />
                                <Text style={styles.editBtnTextModern}>{t.editProfile}</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>

                {/* TAB MENÜSÜ */}
                <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
                    <TouchableOpacity style={[styles.tabItem, activeTab === 'listings' && { borderBottomColor: COLORS.primary, borderBottomWidth: 3 }]} onPress={() => setActiveTab('listings')}>
                        <Ionicons name="grid" size={24} color={activeTab === 'listings' ? COLORS.primary : theme.subText} />
                        <Text style={[styles.tabText, {color: activeTab === 'listings' ? COLORS.primary : theme.subText}]}>{t.tabListings}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabItem, activeTab === 'petsgram' && { borderBottomColor: COLORS.primary, borderBottomWidth: 3 }]} onPress={() => setActiveTab('petsgram')}>
                        <Ionicons name="videocam" size={24} color={activeTab === 'petsgram' ? COLORS.primary : theme.subText} />
                        <Text style={[styles.tabText, {color: activeTab === 'petsgram' ? COLORS.primary : theme.subText}]}>{t.tabPetsgram}</Text>
                    </TouchableOpacity>
                    {isMyProfile && (
                        <TouchableOpacity style={[styles.tabItem, activeTab === 'shop' && { borderBottomColor: COLORS.primary, borderBottomWidth: 3 }]} onPress={() => { setActiveTab('shop'); setShopSubTab(null); }}>
                            <Ionicons name="bag-handle" size={24} color={activeTab === 'shop' ? COLORS.primary : theme.subText} />
                            <Text style={[styles.tabText, {color: activeTab === 'shop' ? COLORS.primary : theme.subText}]}>{t.tabShop}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* İÇERİK ALANI */}
                {activeTab === 'listings' ? (
                    <View>
                        {isMyProfile && displayedListings.length > 0 && <Text style={styles.hintText}>{t.swipeHint}</Text>}
                        {displayedListings.length === 0 ? (
                            <View style={styles.emptyContainer}><Text style={[styles.emptyText, {color:theme.subText}]}>{t.noListings}</Text></View>
                        ) : (
                            <GestureHandlerRootView>
                                <FlatList data={displayedListings} renderItem={renderListingItem} keyExtractor={item => item.id} scrollEnabled={false} contentContainerStyle={{paddingHorizontal: 20}} />
                            </GestureHandlerRootView>
                        )}
                    </View>
                ) : activeTab === 'petsgram' ? (
                    userPosts.length === 0 ? (
                        <View style={styles.emptyContainer}><Text style={[styles.emptyText, {color:theme.subText}]}>{t.noPosts}</Text></View>
                    ) : (
                        <View style={styles.gridContainer}>
                            {userPosts.map((post) => (
                                <GridItem key={post.id} post={post} navigation={navigation} />
                            ))}
                        </View>
                    )
                ) : (
                    // SHOP İÇERİĞİ
                    <View style={{padding: 20}}>
                        {!shopSubTab ? (
                            <View>
                                <TouchableOpacity style={[styles.shopOptionCard, {backgroundColor: theme.cardBg}]} onPress={() => setShopSubTab('orders')} activeOpacity={0.8}>
                                    <View style={[styles.iconCircle, {backgroundColor:'#E3F2FD'}]}><Ionicons name="cube" size={26} color="#2196F3" /></View>
                                    <Text style={[styles.shopOptionText, {color: theme.text}]}>{t.myOrders}</Text>
                                    <Ionicons name="chevron-forward" size={22} color={theme.subText} />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.shopOptionCard, {backgroundColor: theme.cardBg}]} onPress={() => setShopSubTab('favorites')} activeOpacity={0.8}>
                                    <View style={[styles.iconCircle, {backgroundColor:'#FFEBEE'}]}><Ionicons name="heart" size={26} color="#F44336" /></View>
                                    <Text style={[styles.shopOptionText, {color: theme.text}]}>{t.myFavs}</Text>
                                    <Ionicons name="chevron-forward" size={22} color={theme.subText} />
                                </TouchableOpacity>
                                
                                {/* ✅ BAĞIŞ VE ROZETLER İLERLEME ÇUBUĞU */}
                                <TouchableOpacity style={[styles.shopOptionCard, {backgroundColor: theme.cardBg}]} onPress={() => navigation.navigate('Badges')} activeOpacity={0.8}>
                                    <View style={[styles.iconCircle, {backgroundColor:'#FFF3E0'}]}><Ionicons name="trophy" size={26} color="#FF9800" /></View>
                                    <View style={{flex:1}}>
                                        <Text style={[styles.shopOptionText, {color: theme.text}]}>{t.donationPoints}</Text>
                                        <Text style={{fontSize:12, color:theme.subText}}>{t.totalPoints} {user?.donation_points || 0} {t.points}</Text>
                                        
                                        {/* Progress Bar (Gelişim Çubuğu) */}
                                        <View style={{marginTop: 8, height: 6, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 3, overflow: 'hidden', width: '90%'}}>
                                            <View style={{width: `${badgeProgressPercent}%`, height: '100%', backgroundColor: '#FF9800'}} />
                                        </View>
                                        <Text style={{fontSize: 10, color: theme.subText, marginTop: 4, fontWeight: 'bold'}}>
                                            {badgeProgressInfo.max ? t.maxBadge : `${t.nextBadge} (${badgeProgressInfo.name}): ${badgeProgressInfo.current} / ${badgeProgressInfo.next}`}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={22} color={theme.subText} />
                                </TouchableOpacity>
                                
                                <TouchableOpacity style={[styles.shopOptionCard, {backgroundColor: theme.cardBg}]} onPress={() => navigation.navigate('Shop')} activeOpacity={0.8}>
                                    <View style={[styles.iconCircle, {backgroundColor:'#E8F5E9'}]}><Ionicons name="storefront" size={26} color="#4CAF50" /></View>
                                    <Text style={[styles.shopOptionText, {color: theme.text}]}>{t.goToShop}</Text>
                                    <Ionicons name="arrow-forward" size={22} color={theme.subText} />
                                </TouchableOpacity>

                                {/* ADMIN PANELİ BUTONU */}
                                {user && user.is_admin && (
                                    <TouchableOpacity 
                                        style={[styles.shopOptionCard, {backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#D32F2F'}]} 
                                        onPress={() => navigation.navigate('AdminPanel')} 
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.iconCircle, {backgroundColor:'#FFCDD2'}]}>
                                            <Ionicons name="shield-checkmark" size={26} color="#D32F2F" />
                                        </View>
                                        <View style={{flex:1}}>
                                            <Text style={[styles.shopOptionText, {color: '#D32F2F'}]}>{t.adminPanel}</Text>
                                            <Text style={{fontSize:12, color:theme.subText}}>{t.adminDesc}</Text>
                                        </View>
                                        <Ionicons name="lock-open" size={22} color="#D32F2F" />
                                    </TouchableOpacity>
                                )}

                            </View>
                        ) : shopSubTab === 'orders' ? (
                            <View>
                                <TouchableOpacity onPress={() => setShopSubTab(null)} style={{flexDirection:'row', alignItems:'center', marginBottom:15}}>
                                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                                    <Text style={{marginLeft:10, fontSize:18, fontWeight:'bold', color:theme.text}}>{t.myOrders}</Text>
                                </TouchableOpacity>
                                {myOrders.length === 0 ? <Text style={{textAlign:'center', color:theme.subText, marginTop:20}}>{t.noOrders}</Text> : (
                                    myOrders.map(order => {
                                        const statusColor = getStatusColor(order.status);
                                        return (
                                            <TouchableOpacity key={order.id} style={[styles.orderCard, {backgroundColor: theme.cardBg, borderLeftColor: statusColor}]} onPress={() => handleOrderPress(order)}>
                                                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:5}}>
                                                    <Text style={{fontWeight:'bold', color:theme.text, fontSize:16}}>{t.orderNo} {order.id.toString().slice(0,8)}...</Text>
                                                    <Text style={{color: statusColor, fontWeight:'bold', fontSize:12}}>{getLocalizedStatus(order.status)}</Text>
                                                </View>
                                                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                                                    <Text style={{color:theme.subText, fontSize:12}}>{order.date ? new Date(order.date).toLocaleDateString() : ''}</Text>
                                                    <Text style={{fontWeight:'bold', color:COLORS.primary, fontSize:16}}>{order.totalPrice || order.total_price} {activeLang === 'AU' ? 'AUD' : 'TL'}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </View>
                        ) : (
                            <View>
                                <TouchableOpacity onPress={() => setShopSubTab(null)} style={{flexDirection:'row', alignItems:'center', marginBottom:15}}>
                                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                                    <Text style={{marginLeft:10, fontSize:18, fontWeight:'bold', color:theme.text}}>{t.myFavs}</Text>
                                </TouchableOpacity>
                                {myFavoriteProducts.length === 0 ? <Text style={{textAlign:'center', color:theme.subText}}>{t.noFavs}</Text> : (
                                    <View style={{flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between'}}>
                                            {myFavoriteProducts.map(item => (
                                                <TouchableOpacity key={item.id} style={[styles.favItem, {backgroundColor: theme.cardBg}]} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
                                                    <Image source={{ uri: item.img }} style={{width:'100%', height:120, borderRadius:10, marginBottom:5}} resizeMode="cover" />
                                                    <Text numberOfLines={1} style={{fontWeight:'bold', color:theme.text}}>{item.name}</Text>
                                                    <Text style={{color:COLORS.primary, fontWeight:'bold'}}>{item.price}</Text>
                                                </TouchableOpacity>
                                            ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {isMyProfile && activeTab === 'listings' && (
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}><Text style={{color:'red', fontWeight:'bold'}}>{t.logout}</Text></TouchableOpacity>
                )}
            </ScrollView>

            {/* MODALLAR */}
            {/* SİPARİŞ DETAY MODALI */}
            <Modal visible={orderDetailVisible} animationType="slide" transparent={true} onRequestClose={() => setOrderDetailVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, {backgroundColor: theme.cardBg, height: '70%'}]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, {color: theme.text}]}>{t.orderDetail}</Text>
                            <TouchableOpacity onPress={() => setOrderDetailVisible(false)}><Ionicons name="close" size={24} color={theme.icon}/></TouchableOpacity>
                        </View>
                        {selectedOrder && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={{marginBottom:15, borderBottomWidth:1, borderBottomColor:'#eee', paddingBottom:10}}>
                                    <Text style={{color:theme.text, fontSize:16, fontWeight:'bold'}}>{t.orderNo} {selectedOrder.id.toString().slice(0,8)}</Text>
                                    <Text style={{color:theme.subText, fontSize:14}}>{new Date(selectedOrder.date).toLocaleDateString()}</Text>
                                    <Text style={{color: getStatusColor(selectedOrder.status), fontWeight:'bold', marginTop:5}}>{t.status} {getLocalizedStatus(selectedOrder.status)}</Text>
                                    
                                    <View style={{flexDirection:'row', alignItems:'center', marginTop:5}}>
                                        <Ionicons name="time-outline" size={14} color={theme.subText} style={{marginRight:5}} />
                                        <Text style={{fontSize:12, color:theme.subText}}>
                                            {t.estDelivery} <Text style={{fontWeight:'bold', color:COLORS.primary}}>{getEstimatedDeliveryDate(selectedOrder.date)}</Text>
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.userInfoSection}>
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
                                    <TouchableOpacity style={styles.cargoLinkBox} onPress={() => {}}>
                                        <Text style={styles.cargoLinkText}>{t.cargoLinkText}</Text>
                                    </TouchableOpacity>
                                )}
                                <View style={styles.divider} />
                                <Text style={{color:theme.text, fontWeight:'bold', marginBottom:10}}>{t.items}:</Text>
                                {selectedOrder.items && selectedOrder.items.map((item, index) => (
                                    <View key={index} style={{flexDirection:'row', marginBottom:10, alignItems:'center'}}>
                                            <Image source={{uri: item.img}} style={{width:50, height:50, borderRadius:5, marginRight:10, backgroundColor:'#eee'}} />
                                            <View><Text style={{color:theme.text, fontWeight:'600'}}>{item.name}</Text><Text style={{color:theme.subText}}>{item.price} x {item.quantity}</Text></View>
                                    </View>
                                ))}
                                <View style={{marginTop:20, borderTopWidth:1, borderTopColor:'#eee', paddingTop:10}}>
                                    <Text style={{color:theme.text, fontSize:18, fontWeight:'bold', textAlign:'right'}}>{t.total} {selectedOrder.totalPrice || selectedOrder.total_price}</Text>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* KAYDEDİLENLER MODALI */}
            <Modal animationType="slide" transparent={true} visible={savedModalVisible} onRequestClose={() => setSavedModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBg, height: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.saved}</Text>
                            <TouchableOpacity onPress={() => setSavedModalVisible(false)}><Ionicons name="close" size={24} color={theme.icon} /></TouchableOpacity>
                        </View>
                        {savedPostsList.length === 0 ? (
                            <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
                                <Ionicons name="bookmark-outline" size={50} color={theme.subText} />
                                <Text style={{marginTop:10, color:theme.subText}}>{t.noSavedPosts}</Text>
                            </View>
                        ) : (
                            <FlatList 
                                data={savedPostsList}
                                keyExtractor={item => item.id}
                                numColumns={3}
                                renderItem={({item}) => (
                                    <GridItem 
                                        post={item} 
                                        navigation={navigation} 
                                        onPress={() => {
                                            setSavedModalVisible(false);
                                            navigation.navigate('Petsgram', { initialPostId: item.id });
                                        }}
                                    />
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            <Modal transparent={true} visible={accountMenuVisible} onRequestClose={() => setAccountMenuVisible(false)}>
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setAccountMenuVisible(false)}>
                    <View style={[styles.accountMenu, {backgroundColor: theme.cardBg}]}>
                        <TouchableOpacity style={styles.menuItem} onPress={handleSwitchAccount}>
                            <Ionicons name="people-outline" size={20} color={theme.text} />
                            <Text style={{marginLeft:10, color:theme.text}}>{t.switchAccount}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                        <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:20}}>
                            <Text style={{fontSize:18, fontWeight:'bold', color:theme.text}}>{t.modalAdTitle}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color={theme.icon}/></TouchableOpacity>
                        </View>
                        {[{l:t.adMate, v:'Find Mate', c:'#FF6B6B', i:'heart'}, {l:t.adAdopt, v:'Adopt', c:'#4ECDC4', i:'paw'}, {l:t.adVet, v:'Vet Clinics', c:'#45B7D1', i:'medkit'}, {l:t.adSitter, v:'Pet Sitter', c:'#F7B731', i:'people'}].map((o,i)=>(
                            <TouchableOpacity key={i} style={styles.optionBtn} onPress={() => navigateToAdd(o.v)}>
                                <View style={[styles.iconBox, {backgroundColor:o.c+'20'}]}><Ionicons name={o.i} size={24} color={o.c}/></View>
                                <Text style={[styles.optionText, {color: theme.text}]}>{o.l}</Text>
                                <Ionicons name="chevron-forward" size={20} color={theme.subText} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>

            <Modal animationType="slide" transparent={true} visible={userListModalVisible} onRequestClose={() => setUserListModalVisible(false)}>
                <GestureHandlerRootView style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '60%', backgroundColor: theme.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>{userListType === 'followers' ? t.followersTitle : t.followingTitle}</Text>
                            <TouchableOpacity onPress={() => setUserListModalVisible(false)}><Ionicons name="close" size={24} color={theme.icon} /></TouchableOpacity>
                        </View>
                        {isMyProfile && userListType === 'followers' && <Text style={{textAlign:'center', fontSize:10, color:theme.subText, marginBottom:5}}>{t.swipeUserHint}</Text>}
                        <FlatList 
                            data={userListData}
                            keyExtractor={item => String(item.id)}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            ListEmptyComponent={<Text style={{textAlign:'center', marginTop:20, color: theme.subText}}>{t.nobody}</Text>}
                            renderItem={({ item }) => {
                                const row = (
                                    <TouchableOpacity style={[styles.userListItem, { borderBottomColor: theme.border, backgroundColor: theme.cardBg }]} onPress={() => { setUserListModalVisible(false); navigation.push('UserProfile', { userId: item.id, userName: item.fullname, userAvatar: item.avatar }); }}>
                                        <View style={{flexDirection:'row', alignItems:'center', flex:1}}>
                                            <View style={styles.listAvatar}>{item.avatar ? <Image source={{uri: item.avatar}} style={{width:'100%', height:'100%'}} /> : <Text style={{color:'white', fontWeight:'bold'}}>{item.fullname?.charAt(0) || "?"}</Text>}</View>
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
                    <View style={[styles.modalContent, { height: '60%', backgroundColor: theme.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.notifications}</Text>
                            <TouchableOpacity onPress={() => setNotificationsVisible(false)}><Ionicons name="close" size={24} color={theme.icon} /></TouchableOpacity>
                        </View>
                        {user && user.notifications && user.notifications.length > 0 ? (
                            <FlatList 
                                data={user.notifications}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <Swipeable renderRightActions={() => renderNotificationRightActions(item.id)}>
                                            <TouchableOpacity style={[styles.notificationItem, { borderBottomColor: theme.border, backgroundColor: theme.cardBg }]} onPress={() => handleNotificationClick(item)}>
                                                {!item.read && <View style={styles.unreadDot} />}
                                                <View style={{marginRight:15}}>
                                                    {item.fromUserAvatar ? <Image source={{ uri: item.fromUserAvatar }} style={{width:40, height:40, borderRadius:20}} /> : <View style={{width:40, height:40, borderRadius:20, justifyContent:'center', alignItems:'center', backgroundColor:'#E3F2FD'}}><Ionicons name="notifications" size={20} color="#2196F3" /></View>}
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
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    iconBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', marginLeft: 5 },
    badge: { position: 'absolute', top: 5, right: 5, backgroundColor: 'red', borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    profileSection: { alignItems: 'center', padding: 25, borderRadius: 25, margin: 15, elevation: 4, shadowColor: '#000', shadowOffset:{width:0, height:3}, shadowOpacity:0.15 },
    avatarContainer: { marginBottom: 15, shadowColor: '#000', shadowOffset:{width:0, height:4}, shadowOpacity:0.25, shadowRadius:6, position: 'relative' },
    avatar: { width: 90, height: 90, borderRadius: 45 },
    avatarText: { fontSize: 40, fontWeight: 'bold', color: COLORS.primary },
    userName: { fontSize: 24, fontWeight: 'bold', marginTop: 5 },
    userEmail: { fontSize: 14, marginTop: 2, marginBottom: 10 },
    userBio: { textAlign: 'center', marginHorizontal: 20, marginTop: 10, fontStyle: 'italic', lineHeight: 20 },
    editBtnModern: { flexDirection: 'row', alignItems: 'center', marginTop: 15, paddingVertical: 12, paddingHorizontal: 35, borderRadius: 25, backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset:{width:0, height:4}, shadowOpacity:0.3, shadowRadius:5 },
    editBtnTextModern: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    crownIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,215,0,0.2)', justifyContent: 'center', alignItems: 'center' },
    tabBar: { flexDirection: 'row', marginTop: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    tabItem: { flex: 1, alignItems: 'center', paddingVertical: 15 },
    tabText: { fontSize: 12, marginTop: 4, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { marginBottom: 10 },
    hintText: { textAlign: 'center', fontSize: 10, color: '#999', marginVertical: 10 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    gridItem: { width: width / 3, height: width / 3, padding: 1 },
    gridImage: { width: '100%', height: '100%' },
    gridOverlay: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center', backgroundColor:'rgba(0,0,0,0.5)', padding:3, borderRadius:5 },
    shopOptionCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset:{width:0, height:3}, shadowOpacity:0.15 },
    iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    shopOptionText: { flex: 1, fontSize: 18, fontWeight: '600' },
    orderCard: { padding: 15, borderRadius: 15, marginBottom: 15, borderLeftWidth: 5, borderLeftColor: COLORS.primary, elevation: 2 },
    trackCargoBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 15, flexDirection: 'row', justifyContent: 'center' },
    favItem: { width: '48%', padding: 10, borderRadius: 15, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.15 },
    logoutBtn: { alignSelf: 'center', marginTop: 30, padding: 10 },
    card: { flexDirection: 'row', borderRadius: 20, marginBottom: 15, padding: 15, alignItems: 'center', elevation: 3, marginHorizontal: 20, shadowColor: '#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.15 },
    cardImage: { width: 80, height: 80, borderRadius: 15, backgroundColor: '#EEE' },
    cardInfo: { flex: 1, marginLeft: 15 },
    cardName: { fontSize: 18, fontWeight: 'bold' },
    deleteAction: { backgroundColor: '#FF4D4D', justifyContent: 'center', alignItems: 'center', width: 90, borderTopRightRadius: 20, borderBottomRightRadius: 20, height: 110, marginBottom: 15 },
    foundAction: { backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', width: 110, borderTopLeftRadius: 20, borderBottomLeftRadius: 20, height: 110, marginBottom: 15 },
    actionText: { color: 'white', fontWeight: 'bold', fontSize: 12, marginTop: 5 },
    foundOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: 20 },
    foundText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 18, borderWidth: 3, borderColor: '#4CAF50', padding: 8, borderRadius: 8, transform: [{ rotate: '-15deg' }] },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 5 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25 },
    optionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#eee' },
    iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    optionText: { flex: 1, fontSize: 16, fontWeight: '600' },
    accountMenu: { position: 'absolute', top: 60, right: 20, width: 200, borderRadius: 15, padding: 15, elevation: 10 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    userListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, paddingHorizontal: 20 },
    listAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden' },
    listName: { fontSize: 16, fontWeight: '600' },
    notificationItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, alignItems: 'center', position: 'relative' },
    unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'red', position: 'absolute', top: 15, left: 5, zIndex: 10 }, 
    userInfoSection: { backgroundColor: '#F9FAFB', padding: 15, borderRadius: 10, marginBottom: 15 },
    sectionHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    infoText: { fontSize: 14, marginBottom: 5 },
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 15 },
    cargoLinkBox: { backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, marginBottom: 15, alignItems: 'center' },
    cargoLinkText: { color: '#2196F3', fontWeight: 'bold', textDecorationLine: 'underline' },
    warningTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
    loginBtn: { backgroundColor: COLORS.primary, paddingVertical: 15, paddingHorizontal: 50, borderRadius: 30, marginTop: 20 },
    loginBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' }
});

export default ProfileScreen;