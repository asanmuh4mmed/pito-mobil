import React, { useState, useContext, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, TextInput, Modal, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ShopContext } from '../context/ShopContext';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const GOLD = '#B18A46';
const label = value => typeof value === 'object' && value !== null ? String(value.TR || value.AU || '') : String(value || '');

export default function ShopAdminScreen({ navigation }) {
  const { products = [], fetchProducts, unreadOrderCount, resetOrderCount } = useContext(ShopContext);
  const { user } = useContext(AuthContext);
  const { isDarkMode } = useContext(ThemeContext);
  const c = isDarkMode ? { bg: '#0B131E', card: '#1A2533', text: '#F7F4EE', sub: '#A0AAB5', border: '#293647' } : { bg: '#F8F5EF', card: '#FFFFFF', text: '#142239', sub: '#727989', border: '#EAE4D8' };
  const isAdmin = user?.is_admin === true;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Tümü');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);
  const [stockItem, setStockItem] = useState(null);
  const [stockInput, setStockInput] = useState('');
  const [stockLoading, setStockLoading] = useState(false);
  const lock = useRef(false);
  const refreshRef = useRef(fetchProducts);
  refreshRef.current = fetchProducts;
  // The shared catalog is the sole source for both shop and admin screens.
  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    setRefreshing(true);
    try { await refreshRef.current?.(); }
    catch (e) { Alert.alert('Ürünler yenilenemedi', e.message || 'Tekrar deneyin.'); }
    finally { setRefreshing(false); }
  }, [isAdmin]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const filtered = useMemo(() => products.filter(p => {
    const matches = `${label(p.name)} ${label(p.category)} ${p.id}`.toLocaleLowerCase('tr-TR').includes(search.trim().toLocaleLowerCase('tr-TR'));
    return matches && (filter !== 'İndirimli' || !!p.discountPrice || !!p.isDiscount);
  }), [products, search, filter]);
  const discounted = products.filter(p => p.discountPrice || p.isDiscount).length;
  const afterWrite = async () => {
    try { await refreshRef.current?.(); }
    catch { Alert.alert('Kayıt tamamlandı', 'Liste yenilenemedi. Ürün listesini aşağı çekerek yenileyin.'); }
  };
  const remove = item => {
    if (!isAdmin || lock.current) return;
    Alert.alert('Ürünü kalıcı olarak sil', `“${label(item.name)}” mağazadan kaldırılacak. Bu işlem geri alınamaz.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        if (lock.current) return;
        lock.current = true; setBusy(String(item.id));
        try {
          // Returning the deleted ID prevents a denied/zero-row delete from looking successful.
          const { data, error } = await supabase.from('products').delete().eq('id', item.id).select('id');
          if (error) throw error;
          if (!data?.length) throw new Error('Ürün silinmedi. Yetkinizi ve ürünün hâlâ mevcut olduğunu kontrol edin.');
          await afterWrite();
        } catch (e) { Alert.alert('Silinemedi', e.code === '23503' ? 'Bu ürün başka kayıtlara bağlı olduğu için silinemiyor. Sipariş geçmişini koruyacak arşivleme bağlantısı kurulmalı.' : e.message); }
        finally { lock.current = false; setBusy(null); }
      } },
    ]);
  };
  const openStock = async item => {
    if (!isAdmin || lock.current) return;
    lock.current = true; setBusy(String(item.id));
    try {
      // Read the actual row. Never invent a stock field or silently treat an unknown stock as zero.
      const { data, error } = await supabase.from('products').select('*').eq('id', item.id).single();
      if (error) throw error;
      const fields = ['stock_quantity', 'stock', 'stock_count'].filter(key => Object.prototype.hasOwnProperty.call(data, key));
      if (fields.length !== 1) {
        Alert.alert('Stok bağlantısı gerekiyor', 'Stok alanı henüz doğrulanamadı. Products tablosunun kolonlarıyla ShopContext ve AddEditProduct kodları kontrol edilmeden stok güncellemesi yapılmayacak.');
        return;
      }
      const field = fields[0];
      if (data[field] !== null && (!Number.isSafeInteger(Number(data[field])) || Number(data[field]) < 0)) throw new Error('Stok biçimi desteklenmiyor. Ürünün stok yapısını kontrol edin.');
      setStockItem({ ...item, stockField: field, originalStock: data[field] });
      setStockInput(data[field] == null ? '' : String(data[field]));
    } catch (e) { Alert.alert('Stok okunamadı', e.message); }
    finally { lock.current = false; setBusy(null); }
  };
  const saveStock = async () => {
    if (!stockItem || !isAdmin || lock.current) return;
    const raw = stockInput.trim();
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > 2147483647) return Alert.alert('Geçersiz stok', '0 veya daha büyük bir tam sayı girin.');
    lock.current = true; setStockLoading(true);
    try {
      const { stockField, originalStock, id } = stockItem;
      let query = supabase.from('products').update({ [stockField]: Number(raw) }).eq('id', id);
      // Do not overwrite a stock change that happened after the editor opened.
      query = originalStock === null ? query.is(stockField, null) : query.eq(stockField, originalStock);
      const { data, error } = await query.select(`id,${stockField}`);
      if (error) throw error;
      if (!data?.length) throw new Error('Stok başka bir işlemde değişmiş olabilir veya güncelleme yetkiniz yok. Pencereyi kapatıp yeniden açın.');
      setStockItem(null);
      await afterWrite();
    } catch (e) { Alert.alert('Stok kaydedilemedi', e.message); }
    finally { lock.current = false; setStockLoading(false); }
  };
  const button = (icon, title, action, danger = false, disabled = false) => <TouchableOpacity accessibilityRole="button" disabled={disabled} activeOpacity={0.75} onPress={action} style={[styles.action, { opacity: disabled ? 0.45 : 1, backgroundColor: danger ? 'rgba(196,75,75,0.09)' : 'rgba(177,138,70,0.1)' }]}><Ionicons name={icon} size={17} color={danger ? '#C44B4B' : GOLD} /><Text style={[styles.actionText, { color: danger ? '#C44B4B' : c.text }]}>{title}</Text></TouchableOpacity>;
  if (!isAdmin) return <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}><View style={styles.empty}><Ionicons name="lock-closed-outline" size={38} color={GOLD} /><Text style={[styles.heading, { color: c.text }]}>Yönetici erişimi gerekli</Text><Text style={[styles.muted, { color: c.sub }]}>Bu bölüm yalnızca yönetici hesapları içindir.</Text>{button('arrow-back', 'Geri dön', () => navigation.goBack())}</View></SafeAreaView>;
  return <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
    <View style={styles.header}>{button('arrow-back', '', () => navigation.goBack())}<View style={{ flex: 1 }}><Text style={[styles.title, { color: c.text }]}>Mağaza yönetimi</Text><Text style={[styles.muted, { color: c.sub }]}>Pito shop · Yönetici</Text></View><TouchableOpacity accessibilityLabel="Siparişler" style={styles.orderButton} onPress={() => { resetOrderCount?.(); navigation.navigate('ShopAdminOrders'); }}><Ionicons name="receipt-outline" size={24} color={GOLD} />{unreadOrderCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadOrderCount > 99 ? '99+' : unreadOrderCount}</Text></View>}</TouchableOpacity></View>
    <FlatList data={filtered} keyExtractor={item => String(item.id)} refreshing={refreshing} onRefresh={refresh} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}
      ListHeaderComponent={<View><View style={styles.hero}><Text style={styles.eyebrow}>ÜRÜNLERİN KONTROLÜ SENDE</Text><Text style={styles.heroTitle}>Düzenle. Güncelle. Yönet.</Text><Text style={styles.heroText}>Ürünlerini mağazayla aynı katalog üzerinden yönet.</Text><View style={styles.stats}><Text style={styles.stat}>{products.length} ürün</Text><View style={styles.divider} /><Text style={styles.stat}>{discounted} indirimli</Text></View></View>
      <TouchableOpacity style={styles.add} onPress={() => navigation.navigate('AddEditProduct')}><Ionicons name="add-circle-outline" size={23} color="#FFFFFF" /><Text style={styles.addText}>Yeni ürün ekle</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></TouchableOpacity>
      <View style={[styles.search, { backgroundColor: c.card, borderColor: c.border }]}><Ionicons name="search-outline" size={20} color={c.sub} /><TextInput style={[styles.input, { color: c.text }]} placeholder="Ürün adı, kategori veya ID ara" placeholderTextColor={c.sub} value={search} onChangeText={setSearch} autoCorrect={false} />{!!search && <TouchableOpacity accessibilityLabel="Aramayı temizle" onPress={() => setSearch('')}><Ionicons name="close-circle" size={20} color={c.sub} /></TouchableOpacity>}</View>
      <View style={styles.filters}>{['Tümü', 'İndirimli'].map(f => <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.chip, { backgroundColor: filter === f ? '#142239' : c.card }]}><Text style={{ color: filter === f ? '#FFFFFF' : c.text, fontSize: 12, fontWeight: '700' }}>{f}</Text></TouchableOpacity>)}<Text style={[styles.result, { color: c.sub }]}>{filtered.length} sonuç</Text></View></View>}
      renderItem={({ item }) => {
        const uri = item.image_urls?.[0] || item.media?.find(m => m.type !== 'video')?.uri || item.img;
        const pending = busy === String(item.id);
        const stockKeys = ['stock_quantity', 'stock', 'stock_count'].filter(k => Object.prototype.hasOwnProperty.call(item, k));
        const stock = stockKeys.length === 1 ? item[stockKeys[0]] : null;
        return <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}><TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('ProductDetail', { product: item })} style={styles.productRow}>{uri ? <Image source={{ uri }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]}><Ionicons name="bag-outline" size={30} color={GOLD} /></View>}<View style={{ flex: 1 }}><Text style={[styles.productName, { color: c.text }]} numberOfLines={2}>{label(item.name)}</Text><Text style={[styles.muted, { color: c.sub }]}>{label(item.category) || 'Kategorisiz'} · {item.targetRegion || 'GLOBAL'}</Text><View style={styles.prices}><Text style={styles.price}>{item.discountPrice || item.price} {item.targetRegion === 'AU' ? 'AUD' : 'TL'}</Text>{!!item.discountPrice && <Text style={styles.oldPrice}>{item.price}</Text>}</View><Text style={[styles.stock, { color: stock === 0 ? '#C44B4B' : c.sub }]}>{stock == null ? 'Stok bilgisi tanımlanmamış' : `Stok: ${stock} adet`}</Text></View><Ionicons name="chevron-forward" size={18} color={GOLD} /></TouchableOpacity><View style={[styles.actions, { borderTopColor: c.border }]}>{button('create-outline', 'Düzenle', () => navigation.navigate('AddEditProduct', { product: item }), false, !!busy)}{button('cube-outline', 'Stok', () => openStock(item), false, !!busy)}{button('trash-outline', 'Sil', () => remove(item), true, !!busy)}{pending && <ActivityIndicator size="small" color={GOLD} />}</View></View>;
      }}
      ListEmptyComponent={<View style={styles.empty}>{refreshing ? <ActivityIndicator color={GOLD} /> : <Ionicons name="cube-outline" size={42} color={GOLD} />}<Text style={[styles.heading, { color: c.text }]}>{search || filter !== 'Tümü' ? 'Eşleşen ürün bulunamadı' : 'Henüz ürün görünmüyor'}</Text><Text style={[styles.muted, { color: c.sub }]}>Aramayı değiştirebilir veya listeyi yenileyebilirsin.</Text></View>} />
    <Modal visible={!!stockItem} transparent animationType="slide" onRequestClose={() => { if (!stockLoading) setStockItem(null); }}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}><SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: c.card }]}><View style={styles.handle} /><Text style={[styles.heading, { color: c.text }]}>Stok miktarını güncelle</Text><Text style={[styles.muted, { color: c.sub }]}>{label(stockItem?.name)}</Text><Text style={[styles.muted, { color: c.sub, marginTop: 16 }]}>Yeni toplam stok adedi</Text><TextInput value={stockInput} onChangeText={setStockInput} keyboardType="number-pad" editable={!stockLoading} placeholder="0" placeholderTextColor={c.sub} style={[styles.stockInput, { color: c.text, borderColor: c.border }]} /><View style={styles.actions}>{button('close', 'Vazgeç', () => setStockItem(null), false, stockLoading)}{button('checkmark', stockLoading ? 'Kaydediliyor…' : 'Kaydet', saveStock, false, stockLoading)}</View></SafeAreaView></KeyboardAvoidingView></Modal>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingVertical: 12 }, title: { fontSize: 18, fontWeight: '800' }, muted: { fontSize: 11, lineHeight: 18, marginTop: 4 }, list: { padding: 20, paddingTop: 6, paddingBottom: 30 },
  hero: { backgroundColor: '#142239', padding: 23, borderRadius: 25 }, eyebrow: { color: '#D9BC82', letterSpacing: 1.3, fontSize: 9, fontWeight: '800' }, heroTitle: { color: '#FFFFFF', fontSize: 25, lineHeight: 32, fontWeight: '800', marginTop: 12 }, heroText: { color: '#BBC5D2', fontSize: 12, lineHeight: 20, marginTop: 8 }, stats: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 20 }, stat: { color: '#E4C990', fontSize: 14, fontWeight: '700' }, divider: { height: 18, width: 1, backgroundColor: '#41516A' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 17, backgroundColor: GOLD, marginVertical: 16 }, addText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, flex: 1 }, search: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, gap: 9 }, input: { flex: 1, minHeight: 48, fontSize: 12 }, filters: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16 }, chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 }, result: { marginLeft: 'auto', fontSize: 11 },
  card: { padding: 14, borderRadius: 23, borderWidth: 1, marginBottom: 14 }, productRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, image: { width: 82, height: 100, borderRadius: 16, resizeMode: 'contain', backgroundColor: '#F0EEE9' }, placeholder: { alignItems: 'center', justifyContent: 'center' }, productName: { fontSize: 15, lineHeight: 21, fontWeight: '800' }, prices: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 }, price: { color: GOLD, fontWeight: '800', fontSize: 17 }, oldPrice: { color: '#9099A4', fontSize: 11, textDecorationLine: 'line-through' }, stock: { fontSize: 10, marginTop: 7 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 15, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DADADA' }, action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 42, paddingHorizontal: 11, borderRadius: 12 }, actionText: { fontSize: 11, fontWeight: '700' }, orderButton: { padding: 10 }, badge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#C44B4B', borderRadius: 10, paddingHorizontal: 4, minWidth: 17, alignItems: 'center' }, badgeText: { color: '#FFFFFF', fontSize: 9, lineHeight: 17, fontWeight: '700' }, empty: { padding: 28, alignItems: 'center', gap: 12 }, heading: { fontSize: 19, fontWeight: '800' }, overlay: { flex: 1, backgroundColor: 'rgba(11,19,30,0.65)', justifyContent: 'flex-end' }, sheet: { padding: 24, borderTopLeftRadius: 28, borderTopRightRadius: 28 }, handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#9099A4', alignSelf: 'center', marginBottom: 22 }, stockInput: { fontSize: 24, fontWeight: '700', borderWidth: 1, borderRadius: 15, padding: 16, marginTop: 8 },
});