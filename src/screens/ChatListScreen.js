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
      <TouchableOpacity onPress={() => deleteConversation(chatId)}>
        <View style={styles.deleteAction}>
          <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
             <Ionicons name="trash-outline" size={30} color="white" />
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
                isUnread && { backgroundColor: isDarkMode ? '#252525' : '#F0F4FF' } 
            ]} 
            onPress={() => navigation.navigate('ChatDetail', { 
                chatId: item.id, 
                targetUser: otherUser 
            })}
            activeOpacity={0.9}
        >
            {/* --- AVATAR ALANI --- */}
            <View style={styles.avatarContainer}>
                {otherUser.avatar ? (
                    <Image source={{ uri: otherUser.avatar }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarText}>{avatarLetter}</Text>
                )}
            </View>

            <View style={styles.chatInfo}>
                <View style={styles.chatHeaderRow}>
                    <Text style={[styles.userName, { color: theme.text }, isUnread && styles.boldText]}>{displayName}</Text>
                    <Text style={[styles.date, { color: theme.subText }, isUnread && styles.boldText]}>{displayTime}</Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text 
                        style={[
                            styles.lastMessage, 
                            { color: theme.subText }, 
                            isUnread && { color: theme.text, fontWeight: 'bold' }
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{padding:5}}>
              <Ionicons name="arrow-back" size={24} color={theme.icon} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t.messagesTitle}</Text>
          <View style={{width:30}} />
        </View>

        {myChats.length === 0 ? (
          <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={60} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.subText }]}>{t.noMessages}</Text>
          </View>
        ) : (
          <FlatList 
            data={myChats} 
            renderItem={renderItem} 
            keyExtractor={item => item.id} 
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  chatItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, alignItems: 'center' },
  avatarContainer: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 22 },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatHeaderRow: { flexDirection:'row', justifyContent:'space-between' },
  userName: { fontWeight: 'bold', fontSize: 16 },
  lastMessage: { fontSize: 14, flex: 1 },
  date: { fontSize: 12 },
  boldText: { fontWeight: 'bold' },
  unreadBadge: { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, marginLeft: 5 },
  unreadText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 10 },
  deleteAction: { backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', width: 90, height: '100%' },
  deleteText: { color: 'white', fontWeight: 'bold', fontSize: 12, marginTop: 5 }
});

export default ChatListScreen;