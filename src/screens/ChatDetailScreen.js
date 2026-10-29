import React, { useState, useContext, useEffect, useRef, memo, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, Modal, AppState, ActivityIndicator, Alert, TouchableWithoutFeedback, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { COLORS } from '../constants/colors';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { supabase } from '../lib/supabase';
import { useIsFocused } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';

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
  TR: { unknown: "Bilinmeyen", user: "Kullanıcı", listing: "İlan", permRequired: "İzin Gerekli", permMsg: "Galeri izni vermelisiniz.", error: "Hata", photoError: "Fotoğraf sorunu.", typeMessage: "Mesaj yaz...", unsend: "Gönderiyi Geri Çek", cancel: "İptal", unsendConfirm: "Bu mesaj herkesten silinecek.", regardingListing: "İlgili İlan:" },
  AU: { unknown: "Unknown", user: "User", listing: "Listing", permRequired: "Permission Required", permMsg: "Grant gallery permission.", error: "Error", photoError: "Photo error.", typeMessage: "Type a message...", unsend: "Unsend Message", cancel: "Cancel", unsendConfirm: "This message will be deleted for everyone.", regardingListing: "Regarding Listing:" }
};

const AnimatedPawButton = memo(({ isLiked, onPress }) => {
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
                    size={20} 
                    color={isLiked ? PITO_COLORS.navyBg : PITO_COLORS.white} 
                />
            </Animated.View>
        </TouchableWithoutFeedback>
    );
});

const UserAvatar = memo(({ avatarUrl, name, style }) => {
    if (avatarUrl) return <Image source={{ uri: avatarUrl }} style={[styles.avatarImage, style]} />;
    return (
        <View style={[styles.avatarPlaceholder, style]}>
            <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : "?"}</Text>
        </View>
    );
});

const ChatImage = memo(({ uri, onPress, onLongPress }) => {
    const [failed, setFailed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => { setFailed(false); setLoading(true); }, [uri]);
    return <TouchableOpacity activeOpacity={0.9} onPress={() => { if (!failed) onPress(uri); }} onLongPress={onLongPress} style={styles.chatImageFrame}>
        {!failed && <Image key={`${uri}_${attempt}`} source={{ uri }} style={styles.messageImage}
            onLoadStart={() => setLoading(true)}
            onLoad={() => { setLoading(false); setFailed(false); }}
            onError={({ nativeEvent }) => { setLoading(false); setFailed(true); console.log('Sohbet fotoğrafı yüklenemedi:', nativeEvent.error); }} />}
        {loading && !failed && <View style={styles.imageOverlay}><ActivityIndicator color={PITO_COLORS.navyBg} /></View>}
        {failed && <TouchableOpacity style={styles.imageOverlay} onPress={() => { setFailed(false); setLoading(true); setAttempt(prev => prev + 1); }}>
            <Ionicons name="image-outline" size={28} color={PITO_COLORS.navyBg} />
            <Text style={styles.imageErrorText}>Fotoğraf yüklenemedi</Text><Text style={styles.imageRetryText}>Tekrar denemek için dokun</Text>
        </TouchableOpacity>}
    </TouchableOpacity>;
});

