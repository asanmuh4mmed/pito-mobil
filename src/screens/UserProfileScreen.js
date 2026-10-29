import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, FlatList, Dimensions, Alert, Animated, Easing, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

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

const TRANSLATIONS = {
    TR: {
        listings: "İlanlar",
        message: "Mesaj Gönder",
        noListings: "İlan yok.",
        member: "Pito Üyesi",
        loginTitle: "Giriş Yap",
        loginMsg: "Bu işlem için giriş yapmalısınız.",
        menu: "Seçenekler",
        block: "Engelle",
        unblock: "Engeli Kaldır", 
        report: "Şikayet Et",
        cancel: "İptal",
        blockTitle: "Kullanıcıyı Engelle",
        blockMsg: "Bu kullanıcıyı engellemek istediğine emin misin? Birbirinize ulaşamayacaksınız.",
        unblockTitle: "Engeli Kaldır", 
        unblockMsg: "Bu kullanıcının engelini kaldırmak istiyor musunuz?", 
        blockedUser: "Kullanıcıya Ulaşılamıyor",
        blockedDesc: "Bu profil görüntülenemiyor.",
        reported: "Bildirildi",
        reportMsg: "Kullanıcı şikayeti alındı. İnceleme başlatılacaktır.",
    },
    AU: {
        listings: "Listings",
        message: "Send Message",
        noListings: "No listings.",
        member: "Pito Member",
        loginTitle: "Login",
        loginMsg: "Please login first.",
        menu: "Options",
        block: "Block",
        unblock: "Unblock", 
        report: "Report",
        cancel: "Cancel",
        blockTitle: "Block User",
        blockMsg: "Are you sure you want to block this user?",
        unblockTitle: "Unblock User", 
        unblockMsg: "Do you want to unblock this user?", 
        blockedUser: "User Unavailable",
        blockedDesc: "This profile cannot be viewed.",
        reported: "Reported",
        reportMsg: "User report received. Investigation will start.",
    }
};

