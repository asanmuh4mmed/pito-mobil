import React, { useContext, useState, useEffect, useCallback } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, 
    Image, ScrollView, Modal, Alert, Linking, RefreshControl, StatusBar, Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import * as Notifications from 'expo-notifications'; 
import { COLORS } from '../constants/colors';
import { ListingContext } from '../context/ListingContext';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { ThemeContext } from '../context/ThemeContext';
import { ShopContext } from '../context/ShopContext';
import { SocialContext } from '../context/SocialContext';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { playSound } from '../utils/SoundManager'; 

const { width } = Dimensions.get('window');

// Bildirim Ayarları
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
        categories: "Kategoriler",
        seeAll: "Tümü",
        noListing: "Henüz ilan yok.",
        login: "Giriş Yap",
        register: "Kayıt Ol",
        freeAdBtn: "Ücretsiz İlan Ver",
        vetBotBtn: "Senin Veterinerin (AI)",
        qrCollarBtn: "QR Kodlu Künye Al",  
       
        home: "Ana Sayfa",
        profile: "Profil",
        menuTitle: "Menü",
        regionLang: "Bölge & Dil",
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
        selectRegion: "Bölge Seçiniz",
        regionChanged: "Bölge Değiştirildi",
        activeRegion: "Aktif Bölge",
        regionRestrictedTitle: "Bölge Değiştirilemez",
        regionRestrictedMsg: "Hesabınız bu bölgeye kayıtlı değil.",
        catMate: "Eş Arayanlar",
        catAdopt: "Yuva Arayanlar",
        catVet: "Veteriner Klinikleri",
        catSitter: "Bakıcı Bul",
        catGrooming: "Pet Kuaför", 
        catVaccine: "Aşı Karnesi", 
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
        gameBtn: "Pito Oyun Dünyası",
        gameSub: "Eğlen, Yarış ve Puan Topla! 🎮"
    },
    AU: {
        searchPlaceholder: "Search users, breeds...",
        userNotFound: "No results found.",
        searchResults: "Search Results",
        categories: "Categories",
        seeAll: "See All",
        noListing: "No listings yet.",
        login: "Login",
        register: "Sign Up",
        freeAdBtn: "Post Free Ad",
        vetBotBtn: "VetBOT (AI)",
        qrCollarBtn: "Buy QR Tag", 
        
        home: "Home",
        profile: "Profile",
        menuTitle: "Menu",
        regionLang: "Region & Language",
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
        selectRegion: "Select Region",
        regionChanged: "Region Changed",
        activeRegion: "Active Region",
        regionRestrictedTitle: "Region Locked",
        regionRestrictedMsg: "Your account is registered in a different region.",
        catMate: "Looking for Mate",
        catAdopt: "Looking for Home",
        catVet: "Veterinary Clinics",
        catSitter: "Find Pet Sitter", 
        catGrooming: "Pet Groomer", 
        catVaccine: "Vaccine Card", 
        foundMate: "MATE FOUND",
        foundHome: "HOME FOUND",
        shop: "Popular Products",
        social: "Petsgram Feed",
        noData: "No content yet.",
        copyright: "© 2024 Pito. All Rights Reserved.",
        loginRequiredTitle: "Login Required",
        loginRequiredMsg: "Please login or register to use this feature.",
        cancel: "Cancel",
        menuShop: "Shop",
        gameBtn: "Pito Game World",
        gameSub: "Have Fun & Earn Points! 🎮"
    }
};

