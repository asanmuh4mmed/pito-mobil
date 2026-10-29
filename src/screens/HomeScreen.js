import React, { useContext, useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, 
    Image, ScrollView, Modal, Alert, Linking, RefreshControl, Dimensions, Animated, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import * as Notifications from 'expo-notifications'; 
import { COLORS } from '../constants/colors';
import * as ImagePicker from 'expo-image-picker';
import { ListingContext } from '../context/ListingContext';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { supabase } from '../lib/supabase';
import { ThemeContext } from '../context/ThemeContext';
import { ShopContext } from '../context/ShopContext';
import { SocialContext } from '../context/SocialContext';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { playSound } from '../utils/SoundManager'; 

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
    grayText: '#A0AAB5'
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const TRANSLATIONS = {
    TR: {
        searchPlaceholder: "Kullanıcı, ilan veya tür ara...",
        userNotFound: "Sonuç bulunamadı.",
        searchResults: "Arama Sonuçları",
        seeAll: "Tümünü Gör",
        noListing: "Henüz ilan yok.",
        login: "Giriş Yap",
        register: "Kayıt Ol",
        freeAdBtn: "Ücretsiz İlan Ver",
        vetBotBtn: "Veteriner Bot",
        vetMapBtn: "Yakındaki Vet", 
        petIdBtn: "Yapay zeka ile ırk tahmini", 
        qrCollarBtn: "Mağaza",  
        home: "Ana Sayfa",
        messages: "Mesajlar",
        profile: "Profil",
        menuTitle: "Menü",
        appSection: "Uygulama",
        settings: "Ayarlar",
        language: "Dil / Language",
        contactUs: "Bize Ulaşın",
        aboutUs: "Hakkımızda",
        logout: "Çıkış Yap",
        logoutAlertTitle: "Çıkış Yapıldı",
        logoutAlertMsg: "Görüşmek üzere! 👋",
        aboutText1: "Pito; evcil hayvan sahiplerini, hayvanseverleri ve veterinerleri bir araya getiren kapsamlı bir sosyal platformdur.",
        aboutText2: "Amacımız, can dostlarımız için sıcak bir yuva bulmayı kolaylaştırmak.",
        developer: "Geliştirici",
        devDesc: "Bu proje, OXPİ Yazılım Teknolojileri tarafından geliştirilmiştir.",
        feedbackBtn: "Görüş ve Önerileriniz İçin Bize Ulaşın",
        contactAddress: "İletişim Adresimiz:",
        contactHint: "(Mail göndermek için adrese tıklayınız)",
        notifications: "Bildirimler",
        noNotif: "Henüz bildirim yok.",
        selectLang: "Dil Seçiniz",
        langChanged: "Dil Değiştirildi",
        catMate: "Partner Arayan Canlarımız",
        catAdopt: "Yuva Arayan Canlarımız",
        catVet: "Veteriner Klinikleri",
        catSitter: "Bakıcı Bul",
        catGrooming: "Pet Kuaför", 
        foundMate: "EŞ BULUNDU",
        foundHome: "YUVA BULUNDU",
        shop: "Popüler Ürünler",
        social: "Petsgram Akışı",
        noData: "Henüz içerik yok.",
        copyright: "© 2026 Pito. Tüm Hakları Saklıdır.",
        loginRequiredTitle: "Giriş Gerekli",
        loginRequiredMsg: "Bu özelliği kullanmak için lütfen giriş yapın veya kayıt olun.",
        cancel: "Vazgeç",
        menuShop: "Mağaza",
        add: "Ekle"
    },
    EN: {
        searchPlaceholder: "Search users, breeds...",
        userNotFound: "No results found.",
        searchResults: "Search Results",
        seeAll: "See All",
        noListing: "No listings yet.",
        login: "Login",
        register: "Sign Up",
        freeAdBtn: "Post Free Ad",
        vetBotBtn: "Vet Bot",
        vetMapBtn: "Nearby Vet", 
        petIdBtn: "AI breed prediction", 
        qrCollarBtn: "Shop", 
        home: "Home",
        messages: "Messages",
        profile: "Profile",
        menuTitle: "Menu",
        appSection: "Application",
        settings: "Settings",
        language: "Language / Dil",
        contactUs: "Contact Us",
        aboutUs: "About Us",
        logout: "Logout",
        logoutAlertTitle: "Logged Out",
        logoutAlertMsg: "See you soon! 👋",
        aboutText1: "Pito is a comprehensive social platform.",
        aboutText2: "Our goal is to make it easier to find warm homes.",
        developer: "Developer",
        devDesc: "Developed by OXPİ Software Technologies.",
        feedbackBtn: "Contact Us",
        contactAddress: "Our Contact Address:",
        contactHint: "(Click address to send email)",
        notifications: "Notifications",
        noNotif: "No notifications yet.",
        selectLang: "Select Language",
        langChanged: "Language Changed",
        catMate: "Looking for Partner",
        catAdopt: "Looking for Home",
        catVet: "Veterinary Clinics",
        catSitter: "Find Pet Sitter", 
        catGrooming: "Pet Groomer", 
        foundMate: "MATE FOUND",
        foundHome: "HOME FOUND",
        shop: "Popular Products",
        social: "Petsgram Feed",
        noData: "No content yet.",
        copyright: "© 2026 Pito. All Rights Reserved.",
        loginRequiredTitle: "Login Required",
        loginRequiredMsg: "Please login or register to use this feature.",
        cancel: "Cancel",
        menuShop: "Shop",
        add: "Add"
    }
};

const ListingCardItem = memo(({ item, theme, navigation, t, cardWidth, isDarkMode }) => (
    <TouchableOpacity
        style={[styles.card, { width: cardWidth, backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: theme.border, opacity: item.is_found ? 0.8 : 1 }]}
        onPress={() => navigation.navigate('ListingDetail', { item })}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`${item.name || ''}, ${item.city || ''}`}
    >
        {item.img ? <Image source={{ uri: item.img }} style={styles.cardImage} resizeMode="cover" /> : (
            <View style={[styles.cardImage, styles.imagePlaceholder]}><Ionicons name="paw-outline" size={40} color={PITO_COLORS.primary} /></View>
        )}
        {item.is_found && <View style={styles.homeFoundBadge}><Text style={styles.homeFoundText}>{item.category?.includes('Eş') || item.category?.includes('Mate') ? t.foundMate : t.foundHome}</Text></View>}
        <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
            <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={PITO_COLORS.primary} />
                <Text style={[styles.cardType, { color: theme.subText }]} numberOfLines={1}>{item.city || (t.home === 'Home' ? 'Location not specified' : 'Konum belirtilmedi')}</Text>
            </View>
            <View style={styles.petTags}>
                {item.age !== null && item.age !== undefined && String(item.age).trim() !== '' && <View style={styles.petTag}><Text style={[styles.petTagText, { color: theme.text }]}>{t.home === 'Home' ? 'Age: ' : 'Yaş: '}{String(item.age)}</Text></View>}
                {!!item.gender && <View style={styles.petTag}><Text style={[styles.petTagText, { color: theme.text }]}>{item.gender}</Text></View>}
            </View>
        </View>
    </TouchableOpacity>
));

