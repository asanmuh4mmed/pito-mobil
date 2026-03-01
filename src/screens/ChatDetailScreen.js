import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, Alert, TouchableWithoutFeedback, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { COLORS } from '../constants/colors';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { ThemeContext } from '../context/ThemeContext';

const TRANSLATIONS = {
    TR: { unknown: "Bilinmeyen", user: "Kullanıcı", listing: "İlan", permRequired: "İzin Gerekli", permMsg: "Galeri izni vermelisiniz.", error: "Hata", photoError: "Fotoğraf sorunu.", typeMessage: "Mesaj yaz...", unsend: "Gönderiyi Geri Çek", cancel: "İptal", unsendConfirm: "Bu mesaj herkesten silinecek." },
    AU: { unknown: "Unknown", user: "User", listing: "Listing", permRequired: "Permission Required", permMsg: "Grant gallery permission.", error: "Error", photoError: "Photo error.", typeMessage: "Type a message...", unsend: "Unsend Message", cancel: "Cancel", unsendConfirm: "This message will be deleted for everyone." }
};

// ✅ ANİMASYONLU PATİ BUTONU (ÖZEL BİLEŞEN)
const AnimatedPawButton = ({ isLiked, onPress }) => {
    const scaleValue = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleValue, { toValue: 1.4, duration: 100, useNativeDriver: true }),
            Animated.spring(scaleValue, { toValue: 1, friction: 3, useNativeDriver: true })
        ]).start();
        onPress();
    };

    return (
        <TouchableWithoutFeedback onPress={handlePress}>
            <Animated.View style={[styles.pawButton, { transform: [{ scale: scaleValue }] }]}>
                <Ionicons 
                    name={isLiked ? "paw" : "paw-outline"} 
                    size={22} 
                    color={isLiked ? COLORS.primary : "white"} 
                />
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};