const HomeScreen = ({ navigation }) => {
  // Contexts
  const { urgentList, mateList, vetList, sitterList, fetchListings } = useContext(ListingContext);
  const { user, logout, markNotificationsAsRead, allUsers, deleteNotification, country, updateCountry } = useContext(AuthContext); 
  const { getUnreadCount, conversations } = useContext(ChatContext);
  const { theme, isDarkMode } = useContext(ThemeContext);
  
  // Shop ve Social Context Bağlantısı (DB)
  const { products, fetchProducts } = useContext(ShopContext); 
  const { posts, fetchPosts } = useContext(SocialContext); 
  
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modallar
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false); 
  const [countryModalVisible, setCountryModalVisible] = useState(false); 

  // Swipe Detection
  const [touchStart, setTouchStart] = useState(null);

  const activeLang = country?.code || 'TR';
  const t = TRANSLATIONS[activeLang]; 

  // --- 1. VERİ YÜKLEME ---
  useEffect(() => {
      loadAllData();
      (async () => {
        const { status } = await Notifications.requestPermissionsAsync();
      })();
  }, []);

  const loadAllData = async () => {
      if(fetchListings) await fetchListings();
      if(fetchProducts) await fetchProducts(); 
      if(fetchPosts) await fetchPosts();       
  };

  const onRefresh = useCallback(async () => {
      setRefreshing(true);
      await loadAllData();
      setRefreshing(false);
  }, []);

  // --- 2. BİLDİRİM SAYILARI ---
  useEffect(() => {
    if (user) {
        setUnreadMsgCount(getUnreadCount(user.id));
        const notifs = user.notifications || [];
        const unreadN = notifs.filter(n => !n.read).length;
        setUnreadNotifCount(unreadN);
    } else {
        setUnreadMsgCount(0);
        setUnreadNotifCount(0);
    }
  }, [user, conversations]);

  // --- 3. GÜVENLİK KONTROLÜ (Giriş Yapmamışsa Uyar) ---
  const checkAuth = (action) => {
      if (user) {
          action();
      } else {
          playSound('water'); 
          Alert.alert(t.loginRequiredTitle, t.loginRequiredMsg, [
              { text: t.cancel, style: 'cancel' },
              { text: t.login, onPress: () => navigation.navigate('Login') }
          ]);
      }
  };

  // --- 4. YARDIMCI FONKSİYONLAR ---
  const filterByCountry = (list) => {
      if (!list) return [];
      return list.filter(item => {
          if (item.countryCode) {
              return item.countryCode === activeLang;
          }
          return activeLang === 'TR'; 
      });
  };

  const filteredUrgent = filterByCountry(urgentList);
  const filteredMate = filterByCountry(mateList);
  const filteredVet = filterByCountry(vetList);
  const filteredSitter = filterByCountry(sitterList);
  const filteredGrooming = []; 

  const handleSearch = (text) => {
      setSearchQuery(text);
      if (text.trim() === '') {
          setSearchResults([]);
          return;
      }
      const filtered = allUsers.filter(u => 
          (u.username && u.username.toLowerCase().includes(text.toLowerCase())) || 
          (u.fullname && u.fullname.toLowerCase().includes(text.toLowerCase()))
      );
      setSearchResults(filtered);
  };

  const handleUserSelect = (selectedUser) => {
      playSound('water');
      checkAuth(() => {
          if (selectedUser.id === user.id) {
              navigation.navigate('Profile');
          } else {
              navigation.push('UserProfile', {
                  userId: selectedUser.id,
                  userName: selectedUser.fullname,
                  userAvatar: selectedUser.avatar
              });
          }
      });
  };

  const handleAddPress = () => {
    checkAuth(() => setModalVisible(true));
  };

  const handleNotificationPress = () => {
      playSound('water');
      checkAuth(() => {
          setNotificationsVisible(true);
          markNotificationsAsRead(); 
      });
  };

  const handleNotificationItemClick = (notification) => {
      playSound('water');
      setNotificationsVisible(false);
      
      if (notification.type === 'follow' && notification.fromUserId) {
          navigation.push('UserProfile', {
              userId: notification.fromUserId,
              userName: notification.fromUser,
              userAvatar: notification.fromUserAvatar
          });
      } else if (notification.type === 'order_success' || notification.type === 'order_update') {
          navigation.navigate('Profile'); 
      }
  };

  const renderRightActions = (id) => (
      <TouchableOpacity style={styles.deleteAction} onPress={() => { playSound('water'); deleteNotification(id); }}>
          <Ionicons name="trash-outline" size={24} color="white" />
          <Text style={{color:'white', fontSize:10, fontWeight:'bold'}}>{activeLang === 'TR' ? 'Sil' : 'Del'}</Text>
      </TouchableOpacity>
  );

  const changeCountry = (newCountry) => {
      playSound('water');
      if (user && user.country && user.country !== newCountry.code) {
          Alert.alert(t.regionRestrictedTitle, t.regionRestrictedMsg);
          return; 
      }
      updateCountry(newCountry);
      setCountryModalVisible(false);
      Alert.alert(t.regionChanged, `${t.activeRegion}: ${newCountry.name}`);
  };

  const sendEmail = () => {
      playSound('water');
      Linking.openURL('mailto:petspito@gmail.com');
  };

  const goToContactFromAbout = () => {
      playSound('water');
      setAboutVisible(false);
      setTimeout(() => {
          setContactVisible(true);
      }, 500);
  };

  const handleProfilePress = () => {
      playSound('water');
      if (user) {
          navigation.navigate('Profile');
      } else {
          navigation.navigate('Login'); 
      }
  };

  const handleLogout = () => {
    playSound('water');
    setMenuVisible(false);
    logout();
    Alert.alert(t.logoutAlertTitle, t.logoutAlertMsg);
  };

  const goToSettings = () => {
      playSound('water');
      setMenuVisible(false);
      navigation.navigate('Settings');
  };

  const navigateToAdd = (categoryName) => {
      playSound('water');
      setModalVisible(false); 
      let backendCategoryName = categoryName;
      if (categoryName === 'Find Mate') backendCategoryName = 'Eş Arayanlar';
      else if (categoryName === 'Adopt') backendCategoryName = 'Sahiplendirme';
      else if (categoryName === 'Vet Clinics') backendCategoryName = 'Veteriner Klinikleri';
      else if (categoryName === 'Pet Sitter') backendCategoryName = 'Bakıcı';
      else if (categoryName === 'Pet Groomer') backendCategoryName = 'Pet Kuaför';

      navigation.navigate('AddListing', { category: backendCategoryName });
  };

  const handleCategoryPress = (item) => {
    playSound('water');
    if (item.type === 'vaccine') {
        checkAuth(() => navigation.navigate('VaccineReport'));
    } else {
        navigation.navigate('AllListings', { title: item.navTitle, data: item.data || [] });
    }
    setMenuVisible(false);
  };

  // --- SWIPE LOGIC ---
  const onTouchStart = (e) => setTouchStart(e.nativeEvent.pageX);
  const onTouchEnd = (e) => {
      if (!touchStart) return;
      const touchEnd = e.nativeEvent.pageX;
      const SWIPE_THRESHOLD = 80;

      if (touchStart - touchEnd > SWIPE_THRESHOLD) {
          checkAuth(() => navigation.navigate('Profile'));
      }
      
      if (touchEnd - touchStart > SWIPE_THRESHOLD) {
           setMenuVisible(true);
      }
      setTouchStart(null);
  };

  const categories = [
    { id: '1', title: activeLang === 'TR' ? 'Eş Bul' : 'Find Mate', icon: 'heart', color: '#FF6B6B', navTitle: t.catMate, data: filteredMate, type: 'listing' },
    { id: '2', title: activeLang === 'TR' ? 'Sahiplen' : 'Adopt', icon: 'paw', color: '#4ECDC4', navTitle: t.catAdopt, data: filteredUrgent, type: 'listing' },
    { id: '3', title: activeLang === 'TR' ? 'Veteriner' : 'Vet', icon: 'medkit', color: '#45B7D1', navTitle: t.catVet, data: filteredVet, type: 'listing' },
    { id: '4', title: activeLang === 'TR' ? 'Bakıcı Bul' : 'Sitter', icon: 'people', color: '#F7B731', navTitle: t.catSitter, data: filteredSitter, type: 'listing' },
    { id: '5', title: activeLang === 'TR' ? 'Pet Kuaför' : 'Grooming', icon: 'cut', color: '#A55EEA', navTitle: t.catGrooming, data: [], type: 'listing' }, 
    { id: '6', title: activeLang === 'TR' ? 'Aşı Karnesi' : 'Vaccine', icon: 'document-text', color: '#26de81', navTitle: t.catVaccine, data: [], type: 'vaccine' }, 
  ];

  // --- RENDER FONKSİYONLARI ---
  const renderCategory = ({ item }) => (
    <TouchableOpacity style={[styles.categoryCard, { backgroundColor: theme.cardBg }]} onPress={() => handleCategoryPress(item)}>
      <Ionicons name={item.icon} size={32} color={item.color} />
      <Text style={[styles.categoryTitle, { color: theme.text }]}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderSection = (title, dataList) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        <TouchableOpacity onPress={() => { playSound('water'); navigation.navigate('AllListings', { title: title, data: dataList }); }}>
          <Text style={styles.seeAll}>{t.seeAll}</Text>
        </TouchableOpacity>
      </View>
      {dataList.length === 0 ? (
        <Text style={{ color: theme.subText, fontStyle: 'italic', marginTop: 10 }}>{t.noListing}</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {dataList.map((item) => (
            <TouchableOpacity 
                key={item.id} 
                style={[styles.card, { backgroundColor: theme.cardBg, opacity: item.is_found ? 0.8 : 1 }]} 
                onPress={() => { playSound('water'); navigation.navigate('ListingDetail', { item }); }}
            >
              <Image source={{ uri: item.img }} style={styles.cardImage} />
              
              {item.is_found && (
                  <View style={styles.homeFoundBadge}>
                      <Text style={styles.homeFoundText}>
                          {item.category.includes('Eş') || item.category.includes('Mate') ? t.foundMate : t.foundHome}
                      </Text>
                  </View>
              )}
              
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.cardType, { color: theme.subText }]} numberOfLines={1}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderProductCard = ({ item }) => (
    <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.cardBg }]}
        onPress={() => { playSound('water'); navigation.navigate('ProductDetail', { product: item }); }}
    >
        <Image source={{ uri: item.img }} style={styles.cardImage} />
        <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.productPrice, { color: COLORS.primary }]} numberOfLines={1}>
                {item.discountPrice || item.price} {activeLang === 'AU' ? 'AUD' : 'TL'}
            </Text>
        </View>
    </TouchableOpacity>
  );

  const renderSearchResults = () => (
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <Text style={[styles.sectionTitle, { marginTop: 10, color: theme.text }]}>{t.searchResults}</Text>
          {searchResults.length === 0 ? (
              <Text style={{ color: theme.subText, textAlign: 'center', marginTop: 20 }}>{t.userNotFound}</Text>
          ) : (
              <FlatList 
                  data={searchResults}
                  keyExtractor={item => item.id.toString()}
                  renderItem={({ item }) => (
                      <TouchableOpacity 
                          style={[styles.searchResultItem, { backgroundColor: theme.cardBg }]} 
                          onPress={() => handleUserSelect(item)}
                      >
                          <View style={styles.searchAvatar}>
                              {item.avatar ? (
                                  <Image source={{ uri: item.avatar }} style={{ width: '100%', height: '100%' }} />
                              ) : (
                                  <Text style={{ color: 'white', fontWeight: 'bold' }}>
                                      {item.fullname ? item.fullname.charAt(0).toUpperCase() : "?"}
                                  </Text>
                              )}
                          </View>
                          <View>
                              <Text style={[styles.searchName, { color: theme.text }]}>{item.fullname}</Text>
                              <Text style={[styles.searchUsername, { color: theme.subText }]}>@{item.username}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color={theme.subText} style={{ marginLeft: 'auto' }} />
                      </TouchableOpacity>
                  )}
              />
          )}
      </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={{ flex: 1 }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

          {/* HEADERS */}
          <View style={[styles.headerContainer, { backgroundColor: theme.cardBg }]}>
              <View style={styles.headerRow}>
                  
                  <TouchableOpacity onPress={() => { playSound('water'); setMenuVisible(true); }} style={{ padding: 5 }}>
                    <Ionicons name="menu" size={30} color={theme.icon} />
                  </TouchableOpacity>

                  <View style={[styles.headerSearchBox, { backgroundColor: isDarkMode ? '#333' : '#FFF', elevation: 3, shadowColor:'#000', shadowOpacity:0.1 }]}>
                      <Ionicons name="search" size={20} color={theme.subText} style={{ marginRight: 8 }} />
                      <TextInput 
                        placeholder={t.searchPlaceholder} 
                        placeholderTextColor={theme.subText} 
                        style={[styles.headerSearchInput, { color: theme.text }]} 
                        value={searchQuery}
                        onChangeText={handleSearch} 
                      />
                      {searchQuery.length > 0 && (
                          <TouchableOpacity onPress={() => { playSound('water'); handleSearch(''); }}>
                              <Ionicons name="close-circle" size={18} color={theme.subText} />
                          </TouchableOpacity>
                      )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {user ? (
                        <View style={{flexDirection:'row'}}>
                            <TouchableOpacity onPress={handleNotificationPress} style={{ padding: 5, marginLeft: 5 }}>
                                <View>
                                    <Ionicons name="notifications-outline" size={28} color={theme.icon} />
                                    {unreadNotifCount > 0 && (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>{unreadNotifCount}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => { playSound('water'); checkAuth(() => navigation.navigate('ChatList')); }} style={{ padding: 5, marginLeft: 2 }}>
                                <View>
                                    <Ionicons name="paper-plane-outline" size={28} color={theme.text} />
                                    {unreadMsgCount > 0 && (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>{unreadMsgCount}</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={[styles.authButtonsContainer, { backgroundColor: isDarkMode ? '#333' : '#F0F0F0' }]}>
                            <TouchableOpacity onPress={() => { playSound('water'); navigation.navigate('Login'); }} style={styles.authBtn}>
                                <Text style={styles.authBtnText}>{t.login}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { playSound('water'); navigation.navigate('Register'); }} style={styles.authBtn}>
                                <Text style={styles.authBtnText}>{t.register}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                  </View>
              </View>
          </View>

          {/* İÇERİK */}
          {searchQuery.length > 0 ? (
              renderSearchResults()
          ) : (
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              >
                  {/* ✅ MODERN KARE HİKAYELER */}
                  <View style={styles.storySection}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20}}>
                          {/* Hikaye Ekle Butonu */}
                          <TouchableOpacity 
                              style={styles.storyContainer}
                              onPress={() => { playSound('water'); checkAuth(() => navigation.navigate('Petsgram')); }}
                          >
                              <View style={[styles.storySquare, { borderColor: '#ddd', borderStyle: 'dashed' }]}>
                                  <Ionicons name="add" size={30} color="#6C5CE7" />
                              </View>
                              <Text style={[styles.storyText, { color: theme.text }]} numberOfLines={1}>Ekle</Text>
                          </TouchableOpacity>

                          {posts.map((item) => (
                              <TouchableOpacity 
                                  key={item.id} 
                                  style={styles.storyContainer}
                                  onPress={() => { playSound('water'); checkAuth(() => navigation.navigate('Petsgram', { initialPostId: item.id })); }}
                              >
                                  <Image source={{ uri: item.image }} style={[styles.storySquare, { borderColor: '#FD79A8' }]} />
                                  <Text style={[styles.storyText, { color: theme.text }]} numberOfLines={1}>{item.user ? item.user.split(' ')[0] : 'User'}</Text>
                              </TouchableOpacity>
                          ))}
                      </ScrollView>
                  </View>

                  <View style={[styles.bigAddButtonContainer, { paddingHorizontal: 20, marginBottom: 20 }]}>
                        {/* İLAN EKLEME BUTONU */}
                        <TouchableOpacity style={styles.bigAddButton} onPress={handleAddPress}>
                            <View style={styles.bigAddButtonContent}>
                                <Ionicons name="add-circle" size={32} color="white" />
                                <Text style={styles.bigAddButtonText}>{t.freeAdBtn}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="white" />
                        </TouchableOpacity>

                        {/* ✅ OYUN DÜNYASI BUTONU (GAME LIST) */}
                        <TouchableOpacity 
                            style={[styles.gameWorldButton, { marginTop: 12 }]} 
                            onPress={() => { playSound('water'); navigation.navigate('GameList'); }}
                        >
                            <View style={styles.bigAddButtonContent}>
                                <View style={styles.gameIconBox}>
                                    <Ionicons name="game-controller" size={30} color="white" />
                                </View>
                                <View style={{marginLeft: 15}}>
                                    <Text style={styles.bigAddButtonText}>{t.gameBtn}</Text>
                                    <Text style={styles.gameSubText}>{t.gameSub}</Text>
                                </View>
                            </View>
                            <Ionicons name="play-circle" size={32} color="white" style={{opacity: 0.8}} />
                            <Ionicons name="paw" size={80} color="rgba(255,255,255,0.1)" style={styles.bgIconDecor} />
                        </TouchableOpacity>

                        {/* VETERİNER BOT BUTONU */}
                        <View style={{ marginTop: 10 }}>
                            <TouchableOpacity 
                                style={[styles.bigAddButton, { backgroundColor: '#4ECDC4' }]} 
                                onPress={() => { playSound('water'); navigation.navigate('VetBot'); }}
                            >
                                <View style={styles.bigAddButtonContent}>
                                    <Ionicons name="medical" size={32} color="white" />
                                    <Text style={styles.bigAddButtonText}>{t.vetBotBtn}</Text>
                                </View>
                                <Ionicons name="chatbubbles" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* QR KOD KOLYESİ BUTONU */}
                        <View style={{ marginTop: 10 }}>
                            <TouchableOpacity 
                                style={[styles.bigAddButton, { backgroundColor: '#8854d0' }]} 
                                onPress={() => { playSound('water'); navigation.navigate('Shop'); }}
                            >
                                <View style={styles.bigAddButtonContent}>
                                    <Ionicons name="qr-code" size={32} color="white" />
                                    <Text style={styles.bigAddButtonText}>{t.qrCollarBtn}</Text>
                                </View>
                                <Ionicons name="cart" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                      
                  </View>

                  {/* KATEGORİLER */}
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.categories}</Text>
                    <FlatList 
                      data={categories} 
                      renderItem={renderCategory} 
                      keyExtractor={item => item.id} 
                      numColumns={2} 
                      columnWrapperStyle={{ justifyContent: 'space-between' }} 
                      scrollEnabled={false} 
                    />
                  </View>

                  {renderSection(t.catAdopt, filteredUrgent)}
                  {renderSection(t.catMate, filteredMate)}
                  {renderSection(t.catVet, filteredVet)}
                  {renderSection(t.catSitter, filteredSitter)}
                  {renderSection(t.catGrooming, filteredGrooming)} 

                  {/* POPÜLER ÜRÜNLER (DB) */}
                  <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.shop}</Text>
                          <TouchableOpacity onPress={() => { playSound('water'); navigation.navigate('Shop'); }}>
                            <Text style={styles.seeAll}>{t.seeAll}</Text>
                          </TouchableOpacity>
                      </View>
                      {products.length === 0 ? (
                          <Text style={{ marginLeft: 5, color: theme.subText }}>{t.noData}</Text>
                      ) : (
                          <FlatList 
                            data={products.slice(0, 5)} 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            renderItem={renderProductCard} 
                            keyExtractor={item => item.id.toString()} 
                            contentContainerStyle={{ paddingVertical: 10 }}
                          />
                      )}
                  </View>

                  <View style={{marginTop: 20, alignItems: 'center', opacity: 0.5}}>
                      <Text style={{color: theme.subText, fontSize: 12}}>{t.copyright}</Text>
                  </View>

              </ScrollView>
          )}
      </View>
      
      {/* BOTTOM BAR (MODERN APERTURE BUTON) */}
      <View style={[styles.bottomBar, { backgroundColor: theme.cardBg }]}>
        
        <TouchableOpacity style={styles.tabItem} onPress={() => { playSound('water'); setSearchQuery(''); }}>
            <Ionicons name="home-outline" size={26} color={COLORS.primary} />
            <Text style={[styles.tabText, { color: COLORS.primary }]}>{t.home}</Text>
        </TouchableOpacity>
        
        {/* Petsgram - Modern Aperture Icon */}
        <TouchableOpacity 
            style={styles.tabItem} 
            onPress={() => { playSound('water'); checkAuth(() => navigation.navigate('Petsgram')); }}
            activeOpacity={0.9}
        >
            <View style={styles.modernApertureContainer}>
                <Ionicons name="aperture" size={34} color="white" />
            </View>
            <Text style={styles.petsgramTabText}>Petsgram</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.tabItem} onPress={() => { playSound('water'); checkAuth(() => navigation.navigate('Profile')); }}>
            {user && user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.bottomBarAvatar} />
            ) : (
                <Ionicons name="person-outline" size={26} color={theme.subText} />
            )}
            <Text style={[styles.tabText, { color: theme.subText }]}>
                {user ? user.username : t.profile}
            </Text>
        </TouchableOpacity>
      </View>

      {/* MENÜ MODALI */}
      <Modal animationType="fade" transparent={true} visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
         <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
            <View style={[styles.sideMenu, { backgroundColor: theme.cardBg }]}>
                <View style={styles.menuHeader}>
                    <Text style={styles.menuTitle}>{t.menuTitle}</Text>
                    <TouchableOpacity onPress={() => setMenuVisible(false)}>
                        <Ionicons name="close" size={24} color={theme.icon} />
                    </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                    
                    <Text style={styles.menuSectionTitle}>{t.regionLang}</Text>
                    <TouchableOpacity style={styles.menuItem} onPress={() => { playSound('water'); setMenuVisible(false); setCountryModalVisible(true); }}>
                        <Text style={{fontSize:22, marginRight:15}}>{country?.flag || '🇹🇷'}</Text>
                        <Text style={[styles.menuItemText, { color: theme.text }]}>
                            {country?.name || 'Türkiye'} ({country?.code || 'TR'})
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.subText} style={{marginLeft:'auto'}} />
                    </TouchableOpacity>
                    
                    <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

                    <Text style={styles.menuSectionTitle}>{t.appSection}</Text>
                    
                    {/* ✅ OYUN BUTONU (HAMBURGER MENÜ) */}
                    <TouchableOpacity style={styles.menuItem} onPress={() => { playSound('water'); setMenuVisible(false); navigation.navigate('GameList'); }}>
                        <Ionicons name="game-controller-outline" size={22} color="#6C5CE7" />
                        <Text style={[styles.menuItemText, { color: theme.text }]}>Oyunlar</Text>
                        <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>YENİ</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => { playSound('water'); setMenuVisible(false); navigation.navigate('Shop'); }}>
                        <Ionicons name="storefront-outline" size={22} color={theme.icon} />
                        <Text style={[styles.menuItemText, { color: theme.text }]}>{t.menuShop}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => { playSound('water'); setMenuVisible(false); checkAuth(() => navigation.navigate('Profile')); }}>
                        <Ionicons name="person-outline" size={22} color={theme.icon} />
                        <Text style={[styles.menuItemText, { color: theme.text }]}>{t.profile}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={goToSettings}>
                        <Ionicons name="settings-outline" size={22} color={theme.icon} />
                        <Text style={[styles.menuItemText, { color: theme.text }]}>{t.settings}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.menuItem} onPress={() => { playSound('water'); setMenuVisible(false); navigation.navigate('Settings'); }}>
                        <Ionicons name="globe-outline" size={22} color={theme.icon} />
                        <Text style={[styles.menuItemText, { color: theme.text }]}>{t.language}</Text>
                    </TouchableOpacity>


                    <TouchableOpacity style={styles.menuItem} onPress={() => { playSound('water'); setMenuVisible(false); setContactVisible(true); }}>
                        <Ionicons name="mail-outline" size={22} color={theme.icon} />
                        <Text style={[styles.menuItemText, { color: theme.text }]}>{t.contactUs}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={() => { playSound('water'); setMenuVisible(false); setAboutVisible(true); }}>
                        <Ionicons name="information-circle-outline" size={22} color={theme.icon} />
                        <Text style={[styles.menuItemText, { color: theme.text }]}>{t.aboutUs}</Text>
                    </TouchableOpacity>
                    {user && (
                        <TouchableOpacity style={[styles.menuItem, { marginTop: 20 }]} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={22} color="#FF4D4D" />
                            <Text style={[styles.menuItemText, { color: '#FF4D4D' }]}>{t.logout}</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>
         </TouchableOpacity>
      </Modal>

      {/* DİĞER MODALLAR (About/Contact/Country/Notif) */}
      <Modal animationType="slide" transparent={true} visible={aboutVisible} onRequestClose={() => setAboutVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '80%', backgroundColor: theme.cardBg }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>{t.aboutUs}</Text>
                    <TouchableOpacity onPress={() => setAboutVisible(false)}>
                        <Ionicons name="close" size={24} color={theme.icon} />
                    </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                      <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        <Ionicons name="paw" size={70} color={COLORS.primary} />
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginTop: 10 }}>PİTO</Text>
                        <Text style={{ color: theme.subText }}>Versiyon 1.0.0</Text>
                    </View>
                    <Text style={[styles.aboutText, { color: theme.text }]}>{t.aboutText1}</Text>
                    <Text style={[styles.aboutText, { color: theme.text }]}>{t.aboutText2}</Text>
                    <View style={styles.oxpiContainer}>
                        <Text style={[styles.oxpiHeader, {color: theme.text}]}>{t.developer}</Text>
                        <View style={styles.oxpiBox}>
                            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15}}>
                                <Text style={[styles.oxpiLogoText, {color: theme.text}]}>OXPİ</Text>
                            </View>
                            <Text style={styles.oxpiDesc}>{t.devDesc}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.feedbackButton} onPress={goToContactFromAbout}>
                        <Ionicons name="chatbubbles-outline" size={20} color="white" style={{marginRight:10}} />
                        <Text style={styles.feedbackButtonText}>{t.feedbackBtn}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={contactVisible} onRequestClose={() => setContactVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: 'auto', paddingBottom: 40, backgroundColor: theme.cardBg }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>{t.contactUs}</Text>
                    <TouchableOpacity onPress={() => setContactVisible(false)}>
                        <Ionicons name="close" size={24} color={theme.icon} />
                    </TouchableOpacity>
                </View>
                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                    <Ionicons name="mail-open-outline" size={50} color={COLORS.primary} />
                    <Text style={{ fontSize: 16, color: theme.subText, marginTop: 10 }}>{t.contactAddress}</Text>
                    <TouchableOpacity onPress={sendEmail}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text, marginTop: 5, textDecorationLine: 'underline' }}>
                            petspito@gmail.com
                        </Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 12, color: theme.subText, marginTop: 15 }}>{t.contactHint}</Text>
                </View>
            </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={countryModalVisible} onRequestClose={() => setCountryModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '40%', backgroundColor: theme.cardBg }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>{t.selectRegion}</Text>
                    <TouchableOpacity onPress={() => setCountryModalVisible(false)}>
                        <Ionicons name="close" size={24} color={theme.icon} />
                    </TouchableOpacity>
                </View>
                <ScrollView>
                    <TouchableOpacity style={styles.countryItem} onPress={() => changeCountry({name:'Türkiye', code:'TR', flag:'🇹🇷'})}>
                        <Text style={{fontSize:30, marginRight:15}}>🇹🇷</Text>
                        <Text style={[styles.countryText, {color: theme.text}]}>Türkiye (TR)</Text>
                        {country?.code === 'TR' && <Ionicons name="checkmark" size={24} color={COLORS.primary} style={{marginLeft:'auto'}} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.countryItem} onPress={() => changeCountry({name:'Australia', code:'AU', flag:'🇦🇺'})}>
                        <Text style={{fontSize:30, marginRight:15}}>🇦🇺</Text>
                        <Text style={[styles.countryText, {color: theme.text}]}>Australia (AU)</Text>
                        {country?.code === 'AU' && <Ionicons name="checkmark" size={24} color={COLORS.primary} style={{marginLeft:'auto'}} />}
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent={true} visible={notificationsVisible} onRequestClose={() => setNotificationsVisible(false)}>
        <GestureHandlerRootView style={styles.modalOverlay}>
            <View style={[styles.modalContent, { height: '60%', backgroundColor: theme.cardBg }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>{t.notifications}</Text>
                    <TouchableOpacity onPress={() => setNotificationsVisible(false)}>
                        <Ionicons name="close" size={24} color={theme.icon} />
                    </TouchableOpacity>
                </View>
                {user && user.notifications && user.notifications.length > 0 ? (
                    <FlatList 
                        data={user.notifications}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                                <TouchableOpacity style={[styles.notificationItem, { borderBottomColor: theme.border, backgroundColor: theme.cardBg }]} onPress={() => handleNotificationItemClick(item)}>
                                    <View style={styles.notifIconContainer}>
                                            {item.fromUserAvatar ? (
                                                <Image source={{ uri: item.fromUserAvatar }} style={styles.notifAvatar} />
                                            ) : (
                                                <View style={[styles.notifIconPlaceholder, { backgroundColor: item.type === 'follow' ? '#E3F2FD' : '#FFF3E0' }]}>
                                                    <Ionicons name={item.type === 'follow' ? 'person-add' : 'notifications'} size={20} color={item.type === 'follow' ? '#2196F3' : '#FF9800'} />
                                                </View>
                                            )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                            <Text style={[styles.notifText, { color: theme.text }]}>{item.message}</Text>
                                            <Text style={{ fontSize: 10, color: theme.subText, marginTop: 3 }}>
                                                {new Date(item.date).toLocaleDateString()} • {new Date(item.date).toLocaleTimeString().slice(0,5)}
                                            </Text>
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

      {/* EKLEME MODALI */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>{activeLang === 'TR' ? 'Ne İlanı Ekleyeceksin?' : 'What will you post?'}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                        <Ionicons name="close" size={24} color={theme.icon} />
                    </TouchableOpacity>
                </View>
                {[
                    { label: activeLang === 'TR' ? 'Eş Bulma İlanı' : 'Find Mate', val: 'Find Mate', icon: 'heart' },
                    { label: activeLang === 'TR' ? 'Yuva Bulma' : 'Adopt', val: 'Adopt', icon: 'paw' },
                    { label: activeLang === 'TR' ? 'Veteriner Kliniği' : 'Vet Clinics', val: 'Vet Clinics', icon: 'medkit' },
                    { label: activeLang === 'TR' ? 'Bakıcı İlanı' : 'Pet Sitter', val: 'Pet Sitter', icon: 'people' },
                    { label: activeLang === 'TR' ? 'Pet Kuaför İlanı' : 'Pet Groomer', val: 'Pet Groomer', icon: 'cut' } 
                ].map((opt, index) => (
                    <TouchableOpacity key={index} style={[styles.optionBtn, { borderBottomColor: theme.border }]} onPress={() => navigateToAdd(opt.val)}>
                        <View style={[styles.iconBox, { backgroundColor: '#FF6B6B20' }]}> 
                            <Ionicons name={opt.icon} size={24} color="#FF6B6B" /> 
                        </View>
                        <Text style={[styles.optionText, { color: theme.text }]}>{opt.label}</Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.subText} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { padding: 20, paddingTop: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, marginBottom: 5, elevation: 4 },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  
  headerSearchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 15,
      paddingVertical: 10, 
      paddingHorizontal: 15,
      borderRadius: 30, 
  },
  headerSearchInput: { flex: 1, fontSize: 14, marginLeft: 5 },

  // Story Styles (Modern Squircle)
  storySection: { marginBottom: 15, marginTop: 10 },
  storyContainer: { marginRight: 15, alignItems: 'center' },
  storySquare: { width: 75, height: 75, borderRadius: 20, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', elevation: 3 },
  storyText: { marginTop: 6, fontSize: 10, fontWeight: 'bold', width: 75, textAlign: 'center' },

  bigAddButtonContainer: { marginTop: 5 },
  bigAddButton: {
      backgroundColor: COLORS.primary,
      borderRadius: 20,
      paddingVertical: 18,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
  },
  bigAddButtonContent: { flexDirection: 'row', alignItems: 'center' },
  bigAddButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 15 },

  // Modern Game Button
  gameWorldButton: { backgroundColor: '#6C5CE7', borderRadius: 20, paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 8, shadowColor: '#6C5CE7', shadowOpacity: 0.4, overflow: 'hidden' },
  gameIconBox: { backgroundColor: '#FDCB6E', padding: 8, borderRadius: 12 },
  gameSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  bgIconDecor: { position: 'absolute', right: -15, bottom: -20, opacity: 0.15 },

  authButtonsContainer: { flexDirection: 'row', alignItems: 'center', padding: 5, borderRadius: 20, marginLeft: 10 },
  authBtn: { paddingVertical: 6, paddingHorizontal: 8 }, 
  authBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 11 },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF3B30', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'white', paddingHorizontal: 2 },
  badgeText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  section: { paddingHorizontal: 20, marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  seeAll: { color: '#6C5CE7', fontWeight: 'bold' },
  categoryCard: { width: '48%', padding: 20, borderRadius: 22, alignItems: 'center', marginBottom: 15, elevation: 2 },
  categoryTitle: { marginTop: 10, fontWeight: 'bold', fontSize: 13 },
  
  card: { width: 150, borderRadius: 22, marginRight: 15, padding: 10, elevation: 4, marginBottom: 10 },
  cardImage: { width: '100%', height: 110, borderRadius: 18, marginBottom: 10 },
  cardInfo: { alignItems: 'flex-start' },
  cardName: { fontSize: 15, fontWeight: 'bold' },
  cardType: { fontSize: 11, marginTop: 2 },
  
  productCard: { width: 160, borderRadius: 20, marginRight: 15, padding: 10, elevation: 3, marginBottom: 5 },
  productImage: { width: '100%', height: 130, borderRadius: 15, marginBottom: 10, resizeMode:'contain' },
  productInfo: { alignItems: 'flex-start' },
  productName: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  productPrice: { fontSize: 14, color: COLORS.primary, fontWeight:'bold' },

  socialItem: { width: 120, borderRadius: 15, marginRight: 10, overflow: 'hidden', height: 180, elevation: 2 },
  socialImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  socialUser: { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center' },
  socialAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'white' },
  socialUserName: { color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft: 5, textShadowColor: 'black', textShadowRadius: 2 },

  homeFoundBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#55EFC4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, zIndex: 10 },
  homeFoundText: { color: '#000', fontSize: 10, fontWeight: 'bold' },

  bottomBar: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12, borderTopLeftRadius: 35, borderTopRightRadius: 35, elevation: 30, shadowColor: "#000", shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.2, shadowRadius: 15 
  },
  
  // ✅ MODERN APERTURE BUTON (Mor-Pembe-Sarı Karışımı)
  modernApertureContainer: { 
    width: 65, height: 65, borderRadius: 22, 
    backgroundColor: '#6C5CE7', // Ana renk mor
    justifyContent: 'center', alignItems: 'center', 
    marginTop: -50, elevation: 15, 
    shadowColor: '#6C5CE7', shadowOpacity: 0.6,
    borderWidth: 4, borderColor: '#FDCB6E', // Sarımsı çerçeve
  },
  petsgramTabText: { fontSize: 11, fontWeight: '900', color: '#6C5CE7', marginTop: 4 },

  tabItem: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  tabText: { fontSize: 10, marginTop: 4, fontWeight: '700' },
  bottomBarAvatar: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#6C5CE7' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  optionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  optionText: { flex: 1, fontSize: 16, fontWeight: '600' },
  
  // Menu Styles
  sideMenu: { width: '78%', height: '100%', padding: 25, paddingTop: 50 },
  menuTitle: { fontSize: 24, fontWeight: 'bold', color: '#6C5CE7' },
  menuSectionTitle: { fontSize: 14, color: COLORS.gray, fontWeight: 'bold', marginTop: 15, marginBottom: 10, textTransform: 'uppercase' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  menuItemText: { fontSize: 16, marginLeft: 15, fontWeight: '600' },
  menuDivider: { height: 1, marginVertical: 15 },
  newBadge: { backgroundColor: '#FDCB6E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 10 },
  newBadgeText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  
  aboutText: { fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: 10 },
  
  notificationItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, alignItems: 'center' },
  notifIconContainer: { marginRight: 15 },
  notifAvatar: { width: 40, height: 40, borderRadius: 20 },
  notifIconPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notifText: { fontSize: 14, fontWeight: '500' },
  deleteAction: { backgroundColor: '#FF4D4D', justifyContent: 'center', alignItems: 'center', width: 70, height: '100%' },
  
  oxpiContainer: { marginTop: 20, padding: 15, borderWidth: 1, borderColor: '#eee', borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  oxpiHeader: { fontWeight: 'bold', marginBottom: 10 },
  oxpiBox: { alignItems: 'center' },
  oxpiLogoText: { color: 'white', fontSize: 32, fontWeight: 'bold', letterSpacing: 2 },
  oxpiDesc: { textAlign: 'center', fontSize: 13, color: '#666', lineHeight: 18 },

  feedbackButton: { flexDirection:'row', backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, justifyContent:'center', alignItems:'center' },
  feedbackButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  countryItem: { flexDirection:'row', alignItems:'center', paddingVertical:15, borderBottomWidth:1, borderBottomColor:'#eee' },
  countryText: { fontSize:18, fontWeight:'500' },

  searchResultItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center', borderRadius: 15, marginBottom: 10 },
  searchAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden' },
  searchName: { fontSize: 16, fontWeight: 'bold' },
  searchUsername: { fontSize: 14 },
});

export default HomeScreen;