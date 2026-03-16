import React, { useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler'; 
import { COLORS } from '../constants/colors';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

// --- DİL VE METİN PAKETİ ---
const TRANSLATIONS = {
    TR: {
        messagesTitle: "Mesajlar",
        noMessages: "Henüz mesajınız yok.",
        guest: "Misafir",
        listing: "İlan",
        unknown: "Bilinmeyen",
        delete: "Sil" 
    },
    AU: {
        messagesTitle: "Messages",
        noMessages: "No messages yet.",
        guest: "Guest",
        listing: "Listing",
        unknown: "Unknown",
        delete: "Delete" 
    }
};

const ChatListScreen = ({ navigation }) => {
  const { conversations, deleteConversation } = useContext(ChatContext);
  const { user, country } = useContext(AuthContext); 
  const { theme, isDarkMode } = useContext(ThemeContext);

  // Dil Seçimi
  const activeLang = country?.code || 'TR';
  const t = TRANSLATIONS[activeLang];

  // Sadece benim olduğum sohbetleri getir ve tarihe göre sırala
  const myChats = (conversations || []).sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate));

  // ✅ SOLA KAYDIRINCA ÇIKAN SİLME BUTONU
  const renderRightActions = (progress, dragX, chatId) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity onPress={() => deleteConversation(chatId)} activeOpacity={0.8}>
        <View style={styles.deleteAction}>
          <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
             <Ionicons name="trash-outline" size={28} color="white" />
             <Text style={styles.deleteText}>{t.delete}</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    // ✅ KARŞI TARAFI BULMA (VERİTABANI YAPISINA UYGUN)
    let otherUser = { id: null, fullname: t.unknown, avatar: null };
    if (item.participants && Array.isArray(item.participants)) {
        const found = item.participants.find(p => String(p.id) !== String(user?.id));
        if (found) {
            otherUser = {
                id: found.id,
                fullname: found.name || found.fullname || t.guest,
                avatar: found.avatar
            };
        }
    }
    
    const displayName = String(otherUser.fullname);
    const avatarLetter = displayName.charAt(0).toUpperCase();

    // Okunmamış mesaj sayısı kontrolü
    const unreadCount = item.messages ? item.messages.filter(m => String(m.senderId) !== String(user?.id) && !m.isRead).length : 0;
    const isUnread = unreadCount > 0;

    const displayTime = item.lastMessageDate ? new Date(item.lastMessageDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
    const displayMsg = String(item.lastMessage || '');

    return (
      <Swipeable
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.id)}
      >
        <TouchableOpacity 
            style={[
                styles.chatItem, 
                { backgroundColor: theme.cardBg, borderBottomColor: theme.border }, 
                isUnread && { backgroundColor: isDarkMode ? '#1E1E2C' : 'rgba(108, 92, 231, 0.05)' } 
            ]} 
            onPress={() => navigation.navigate('ChatDetail', { 
                chatId: item.id, 
                targetUser: otherUser 
            })}
            activeOpacity={0.8}
        >
            {/* --- AVATAR ALANI --- */}
            <View style={styles.avatarContainer}>
                {otherUser.avatar ? (
                    <Image source={{ uri: otherUser.avatar }} style={styles.avatarImage} />
                ) : (
                    <View style={{width: '100%', height: '100%', backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center'}}>
                        <Text style={styles.avatarText}>{avatarLetter}</Text>
                    </View>
                )}
                {isUnread && <View style={styles.onlineDot} />}
            </View>

            <View style={styles.chatInfo}>
                <View style={styles.chatHeaderRow}>
                    <Text style={[styles.userName, { color: theme.text }, isUnread && styles.boldText]}>{displayName}</Text>
                    <Text style={[styles.date, { color: isUnread ? '#6C5CE7' : theme.subText }, isUnread && styles.boldText]}>{displayTime}</Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                    <Text 
                        style={[
                            styles.lastMessage, 
                            { color: theme.subText }, 
                            isUnread && { color: theme.text, fontWeight: '600' }
                        ]} 
                        numberOfLines={1}
                    >
                        {displayMsg}
                    </Text>
                    
                    {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{unreadCount}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F8F9FA' }]}>
        
        {/* PREMIUM HEADER */}
        <View style={[styles.header, { backgroundColor: theme.cardBg }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, {backgroundColor: isDarkMode ? '#333' : '#F0F0F0'}]}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t.messagesTitle}</Text>
          <View style={{width: 40}} />
        </View>

        {/* İÇERİK ALANI */}
        {myChats.length === 0 ? (
          <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                  <Ionicons name="chatbubbles-outline" size={60} color="#6C5CE7" />
              </View>
              <Text style={[styles.emptyText, { color: theme.subText }]}>{t.noMessages}</Text>
          </View>
        ) : (
          <FlatList 
            data={myChats} 
            renderItem={renderItem} 
            keyExtractor={item => item.id} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, zIndex: 10 },
  backButton: { padding: 8, borderRadius: 14 },
  headerTitle: { fontSize: 19, fontWeight: '800' },
  
  chatItem: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  avatarContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'visible' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 28 },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 22 },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#00E5FF', borderWidth: 2, borderColor: 'white' },
  
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatHeaderRow: { flexDirection:'row', justifyContent:'space-between', alignItems: 'center' },
  userName: { fontWeight: '700', fontSize: 16, letterSpacing: 0.2 },
  lastMessage: { fontSize: 14, flex: 1, opacity: 0.8 },
  date: { fontSize: 12, fontWeight: '500' },
  boldText: { fontWeight: '800' },
  
  unreadBadge: { backgroundColor: '#FF4D4D', borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginLeft: 10 },
  unreadText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(108, 92, 231, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 16, fontWeight: '500', opacity: 0.8 },
  
  deleteAction: { backgroundColor: '#FF4D4D', justifyContent: 'center', alignItems: 'center', width: 90, height: '100%' },
  deleteText: { color: 'white', fontWeight: 'bold', fontSize: 12, marginTop: 4 }
});

export default ChatListScreen;