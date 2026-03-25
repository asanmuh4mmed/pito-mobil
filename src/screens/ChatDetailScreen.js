import React, { useState, useContext, useEffect, useRef, memo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, Alert, TouchableWithoutFeedback, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { COLORS } from '../constants/colors';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { ThemeContext } from '../context/ThemeContext';

const TRANSLATIONS = {
    TR: { unknown: "Bilinmeyen", user: "Kullanıcı", listing: "İlan", permRequired: "İzin Gerekli", permMsg: "Galeri izni vermelisiniz.", error: "Hata", photoError: "Fotoğraf sorunu.", typeMessage: "Mesaj yaz...", unsend: "Gönderiyi Geri Çek", cancel: "İptal", unsendConfirm: "Bu mesaj herkesten silinecek.", regardingListing: "İlgili İlan:" },
    AU: { unknown: "Unknown", user: "User", listing: "Listing", permRequired: "Permission Required", permMsg: "Grant gallery permission.", error: "Error", photoError: "Photo error.", typeMessage: "Type a message...", unsend: "Unsend Message", cancel: "Cancel", unsendConfirm: "This message will be deleted for everyone.", regardingListing: "Regarding Listing:" }
};

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
                    color={isLiked ? '#6C5CE7' : "white"} 
                />
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};

const UserAvatar = memo(({ avatarUrl, name, style }) => {
    if (avatarUrl) return <Image source={{ uri: avatarUrl }} style={[styles.avatarImage, style]} />;
    return (
        <View style={[styles.avatarPlaceholder, style]}>
            <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : "?"}</Text>
        </View>
    );
});

