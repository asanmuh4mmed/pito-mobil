import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
const fields = [
  ['name', 'İlan başlığı / isim'], ['description', 'Açıklama'],
  ['city', 'Şehir'], ['district', 'İlçe'], ['phone', 'Telefon'],
  ['address', 'Adres'], ['breed', 'Irk'], ['pet_type', 'Hayvan türü'],
  ['age', 'Yaş / bakıcı deneyimi'], ['gender', 'Cinsiyet'], ['price', 'Ücret'],
];
const numberValue = (value, label) => {
  const normalized = String(value).trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized) || !Number.isFinite(Number(normalized))) throw new Error(`${label}: 0 veya daha büyük bir sayı girin.`);
  return Number(normalized);
};
export default function EditListingModal({ listing, onClose, onSaved }) {
  const { user } = useContext(AuthContext);
  const { isDarkMode } = useContext(ThemeContext);
  const c = isDarkMode ? { bg: '#0B131E', card: '#1A2533', text: '#F7F4EE', sub: '#A0AAB5', line: '#293647' } : { bg: '#F8F5EF', card: '#FFFFFF', text: '#142239', sub: '#727989', line: '#EAE4D8' };
  const [form, setForm] = useState({});
  const [original, setOriginal] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photosChanged, setPhotosChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const pickerLock = useRef(false);
  const uploadCache = useRef(new Map());
  const dirty = useRef(false);
  const scope = useRef({ live: true, listingId: listing?.id, userId: user?.id, version: 0 });
  if (scope.current.listingId !== listing?.id || scope.current.userId !== user?.id) {
    scope.current = { ...scope.current, listingId: listing?.id, userId: user?.id, version: scope.current.version + 1 };
  }
  const isCurrent = version => scope.current.live && scope.current.version === version;

  useEffect(() => {
    scope.current.live = true;
    return () => { scope.current.live = false; scope.current.version++; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const version = scope.current.version;
    const current = () => !cancelled && isCurrent(version);
    lock.current = false; pickerLock.current = false;
    setSaving(false); setPicking(false); setLoading(false);
    setOriginal(null); setForm({}); setPhotos([]); setPhotosChanged(false); setLoadError('');
    dirty.current = false; uploadCache.current.clear();
    if (!listing?.id || !user?.id) return;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.from('listings').select('*').eq('id', listing.id).eq('owner_id', user.id).single();
        if (!current()) return;
        if (error) throw error;
        if (!data || String(data.id) !== String(listing.id) || String(data.owner_id) !== String(user.id)) throw new Error('Yalnızca kendi ilanınızı düzenleyebilirsiniz.');
        setOriginal(data);
        setForm(Object.fromEntries(fields.filter(([key]) => Object.prototype.hasOwnProperty.call(data, key)).map(([key]) => [key, String(data[key] ?? '')])));
        const urls = Array.isArray(data.images) && data.images.length ? data.images : data.img ? [data.img] : [];
        setPhotos(urls.map(uri => ({ uri })));
      } catch (error) {
        if (current()) setLoadError(error.message || 'İlan yüklenemedi.');
      } finally { if (current()) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [listing?.id, user?.id, retry]);

  const close = () => {
    if (lock.current || pickerLock.current) return;
    if (!dirty.current) return onClose();
    const version = scope.current.version;
    Alert.alert('Değişiklikler kaydedilmedi', 'Kaydetmeden çıkmak istiyor musunuz?', [
      { text: 'Düzenlemeye devam', style: 'cancel' },
      { text: 'Çık', style: 'destructive', onPress: () => { if (isCurrent(version) && !lock.current && !pickerLock.current) onClose(); } },
    ]);
  };

  const pickPhoto = async () => {
    if (lock.current || pickerLock.current || !original || loading || photos.length >= 5) return;
    const version = scope.current.version;
    pickerLock.current = true; setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!isCurrent(version)) return;
      if (!permission.granted) throw new Error('Fotoğraf eklemek için galeri izni verin.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8, base64: true });
      if (!isCurrent(version)) return;
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (!asset.base64) throw new Error('Fotoğraf okunamadı. Lütfen yeniden seçin.');
        setPhotos(previous => [...previous, { uri: asset.uri, base64: asset.base64 }].slice(0, 5));
        setPhotosChanged(true); dirty.current = true;
      }
    } catch (error) {
      if (isCurrent(version)) Alert.alert('Fotoğraf seçilemedi', error.message || 'Lütfen tekrar deneyin.');
    } finally {
      if (isCurrent(version)) { pickerLock.current = false; setPicking(false); }
    }
  };

  const upload = async (photo, ownerId, listingId, version) => {
    if (!isCurrent(version)) throw new Error('Oturum veya ilan değişti.');
    if (/^https?:\/\//i.test(photo.uri || '')) return photo.uri;
    const cacheKey = `${ownerId}:${listingId}:${photo.uri}`;
    if (uploadCache.current.has(cacheKey)) return uploadCache.current.get(cacheKey);
    if (typeof photo.base64 !== 'string' || !photo.base64 || photo.base64.length > 11200000) throw new Error('Fotoğraf okunamadı veya çok büyük. Yeniden seçin.');
    const bytes = Uint8Array.from(atob(photo.base64), ch => ch.charCodeAt(0));
    if (bytes.length < 12 || bytes.length > 8 * 1024 * 1024) throw new Error('Fotoğraf en fazla 8 MB olabilir.');
    let ext, mime;
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) { ext = 'jpg'; mime = 'image/jpeg'; }
    else if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) { ext = 'png'; mime = 'image/png'; }
    else if (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') { ext = 'webp'; mime = 'image/webp'; }
    else throw new Error('JPEG, PNG veya WebP biçiminde fotoğraf seçin.');
    // Mevcut düzenleme ekranının kullandığı bucket ve kullanıcı klasörü korunur.
    const bucket = supabase.storage.from('posts');
    const path = `${ownerId}/listing_${listingId}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await bucket.upload(path, bytes.buffer, { contentType: mime, upsert: false });
    if (!isCurrent(version)) throw new Error('Oturum veya ilan değişti.');
    if (error) throw error;
    const { data } = bucket.getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('Fotoğraf bağlantısı alınamadı.');
    uploadCache.current.set(cacheKey, data.publicUrl);
    return data.publicUrl;
  };

  const save = async () => {
    if (lock.current || pickerLock.current || loading || !original) return;
    const ownerId = user?.id;
    const listingId = listing?.id;
    const version = scope.current.version;
    if (!isCurrent(version) || !ownerId || String(original.id) !== String(listingId) || String(original.owner_id) !== String(ownerId) || scope.current.userId !== ownerId) {
      return Alert.alert('Yetki gerekli', 'İlanı kendi hesabınızdan yeniden açın.');
    }
    lock.current = true; setSaving(true);
    let confirmed = false;
    try {
      const updates = {};
      for (const [key, title] of fields) {
        if (!Object.prototype.hasOwnProperty.call(form, key)) continue;
        const value = form[key].trim();
        if (value === String(original[key] ?? '').trim()) continue;
        if (['name', 'description', 'city', 'district'].includes(key) && !value) throw new Error(`${title} boş bırakılamaz.`);
        updates[key] = ['age', 'price'].includes(key) ? (value === '' ? 0 : numberValue(value, title)) : value;
      }
      if (photosChanged) {
        if (!photos.length || photos.length > 5) throw new Error('İlanda 1–5 fotoğraf bulunmalı.');
        const urls = [];
        for (const photo of photos) urls.push(await upload(photo, ownerId, listingId, version));
        updates.images = urls; updates.img = urls[0];
      }
      if (!isCurrent(version)) return;
      if (!Object.keys(updates).length) { dirty.current = false; onClose(); return; }
      const { data, error } = await supabase.from('listings').update(updates).eq('id', listingId).eq('owner_id', ownerId).select('*').single();
      if (error) throw error;
      if (!data || String(data.id) !== String(listingId) || String(data.owner_id) !== String(ownerId)) throw new Error('Güncelleme doğrulanamadı. İlan yetkilerini kontrol edin.');
      confirmed = true;
      if (!isCurrent(version)) return;
      dirty.current = false;
      setOriginal(data);
      // Ekran yenileme hatası kaydedilmiş ilanı başarısız gibi göstermez.
      Alert.alert('Kaydedildi', 'İlan bilgileriniz güncellendi.');
      try { Promise.resolve(onSaved?.(data)).catch(() => {}); } catch {}
      try { onClose(); } catch {}
    } catch (error) {
      if (!confirmed && isCurrent(version)) Alert.alert('İlan kaydedilemedi', error.message || 'Bağlantınızı kontrol edin. Yeniden denemeden önce ilanın güncel durumunu kontrol edin.');
    } finally {
      if (isCurrent(version)) { lock.current = false; setSaving(false); }
    }
  };

  return <Modal visible={!!listing} animationType="slide" onRequestClose={close}>
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.header}><TouchableOpacity disabled={saving || picking} accessibilityLabel="Kapat" onPress={close} style={styles.icon}><Ionicons name="close" size={25} color={c.text} /></TouchableOpacity><Text style={[styles.title, { color: c.text }]}>İlanı düzenle</Text><TouchableOpacity disabled={saving || picking || loading || !original} onPress={save} style={styles.icon}>{saving ? <ActivityIndicator color="#B18A46" /> : <Text style={{ color: '#B18A46', fontWeight: '800' }}>Kaydet</Text>}</TouchableOpacity></View>
      {loading ? <ActivityIndicator style={{ marginTop: 50 }} color="#B18A46" /> : loadError ? <View style={{ padding: 25 }}><Text style={{ color: c.sub }}>{loadError}</Text><TouchableOpacity onPress={() => setRetry(n => n + 1)} style={styles.button}><Text style={styles.buttonText}>Tekrar dene</Text></TouchableOpacity></View> : original && <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 22, paddingBottom: 40 }}><View pointerEvents={saving || picking ? 'none' : 'auto'}>
        <View style={styles.intro}><Text style={styles.introTitle}>İlanın güncel kalsın.</Text><Text style={styles.introText}>Fotoğraflarını, açıklamanı ve iletişim bilgilerini buradan düzenle.</Text></View>
        <Text style={[styles.label, { color: c.text }]}>Fotoğraflar · {photos.length}/5</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 10 }}>{photos.map((photo, index) => <View key={`${photo.uri}-${index}`}><TouchableOpacity accessibilityLabel="Kapak fotoğrafı yap" onPress={() => { setPhotos(previous => [previous[index], ...previous.filter((_, i) => i !== index)]); setPhotosChanged(true); dirty.current = true; }}><Image source={{ uri: photo.uri }} style={styles.photo} />{index === 0 && <Text style={styles.cover}>KAPAK</Text>}</TouchableOpacity><TouchableOpacity accessibilityLabel="Fotoğrafı kaldır" style={styles.remove} onPress={() => { setPhotos(previous => previous.filter((_, i) => i !== index)); setPhotosChanged(true); dirty.current = true; }}><Ionicons name="close-circle" size={25} color="#C44B4B" /></TouchableOpacity></View>)}{photos.length < 5 && <TouchableOpacity style={[styles.photo, styles.addPhoto]} onPress={pickPhoto}>{picking ? <ActivityIndicator color="#B18A46" /> : <Ionicons name="add" size={32} color="#B18A46" />}</TouchableOpacity>}</ScrollView>
        <Text style={[styles.hint, { color: c.sub }]}>Kapak yapmak istediğin fotoğrafa dokun. Kaldırılan fotoğraf yalnızca bu ilandan çıkarılır.</Text>
        {fields.filter(([key]) => Object.prototype.hasOwnProperty.call(form, key)).map(([key, title]) => <View key={key}><Text style={[styles.label, { color: c.text }]}>{title}</Text><TextInput value={form[key]} onChangeText={value => { setForm(previous => ({ ...previous, [key]: value })); dirty.current = true; }} multiline={key === 'description' || key === 'address'} keyboardType={['age', 'price'].includes(key) ? 'decimal-pad' : key === 'phone' ? 'phone-pad' : 'default'} style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.line }, key === 'description' && { minHeight: 130, textAlignVertical: 'top' }]} /></View>)}
        <TouchableOpacity disabled={saving || picking || loading} onPress={save} style={[styles.button, { opacity: saving || picking ? 0.6 : 1 }]}><Text style={styles.buttonText}>Değişiklikleri kaydet</Text></TouchableOpacity>
      </View></ScrollView></KeyboardAvoidingView>}
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15 }, title: { fontSize: 19, fontWeight: '800' }, icon: { padding: 10 }, intro: { backgroundColor: '#142239', padding: 22, borderRadius: 24, marginBottom: 18 }, introTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' }, introText: { color: '#BBC5D2', fontSize: 13, lineHeight: 21, marginTop: 10 }, label: { fontSize: 12, fontWeight: '700', marginTop: 17, marginBottom: 9 }, input: { borderWidth: 1, borderRadius: 15, padding: 15, fontSize: 15 }, photo: { width: 100, height: 110, borderRadius: 16, backgroundColor: '#EDE4D4' }, addPhoto: { alignItems: 'center', justifyContent: 'center' }, remove: { position: 'absolute', top: -8, right: -6 }, cover: { position: 'absolute', bottom: 7, left: 7, color: '#E4C990', backgroundColor: '#142239', fontSize: 9, fontWeight: '800', padding: 5, borderRadius: 5 }, hint: { fontSize: 11, lineHeight: 18, marginTop: 5 }, button: { backgroundColor: '#142239', borderRadius: 18, padding: 18, alignItems: 'center', marginTop: 26 }, buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 } });