const HomeScreen = ({ navigation }) => {
  const { urgentList, mateList, fetchListings } = useContext(ListingContext);
  const { user, logout, markNotificationsAsRead, allUsers, deleteNotification, language: globalLang, setLanguage: setGlobalLang } = useContext(AuthContext); 
  const { getUnreadCount, conversations } = useContext(ChatContext);
  const { theme, isDarkMode } = useContext(ThemeContext);
  const { fetchProducts } = useContext(ShopContext); 
  
  const [localLang, setLocalLang] = useState('TR');
  const language = globalLang || localLang;

  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [petFilter, setPetFilter] = useState('all');

  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false); 
  const [langModalVisible, setLangModalVisible] = useState(false); 

  const t = TRANSLATIONS[language] || TRANSLATIONS['TR']; 

  const menuPalette = isDarkMode
      ? { bg: '#0B131E', card: '#1A2533', text: '#F7F4EE', muted: '#A0AAB5', line: '#293647' }
      : { bg: '#F8F5EF', card: '#FFFFFF', text: '#142239', muted: '#727989', line: '#EAE4D8' };
  const menuCopy = (tr, en) => language === 'TR' ? tr : en;
  const menuRow = (icon, title, subtitle, action, danger = false) => (
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.75} onPress={action}
          style={[styles.drawerRow, { backgroundColor: menuPalette.card, borderColor: menuPalette.line }]}>
          <View style={[styles.drawerIcon, danger && { backgroundColor: 'rgba(212,81,81,0.1)' }]}>
              <Ionicons name={icon} size={22} color={danger ? '#D45151' : PITO_COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
              <Text style={[styles.drawerLabel, { color: danger ? '#D45151' : menuPalette.text }]}>{title}</Text>
              {!!subtitle && <Text style={[styles.drawerHint, { color: menuPalette.muted }]}>{subtitle}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={17} color={menuPalette.muted} />
      </TouchableOpacity>
  );

  const fabScaleAnim = useRef(new Animated.Value(1)).current;
  const carouselRef = useRef(null);

  const updateLanguage = (lang) => {
      if (setGlobalLang) setGlobalLang(lang);
      setLocalLang(lang);
      setLangModalVisible(false);
  };

  useEffect(() => {
      loadAllData();
      (async () => { await Notifications.requestPermissionsAsync(); })();
  }, []);

  useEffect(() => {
      const subscription = Notifications.addNotificationReceivedListener(notification => { playSound('game_start'); });
      return () => subscription.remove();
  }, []);

  const loadAllData = async () => {
      if(fetchListings) await fetchListings();
      setTimeout(async () => {
          if(fetchProducts) await fetchProducts(); 
      }, 500);
  };

  const onRefresh = useCallback(async () => {
      setRefreshing(true);
      await loadAllData();
      setRefreshing(false);
  }, []);

  useEffect(() => {
    if (user) {
        setUnreadMsgCount(getUnreadCount(user.id));
        const notifs = user.notifications || [];
        setUnreadNotifCount(notifs.filter(n => !n.read).length);
    } else {
        setUnreadMsgCount(0);
        setUnreadNotifCount(0);
    }
  }, [user, conversations]);

  const checkAuth = (action) => {
      if (user) action();
      else {
          Alert.alert(t.loginRequiredTitle, t.loginRequiredMsg, [
              { text: t.cancel, style: 'cancel' },
              { text: t.login, onPress: () => navigation.navigate('Login') }
          ]);
      }
  };

  const sortByDate = (list) => {
      if (!list) return [];
      return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const sortedUrgent = useMemo(() => sortByDate(urgentList), [urgentList]);
  const sortedMate = useMemo(() => sortByDate(mateList), [mateList]);

  // TÜM İLANLARI EN YENİDEN ESKİYE SIRALAMA
  const allSortedListings = useMemo(() => {
      const combined = [...(urgentList || []), ...(mateList || [])];
      return combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [urgentList, mateList]);

  // CAROUSEL İÇİN GÖRSELİ OLAN İLANLARI FİLTRELEME
  const carouselData = useMemo(() => {
      return allSortedListings.filter(item => item.img).slice(0, 10);
  }, [allSortedListings]);

  // CAROUSEL OTOMATİK KAYDIRMA EFEKTİ (1 Saniyede Bir Ardışık)
  useEffect(() => {
      if (carouselData.length === 0) return;
      
      const interval = setInterval(() => {
          setCurrentSlide((prev) => {
              const nextSlide = (prev + 1) % carouselData.length;
              if (carouselRef.current) {
                  carouselRef.current.scrollToIndex({
                      index: nextSlide,
                      animated: true,
                  });
              }
              return nextSlide;
          });
      }, 3000); 

      return () => clearInterval(interval);
  }, [carouselData]);

  const handleNotificationPress = () => {
      checkAuth(() => {
          setNotificationsVisible(true);
          markNotificationsAsRead(); 
      });
  };

  const handleNotificationItemClick = (notification) => {
      setNotificationsVisible(false);
      if (notification.type === 'follow' && notification.fromUserId) {
          navigation.push('UserProfile', { userId: notification.fromUserId, userName: notification.fromUser, userAvatar: notification.fromUserAvatar });
      } else if (notification.type === 'order_success' || notification.type === 'order_update') {
          navigation.navigate('Profile'); 
      } else if (notification.type === 'like' || notification.type === 'comment') {
          const targetId = notification.postId || notification.post_id || notification.targetId || notification.target_id || notification.referenceId;
          navigation.navigate('Petsgram', { 
              initialPostId: targetId,
              targetPostId: targetId,
              postId: targetId 
          }); 
      }
  };

  const renderRightActions = (id) => (
      <TouchableOpacity style={styles.deleteAction} onPress={() => { deleteNotification(id); }}>
          <Ionicons name="trash-outline" size={24} color="white" />
          <Text style={{color:'white', fontSize:10, fontWeight:'bold'}}>{language === 'TR' ? 'Sil' : 'Del'}</Text>
      </TouchableOpacity>
  );

  const sendEmail = () => Linking.openURL('mailto:petspito@gmail.com');

  const handleLogout = () => {
    setMenuVisible(false);
    logout();
    Alert.alert(t.logoutAlertTitle, t.logoutAlertMsg);
  };

  const goToSettings = () => {
      setMenuVisible(false);
      navigation.navigate('Settings');
  };

  const navigateToAdd = (categoryName) => {
      setModalVisible(false); 
      let backendCategoryName = categoryName;
      if (categoryName === 'Eş Bulma İlanı' || categoryName === 'Find Mate') backendCategoryName = language === 'TR' ? 'Eş Arayanlar' : 'Find Mate';
      else if (categoryName === 'Yuva Bulma' || categoryName === 'Adopt') backendCategoryName = language === 'TR' ? 'Sahiplendirme' : 'Adopt';
      else if (categoryName === 'Veteriner Kliniği' || categoryName === 'Vet Clinics') backendCategoryName = language === 'TR' ? 'Veteriner Klinikleri' : 'Vet Clinics';
      else if (categoryName === 'Bakıcı İlanı' || categoryName === 'Pet Sitter') backendCategoryName = language === 'TR' ? 'Bakıcı' : 'Pet Sitter';
      else if (categoryName === 'Pet Kuaför İlanı' || categoryName === 'Pet Groomer') backendCategoryName = language === 'TR' ? 'Pet Kuaför' : 'Pet Groomer';

      navigation.navigate('AddListing', { category: backendCategoryName });
  };

  const renderHorizontalSection = (title, dataList) => {
      const displayData = dataList.slice(0, 10);
      const cardWidth = Math.min(220, (width - 52) / 2);
      return (
          <View style={styles.section}>
              <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
                  <TouchableOpacity style={styles.seeAllBox} onPress={() => navigation.navigate('AllListings', { title, data: dataList })} accessibilityRole="button">
                      <Text style={styles.seeAllText}>{t.seeAll}</Text>
                      <Ionicons name="chevron-forward" size={14} color={PITO_COLORS.primary} />
                  </TouchableOpacity>
              </View>
              {displayData.length === 0 ? (
                  <View style={[styles.emptyState, { borderColor: theme.border }]}>
                      <Ionicons name="paw-outline" size={28} color={PITO_COLORS.primary} />
                      <Text style={{ color: theme.subText, marginTop: 10 }}>{t.noListing}</Text>
                  </View>
              ) : (
                  <FlatList horizontal showsHorizontalScrollIndicator={false}
                      data={displayData} keyExtractor={item => item.id.toString()}
                      snapToInterval={cardWidth + 12} decelerationRate="fast"
                      initialNumToRender={3} maxToRenderPerBatch={3} windowSize={3}
                      ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                      renderItem={({ item }) => <ListingCardItem item={item} theme={theme} isDarkMode={isDarkMode} navigation={navigation} t={t} cardWidth={cardWidth} />}
                      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 6 }}
                  />
              )}
          </View>
      );
  };

  // Filters operate only on the already loaded data; no database calls.
  const filterListings = (items) => items.filter(item => {
      if (petFilter === 'all') return true;
      const type = String(item.pet_type || '').toLocaleLowerCase('tr-TR');
      if (petFilter === 'cat') return ['kedi', 'cat'].includes(type);
      if (petFilter === 'dog') return ['köpek', 'dog'].includes(type);
      return !['kedi', 'cat', 'köpek', 'dog'].includes(type);
  });

  const topActionPills = [
      { label: t.petIdBtn, icon: 'sparkles', route: 'PetIdentifier' },
      { label: t.vetBotBtn, icon: 'pulse', route: 'VetBot' },
      { label: t.vetMapBtn, icon: 'location', route: 'VetMapScreen' },
      { label: t.qrCollarBtn, icon: 'cart', route: 'Shop' }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.background }]}>
      <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.brandButton} onPress={() => setMenuVisible(true)} accessibilityLabel={t.menuTitle} accessibilityRole="button">
              <Text style={[styles.brandName, { color: theme.text }]}>Pito</Text>
              <Ionicons name="paw" size={27} color={PITO_COLORS.primary} />
              <Ionicons name="menu-outline" size={19} color={theme.subText} style={{ marginLeft: 5 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNotificationPress} style={styles.notificationButton} accessibilityLabel={t.notifications} accessibilityRole="button">
              <Ionicons name="notifications-outline" size={25} color={PITO_COLORS.primary} />
              {user && unreadNotifCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</Text></View>}
          </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PITO_COLORS.primary} />}>
          <View style={styles.welcomeBlock}>
              <Text style={[styles.greeting, { color: theme.subText }]}>{language === 'TR' ? 'Merhaba' : 'Hello'}{user ? `, ${(user.fullname || user.username || '').split(' ')[0]}` : ''}</Text>
              <Text style={[styles.welcomeTitle, { color: theme.text }]}>{language === 'TR' ? 'Yeni dostun ' : 'Your new friend '}<Text style={{ color: PITO_COLORS.primary }}>{language === 'TR' ? 'seni bekliyor.' : 'is waiting.'}</Text></Text>
              {!user && <View style={styles.guestActions}>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')} style={[styles.authBtn, { backgroundColor: PITO_COLORS.primary }]}><Text style={[styles.authBtnText, { color: PITO_COLORS.navyBg }]}>{t.login}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.authBtn}><Text style={[styles.authBtnText, { color: PITO_COLORS.primary }]}>{t.register}</Text></TouchableOpacity>
              </View>}
          </View>
          <View style={[styles.topBanner, { backgroundColor: PITO_COLORS.navySurface }]}>
              <View style={StyleSheet.absoluteFill}>
                  {carouselData.length > 0 ? (
                      <FlatList ref={carouselRef} data={carouselData} horizontal pagingEnabled scrollEnabled={false} showsHorizontalScrollIndicator={false}
                          keyExtractor={item => item.id.toString()}
                          renderItem={({ item }) => <Image source={{ uri: item.img }} style={{ width: width - 40, height: '100%' }} resizeMode="cover" />}
                          getItemLayout={(_, index) => ({ length: width - 40, offset: (width - 40) * index, index })}
                      />
                  ) : <View style={[StyleSheet.absoluteFill, styles.bannerPlaceholder]}><Ionicons name="paw" size={120} color={PITO_COLORS.primary} /></View>}
              </View>
              <View style={styles.bannerOverlay} />
              <View style={styles.bannerTextContent}>
                  <Text style={styles.bannerTitle}>{language === 'TR' ? 'Bir yuva,' : 'One home,'}<Text style={{ color: '#E8C77D' }}>{language === 'TR' ? '\nyeni bir hayat.' : '\na new life.'}</Text></Text>
                  <Text style={styles.bannerSubtitle}>{language === 'TR' ? 'Birlikte güzel bir hikâye başlatın.' : 'Start a beautiful story together.'}</Text>
                  <TouchableOpacity style={styles.bannerButton} onPress={() => navigation.navigate('AllListings', { title: language === 'TR' ? 'Tüm İlanlar' : 'All Listings', data: allSortedListings })}>
                      <Text style={styles.bannerButtonText}>{language === 'TR' ? 'Dostunu bul' : 'Find your friend'}</Text><Ionicons name="arrow-forward" size={17} color={PITO_COLORS.navyBg} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
              </View>
              {carouselData.length > 1 && <View style={styles.carouselDots}>{carouselData.map((item, index) => <View key={item.id} style={[styles.carouselDot, index === currentSlide && styles.carouselDotActive]} />)}</View>}
          </View>
          <View style={styles.filterRow}>
              {[
                  { value: 'all', icon: 'paw', tr: 'Tümü', en: 'All' },
                  { value: 'cat', icon: 'paw-outline', tr: 'Kediler', en: 'Cats' },
                  { value: 'dog', icon: 'paw-outline', tr: 'Köpekler', en: 'Dogs' },
                  { value: 'other', icon: 'grid-outline', tr: 'Diğer', en: 'Other' }
              ].map(option => <TouchableOpacity key={option.value} onPress={() => setPetFilter(option.value)} accessibilityRole="button" accessibilityState={{ selected: petFilter === option.value }} style={[styles.filterChip, { backgroundColor: petFilter === option.value ? PITO_COLORS.primary : (isDarkMode ? PITO_COLORS.navySurface : theme.cardBg), borderColor: petFilter === option.value ? PITO_COLORS.primary : theme.border }]}>
                  <Ionicons name={option.icon} size={16} color={petFilter === option.value ? PITO_COLORS.navyBg : PITO_COLORS.primary} />
                  <Text style={[styles.filterText, { color: petFilter === option.value ? PITO_COLORS.navyBg : theme.text }]}>{language === 'TR' ? option.tr : option.en}</Text>
              </TouchableOpacity>)}
          </View>
          {renderHorizontalSection(t.catAdopt, filterListings(sortedUrgent))}
          <View style={styles.gridActionContainer}>
              {topActionPills.map(pill => <TouchableOpacity key={pill.route} style={[styles.gridPill, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: theme.border }]} onPress={() => pill.route === 'Shop' ? navigation.navigate(pill.route) : checkAuth(() => navigation.navigate(pill.route))}>
                  <View style={styles.shortcutIcon}><Ionicons name={pill.icon} size={25} color={PITO_COLORS.primary} /></View>
                  <Text style={[styles.shortcutLabel, { color: theme.text }]}>{pill.label}</Text>
                  <Ionicons name="chevron-forward" size={14} color={PITO_COLORS.primary} />
              </TouchableOpacity>)}
          </View>
          <View style={{ paddingHorizontal: 20, marginBottom: 26 }}>
              <TouchableOpacity style={[styles.middleAddCard, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]} onPress={() => checkAuth(() => setModalVisible(true))}>
                  <View style={{ flex: 1, paddingRight: 12 }}><Text style={[styles.middleAddTitle, { color: theme.text }]}>{t.freeAdBtn}</Text><Text style={[styles.middleAddSub, { color: theme.subText }]}>{language === 'TR' ? 'Patili dostun için yeni bir başlangıç.' : 'A fresh start for your furry friend.'}</Text></View>
                  <View style={styles.middleAddIconBox}><Ionicons name="arrow-forward" size={23} color={PITO_COLORS.navyBg} /></View>
              </TouchableOpacity>
          </View>
          {renderHorizontalSection(t.catMate, filterListings(sortedMate))}
          <Text style={[styles.copyrightText, { color: theme.subText }]}>{t.copyright}</Text>
      </ScrollView>
      <View style={[styles.bottomBar, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.cardBg, borderColor: theme.border }]}>
          <TouchableOpacity style={styles.tabItem} accessibilityRole="button" accessibilityState={{ selected: true }}><Ionicons name="home" size={25} color={PITO_COLORS.primary} /><Text style={[styles.tabText, { color: PITO_COLORS.primary }]}>{t.home}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => checkAuth(() => setModalVisible(true))} accessibilityRole="button">
              <View style={styles.addTabCircle}><Ionicons name="add" size={29} color={PITO_COLORS.navyBg} /></View><Text style={[styles.tabText, { color: theme.text }]}>{language === 'TR' ? 'İlan Ver' : 'Post Ad'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => checkAuth(() => navigation.navigate('ChatList'))} accessibilityRole="button">
              <View><Ionicons name="chatbubbles-outline" size={25} color={theme.subText} />{unreadMsgCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadMsgCount > 99 ? '99+' : unreadMsgCount}</Text></View>}</View><Text style={[styles.tabText, { color: theme.subText }]}>{t.messages}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem} onPress={() => checkAuth(() => navigation.navigate('Profile'))} accessibilityRole="button">
              {user?.avatar ? <Image source={{ uri: user.avatar }} style={styles.bottomBarAvatar} /> : <Ionicons name="person-outline" size={25} color={theme.subText} />}<Text numberOfLines={1} style={[styles.tabText, { color: theme.subText }]}>{t.profile}</Text>
          </TouchableOpacity>
      </View>

      <Modal animationType="fade" transparent visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.menuOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} accessibilityLabel={menuCopy('Menüyü kapat', 'Close menu')} onPress={() => setMenuVisible(false)} />
          <SafeAreaView style={[styles.drawerPanel, { backgroundColor: menuPalette.bg }]}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrand}><Text style={[styles.drawerBrandText, { color: menuPalette.text }]}>Pito</Text><Ionicons name="paw" size={25} color={PITO_COLORS.primary} /></View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t.cancel} style={[styles.drawerClose, { backgroundColor: menuPalette.card }]} onPress={() => setMenuVisible(false)}><Ionicons name="close" size={23} color={menuPalette.text} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 30 }}>
              <View style={[styles.drawerIdentity, { borderColor: menuPalette.line, backgroundColor: menuPalette.card }]}>
                {user?.avatar ? <Image source={{ uri: user.avatar }} style={styles.drawerAvatar} /> : <View style={[styles.drawerAvatar, styles.drawerAvatarFallback]}><Ionicons name="person-outline" size={25} color={PITO_COLORS.primary} /></View>}
                <View style={{ flex: 1 }}><Text style={[styles.drawerLabel, { color: menuPalette.text }]} numberOfLines={2}>{user ? (user.fullname || user.username || t.profile) : menuCopy('Pito’ya hoş geldin', 'Welcome to Pito')}</Text><Text style={[styles.drawerHint, { color: menuPalette.muted }]}>{user?.username ? `@${user.username}` : menuCopy('Can dostlarımız için bir aradayız.', 'Together for our animal friends.')}</Text></View>
              </View>
              <Text style={[styles.drawerSection, { color: menuPalette.muted }]}>{menuCopy('KEŞFET', 'EXPLORE')}</Text>
              {menuRow('storefront-outline', t.menuShop, menuCopy('Dostun için bir şeyler keşfet', 'Explore something for your pet'), () => { setMenuVisible(false); navigation.navigate('Shop'); })}
              {menuRow('person-outline', t.profile, menuCopy('Profilin ve paylaşımların', 'Your profile and posts'), () => { setMenuVisible(false); checkAuth(() => navigation.navigate('Profile')); })}
              <Text style={[styles.drawerSection, { color: menuPalette.muted }]}>{menuCopy('TERCİHLER', 'PREFERENCES')}</Text>
              {menuRow('settings-outline', t.settings, menuCopy('Hesap ve uygulama ayarları', 'Account and app settings'), goToSettings)}
              {menuRow('globe-outline', t.language, language === 'TR' ? 'Türkçe' : 'English', () => { setMenuVisible(false); setLangModalVisible(true); })}
              <Text style={[styles.drawerSection, { color: menuPalette.muted }]}>{menuCopy('PİTO HAKKINDA', 'ABOUT PITO')}</Text>
              {menuRow('heart-outline', t.aboutUs, menuCopy('Hikâyemiz ve bize ilham verenler', 'Our story and inspiration'), () => { setMenuVisible(false); setTimeout(() => navigation.navigate('AboutPito'), 300); })}
              {menuRow('chatbubble-ellipses-outline', t.contactUs, menuCopy('Bir fikrin ya da sorun mu var?', 'Have an idea or need help?'), () => { setMenuVisible(false); setContactVisible(true); })}
              {user && <View style={{ marginTop: 18 }}>{menuRow('log-out-outline', t.logout, '', handleLogout, true)}</View>}
              <View style={styles.drawerFooter}><Ionicons name="paw-outline" size={17} color={PITO_COLORS.primary} /><Text style={[styles.drawerHint, { color: menuPalette.muted }]}>{menuCopy('Küçük patiler, büyük bağlar.', 'Little paws, lasting bonds.')}</Text></View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal animationType="slide" transparent visible={contactVisible} onRequestClose={() => setContactVisible(false)}>
        <View style={[styles.menuOverlay, { justifyContent: 'flex-end' }]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} accessibilityLabel={t.cancel} onPress={() => setContactVisible(false)} />
          <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.contactSheet, { backgroundColor: menuPalette.bg }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.drawerHeader}><Text style={[styles.contactTitle, { color: menuPalette.text }]}>{t.contactUs}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={t.cancel} style={[styles.drawerClose, { backgroundColor: menuPalette.card }]} onPress={() => setContactVisible(false)}><Ionicons name="close" size={23} color={menuPalette.text} /></TouchableOpacity></View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              <View style={styles.contactEmblem}><Ionicons name="chatbubbles-outline" size={34} color={PITO_COLORS.primary} /></View>
              <Text style={[styles.contactHeadline, { color: menuPalette.text }]}>{menuCopy('Seni dinliyoruz.', 'We’re listening.')}</Text>
              <Text style={[styles.contactBody, { color: menuPalette.muted }]}>{menuCopy('Bir sorunu birlikte çözelim ya da Pito’yu daha iyi yapacak fikrini konuşalım. Görüşlerin bizim için değerli.', 'Let’s solve a problem or explore your idea for a better Pito. Your feedback matters to us.')}</Text>
              <View style={[styles.contactNote, { backgroundColor: menuPalette.card, borderColor: menuPalette.line }]}>
                <Text style={[styles.drawerLabel, { color: menuPalette.text }]}>{menuCopy('Nasıl yardımcı olabiliriz?', 'How can we help?')}</Text>
                <Text style={[styles.contactBody, { color: menuPalette.muted }]}>{menuCopy('Teknik destek · Görüş ve öneriler · İş birliği', 'Technical support · Feedback · Collaboration')}</Text>
                <Text style={[styles.drawerHint, { color: menuPalette.muted }]}>{menuCopy('Bir hata bildirirken telefon modelini, sorunun yaşandığı ekranı ve izlediğin adımları yazabilirsin. Şifreni veya doğrulama kodlarını paylaşma.', 'For a bug report, include your phone model, the affected screen and the steps you took. Do not share passwords or verification codes.')}</Text>
              </View>
              <Text selectable style={[styles.contactEmail, { color: menuPalette.text }]}>petspito@gmail.com</Text>
              <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} onPress={sendEmail} style={styles.contactButton}><Ionicons name="mail-outline" size={22} color="#142239" /><Text style={styles.contactButtonText}>{menuCopy('E-posta gönder', 'Send an email')}</Text><Ionicons name="arrow-forward" size={20} color="#142239" /></TouchableOpacity>
              <Text style={[styles.contactFootnote, { color: menuPalette.muted }]}>{menuCopy('Telefonundaki e-posta uygulaması açılır.', 'Opens the email app on your phone.')}</Text>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={langModalVisible} onRequestClose={() => setLangModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '30%', backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.cardBg }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>{t.selectLang}</Text>
                    <TouchableOpacity onPress={() => setLangModalVisible(false)}><Ionicons name="close" size={24} color={theme.icon} /></TouchableOpacity>
                </View>
                <ScrollView>
                    <TouchableOpacity style={styles.countryItem} onPress={() => updateLanguage('TR')}>
                        <Text style={{fontSize:30, marginRight:15}}>🇹🇷</Text>
                        <Text style={[styles.countryText, {color: theme.text}]}>Türkçe</Text>
                        {language === 'TR' && <Ionicons name="checkmark" size={24} color={PITO_COLORS.primary} style={{marginLeft:'auto'}} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.countryItem} onPress={() => updateLanguage('EN')}>
                        <Text style={{fontSize:30, marginRight:15}}>🇬🇧</Text>
                        <Text style={[styles.countryText, {color: theme.text}]}>English</Text>
                        {language === 'EN' && <Ionicons name="checkmark" size={24} color={PITO_COLORS.primary} style={{marginLeft:'auto'}} />}
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={notificationsVisible} onRequestClose={() => setNotificationsVisible(false)}>
        <GestureHandlerRootView style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '70%', backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.background }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>{t.notifications}</Text>
                    <TouchableOpacity onPress={() => setNotificationsVisible(false)} style={styles.closeMenuBtn}><Ionicons name="close" size={24} color={theme.icon} /></TouchableOpacity>
                </View>
                {user && user.notifications && user.notifications.length > 0 ? (
                    <FlatList 
                        data={user.notifications}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => {
                            let iconName = 'notifications'; let iconColor = PITO_COLORS.primary; let bgColor = PITO_COLORS.navySurface;
                            if (item.type === 'follow') { iconName = 'person-add'; }
                            else if (item.type === 'like') { iconName = 'heart'; }
                            else if (item.type === 'comment') { iconName = 'chatbubble-ellipses'; }

                            return (
                                <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                                    <TouchableOpacity style={[styles.notificationItem, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]} onPress={() => handleNotificationItemClick(item)}>
                                        <View style={styles.notifIconContainer}>
                                            {item.fromUserAvatar ? (
                                                <Image source={{ uri: item.fromUserAvatar }} style={styles.notifAvatar} />
                                            ) : (
                                                <View style={[styles.notifIconPlaceholder, { backgroundColor: bgColor }]}><Ionicons name={iconName} size={22} color={iconColor} /></View>
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.notifText, { color: theme.text }]}>{item.message}</Text>
                                            <Text style={{ fontSize: 11, color: theme.subText, marginTop: 4 }}>
                                                {new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString().slice(0,5)}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color={PITO_COLORS.primary} style={{marginLeft: 10}} />
                                    </TouchableOpacity>
                                </Swipeable>
                            );
                        }}
                    />
                ) : (
                    <View style={{ alignItems: 'center', marginTop: 80 }}>
                        <Ionicons name="notifications-off-outline" size={60} color={theme.subText} style={{opacity: 0.5}} />
                        <Text style={{ marginTop: 15, color: theme.subText, fontSize: 16 }}>{t.noNotif}</Text>
                    </View>
                )}
            </View>
        </GestureHandlerRootView>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.cardBg }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>{language === 'TR' ? 'Ne İlanı Ekleyeceksin?' : 'What will you post?'}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color={theme.icon} /></TouchableOpacity>
                </View>
                {(() => {
                    let addOptions = [
                        { label: language === 'TR' ? 'Eş Bulma İlanı' : 'Find Mate', val: 'Find Mate', icon: 'heart' },
                        { label: language === 'TR' ? 'Yuva Bulma' : 'Adopt', val: 'Adopt', icon: 'paw' }
                    ];
                    if (user?.account_type === 'vet') addOptions.push({ label: language === 'TR' ? 'Veteriner Kliniği' : 'Vet Clinics', val: 'Vet Clinics', icon: 'medkit' });
                    else if (user?.account_type === 'sitter') addOptions.push({ label: language === 'TR' ? 'Bakıcı İlanı' : 'Pet Sitter', val: 'Pet Sitter', icon: 'people' });
                    else if (user?.account_type === 'groomer') addOptions.push({ label: language === 'TR' ? 'Pet Kuaför İlanı' : 'Pet Groomer', val: 'Pet Groomer', icon: 'cut' });

                    return addOptions.map((opt, index) => (
                        <TouchableOpacity key={index} style={[styles.optionBtn, { borderBottomColor: theme.border }]} onPress={() => navigateToAdd(opt.val)}>
                            <View style={[styles.iconBox, { backgroundColor: PITO_COLORS.navySurface }]}>
                                <Ionicons name={opt.icon} size={24} color={PITO_COLORS.primary} />
                            </View>
                            <Text style={[styles.optionText, { color: theme.text }]}>{opt.label}</Text>
                            <Ionicons name="chevron-forward" size={20} color={PITO_COLORS.primary} />
                        </TouchableOpacity>
                    ));
                })()}
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  drawerPanel: { width: '88%', maxWidth: 390, height: '100%', borderTopRightRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, gap: 12 },
  drawerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  drawerBrandText: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  drawerClose: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  drawerIdentity: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12, borderRadius: 22, borderWidth: 1 },
  drawerAvatar: { width: 50, height: 50, borderRadius: 18 },
  drawerAvatarFallback: { backgroundColor: 'rgba(197,160,89,0.12)', alignItems: 'center', justifyContent: 'center' },
  drawerSection: { fontSize: 10, fontWeight: '800', letterSpacing: 1.6, marginTop: 25, marginBottom: 11, marginLeft: 4 },
  drawerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 18, borderWidth: 1, marginBottom: 8 },
  drawerIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(197,160,89,0.12)', justifyContent: 'center', alignItems: 'center' },
  drawerLabel: { fontSize: 14, fontWeight: '700' },
  drawerHint: { fontSize: 11, lineHeight: 17, marginTop: 3 },
  drawerFooter: { alignItems: 'center', gap: 5, marginTop: 24 },
  contactSheet: { maxHeight: '90%', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#A0AAB5', opacity: 0.4, alignSelf: 'center', marginTop: 10 },
  contactTitle: { fontSize: 20, fontWeight: '800', flex: 1 },
  contactEmblem: { width: 70, height: 70, borderRadius: 24, backgroundColor: 'rgba(197,160,89,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  contactHeadline: { fontSize: 29, fontWeight: '800', letterSpacing: -0.8 },
  contactBody: { fontSize: 14, lineHeight: 23, marginTop: 10 },
  contactNote: { borderWidth: 1, borderRadius: 22, padding: 18, marginTop: 22 },
  contactEmail: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 24, marginBottom: 14 },
  contactButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 17, borderRadius: 18, backgroundColor: '#C5A059' },
  contactButtonText: { fontSize: 15, fontWeight: '800' },
  contactFootnote: { textAlign: 'center', fontSize: 11, marginTop: 12 },
  container: { flex: 1 },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  
  
  // absoluteFill yerine kullanılan Image veya View özellikleri kod içinde satır içi tanımlandığı için bannerBgImage kullanılmıyor
  
  
  
  
  
  

  // 2x2 Grid Style for Action Pills
  
  

  
  middleAddTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  middleAddSub: { fontSize: 12, opacity: 0.85 },
  

  authButtonsContainer: { flexDirection: 'row', alignItems: 'center', padding: 5, borderRadius: 20 },
  authBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16 }, 
  authBtnText: { fontWeight: 'bold', fontSize: 13 },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF3B30', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'white', paddingHorizontal: 2 },
  badgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  
  
  
  
  
  
  
  
  
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  
  
  
  
  
  homeFoundText: { color: PITO_COLORS.navyBg, fontSize: 10, fontWeight: 'bold' },
  
  
  
  
  bottomBarAvatar: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: PITO_COLORS.primary },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 19, 30, 0.7)', justifyContent: 'flex-end' }, 
  modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, paddingBottom: 40, elevation: 20, shadowColor: '#000', shadowOffset: {width: 0, height: -5}, shadowOpacity: 0.1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  optionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  optionText: { flex: 1, fontSize: 16, fontWeight: '600' },
  sideMenu: { width: '80%', height: '100%', padding: 25, paddingTop: 50, borderTopRightRadius: 40, borderBottomRightRadius: 40, shadowColor: '#000', shadowOffset: {width: 10, height: 0}, shadowOpacity: 0.15, shadowRadius: 20, elevation: 25 },
  modernMenuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35 },
  menuAvatar: { width: 56, height: 56, borderRadius: 28, marginRight: 15, borderWidth: 2, borderColor: PITO_COLORS.primary },
  menuAvatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: PITO_COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  closeMenuBtn: { padding: 6, borderRadius: 20 },
  menuTitle: { fontSize: 18, fontWeight: 'bold' },
  menuSectionTitle: { fontSize: 12, color: PITO_COLORS.grayText, fontWeight: 'bold', marginTop: 10, marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 15, borderRadius: 16, marginBottom: 5 },
  menuItemText: { fontSize: 15, marginLeft: 15, fontWeight: '600' },
  notificationItem: { flexDirection: 'row', padding: 18, alignItems: 'center', borderRadius: 20, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.08, shadowRadius: 5 },
  notifIconContainer: { marginRight: 15 },
  notifAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: PITO_COLORS.primary },
  notifIconPlaceholder: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  notifText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  deleteAction: { backgroundColor: '#FF4D4D', justifyContent: 'center', alignItems: 'center', width: 80, height: '80%', borderRadius: 20, marginTop: 5, marginLeft: 10 },
  countryItem: { flexDirection:'row', alignItems:'center', paddingVertical:15, borderBottomWidth:1, borderBottomColor:'#eee' },
  countryText: { fontSize:18, fontWeight:'500' },

  fabContainer: { position: 'absolute', right: 20, bottom: 95, zIndex: 999 },
  fabButton: { 
      width: 62, 
      height: 62, 
      borderRadius: 31, 
      backgroundColor: PITO_COLORS.primary, 
      justifyContent: 'center', 
      alignItems: 'center', 
      elevation: 8, 
      shadowColor: '#000', 
      shadowOffset: {width: 0, height: 4}, 
      shadowOpacity: 0.3, 
      shadowRadius: 5 
  },
  // Home redesign: restrained gold accents and a single posting action in the tab bar.
  headerContainer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandButton: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  brandName: { fontSize: 32, fontWeight: '900', letterSpacing: -1.3, marginRight: 4 },
  headerLocation: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginHorizontal: 10 },
  headerCity: { marginLeft: 4, fontSize: 12, flexShrink: 1 },
  notificationButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  welcomeBlock: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22 },
  greeting: { fontSize: 14, marginBottom: 7 },
  welcomeTitle: { fontSize: 29, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8 },
  guestActions: { flexDirection: 'row', marginTop: 16, alignItems: 'center' },
  topBanner: { marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', marginBottom: 20, minHeight: 222, justifyContent: 'center' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5, 12, 21, 0.53)' },
  bannerPlaceholder: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 20, opacity: 0.3 },
  bannerTextContent: { padding: 22, paddingBottom: 32, alignItems: 'flex-start' },
  bannerTitle: { fontSize: 29, lineHeight: 35, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.6 },
  bannerSubtitle: { fontSize: 12, lineHeight: 18, color: '#F1EDE4', marginTop: 8, marginBottom: 16, maxWidth: '85%' },
  bannerButton: { backgroundColor: PITO_COLORS.primary, paddingHorizontal: 17, paddingVertical: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center' },
  bannerButtonText: { color: PITO_COLORS.navyBg, fontWeight: '800', fontSize: 13 },
  carouselDots: { position: 'absolute', bottom: 12, right: 18, flexDirection: 'row', alignItems: 'center', gap: 4 },
  carouselDot: { width: 4, height: 4, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  carouselDotActive: { width: 14, backgroundColor: PITO_COLORS.primary },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 7, marginBottom: 26 },
  filterChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderWidth: 1, borderRadius: 15, gap: 4 },
  filterText: { fontSize: 11, fontWeight: '700' },
  section: { marginBottom: 26 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 13, gap: 8 },
  sectionTitle: { flex: 1, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  seeAllBox: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  seeAllText: { color: PITO_COLORS.primary, fontSize: 11, fontWeight: '600' },
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 2 },
  cardImage: { width: '100%', aspectRatio: 0.95 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: PITO_COLORS.navyLight },
  cardInfo: { padding: 12 },
  cardName: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  cardType: { fontSize: 11, flex: 1 },
  petTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 12 },
  petTag: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: 'rgba(154,166,182,0.12)' },
  petTagText: { fontSize: 10, fontWeight: '500' },
  homeFoundBadge: { position: 'absolute', top: 10, left: 10, right: 10, alignItems: 'center', paddingVertical: 6, paddingHorizontal: 5, borderRadius: 8, backgroundColor: PITO_COLORS.primary },
  emptyState: { marginHorizontal: 20, alignItems: 'center', padding: 24, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed' },
  gridActionContainer: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  gridPill: { width: '48.5%', minHeight: 92, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 15, marginBottom: 11 },
  shortcutIcon: { marginRight: 8 },
  shortcutLabel: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 16, marginRight: 3 },
  middleAddCard: { borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(197,160,89,0.35)' },
  middleAddIconBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: PITO_COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 9, paddingBottom: 7, paddingHorizontal: 10, borderTopWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 57, paddingHorizontal: 3 },
  tabText: { fontSize: 10, fontWeight: '600', marginTop: 5 },
  addTabCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: PITO_COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  copyrightText: { textAlign: 'center', fontSize: 10, paddingHorizontal: 20, paddingTop: 4, opacity: 0.55 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(11,19,30,0.7)' }

});

export default HomeScreen;