import React, { useContext, useState, useRef, useMemo, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const GOLD = '#C5A059';
const NAVY = '#0B131E';
const RED = '#E45C65';

const ChatCard = memo(({ item, userId, theme, dark, selecting, selected, busy, onOpen, onSelect, english }) => {
  const partner = item.participants?.find(person => String(person.id) !== String(userId));
  const name = String(partner?.name || partner?.fullname || (english ? 'User' : 'Kullanıcı'));
  const unread = (item.messages || []).filter(message => String(message.senderId) !== String(userId) && !message.isRead).length;
  const date = new Date(item.lastMessageDate);
  const time = Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <TouchableOpacity disabled={busy} activeOpacity={0.75}
      onPress={() => selecting ? onSelect(item.id) : onOpen(item)}
      onLongPress={() => onSelect(item.id)}
      accessibilityRole="button" accessibilityState={{ selected }}
      accessibilityLabel={`${name}, ${item.lastMessage || ''}`}
      style={[styles.card, { backgroundColor: dark ? '#1A2533' : '#FFFFFF', borderColor: selected ? GOLD : theme.border }, selected && styles.selectedCard]}>
      {selecting && <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={selected ? GOLD : theme.subText} style={{ marginRight: 11 }} />}
      <View style={styles.avatarBox}>
        {partner?.avatar ? <Image source={{ uri: partner.avatar }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text></View>}
        {partner?.is_online === true && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.info}>
        <View style={styles.row}>
          <Text numberOfLines={1} style={[styles.name, { color: theme.text }, unread > 0 && { fontWeight: '800' }]}>{name}</Text>
          <Text style={[styles.time, { color: unread ? GOLD : theme.subText }]}>{time}</Text>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text numberOfLines={1} style={[styles.preview, { color: theme.subText }]}>{String(item.lastMessage || (english ? 'Open conversation' : 'Sohbeti aç'))}</Text>
          {!selecting && unread > 0 && <View style={styles.unread}><Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text></View>}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const ChatListScreen = ({ navigation }) => {
  const { conversations, deleteConversation } = useContext(ChatContext);
  const { user, country } = useContext(AuthContext);
  const { theme: appTheme, isDarkMode } = useContext(ThemeContext);
  const theme = isDarkMode ? appTheme : { ...appTheme, background: '#F8F5EF', text: '#142239', subText: '#78808D', border: '#EAE4D8' };
  const english = country?.code === 'AU';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const actorRef = useRef(user?.id);
  actorRef.current = user?.id;
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const aliveRef = useRef(true);
  useEffect(() => { aliveRef.current = true; return () => { aliveRef.current = false; }; }, []);
  useEffect(() => { setSelecting(false); setSelectedIds([]); setSearch(''); setFilter('all'); }, [user?.id]);
  const chats = useMemo(() => [...(conversations || [])].sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate)), [conversations]);
  useEffect(() => { setSelectedIds(previous => previous.filter(id => chats.some(chat => String(chat.id) === id))); }, [chats]);
  const toggle = useCallback((id) => {
    if (busyRef.current) return;
    setSelecting(true);
    setSelectedIds(previous => previous.includes(String(id)) ? previous.filter(value => value !== String(id)) : [...previous, String(id)]);
  }, []);
  const cancelSelection = () => { if (!busyRef.current) { setSelecting(false); setSelectedIds([]); } };
  const openChat = useCallback((item) => {
    const partner = item.participants?.find(person => String(person.id) !== String(user?.id));
    navigation.navigate('ChatDetail', {
      chat: item, chatId: item.id,
      targetUser: partner ? { id: partner.id, fullname: partner.name || partner.fullname, avatar: partner.avatar } : undefined
    });
  }, [navigation, user?.id]);
  const deleteSelected = () => {
    if (busyRef.current || !selectedIds.length) return;
    const ids = [...selectedIds];
    const actorId = user?.id;
    Alert.alert(english ? 'Delete conversations?' : 'Sohbetler silinsin mi?',
      english ? `${ids.length} conversation histories will be removed from your account. New messages can appear again.` : `${ids.length} sohbetin mevcut geçmişi senin hesabından kaldırılacak. Yeni mesaj gelirse sohbet yeniden görünür.`,
      [{ text: english ? 'Cancel' : 'Vazgeç', style: 'cancel' }, {
        text: english ? 'Delete' : 'Sil', style: 'destructive', onPress: async () => {
          if (busyRef.current || actorRef.current !== actorId) return;
          busyRef.current = true;
          setBusy(true);
          const failed = [];
          let lastError = '';
          try {
            for (const id of ids) {
              if (!aliveRef.current || actorRef.current !== actorId) return;
              try {
                const result = await deleteConversation(id);
                if (result?.success !== true) { failed.push(id); lastError = result?.error || 'Silme onayı alınamadı.'; }
              } catch (error) { failed.push(id); lastError = error.message; }
            }
            if (!aliveRef.current || actorRef.current !== actorId) return;
            setSelectedIds(failed);
            setSelecting(failed.length > 0);
            if (failed.length) Alert.alert(english ? 'Some conversations could not be deleted' : 'Bazı sohbetler silinemedi', `${failed.length} ${english ? 'failed' : 'sohbet silinemedi'}.\n${lastError}`);
          } finally { busyRef.current = false; if (aliveRef.current) setBusy(false); }
        }
      }]);
  };
  const unreadChats = chats.filter(chat => (chat.messages || []).some(message => String(message.senderId) !== String(user?.id) && !message.isRead)).length;
  const visibleChats = useMemo(() => chats.filter(chat => {
    const partner = chat.participants?.find(person => String(person.id) !== String(user?.id));
    const haystack = `${partner?.name || partner?.fullname || ''} ${chat.lastMessage || ''} ${chat.listingName || ''}`.toLocaleLowerCase(english ? 'en' : 'tr');
    const matches = haystack.includes(search.trim().toLocaleLowerCase(english ? 'en' : 'tr'));
    const unread = (chat.messages || []).some(message => String(message.senderId) !== String(user?.id) && !message.isRead);
    return matches && (filter === 'all' || unread);
  }), [chats, search, filter, user?.id, english]);
  const allSelected = chats.length > 0 && chats.every(chat => selectedIds.includes(String(chat.id)));
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? NAVY : theme.background }]}>
      <View style={styles.toolbar}>
        <TouchableOpacity disabled={busy} onPress={() => selecting ? cancelSelection() : navigation.goBack()} style={styles.iconButton} accessibilityLabel={selecting ? 'Seçimi kapat' : 'Geri'}><Ionicons name={selecting ? 'close' : 'arrow-back'} size={23} color={theme.text} /></TouchableOpacity>
        <View style={styles.brand}><Ionicons name="paw" size={20} color={GOLD} /><Text style={[styles.brandText, { color: theme.text }]}>Pito</Text></View>
        <TouchableOpacity disabled={busy || !chats.length} onPress={() => selecting ? cancelSelection() : setSelecting(true)} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={english ? 'Select conversations' : 'Sohbetleri seç ve sil'}><Ionicons name={selecting ? 'checkmark-circle-outline' : 'trash-outline'} size={23} color={chats.length ? GOLD : theme.subText} /></TouchableOpacity>
      </View>
      <View style={styles.heading}>
        <View style={styles.heroTop}><View style={styles.heroEyebrow}><Ionicons name="chatbubble-ellipses-outline" size={14} color={GOLD} /><Text style={styles.heroEyebrowText}>{english ? 'PITO CONNECTIONS' : 'PITO SOHBETLER'}</Text></View><Ionicons name="paw-outline" size={31} color="rgba(197,160,89,0.45)" /></View>
        <Text style={styles.title}>{selecting ? (english ? 'A little inbox care.' : 'Sohbetlerine yer aç.') : (english ? 'A hello can change a life.' : 'Bir merhaba,\nbir dostluğun başlangıcı.')}</Text>
        <Text style={styles.subtitle}>{selecting ? (english ? 'Select the conversations you want to remove.' : 'Kaldırmak istediğin sohbetleri seç.') : (english ? 'Meet, share and stay connected.' : 'Tanış, paylaş, can dostlarımız için iletişimde kal.')}</Text>
        <View style={styles.heroStats}><Text style={styles.heroStat}>{chats.length} {english ? 'conversations' : 'sohbet'}</Text><View style={styles.heroStatDot} /><Text style={styles.heroStat}>{unreadChats} {english ? 'unread' : 'okunmamış'}</Text></View>
      </View>
      <View style={[styles.searchBox, { backgroundColor: isDarkMode ? '#1A2533' : '#FFFFFF', borderColor: theme.border }]}><Ionicons name="search-outline" size={20} color={theme.subText} /><TextInput value={search} onChangeText={setSearch} placeholder={english ? 'Search a name or conversation' : 'İsim veya sohbet ara'} placeholderTextColor={theme.subText} style={[styles.searchInput, { color: theme.text }]} accessibilityLabel={english ? 'Search conversations' : 'Sohbetlerde ara'} />{!!search && <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel={english ? 'Clear search' : 'Aramayı temizle'}><Ionicons name="close-circle" size={19} color={theme.subText} /></TouchableOpacity>}</View>
      <View style={styles.filters}>{['all', 'unread'].map(value => <TouchableOpacity key={value} onPress={() => setFilter(value)} accessibilityRole="button" accessibilityState={{ selected: filter === value }} style={[styles.filterChip, { backgroundColor: filter === value ? GOLD : (isDarkMode ? '#1A2533' : '#ECE7DD') }]}><Text style={{ color: filter === value ? NAVY : theme.subText, fontWeight: '700', fontSize: 12 }}>{value === 'all' ? (english ? 'All' : 'Tümü') : (english ? 'Unread' : 'Okunmamış')}{value === 'unread' ? ` · ${unreadChats}` : ''}</Text></TouchableOpacity>)}</View>
      {selecting && <View style={styles.selectionBar}><Text style={{ color: theme.text, fontSize: 12 }}>{selectedIds.length} {english ? 'selected' : 'sohbet seçildi'}</Text><TouchableOpacity disabled={busy} onPress={() => setSelectedIds(allSelected ? [] : chats.map(chat => String(chat.id)))}><Text style={styles.goldText}>{allSelected ? (english ? 'Clear' : 'Seçimi kaldır') : (english ? 'Select all' : 'Tümünü seç')}</Text></TouchableOpacity></View>}
      <FlatList data={visibleChats} keyExtractor={item => String(item.id)} extraData={{ selectedIds, selecting, busy }}
        contentContainerStyle={[styles.list, !visibleChats.length && { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false} initialNumToRender={10} maxToRenderPerBatch={10} windowSize={5}
        renderItem={({ item }) => <ChatCard item={item} userId={user?.id} theme={theme} dark={isDarkMode} selecting={selecting} selected={selectedIds.includes(String(item.id))} busy={busy} onOpen={openChat} onSelect={toggle} english={english} />}
        ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={44} color={GOLD} /></View><Text style={[styles.emptyTitle, { color: theme.text }]}>{chats.length ? (english ? 'No matching conversations' : 'Eşleşen sohbet bulunamadı') : (english ? 'Your inbox is quiet' : 'Mesaj kutun şimdilik sessiz')}</Text><Text style={[styles.emptyText, { color: theme.subText }]}>{chats.length ? (english ? 'Try another search or filter.' : 'Aramayı veya filtreyi değiştir.') : (english ? 'Your conversations will appear here.' : 'Yeni sohbetlerin burada görünecek.')}</Text></View>}
      />
      {selecting && <View style={[styles.footer, { borderColor: theme.border }]}><TouchableOpacity disabled={busy || !selectedIds.length} onPress={deleteSelected} style={[styles.deleteButton, (!selectedIds.length || busy) && { opacity: 0.5 }]}>{busy ? <ActivityIndicator color="white" /> : <><Ionicons name="trash-outline" size={20} color="white" /><Text style={styles.deleteText}>{english ? 'Delete selected' : 'Seçilenleri sil'} ({selectedIds.length})</Text></>}</TouchableOpacity></View>}
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1 }, toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(154,151,140,0.09)', alignItems: 'center', justifyContent: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 5 }, brandText: { fontSize: 23, fontWeight: '800', letterSpacing: -0.5 },
  heading: { marginHorizontal: 20, marginTop: 12, marginBottom: 18, padding: 21, borderRadius: 27, backgroundColor: '#142239', overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 },
  heroEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, heroEyebrowText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: GOLD },
  title: { fontSize: 25, lineHeight: 32, fontWeight: '800', letterSpacing: -0.7, color: '#FAF6ED' }, subtitle: { fontSize: 12, lineHeight: 19, marginTop: 10, color: '#BCC6D2' },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 17 }, heroStat: { fontSize: 11, color: '#E1C58F', fontWeight: '600' }, heroStatDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: GOLD },
  searchBox: { marginHorizontal: 20, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 9, minHeight: 49 }, searchInput: { flex: 1, minWidth: 0, fontSize: 13, paddingVertical: 13 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 15 }, filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 13 },
  selectionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 }, goldText: { color: GOLD, fontSize: 12, fontWeight: '700', paddingVertical: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 25 }, card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderRadius: 22, marginBottom: 12 }, selectedCard: { borderWidth: 2 },
  avatarBox: { width: 55, height: 55, marginRight: 13 }, avatar: { width: '100%', height: '100%', borderRadius: 17 }, avatarFallback: { width: '100%', height: '100%', borderRadius: 17, backgroundColor: '#EADAB8', alignItems: 'center', justifyContent: 'center' }, avatarLetter: { color: NAVY, fontSize: 22, fontWeight: '700' },
  onlineDot: { position: 'absolute', right: -2, bottom: -2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: 'white', backgroundColor: '#00B894' },
  info: { flex: 1 }, row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, name: { flex: 1, fontSize: 15, fontWeight: '600' }, time: { fontSize: 10 }, preview: { flex: 1, fontSize: 12 },
  unread: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }, unreadText: { color: NAVY, fontSize: 9, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 50 }, emptyIcon: { width: 95, height: 95, borderRadius: 32, backgroundColor: 'rgba(197,160,89,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }, emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' }, emptyText: { fontSize: 12, textAlign: 'center', marginTop: 9, lineHeight: 20 },
  footer: { paddingHorizontal: 20, paddingVertical: 13, borderTopWidth: 1 }, deleteButton: { minHeight: 52, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: RED, borderRadius: 16 }, deleteText: { color: 'white', fontWeight: '700', fontSize: 14 }
});
export default ChatListScreen;