// ✅ OPTİMİZASYON: Mesaj öğesi tamamen izole edildi. Yazı yazarken listeyi dondurmaz.
const MessageItem = memo(({ item, currentUserId, otherUser, theme, isDarkMode, onProfilePress, onLongPress, onTogglePaw, onPressReel, onOpenImage }) => {
    const isMe = String(item.senderId) === currentUserId;
    const isSharedPost = item.type === 'shared_post';
    const isPawLiked = item.reactions && item.reactions.includes('🐾');
    
    return (
      <View style={[styles.messageRow, isMe ? styles.rowRight : styles.rowLeft]}>
        {!isMe && (
           <TouchableOpacity onPress={() => onProfilePress(otherUser)} style={{ marginRight: 8, alignSelf: 'flex-end', marginBottom: 2 }}>
               <UserAvatar avatarUrl={otherUser.avatar} name={otherUser.fullname} style={styles.msgAvatar} />
           </TouchableOpacity>
        )}
        
        <TouchableWithoutFeedback onLongPress={() => onLongPress(item)}>
            <View style={[
                styles.messageBubble, 
                isMe ? styles.bubbleMe : [
                  styles.bubbleThem, 
                  { 
                    backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, 
                    borderColor: isDarkMode ? PITO_COLORS.navyLight : `${PITO_COLORS.primary}50` 
                  }
                ],
                isSharedPost && { padding: 0, overflow: 'hidden', width: 240, borderWidth: 0 }
            ]}>
                
                {isSharedPost ? (
                    <View>
                        <TouchableOpacity activeOpacity={0.95} onPress={() => onPressReel(item.relatedId)}>
                            <View style={styles.sharedPostContainer}>
                                <Image source={{ uri: item.image }} style={styles.sharedPostImage} />
                                <View style={styles.playIconOverlay}>
                                    <View style={styles.playIconCircle}>
                                      <Ionicons name="play" size={26} color={PITO_COLORS.primary} style={{ marginLeft: 3 }} />
                                    </View>
                                </View>
                                <View style={styles.sharedPostFooter}>
                                    <Ionicons name="film-outline" size={14} color={PITO_COLORS.primary} style={{marginRight:6}} />
                                    <Text numberOfLines={1} style={styles.sharedPostText}>{item.text}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                        <AnimatedPawButton isLiked={isPawLiked} onPress={() => onTogglePaw(item.id)} />
                    </View>
                ) : (
                    <>
                        {!!item.image && <ChatImage uri={item.image} onPress={onOpenImage} onLongPress={() => onLongPress(item)} />}
                        {item.text ? <Text style={[styles.messageText, isMe ? styles.textMe : { color: theme.text }]}>{String(item.text)}</Text> : null}
                        {isPawLiked && (
                            <View style={[styles.textReactionBadge, { borderColor: isDarkMode ? PITO_COLORS.navyLight : '#EAEAEA' }]}>
                                <Ionicons name="paw" size={12} color={PITO_COLORS.primary} />
                            </View>
                        )}
                    </>
                )}

                <View style={[styles.metaContainer, isSharedPost && styles.metaContainerReel]}>
                    <Text style={[styles.timeText, isMe ? styles.timeMe : { color: theme.subText }, isSharedPost && {color:'white'}]}>
                        {item.status === 'sending' ? '…' : new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Text>
                    {isMe && (
                      <Ionicons 
                        name={item.isRead ? "checkmark-done" : "checkmark-outline"} 
                        size={15} 
                        color={isSharedPost ? "white" : (item.isRead ? PITO_COLORS.navyBg : "rgba(11, 19, 30, 0.5)")} 
                        style={{ marginLeft: 4 }} 
                      />
                    )}
                </View>
            </View>
        </TouchableWithoutFeedback>
      </View>
    );
});

const ChatDetailScreen = ({ navigation, route }) => {
  const { user, country } = useContext(AuthContext); 
  const { sendMessage, conversations, markAsRead, reactToMessage, deleteMessage } = useContext(ChatContext);
  const { theme: appTheme, isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? appTheme : { ...appTheme, background: '#F8F5EF', cardBg: '#FFFFFF', text: '#142239', subText: '#78808D', border: '#EAE4D8' };
  
  const activeLang = country?.code || 'TR';
  const t = TRANSLATIONS[activeLang] || TRANSLATIONS.TR;

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
  } else if (targetUser && user?.id) {
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
  const [selectedImage, setSelectedImage] = useState(null);
  const [fullImageFailed, setFullImageFailed] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const isFocused = useIsFocused();
  const typingChannelRef = useRef(null);
  const typingReadyRef = useRef(false);
  const typingSentAtRef = useRef(0);
  const typingIdleRef = useRef(null);
  const peerTypingTimerRef = useRef(null);
  const typingTextRef = useRef('');
  const appStateRef = useRef(AppState.currentState);

  const openImage = useCallback((uri) => { setFullImageFailed(false); setSelectedImage(uri); }, []);
  const broadcastTyping = useCallback((isTyping) => {
    if (!typingReadyRef.current || !typingChannelRef.current) return;
    typingSentAtRef.current = isTyping ? Date.now() : 0;
    typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserId, isTyping } })
      .then(status => { if (status !== 'ok') console.log('Yazıyor bilgisi gönderilemedi:', status); })
      .catch(error => console.log('Yazıyor bağlantısı:', error.message));
  }, [currentUserId]);
  const stopTyping = useCallback(() => {
    clearTimeout(typingIdleRef.current);
    typingTextRef.current = '';
    broadcastTyping(false);
  }, [broadcastTyping]);
  const handleTextChange = useCallback((value) => {
    setText(value);
    typingTextRef.current = value;
    clearTimeout(typingIdleRef.current);
    if (!value.trim()) { stopTyping(); return; }
    if (appStateRef.current !== 'active') return;
    if (Date.now() - typingSentAtRef.current > 1200) broadcastTyping(true);
    typingIdleRef.current = setTimeout(stopTyping, 2000);
  }, [broadcastTyping, stopTyping]);

  useEffect(() => {
    if (!isFocused || !otherUser.id || otherUser.id === 'unknown') { setPeerOnline(false); return; }
    let live = true;
    let revision = 0;
    setPeerOnline(false);
    const refreshOnline = async () => {
      const startRevision = revision;
      try {
        const { data, error } = await supabase.from('pito_public_profiles').select('is_online').eq('id', otherUser.id).single();
        if (live && startRevision === revision) setPeerOnline(!error && data?.is_online === true);
      } catch { if (live && startRevision === revision) setPeerOnline(false); }
    };
    const onlineChannel = supabase.channel(`pito-online:${currentUserId}:${otherUser.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${otherUser.id}` }, ({ new: updated }) => { revision++; if (live) setPeerOnline(updated.is_online === true); })
      .subscribe(status => { if (status === 'SUBSCRIBED') refreshOnline(); });
    refreshOnline();
    const poll = setInterval(refreshOnline, 15000);
    return () => { live = false; clearInterval(poll); supabase.removeChannel(onlineChannel); };
  }, [isFocused, otherUser.id, currentUserId]);

  useEffect(() => {
    setPeerTyping(false);
    if (!isFocused || !currentChatId || !user?.id) return;
    let live = true;
    const channel = supabase.channel(`pito-typing:${currentChatId}`, { config: { private: true, broadcast: { self: false } } });
    typingChannelRef.current = channel;
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (!live || appStateRef.current !== 'active' || String(payload?.userId) !== String(otherUser.id)) return;
      clearTimeout(peerTypingTimerRef.current);
      setPeerTyping(payload?.isTyping === true);
      if (payload?.isTyping === true) peerTypingTimerRef.current = setTimeout(() => setPeerTyping(false), 4500);
    }).subscribe(status => {
      if (!live) return;
      typingReadyRef.current = status === 'SUBSCRIBED';
      if (status === 'SUBSCRIBED' && typingTextRef.current.trim() && appStateRef.current === 'active') broadcastTyping(true);
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { setPeerTyping(false); console.log('Yazıyor kanalı bağlanamadı. Realtime izinlerini kontrol edin.'); }
    });
    const appSubscription = AppState.addEventListener('change', state => {
      appStateRef.current = state;
      if (state !== 'active') { stopTyping(); setPeerTyping(false); }
    });
    return () => {
      stopTyping();
      live = false;
      typingReadyRef.current = false;
      typingChannelRef.current = null;
      clearTimeout(peerTypingTimerRef.current);
      appSubscription.remove();
      supabase.removeChannel(channel);
    };
  }, [isFocused, currentChatId, user?.id, otherUser.id, broadcastTyping, stopTyping]);

  const [isSendingImage, setIsSendingImage] = useState(false);
  const [isSendingText, setIsSendingText] = useState(false);
  const textSendLock = useRef(false);
  const screenScope = useRef({ live: true, account: user?.id, chatId: currentChatId });
  screenScope.current.account = user?.id;
  screenScope.current.chatId = currentChatId;
  useEffect(() => { screenScope.current.live = true; return () => { screenScope.current.live = false; }; }, []);
  const flatListRef = useRef();

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && String(last.senderId) === String(otherUser.id)) {
      clearTimeout(peerTypingTimerRef.current);
      setPeerTyping(false);
    }
  }, [messages.length, otherUser.id]);

  const handleProfilePress = useCallback((target) => {
      const u = target || otherUser;
      if (u.id && u.id !== 'unknown') {
        navigation.navigate('UserProfile', { userId: u.id, userName: u.fullname, userAvatar: u.avatar });
      }
  }, [navigation, otherUser]);

  useEffect(() => {
    if (currentChatId && user) {
        markAsRead(currentChatId, user.id);
    }
  }, [currentChatId, messages.length]);

 const pickImage = async () => {
    if (isSendingImage) return;
    setIsSendingImage(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert(t.permRequired, t.permMsg); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const response = await sendMessage(currentChatId, user, otherUser, null, listingId, listingName, asset.uri, 'image', null, asset);
      if (response?.success === false) Alert.alert(t.error, response.error || t.photoError);
    } catch (error) {
      console.error('Fotoğraf gönderme hatası:', error);
      Alert.alert(t.error, error.message || t.photoError);
    } finally { setIsSendingImage(false); }
  };

  const handleSendText = async () => {
    if (!text.trim() || textSendLock.current || !user?.id || !currentChatId || otherUser.id === 'unknown') return;
    const outgoing = text;
    const account = user.id;
    const chatId = currentChatId;
    const current = () => screenScope.current.live && screenScope.current.account === account && screenScope.current.chatId === chatId;
    textSendLock.current = true;
    setIsSendingText(true);
    stopTyping(); setText('');
    try {
      const response = await sendMessage(chatId, user, otherUser, outgoing, listingId, listingName, null, 'text');
      if (response?.success !== true) throw new Error(response?.error || (activeLang === 'TR' ? 'Mesaj gönderimi doğrulanamadı.' : 'Message delivery could not be confirmed.'));
    } catch (error) {
      if (current()) {
        setText(value => value ? `${outgoing}\n${value}` : outgoing);
        Alert.alert(t.error, error.message || (activeLang === 'TR' ? 'Mesaj gönderilemedi.' : 'Could not send message.'));
      }
    } finally { textSendLock.current = false; if (screenScope.current.live) setIsSendingText(false); }
  };

  const handlePressReel = useCallback((targetPostId) => {
      navigation.navigate('Petsgram', { initialPostId: targetPostId });
  }, [navigation]);

  const togglePawReaction = useCallback((messageId) => {
      reactToMessage(currentChatId, messageId, '🐾');
  }, [currentChatId, reactToMessage]);

  const handleLongPress = useCallback((message) => {
      if (String(message.senderId) !== currentUserId) return;
      Alert.alert(
          t.unsend,
          t.unsendConfirm,
          [
              { text: t.cancel, style: "cancel" },
              { text: t.unsend, style: 'destructive', onPress: () => deleteMessage(currentChatId, message.id) }
          ]
      );
  }, [currentUserId, currentChatId, deleteMessage, t]);

  const renderListingBanner = () => {
      if (!displaySubject || displaySubject.trim() === '') return null;
      return (
          <View style={styles.listingBannerContainer}>
              <View style={[styles.listingBanner, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : `${PITO_COLORS.primary}15`, borderColor: isDarkMode ? PITO_COLORS.navyLight : `${PITO_COLORS.primary}30` }]}>
                  <View style={styles.listingBannerIconBox}>
                    <Ionicons name="pricetag" size={14} color={PITO_COLORS.navyBg} />
                  </View>
                  <Text style={[styles.listingBannerText, { color: theme.text }]}>
                      {t.regardingListing} <Text style={{fontWeight: '800', color: PITO_COLORS.primary}}>{displaySubject}</Text>
                  </Text>
              </View>
          </View>
      );
  };

  const renderMessage = useCallback(({ item, index }) => {
      const date = new Date(item.createdAt);
      const previous = index > 0 ? new Date(messages[index - 1]?.createdAt) : null;
      const showDate = Number.isFinite(date.getTime()) && (!previous || date.toDateString() !== previous.toDateString());
      const label = Number.isFinite(date.getTime()) ? date.toLocaleDateString(activeLang === 'TR' ? 'tr-TR' : 'en-AU', { day: 'numeric', month: 'long' }) : '';
      return <View>{showDate && <View style={styles.daySeparator}><View style={styles.dayLine} /><Text style={[styles.dayText, { color: theme.subText }]}>{label}</Text><View style={styles.dayLine} /></View>}<MessageItem 
          item={item} 
          currentUserId={currentUserId} 
          otherUser={otherUser} 
          theme={theme} 
          isDarkMode={isDarkMode} 
          onProfilePress={handleProfilePress} 
          onLongPress={handleLongPress} 
          onTogglePaw={togglePawReaction} 
          onPressReel={handlePressReel}
          onOpenImage={openImage} 
      /></View>;
  }, [messages, activeLang, currentUserId, otherUser, theme, isDarkMode, handleProfilePress, handleLongPress, togglePawReaction, handlePressReel, openImage]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : '#F8F5EF' }]} edges={['top', 'right', 'left']}>
       <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25} 
        >
            {/* MODERN PREMIUM HEADER */}
            <View style={[styles.header, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, {backgroundColor: isDarkMode ? PITO_COLORS.navyLight : '#F0EADD'}]}>
                    <Ionicons name="arrow-back" size={22} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerProfileArea} onPress={() => handleProfilePress()} activeOpacity={0.85}>
                    <View>
                      <UserAvatar avatarUrl={otherUser.avatar} name={otherUser.fullname} style={styles.headerAvatar} />
                      {peerOnline && <View style={styles.onlineHeaderDot} />}
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{displayTitle}</Text>
                        <Text style={[styles.headerSubtitle, (peerTyping || peerOnline) && { color: PITO_COLORS.success }]}>{peerTyping ? (activeLang === 'TR' ? 'Yazıyor…' : 'Typing…') : peerOnline ? (activeLang === 'TR' ? 'Aktif' : 'Online') : (activeLang === 'TR' ? 'Sohbettesiniz' : 'Chat')}</Text>
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
                ListEmptyComponent={<View style={styles.emptyChat}><View style={styles.emptyChatIcon}><Ionicons name="chatbubble-ellipses-outline" size={32} color={PITO_COLORS.primary} /></View><Text style={[styles.emptyChatTitle, { color: theme.text }]}>{activeLang === 'TR' ? 'Bir merhaba ile başla.' : 'Start with a hello.'}</Text><Text style={[styles.emptyChatText, { color: theme.subText }]}>{activeLang === 'TR' ? 'İlan hakkında sorularını sor, tanış ve paylaş.' : 'Ask about the listing, connect and share.'}</Text></View>} 
                // KAYDIRMA ANİMASYONUNU FALSE YAPTIK (Klavye açıkken zıplamayı önler)
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                // 🔥 İŞTE BUG'IN ÇÖZÜMÜ: Android'de kaydırınca klavye kapanmasını devreden çıkardık 🔥
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'} 
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
            />

            {/* YÜZEN ÇAĞDAŞ MESAJ GİRİŞ KUTUSU (FLOATING BAR) */}
            <View style={[styles.inputWrapper, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : '#F8F5EF' }]}>
                <View style={[styles.inputContainer, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: isDarkMode ? PITO_COLORS.navyLight : '#EAE4D8' }]}>
                    <TouchableOpacity onPress={pickImage} style={styles.attachBtn} disabled={isSendingImage}>
                        <View style={[styles.attachIconCircle, { backgroundColor: isDarkMode ? PITO_COLORS.navyLight : `${PITO_COLORS.primary}20` }]}>
                          {isSendingImage ? <ActivityIndicator size="small" color={PITO_COLORS.primary} /> : <Ionicons name="image" size={18} color={PITO_COLORS.primary} />}
                        </View>
                    </TouchableOpacity>
                    <TextInput 
                        style={[styles.input, { color: theme.text }]} 
                        value={text} 
                        onChangeText={handleTextChange}
                        onBlur={stopTyping} 
                        placeholder={t.typeMessage} 
                        placeholderTextColor={theme.subText} 
                        multiline 
                    />
                    <TouchableOpacity 
                        style={[styles.sendBtn, { backgroundColor: text.trim().length > 0 ? PITO_COLORS.primary : (isDarkMode ? PITO_COLORS.navyLight : '#EAE4D8') }]} 
                        onPress={handleSendText}
                        disabled={isSendingText || text.trim().length === 0}
                    >
                        {isSendingText ? <ActivityIndicator size="small" color={PITO_COLORS.navyBg} /> : <Ionicons name="send" size={18} color={text.trim().length > 0 ? PITO_COLORS.navyBg : theme.subText} style={{marginLeft: 2}} />}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
        <Modal visible={!!selectedImage} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
          <SafeAreaView style={styles.photoViewer}>
            <View style={styles.photoViewerHeader}><Text style={styles.photoViewerTitle}>{activeLang === 'TR' ? 'Fotoğraf' : 'Photo'}</Text><TouchableOpacity style={styles.photoCloseButton} onPress={() => setSelectedImage(null)} accessibilityRole="button" accessibilityLabel={activeLang === 'TR' ? 'Kapat' : 'Close'}><Ionicons name="close" size={27} color="white" /></TouchableOpacity></View>
            {selectedImage && !fullImageFailed && <Image source={{ uri: selectedImage }} style={styles.fullPhoto} resizeMode="contain" onError={() => setFullImageFailed(true)} />}
            {fullImageFailed && <View style={styles.photoViewerError}><Ionicons name="image-outline" size={42} color="white" /><Text style={styles.photoViewerTitle}>{activeLang === 'TR' ? 'Fotoğraf açılamadı.' : 'Unable to load photo.'}</Text><TouchableOpacity onPress={() => setFullImageFailed(false)}><Text style={{ color: PITO_COLORS.primary, padding: 15 }}>{activeLang === 'TR' ? 'Tekrar dene' : 'Retry'}</Text></TouchableOpacity></View>}
          </SafeAreaView>
        </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  photoViewer: { flex: 1, backgroundColor: '#05080D' },
  photoViewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  photoViewerTitle: { color: 'white', fontSize: 15, fontWeight: '600', marginTop: 8 },
  photoCloseButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  fullPhoto: { width: '100%', flex: 1 },
  photoViewerError: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  daySeparator: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18, paddingHorizontal: 24 }, dayLine: { flex: 1, height: 1, backgroundColor: 'rgba(160,150,125,0.18)' }, dayText: { fontSize: 10, fontWeight: '600' },
  emptyChat: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 }, emptyChatIcon: { width: 76, height: 76, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(197,160,89,0.1)', marginBottom: 18 }, emptyChatTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' }, emptyChatText: { fontSize: 12, lineHeight: 20, marginTop: 9, textAlign: 'center' },
  
  // Canlı Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 17, 
    elevation: 0, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.03, 
    shadowRadius: 10, 
    borderBottomLeftRadius: 0, 
    borderBottomRightRadius: 0, 
    zIndex: 10 
  },
  backButton: { padding: 10, borderRadius: 16 },
  headerProfileArea: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12 },
  headerAvatar: { width: 47, height: 47, borderRadius: 17, borderWidth: 1, borderColor: PITO_COLORS.primary },
  onlineHeaderDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: PITO_COLORS.success, borderWidth: 2, borderColor: PITO_COLORS.navyBg },
  headerInfo: { flex: 1, justifyContent: 'center', marginLeft: 12 },
  headerTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, fontWeight: '600', color: PITO_COLORS.primary, marginTop: 1 },
  
  // İlan Banner
  listingBannerContainer: { width: '100%', alignItems: 'center', marginBottom: 18, marginTop: 8 },
  listingBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, borderWidth: 1, elevation: 2, shadowColor: PITO_COLORS.primary, shadowOffset: {width:0, height:2}, shadowOpacity: 0.05 },
  listingBannerIconBox: { width: 24, height: 24, borderRadius: 12, backgroundColor: PITO_COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  listingBannerText: { fontSize: 12, fontWeight: '500' },

  listContent: { padding: 16, paddingBottom: 24 },
  messageRow: { flexDirection: 'row', marginBottom: 14, width: '100%', alignItems: 'flex-end' },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  
  msgAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: PITO_COLORS.primary },
  avatarImage: { width: 32, height: 32, borderRadius: 16 },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: PITO_COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: PITO_COLORS.navyBg, fontWeight: '900', fontSize: 14 },
  
  // Mesaj Balonları (Premium Altın)
  messageBubble: { maxWidth: '80%', padding: 12, paddingHorizontal: 15, borderRadius: 20, elevation: 0, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4 },
  bubbleMe: { backgroundColor: '#DDC18C', borderTopRightRadius: 6, borderBottomRightRadius: 22, borderTopLeftRadius: 22, borderBottomLeftRadius: 22 },
  bubbleThem: { borderTopLeftRadius: 6, borderBottomLeftRadius: 22, borderTopRightRadius: 22, borderBottomRightRadius: 22, borderWidth: 1 },
  messageText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  messageImage: { width: '100%', height: '100%', borderRadius: 16, resizeMode: 'cover' },
  chatImageFrame: { width: 210, height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 6, backgroundColor: 'rgba(0,0,0,0.08)' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 10 },
  imageErrorText: { fontSize: 12, fontWeight: '700', marginTop: 8, color: PITO_COLORS.navyBg },
  imageRetryText: { fontSize: 10, marginTop: 5, color: PITO_COLORS.navyBg }, 
  textMe: { color: PITO_COLORS.navyBg, fontWeight: '500' },
  
  metaContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  metaContainerReel: { position:'absolute', top: 10, right: 10, backgroundColor:'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  timeText: { fontSize: 10, fontWeight: '700' },
  timeMe: { color: 'rgba(11, 19, 30, 0.6)' },
  
  // Paylaşılan Gönderi (Reel/Post Kartı)
  sharedPostContainer: { width: '100%', height: 320, borderRadius: 22, overflow: 'hidden', position: 'relative' },
  sharedPostImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  playIconOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  playIconCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  sharedPostFooter: { position: 'absolute', bottom: 0, width: '100%', padding: 14, paddingRight: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  sharedPostText: { fontSize: 13, fontWeight: '700', color: 'white' },
  
  pawButton: { position: 'absolute', bottom: 50, right: 12, backgroundColor: PITO_COLORS.primary, width: 38, height: 38, borderRadius: 19, elevation: 6, shadowColor: '#000', shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.3, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  textReactionBadge: { position: 'absolute', bottom: -8, left: 16, backgroundColor: PITO_COLORS.navySurface, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12, borderWidth: 1.5, elevation: 4 },
  
  // Modern Yüzen Input Alanı
  inputWrapper: { paddingHorizontal: 16, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 23, paddingHorizontal: 7, paddingVertical: 7, borderWidth: 1, elevation: 0, shadowColor: '#000', shadowOffset: {width:0, height: 4}, shadowOpacity: 0.05 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 100, fontSize: 15, fontWeight: '500' },
  sendBtn: { width: 43, height: 43, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 2 },
  attachBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginLeft: 2 },
  attachIconCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' }
});

export default ChatDetailScreen;