const ChatDetailScreen = ({ navigation, route }) => {
  const { user, country } = useContext(AuthContext); 
  const { sendMessage, conversations, markAsRead, reactToMessage, deleteMessage } = useContext(ChatContext);
  const { theme, isDarkMode } = useContext(ThemeContext);
  
  const activeLang = country?.code || 'TR';
  const t = TRANSLATIONS[activeLang];

  const params = route.params || {};
  const { chat, targetUser, listingId, listingName } = params;

  const currentUserId = String(user?.id);
  let otherUser = targetUser || { id: 'unknown', fullname: t.unknown, avatar: null };
  let currentChatId = null;

  if (chat) {
      currentChatId = chat.id;
      
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
      const ids = [String(user.id), String(targetUser.id)].sort();
      currentChatId = ids.join('_');
  }

  const currentChatData = (conversations || []).find(c => c.id === currentChatId);
  const messages = currentChatData ? currentChatData.messages : [];
  
  const displayTitle = String(otherUser.fullname || t.user);
  
  let displaySubject = '';
  if (listingName && listingName !== 'undefined') displaySubject = listingName;
  else if (currentChatData && currentChatData.listingName && currentChatData.listingName !== 'undefined') displaySubject = currentChatData.listingName;

  const [text, setText] = useState('');
  const flatListRef = useRef();

  const handleProfilePress = () => {
      if (otherUser.id && otherUser.id !== 'unknown') {
        navigation.navigate('UserProfile', { userId: otherUser.id, userName: otherUser.fullname, userAvatar: otherUser.avatar });
      }
  };

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
        base64: true 
    });

    if (!result.canceled) {
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

  const renderListingBanner = () => {
      if (!displaySubject || displaySubject.trim() === '') return null;
      return (
          <View style={styles.listingBannerContainer}>
              <View style={styles.listingBanner}>
                  <Ionicons name="pricetag" size={16} color="#6C5CE7" />
                  <Text style={styles.listingBannerText}>
                      {t.regardingListing} <Text style={{fontWeight: 'bold'}}>{displaySubject}</Text>
                  </Text>
              </View>
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
                isMe ? styles.bubbleMe : [styles.bubbleThem, { backgroundColor: isDarkMode ? '#1E1E2C' : '#FFFFFF', borderColor: isDarkMode ? '#2D2D3F' : 'rgba(108, 92, 231, 0.15)' }],
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
                                <Ionicons name="paw" size={10} color="#6C5CE7" />
                            </View>
                        )}
                    </>
                )}

                <View style={[styles.metaContainer, isSharedPost && styles.metaContainerReel]}>
                    <Text style={[styles.timeText, isMe ? styles.timeMe : { color: theme.subText }, isSharedPost && {color:'rgba(255,255,255,0.7)'}]}>
                        {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                    {isMe && <Ionicons name={item.isRead ? "checkmark-done-all" : "checkmark-outline"} size={16} color={isSharedPost ? "white" : (item.isRead ? "#00E5FF" : "rgba(255,255,255,0.7)")} style={{ marginLeft: 4 }} />}
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
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F8F9FA' }]} edges={['top', 'right', 'left']}>
        {/* ✨ KESİN ÇÖZÜM: Android'de 'height' ve ekstra offset kullanarak zorla yukarı itmesini sağlıyoruz. */}
        <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            keyboardVerticalOffset={Platform.OS === 'android' ? 25 : 0} 
        >
            <View style={[styles.header, { backgroundColor: theme.cardBg }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, {backgroundColor: isDarkMode ? '#333' : '#F0F0F0'}]}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10 }} onPress={handleProfilePress} activeOpacity={0.8}>
                    <UserAvatar avatarUrl={otherUser.avatar} name={otherUser.fullname} style={{ width: 40, height: 40, borderRadius: 20 }} />
                    <View style={styles.headerInfo}>
                        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{displayTitle}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderListingBanner} 
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            />

            <View style={[styles.inputWrapper, { backgroundColor: theme.background }]}>
                <View style={[styles.inputContainer, { backgroundColor: theme.cardBg, borderColor: isDarkMode ? '#333' : '#E0E0E0', borderWidth: 1 }]}>
                    <TouchableOpacity onPress={pickImage} style={styles.attachBtn}>
                        <Ionicons name="add-circle" size={30} color="#6C5CE7" />
                    </TouchableOpacity>
                    <TextInput 
                        style={[styles.input, { color: theme.text }]} 
                        value={text} 
                        onChangeText={setText} 
                        placeholder={t.typeMessage} 
                        placeholderTextColor={theme.subText} 
                        multiline 
                    />
                    <TouchableOpacity 
                        style={[styles.sendBtn, { backgroundColor: text.trim().length > 0 ? '#6C5CE7' : 'rgba(108, 92, 231, 0.4)' }]} 
                        onPress={handleSendText}
                        disabled={text.trim().length === 0}
                    >
                        <Ionicons name="send" size={18} color="white" style={{marginLeft: 2}} />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 10 },
  backButton: { padding: 8, borderRadius: 14 },
  headerInfo: { flex: 1, justifyContent: 'center', marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  
  listingBannerContainer: { width: '100%', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  listingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(108, 92, 231, 0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  listingBannerText: { color: '#6C5CE7', fontSize: 12, marginLeft: 6 },

  listContent: { padding: 15, paddingBottom: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 15, width: '100%', alignItems: 'flex-end' },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  
  avatarImage: { width: 30, height: 30, borderRadius: 15 },
  avatarPlaceholder: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  
  messageBubble: { maxWidth: '75%', padding: 12, paddingHorizontal: 16, borderRadius: 20, elevation: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05 },
  bubbleMe: { backgroundColor: '#6C5CE7', borderTopRightRadius: 4, borderBottomRightRadius: 20, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  bubbleThem: { borderTopLeftRadius: 4, borderBottomLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, borderWidth: 1 },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 5, resizeMode: 'cover' }, 
  textMe: { color: 'white', fontWeight: '500' },
  
  metaContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  metaContainerReel: { position:'absolute', bottom: 5, right: 5, backgroundColor:'rgba(0,0,0,0.3)', paddingHorizontal:6, paddingVertical: 2, borderRadius:8 },
  timeText: { fontSize: 10, fontWeight: '600' },
  timeMe: { color: 'rgba(255,255,255,0.7)' },
  
  sharedPostContainer: { width: '100%', height: 320, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  sharedPostImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  playIconOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  sharedPostFooter: { position: 'absolute', bottom: 0, width: '100%', padding: 12, paddingRight: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  sharedPostText: { fontSize: 13, fontWeight: '600', color: 'white' },
  
  pawButton: { position: 'absolute', bottom: 45, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 8, borderRadius: 20, elevation: 5, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  textReactionBadge: { position: 'absolute', bottom: -8, left: 15, backgroundColor: '#fff', padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#eee', elevation: 3 },
  
  inputWrapper: { paddingHorizontal: 15, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 25 : 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 25, paddingHorizontal: 5, paddingVertical: 5 },
  input: { flex: 1, paddingHorizontal: 10, paddingVertical: 12, maxHeight: 100, fontSize: 16 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
  attachBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginLeft: 5 } 
});

export default ChatDetailScreen;