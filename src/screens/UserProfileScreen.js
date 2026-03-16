import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, FlatList, Dimensions, Alert, Animated, Easing, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

const TRANSLATIONS = {
    TR: {
        listings: "İlanlar",
        petsgram: "Petsgram",
        message: "Mesaj Gönder",
        noListings: "İlan yok.",
        noPosts: "Henüz fotoğraf yok.",
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
        // Rozet İsimleri
        badgeBronze: "Bronz Pati", badgeSilver: "Gümüş Pati", badgeGold: "Altın Pati", badgeDiamond: "Elmas Pati"
    },
    AU: {
        listings: "Listings",
        petsgram: "Petsgram",
        message: "Send Message",
        noListings: "No listings.",
        noPosts: "No photos yet.",
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
        // Badge Names
        badgeBronze: "Bronze Paw", badgeSilver: "Silver Paw", badgeGold: "Gold Paw", badgeDiamond: "Diamond Paw"
    }
};

const UserProfileScreen = ({ navigation, route }) => {
  const { userId, userName, userAvatar } = route.params || {};
  
  const { user, country } = useContext(AuthContext); 
  const { theme } = useContext(ThemeContext);

  const [activeTab, setActiveTab] = useState('listings');
  const [menuVisible, setMenuVisible] = useState(false);
  
  // ✅ STATE: Engelleme Durumları
  const [isBlocked, setIsBlocked] = useState(false); 
  const [blockedByMe, setBlockedByMe] = useState(false); 
  
  const [userListings, setUserListings] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetUser, setTargetUser] = useState({
      id: userId,
      fullname: userName || 'Kullanıcı',
      avatar: userAvatar,
      isPremium: false,
      donation_points: 0,
      is_founder: false // 👑 Güvenli veritabanı değişkeni 👑
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

  // ✅ DİNAMİK ROZET HESAPLAYICI
  const calculateDynamicBadge = (points) => {
      const p = points || 0;
      if (p >= 50) return { name: t.badgeDiamond, icon: 'diamond', color: '#00cec9' };
      if (p >= 15) return { name: t.badgeGold, icon: 'star', color: '#f1c40f' };
      if (p >= 5) return { name: t.badgeSilver, icon: 'medal', color: '#bdc3c7' };
      if (p >= 1) return { name: t.badgeBronze, icon: 'paw', color: '#e17055' };
      return null; 
  };

  const displayBadge = targetUser.activeBadge || calculateDynamicBadge(targetUser.donation_points);

  // ✅ ENGEL KONTROLÜ
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
              .from('users')
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

          const { data: postsData } = await supabase
              .from('posts')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

          setUserPosts(postsData || []);

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
          <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
              <View style={[styles.header, { backgroundColor: theme.cardBg, position:'absolute', top:0, width:'100%' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t.blockedUser}</Text>
                <View style={{width:24}} />
              </View>
              
              <Ionicons name="ban-outline" size={80} color={theme.subText} />
              <Text style={{ marginTop: 20, fontSize: 18, fontWeight: 'bold', color: theme.text }}>{t.blockedUser}</Text>
              <Text style={{ marginTop: 10, color: theme.subText, marginBottom: 30 }}>{t.blockedDesc}</Text>

              {blockedByMe && (
                  <TouchableOpacity style={styles.unblockButton} onPress={handleUnblockUser}>
                      <Text style={styles.unblockButtonText}>{t.unblock}</Text>
                  </TouchableOpacity>
              )}
          </View>
      );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: theme.cardBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {targetUser.fullname}
        </Text>

        {!isMe ? (
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={{padding:5}}>
                <Ionicons name="ellipsis-vertical" size={24} color={theme.text} />
            </TouchableOpacity>
        ) : (
            <View style={{width: 24}} /> 
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {/* PROFİL KARTI */}
        <View style={[styles.profileCard, { backgroundColor: theme.cardBg }]}>
            <Image source={{ uri: targetUser.avatar || 'https://placekitten.com/200/200' }} style={styles.avatar} />
            
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                <Text style={[styles.userName, { color: theme.text }]}>{targetUser.fullname}</Text>
                
                {/* 👑 DİNAMİK VERİTABANI KONTROLLÜ KURUCU ROZETİ 👑 */}
                {targetUser.is_founder && (
                    <Ionicons 
                        name="checkmark-circle" 
                        size={22} 
                        color="#1DA1F2" 
                        style={{ marginLeft: 6, marginTop: 4 }} 
                    />
                )}

                {/* DİĞER KULLANICILARIN PREMİUM VE BAĞIŞ ROZETLERİ */}
                {targetUser.isPremium && <Ionicons name="checkmark-circle" size={22} color="#2196F3" style={{ marginLeft: 5 }} />}
                
                {displayBadge && (
                    <View style={{marginLeft: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: displayBadge.color + '20', borderRadius: 12, marginTop: 4}}>
                        <Ionicons name={displayBadge.icon} size={14} color={displayBadge.color} />
                        <Text style={{fontSize: 10, fontWeight: 'bold', color: displayBadge.color, marginLeft: 4}}>{displayBadge.name}</Text>
                    </View>
                )}
            </View>

            <Text style={{color: theme.subText, marginBottom: 15, marginTop: 5}}>{t.member}</Text>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={[styles.statNum, {color:theme.text}]}>
                        {loading ? '-' : userListings.length}
                    </Text>
                    <Text style={styles.statLabel}>{t.listings}</Text>
                </View>
                <View style={{width: 1, height: 30, backgroundColor: theme.border}} />
                <View style={styles.stat}>
                    <Text style={[styles.statNum, {color:theme.text}]}>
                        {loading ? '-' : userPosts.length}
                    </Text>
                    <Text style={styles.statLabel}>Petsgram</Text>
                </View>
            </View>

            {!isMe && (
                <View style={styles.actionButtonsContainer}>
                    <Animated.View style={{ transform: [{ scale: messageScale }], flex: 1 }}>
                        <TouchableOpacity 
                            style={[
                                styles.modernButton, 
                                { backgroundColor: COLORS.primary, borderColor: theme.subText }
                            ]} 
                            onPress={handleMessagePress}
                            activeOpacity={0.9}
                        >
                            <Ionicons name="chatbubble-ellipses" size={20} color="white" style={{marginRight: 8}} />
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                                {t.message}
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            )}
        </View>

        <View style={styles.tabContainer}>
            <TouchableOpacity onPress={() => setActiveTab('listings')} style={[styles.tabBtn, activeTab==='listings' && styles.activeTab]}>
                <Ionicons name="list" size={20} color={activeTab==='listings' ? COLORS.primary : theme.subText} />
                <Text style={{color: activeTab==='listings' ? COLORS.primary : theme.subText, marginLeft:5}}>{t.listings}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('petsgram')} style={[styles.tabBtn, activeTab==='petsgram' && styles.activeTab]}>
                <Ionicons name="grid" size={20} color={activeTab==='petsgram' ? COLORS.primary : theme.subText} />
                <Text style={{color: activeTab==='petsgram' ? COLORS.primary : theme.subText, marginLeft:5}}>{t.petsgram}</Text>
            </TouchableOpacity>
        </View>

        {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 30}} />
        ) : (
            <>
                {activeTab === 'listings' ? (
                    <FlatList 
                        data={userListings}
                        keyExtractor={item => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                              style={[styles.listingCard, { backgroundColor: theme.cardBg }]}
                              onPress={() => navigation.push('ListingDetail', { item })}
                            >
                              <Image source={{ uri: item.images ? item.images[0] : (item.img || 'https://via.placeholder.com/150') }} style={styles.listingImage} />
                              <View style={styles.listingInfo}>
                                <Text style={[styles.listingTitle, { color: theme.text }]} numberOfLines={1}>{item.title || item.name}</Text>
                                <Text style={[styles.listingCategory, { color: COLORS.primary }]}>{item.category || 'İlan'}</Text>
                              </View>
                            </TouchableOpacity>
                        )}
                        numColumns={2} 
                        scrollEnabled={false}
                        columnWrapperStyle={{ justifyContent: 'space-between' }}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={{ color: theme.subText }}>{t.noListings}</Text></View>}
                    />
                ) : (
                    userPosts.length === 0 ? (
                        <View style={styles.emptyContainer}><Text style={{ color: theme.subText }}>{t.noPosts}</Text></View>
                    ) : (
                        <View style={styles.gridContainer}>
                            {userPosts.map((post) => (
                                <TouchableOpacity key={post.id} style={styles.gridItem} onPress={() => navigation.navigate('Petsgram', { initialPostId: post.id })}>
                                    <Image source={{ uri: post.image }} style={styles.gridImage} resizeMode="cover" />
                                    <View style={styles.gridOverlay}>
                                            <Ionicons name="heart" size={10} color="white" />
                                            <Text style={{color:'white', fontSize:10, marginLeft:2, fontWeight:'bold'}}>{post.likes || 0}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )
                )}
            </>
        )}
      </ScrollView>

      <Modal visible={menuVisible} transparent={true} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
            <View style={[styles.menuContainer, { backgroundColor: theme.cardBg }]}>
                <Text style={{color:theme.subText, fontSize:12, marginBottom:10, textAlign:'center'}}>{t.menu}</Text>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleBlockUser}>
                    <Ionicons name="ban-outline" size={22} color="#FF3B30" />
                    <Text style={[styles.menuText, { color: '#FF3B30' }]}>{t.block}</Text>
                </TouchableOpacity>
                
                <View style={{height:1, backgroundColor:theme.border, marginVertical:5}} />
                
                <TouchableOpacity style={styles.menuItem} onPress={handleReportUser}>
                    <Ionicons name="alert-circle-outline" size={22} color={theme.text} />
                    <Text style={[styles.menuText, { color: theme.text }]}>{t.report}</Text>
                </TouchableOpacity>
                
                <View style={{height:1, backgroundColor:theme.border, marginVertical:5}} />

                <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
                    <Text style={[styles.menuText, { color: theme.subText, textAlign:'center', width:'100%' }]}>{t.cancel}</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, paddingTop: 50, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', textTransform: 'lowercase' },
  backButton: { padding: 5 },
  profileCard: { alignItems: 'center', padding: 20, margin: 15, borderRadius: 25, elevation: 5, shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity:0.1, shadowRadius:4 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 15, borderWidth: 3, borderColor: COLORS.primary },
  userName: { fontSize: 24, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems:'center', width: '100%', marginVertical: 20, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
  stat: { alignItems: 'center', marginHorizontal: 20 },
  statNum: { fontWeight: 'bold', fontSize: 20 },
  statLabel: { fontSize: 13, color: '#888', marginTop: 2 },
  actionButtonsContainer: { flexDirection: 'row', marginTop: 15, width: '100%', alignItems: 'center', justifyContent: 'center' },
  modernButton: { flexDirection: 'row', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: COLORS.primary, shadowOffset: {width:0, height:4}, shadowOpacity:0.3, shadowRadius:5, paddingHorizontal: 40 },
  tabContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  tabBtn: { padding: 10, marginHorizontal: 20, borderBottomWidth: 3, borderBottomColor: 'transparent', flexDirection: 'row', alignItems: 'center' },
  activeTab: { borderBottomColor: COLORS.primary },
  listContent: { paddingHorizontal: 15, paddingBottom: 20 },
  listingCard: { width: (width-40)/2, borderRadius: 15, marginBottom: 15, paddingBottom: 10, overflow:'hidden', elevation:2 },
  listingImage: { width: '100%', height: 120 },
  listingInfo: { padding: 8 },
  listingTitle: { fontWeight:'bold', fontSize:14 },
  listingCategory: { fontSize:12, fontWeight:'bold' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', padding: 2 },
  gridItem: { width: (width/3)-4, height: (width/3)-4, margin: 2 },
  gridImage: { width: '100%', height: '100%', borderRadius: 5 },
  gridOverlay: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center', backgroundColor:'rgba(0,0,0,0.5)', padding:3, borderRadius:5 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { width: '80%', padding: 20, borderRadius: 20, elevation: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  menuText: { fontSize: 16, fontWeight: 'bold', marginLeft: 15 },

  unblockButton: { backgroundColor: COLORS.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
  unblockButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default UserProfileScreen;