const UserProfileScreen = ({ navigation, route }) => {
  const { userId, userName, userAvatar } = route.params || {};
  
  const { user, country } = useContext(AuthContext); 
  const { theme: appTheme, isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? appTheme : { ...appTheme, background: '#F8F5EF', cardBg: '#FFFFFF', text: '#142239', subText: '#727989', border: '#EAE4D8' };

  const [menuVisible, setMenuVisible] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false); 
  const [blockedByMe, setBlockedByMe] = useState(false); 
  
  const [userListings, setUserListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetUser, setTargetUser] = useState({
      id: userId,
      fullname: userName || 'Kullanıcı',
      avatar: userAvatar,
      isPremium: false,
      is_founder: false
  });

  const messageScale = useRef(new Animated.Value(1)).current;
  const activeLang = country?.code || 'TR';
  const t = TRANSLATIONS[activeLang];

  const isMe = user && String(user.id) === String(userId);

  useEffect(() => {
      if (userId) {
          fetchUserData();
          if (user) checkBlockStatus();
      }
  }, [userId]);


  const checkBlockStatus = async () => {
      try {
          const { data, error } = await supabase
              .from('blocks')
              .select('*')
              .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${userId}),and(blocker_id.eq.${userId},blocked_id.eq.${user.id})`);

          if (data && data.length > 0) {
              setIsBlocked(true);
              const myBlock = data.find(b => String(b.blocker_id) === String(user.id));
              if (myBlock) {
                  setBlockedByMe(true);
              }
          }
      } catch (error) {
          console.log("Blok kontrol hatası:", error);
      }
  };

  const fetchUserData = async () => {
      try {
          setLoading(true);

          const { data: userData } = await supabase
              .from('pito_public_profiles')
              .select('*')
              .eq('id', userId)
              .single();
          
          if (userData) setTargetUser(prev => ({ ...prev, ...userData }));

          const { data: listingsData } = await supabase
              .from('listings')
              .select('*')
              .eq('owner_id', userId)
              .order('created_at', { ascending: false });

          setUserListings(listingsData || []);

      } catch (error) {
          console.log("Kullanıcı veri hatası:", error);
      } finally {
          setLoading(false);
      }
  };

  const animateButton = (scaleValue) => {
      Animated.sequence([
          Animated.timing(scaleValue, { toValue: 0.9, duration: 100, useNativeDriver: true, easing: Easing.ease }),
          Animated.timing(scaleValue, { toValue: 1, duration: 100, useNativeDriver: true, easing: Easing.ease })
      ]).start();
  };

  const handleMessagePress = () => {
      animateButton(messageScale);
      if (!user) return Alert.alert(t.loginTitle, t.loginMsg);
      
      const chatId = [String(user.id), String(userId)].sort().join('_');
      
      navigation.navigate('ChatDetail', { 
          chatId: chatId, 
          targetUser: { id: targetUser.id, fullname: targetUser.fullname, avatar: targetUser.avatar }
      });
  };

  const handleBlockUser = async () => {
      setMenuVisible(false);
      if (!user) return Alert.alert(t.loginTitle, t.loginMsg);

      Alert.alert(t.blockTitle, t.blockMsg, [
          { text: t.cancel, style: "cancel" },
          { 
              text: t.block, 
              style: "destructive", 
              onPress: async () => {
                  try {
                      const { error } = await supabase
                          .from('blocks')
                          .insert({ 
                              blocker_id: user.id, 
                              blocked_id: userId,
                              created_at: new Date()
                          });

                      if (error) throw error;

                      setIsBlocked(true);
                      setBlockedByMe(true); 
                      Alert.alert("Başarılı", "Kullanıcı engellendi.");
                  } catch (error) {
                      console.log("Bloklama hatası:", error);
                      Alert.alert("Hata", "İşlem başarısız oldu.");
                  }
              }
          }
      ]);
  };

  const handleUnblockUser = async () => {
      Alert.alert(t.unblockTitle, t.unblockMsg, [
          { text: t.cancel, style: "cancel" },
          { 
              text: t.unblock, 
              onPress: async () => {
                  try {
                      const { error } = await supabase
                          .from('blocks')
                          .delete()
                          .eq('blocker_id', user.id)
                          .eq('blocked_id', userId);

                      if (error) throw error;

                      setIsBlocked(false);
                      setBlockedByMe(false);
                      
                      fetchUserData(); 
                      Alert.alert("Başarılı", "Engel kaldırıldı.");

                  } catch (error) {
                      console.log("Engel kaldırma hatası:", error);
                      Alert.alert("Hata", "Engel kaldırılamadı.");
                  }
              }
          }
      ]);
  };

  const handleReportUser = () => {
      setMenuVisible(false);
      Alert.alert(t.reported, t.reportMsg);
  };

  if (isBlocked) {
      return (
          <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.background, }]}>
              <View style={[styles.header, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, width:'100%', borderBottomWidth: 1, borderBottomColor: isDarkMode ? PITO_COLORS.navyLight : theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t.blockedUser}</Text>
                <View style={{width:24}} />
              </View>
              
              <View style={styles.blockedContent}>
              <View style={styles.emptyIcon}><Ionicons name="ban-outline" size={40} color={PITO_COLORS.primary} /></View>
              <Text style={{ marginTop: 20, fontSize: 18, fontWeight: 'bold', color: theme.text }}>{t.blockedUser}</Text>
              <Text style={{ marginTop: 10, color: theme.subText, marginBottom: 30 }}>{t.blockedDesc}</Text>

              {blockedByMe && (
                  <TouchableOpacity style={[styles.unblockButton, { backgroundColor: PITO_COLORS.primary }]} onPress={handleUnblockUser}>
                      <Text style={[styles.unblockButtonText, { color: PITO_COLORS.navyBg }]}>{t.unblock}</Text>
                  </TouchableOpacity>
              )}
              </View>
          </SafeAreaView>
      );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.background }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {targetUser.fullname}
        </Text>

        {!isMe ? (
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.backButton} accessibilityRole="button" accessibilityLabel={t.menu}>
                <Ionicons name="ellipsis-vertical" size={24} color={theme.text} />
            </TouchableOpacity>
        ) : (
            <View style={{width: 44}} /> 
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          <View style={styles.coverTop}><Text style={styles.coverBrand}>Pito</Text><Ionicons name="paw" size={23} color={PITO_COLORS.primary} /></View>
          <Text style={styles.coverCaption}>{activeLang === 'TR' ? 'Küçük patiler, güzel karşılaşmalar.' : 'Little paws, lovely connections.'}</Text>
          <Ionicons name="paw-outline" size={110} color="rgba(197,160,89,0.13)" style={styles.coverPaw} />
        </View>
        {/* PROFİL KARTI */}
        <View style={[styles.profileCard, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]}>
            {targetUser.avatar ? <Image source={{ uri: targetUser.avatar }} style={[styles.avatar, { borderColor: theme.cardBg }]} /> : <View style={[styles.avatar, styles.avatarPlaceholder, { borderColor: theme.cardBg }]}><Ionicons name="person-outline" size={38} color={PITO_COLORS.primary} /></View>}
            
            <View style={styles.nameRow}>
                <Text style={[styles.userName, { color: theme.text }]}>{targetUser.fullname}</Text>
                
                {targetUser.is_founder && (
                    <Ionicons 
                        name="checkmark-circle" 
                        size={22} 
                        color="#1DA1F2" 
                        style={{ marginLeft: 6, marginTop: 4 }} 
                    />
                )}

                {targetUser.isPremium && <Ionicons name="checkmark-circle" size={22} color={PITO_COLORS.primary} style={{ marginLeft: 5 }} />}
                

            </View>

            <Text style={{color: theme.subText, marginBottom: 3, marginTop: 8, fontSize: 12}}>{t.member}</Text>

            <View style={[styles.statsRow, { borderTopColor: isDarkMode ? PITO_COLORS.navyLight : theme.border }]}>
                <View style={styles.stat}>
                    <Text style={[styles.statNum, {color: theme.text}]}>
                        {loading ? '-' : userListings.length}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.subText }]}>{t.listings}</Text>
                </View>
            </View>

            {!isMe && (
                <View style={styles.actionButtonsContainer}>
                    <Animated.View style={{ transform: [{ scale: messageScale }], flex: 1 }}>
                        <TouchableOpacity 
                            style={[
                                styles.modernButton, 
                                { backgroundColor: PITO_COLORS.primary, borderColor: PITO_COLORS.primaryDark }
                            ]} 
                            onPress={handleMessagePress}
                            activeOpacity={0.9}
                        >
                            <Ionicons name="chatbubble-ellipses" size={20} color={PITO_COLORS.navyBg} style={{marginRight: 8}} />
                            <Text style={{ color: PITO_COLORS.navyBg, fontWeight: 'bold', fontSize: 16 }}>
                                {t.message}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            )}
        </View>

        <View style={styles.sectionHeader}>
          <View><Text style={[styles.sectionTitle, { color: theme.text }]}>{t.listings}</Text><Text style={[styles.sectionHint, { color: theme.subText }]}>{activeLang === 'TR' ? 'Bu profilin paylaştığı ilanlar' : 'Listings shared by this member'}</Text></View>
          <View style={styles.countPill}><Ionicons name="grid-outline" size={15} color={PITO_COLORS.primary} /><Text style={styles.countText}>{loading ? '—' : userListings.length}</Text></View>
        </View>
        {loading ? (
            <ActivityIndicator size="large" color={PITO_COLORS.primary} style={{marginTop: 30}} />
        ) : (
            <View style={{ marginTop: 10 }}>
                <FlatList 
                    data={userListings}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                          style={[styles.listingCard, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]}
                          onPress={() => navigation.push('ListingDetail', { item })}
                        >
                          {(item.images?.[0] || item.img) ? <Image source={{ uri: item.images?.[0] || item.img }} style={styles.listingImage} resizeMode="cover" /> : <View style={[styles.listingImage, styles.avatarPlaceholder]}><Ionicons name="paw-outline" size={38} color={PITO_COLORS.primary} /></View>}
                          <View style={styles.listingInfo}>
                            <Text style={[styles.listingTitle, { color: theme.text }]} numberOfLines={1}>{item.title || item.name}</Text>
                            <Text style={[styles.listingCategory, { color: PITO_COLORS.primary }]}>{item.category || 'İlan'}</Text>
                          </View>
                        </TouchableOpacity>
                    )}
                    numColumns={2} 
                    scrollEnabled={false}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={<View style={[styles.emptyContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}><View style={styles.emptyIcon}><Ionicons name="paw-outline" size={33} color={PITO_COLORS.primary} /></View><Text style={[styles.emptyTitle, { color: theme.text }]}>{t.noListings}</Text><Text style={[styles.emptyHint, { color: theme.subText }]}>{activeLang === 'TR' ? 'Paylaşılan ilanlar burada görünecek.' : 'Shared listings will appear here.'}</Text></View>}
                />
            </View>
        )}
      </ScrollView>

      <Modal visible={menuVisible} transparent={true} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} accessibilityLabel={t.cancel} onPress={() => setMenuVisible(false)} />
            <SafeAreaView edges={['bottom']} style={[styles.menuContainer, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]}>
                <View style={styles.sheetHandle} /><Text style={[styles.sheetTitle, { color: theme.text }]}>{t.menu}</Text>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleBlockUser}>
                    <Ionicons name="ban-outline" size={22} color={PITO_COLORS.error} />
                    <Text style={[styles.menuText, { color: PITO_COLORS.error }]}>{t.block}</Text>
                </TouchableOpacity>
                
                <View style={{height:1, backgroundColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, marginVertical:5}} />
                
                <TouchableOpacity style={styles.menuItem} onPress={handleReportUser}>
                    <Ionicons name="alert-circle-outline" size={22} color={PITO_COLORS.primary} />
                    <Text style={[styles.menuText, { color: PITO_COLORS.primary }]}>{t.report}</Text>
                </TouchableOpacity>
                
                <View style={{height:1, backgroundColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, marginVertical:5}} />

                <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                    <Text style={[styles.menuText, { color: theme.text, textAlign:'center', width:'100%' }]}>{t.cancel}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: 'rgba(197,160,89,0.1)', justifyContent: 'center', alignItems: 'center' },
  cover: { backgroundColor: '#142239', marginHorizontal: 20, padding: 24, paddingBottom: 58, borderRadius: 26, overflow: 'hidden' },
  coverTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coverBrand: { fontSize: 29, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
  coverCaption: { color: '#D7C6A4', fontSize: 12, marginTop: 8, maxWidth: '85%', lineHeight: 18 },
  coverPaw: { position: 'absolute', right: -15, bottom: -25, transform: [{ rotate: '-20deg' }] },
  profileCard: { alignItems: 'center', padding: 22, marginHorizontal: 20, marginTop: -24, borderRadius: 26, marginBottom: 24 },
  avatar: { width: 90, height: 90, borderRadius: 30, marginTop: -53, marginBottom: 15, borderWidth: 5 },
  avatarPlaceholder: { backgroundColor: '#EDE4D4', alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', rowGap: 8, width: '100%' },
  userName: { fontSize: 24, fontWeight: '800', textAlign: 'center', flexShrink: 1, letterSpacing: -0.6 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: 18, borderTopWidth: 1, paddingTop: 15 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statNum: { fontWeight: '800', fontSize: 21 },
  statLabel: { fontSize: 13 },
  actionButtonsContainer: { flexDirection: 'row', marginTop: 20, width: '100%', alignItems: 'center' },
  modernButton: { flexDirection: 'row', minHeight: 52, borderRadius: 17, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 22, marginBottom: 8 },
  sectionTitle: { fontSize: 21, fontWeight: '800' },
  sectionHint: { fontSize: 11, marginTop: 5 },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(197,160,89,0.12)', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13 },
  countText: { color: PITO_COLORS.primary, fontSize: 13, fontWeight: '800' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  listingCard: { width: '48.2%', borderRadius: 21, marginBottom: 14, overflow: 'hidden' },
  listingImage: { width: '100%', aspectRatio: 1 },
  listingInfo: { padding: 13, gap: 6 },
  listingTitle: { fontWeight: '800', fontSize: 15 },
  listingCategory: { fontSize: 10, fontWeight: '700', lineHeight: 15 },
  emptyContainer: { alignItems: 'center', padding: 28, marginTop: 4, borderWidth: 1, borderStyle: 'dashed', borderRadius: 24 },
  emptyIcon: { width: 76, height: 76, borderRadius: 26, backgroundColor: 'rgba(197,160,89,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyHint: { fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 8 },
  blockedContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(11,19,30,0.65)', justifyContent: 'flex-end' },
  menuContainer: { width: '100%', paddingHorizontal: 24, paddingTop: 12, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#9BA3AE', opacity: 0.4, alignSelf: 'center', marginBottom: 22 },
  sheetTitle: { fontSize: 21, fontWeight: '800', marginBottom: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingVertical: 16 },
  menuText: { fontSize: 15, fontWeight: '700', marginLeft: 12 },
  unblockButton: { paddingHorizontal: 30, paddingVertical: 16, borderRadius: 18 },
  unblockButtonText: { fontWeight: '700', fontSize: 15 }
});

export default UserProfileScreen;