const ChatDetailScreen = ({ navigation, route }) => {
  const { user, country } = useContext(AuthContext); 
  const { sendMessage, conversations, markAsRead, reactToMessage, deleteMessage } = useContext(ChatContext);
  const { theme, isDarkMode } = useContext(ThemeContext);
  
  const activeLang = country?.code || 'TR';
  const t = TRANSLATIONS[activeLang];

  const params = route.params || {};
  const { chat, targetUser, listingId, listingName } = params;

  // Başlangıç değerleri
  const currentUserId = String(user?.id);
  let otherUser = targetUser || { id: 'unknown', fullname: t.unknown, avatar: null };
  let currentChatId = null;

  // ✅ SOHBET ID VE KARŞI TARAF BELİRLEME (DATABASE STANDARDI)
  if (chat) {
      // Mevcut sohbetten geldiysek ID bellidir
      currentChatId = chat.id;
      
      // Katılımcılardan 'ben' olmayanı bul
      if (chat.participants) {
          const found = chat.participants.find(p => String(p.id) !== currentUserId);
          if (found) {
              otherUser = { 
                  id: found.id, 
                  fullname: String(found.name || found.fullname || t.user), 
                  avatar: found.avatar 
              };
          }
      }
  } else if (targetUser) {
      // Yeni sohbet başlatılıyorsa ID'yi biz oluşturuyoruz: KüçükID_BüyükID
      // Bu standart sayesinde veritabanındaki 'room_id' ile eşleşir
      const ids = [String(user.id), String(targetUser.id)].sort();
      currentChatId = ids.join('_');
  }

  // ✅ CANLI VERİ AKIŞI
  // Context içindeki 'conversations' listesi Supabase Realtime ile besleniyor.
  // Biz de buradan güncel sohbet verisini çekiyoruz.
  const currentChatData = (conversations || []).find(c => c.id === currentChatId);
  const messages = currentChatData ? currentChatData.messages : [];
  
  const displayTitle = String(otherUser.fullname || t.user);
  const displaySubject = String(listingName || (currentChatData ? currentChatData.listingName : '') || '');

  const [text, setText] = useState('');
  const flatListRef = useRef();

  const handleProfilePress = () => {
      if (otherUser.id && otherUser.id !== 'unknown') {
        navigation.navigate('UserProfile', { userId: otherUser.id, userName: otherUser.fullname, userAvatar: otherUser.avatar });
      }
  };

  // ✅ OKUNDU BİLGİSİ GÜNCELLEME
  // Sayfa açıldığında veya yeni mesaj düştüğünde çalışır
  useEffect(() => {
    if (currentChatId && user) {
        markAsRead(currentChatId, user.id);
    }
  }, [currentChatId, messages.length]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert(t.permRequired, t.permMsg);
    
    let result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        quality: 0.5,
        base64: true // Supabase Storage yoksa base64 kullanabilirsin, varsa URL
    });

    if (!result.canceled) {
        // Not: Gerçek uygulamada önce Storage'a yükleyip URL almalısın.
        // Şimdilik direkt URI gönderiyoruz, Context bunu DB'ye yazar.
        sendMessage(currentChatId, user, otherUser, null, listingId, listingName, result.assets[0].uri, 'image');
    }
  };

  const handleSendText = () => {
    if (text.trim().length === 0) return;
    sendMessage(currentChatId, user, otherUser, text, listingId, listingName, null, 'text');
    setText('');
  };

  const handlePressReel = (targetPostId) => {
      navigation.navigate('Petsgram', { initialPostId: targetPostId });
  };

  const togglePawReaction = (messageId) => {
      reactToMessage(currentChatId, messageId, '🐾');
  };

  const handleLongPress = (message) => {
      if (String(message.senderId) !== currentUserId) return;
      Alert.alert(
          t.unsend,
          t.unsendConfirm,
          [
              { text: t.cancel, style: "cancel" },
              { text: t.unsend, style: 'destructive', onPress: () => deleteMessage(currentChatId, message.id) }
          ]
      );
  };

  const UserAvatar = ({ avatarUrl, name, style }) => {
    if (avatarUrl) return <Image source={{ uri: avatarUrl }} style={[styles.avatarImage, style]} />;
    return (
        <View style={[styles.avatarPlaceholder, style]}>
            <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : "?"}</Text>
        </View>
    );
  };

  const renderMessage = ({ item }) => {
    const isMe = String(item.senderId) === currentUserId;
    const isSharedPost = item.type === 'shared_post';
    const isPawLiked = item.reactions && item.reactions.includes('🐾');
    
    return (
      <View style={[styles.messageRow, isMe ? styles.rowRight : styles.rowLeft]}>
        {!isMe && (
           <TouchableOpacity onPress={handleProfilePress} style={{ marginRight: 8, alignSelf: 'flex-end' }}>
               <UserAvatar avatarUrl={otherUser.avatar} name={otherUser.fullname} />
           </TouchableOpacity>
        )}
        
        <TouchableWithoutFeedback onLongPress={() => handleLongPress(item)}>
            <View style={[
                styles.messageBubble, 
                isMe ? styles.bubbleMe : [styles.bubbleThem, { backgroundColor: theme.cardBg, borderColor: theme.border }],
                isSharedPost && { padding: 0, overflow: 'hidden', width: 240 }
            ]}>
                
                {isSharedPost ? (
                    <View>
                        <TouchableOpacity activeOpacity={0.9} onPress={() => handlePressReel(item.relatedId)}>
                            <View style={styles.sharedPostContainer}>
                                <Image source={{ uri: item.image }} style={styles.sharedPostImage} />
                                <View style={styles.playIconOverlay}>
                                    <Ionicons name="play" size={36} color="white" style={{ opacity: 0.9 }} />
                                </View>
                                <View style={styles.sharedPostFooter}>
                                    <Ionicons name="film-outline" size={14} color="white" style={{marginRight:5}} />
                                    <Text numberOfLines={1} style={styles.sharedPostText}>{item.text}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                        <AnimatedPawButton isLiked={isPawLiked} onPress={() => togglePawReaction(item.id)} />
                    </View>
                ) : (
                    <>
                        {item.image && <Image source={{ uri: item.image }} style={styles.messageImage} />}
                        {item.text ? <Text style={[styles.messageText, isMe ? styles.textMe : { color: theme.text }]}>{String(item.text)}</Text> : null}
                        {isPawLiked && (
                            <View style={styles.textReactionBadge}>
                                <Ionicons name="paw" size={10} color={COLORS.primary} />
                            </View>
                        )}
                    </>
                )}

                <View style={[styles.metaContainer, isSharedPost && styles.metaContainerReel]}>
                    <Text style={[styles.timeText, isMe ? styles.timeMe : { color: theme.subText }, isSharedPost && {color:'rgba(255,255,255,0.7)'}]}>
                        {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                    {isMe && <Ionicons name={item.isRead ? "checkmark-done-all" : "checkmark-outline"} size={16} color={isSharedPost ? "white" : (item.isRead ? "#E0F7FA" : "rgba(255,255,255,0.7)")} style={{ marginLeft: 4 }} />}
                </View>
            </View>
        </TouchableWithoutFeedback>

        {isMe && (
           <View style={{ marginLeft: 8, alignSelf: 'flex-end' }}>
               <UserAvatar avatarUrl={user?.avatar} name={user?.fullname} />
           </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? theme.background : '#EFE7DE' }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color={theme.icon} /></TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={handleProfilePress}>
            <View style={{ marginRight: 10 }}><UserAvatar avatarUrl={otherUser.avatar} name={otherUser.fullname} style={{ width: 36, height: 36, borderRadius: 18 }} /></View>
            <View style={styles.headerInfo}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{displayTitle}</Text>
                {displaySubject ? <Text style={styles.headerSub}>{displaySubject}</Text> : null}
            </View>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        <View style={[styles.inputWrapper, { backgroundColor: theme.background }]}>
            <View style={[styles.inputContainer, { backgroundColor: theme.cardBg }]}>
                <TouchableOpacity onPress={pickImage} style={styles.attachBtn}><Ionicons name="add" size={28} color={COLORS.primary} /></TouchableOpacity>
                <TextInput style={[styles.input, { color: theme.text }]} value={text} onChangeText={setText} placeholder={t.typeMessage} placeholderTextColor={theme.subText} multiline />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSendText}><Ionicons name="send" size={20} color="white" /></TouchableOpacity>
            </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 15, borderBottomWidth: 1, elevation: 2 },
  backButton: { marginRight: 10 },
  headerInfo: { flex: 1, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  headerSub: { fontSize: 12, color: COLORS.primary },
  listContent: { padding: 15, paddingBottom: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 15, width: '100%', alignItems: 'flex-end' },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  avatarImage: { width: 32, height: 32, borderRadius: 16 },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ADB5BD', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  messageBubble: { maxWidth: '75%', padding: 10, paddingHorizontal: 14, borderRadius: 18, elevation: 1 },
  bubbleMe: { backgroundColor: COLORS.primary, borderTopRightRadius: 4, borderBottomRightRadius: 18, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
  bubbleThem: { borderTopLeftRadius: 4, borderBottomLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderWidth: 1 },
  messageText: { fontSize: 16, lineHeight: 22 },
  messageImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 5, resizeMode: 'cover' }, 
  textMe: { color: 'white' },
  metaContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  metaContainerReel: { position:'absolute', bottom: 5, right: 5, backgroundColor:'rgba(0,0,0,0.3)', paddingHorizontal:4, borderRadius:4 },
  timeText: { fontSize: 11 },
  timeMe: { color: 'rgba(255,255,255,0.85)' },
  sharedPostContainer: { width: '100%', height: 320, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  sharedPostImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  playIconOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  sharedPostFooter: { position: 'absolute', bottom: 0, width: '100%', padding: 10, paddingRight: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  sharedPostText: { fontSize: 13, fontWeight: '600', color: 'white' },
  pawButton: { position: 'absolute', bottom: 40, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  textReactionBadge: { position: 'absolute', bottom: -8, left: 10, backgroundColor: '#fff', padding: 3, borderRadius: 10, borderWidth: 1, borderColor: '#eee', elevation: 2 },
  inputWrapper: { padding: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 25, paddingHorizontal: 5, paddingVertical: 5 },
  input: { flex: 1, paddingHorizontal: 10, paddingVertical: 10, maxHeight: 100, fontSize: 16 },
  sendBtn: { backgroundColor: COLORS.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
  attachBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginLeft: 5 } 
});

export default ChatDetailScreen;