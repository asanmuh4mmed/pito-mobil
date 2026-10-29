import React, { useState, useContext, useEffect, useRef } from 'react';
import { 
    View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, 
    Alert, Image, Switch, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ShopContext } from '../context/ShopContext';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase'; 

const AddEditProductScreen = ({ navigation, route }) => {
    const { addProduct, updateProduct } = useContext(ShopContext);
    const { theme: appTheme, isDarkMode } = useContext(ThemeContext);
    const { user, country } = useContext(AuthContext);
    const theme = isDarkMode ? appTheme : { ...appTheme, background: '#F8F5EF', cardBg: '#FFFFFF', text: '#142239', subText: '#727989', border: '#EAE4D8' };
    const saveLock = useRef(false);
    const pickerLock = useRef(false);
    const uploadCache = useRef(new Map());
    const editLanguage = country?.code === 'AU' ? 'AU' : 'TR';
    const textValue = value => value && typeof value === 'object' ? String(value[editLanguage] || value.TR || value.AU || '') : String(value ?? '');
    const editProduct = route.params?.product;

    const [uploading, setUploading] = useState(false); 

    const OPTIONS = {
        colors: ["Siyah", "Beyaz", "Kırmızı", "Mavi", "Yeşil", "Sarı", "Turuncu", "Mor", "Pembe", "Kahverengi", "Gri", "Lacivert", "Bej", "Bordo", "Çok Renkli"],
        sizes: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "Standart"]
    };

    const t = {
        header: editProduct ? "Ürünü Düzenle" : "Yeni Ürün", 
        media: "Ürün fotoğrafları · En fazla 5",
        name: "Ürün Adı", price: "Fiyat", disc: "İndirimli Fiyat",
        color: "Renk Seçimi (Çoklu)", size: "Beden Seçimi (Çoklu)", desc: "Açıklama",
        catLabel: "Kategori",
        categories: [
            "Kedi Maması", "Köpek Maması", "Kuş Yemi", "Oyuncak", 
            "Aksesuar", "Giyim", "Bakım & Sağlık", 
            "Yatak & Taşıma", "Teknoloji", "QR Kodlu Tasma"
        ],
        feat: "★ Öne Çıkan", 
        best: "🔥 Çok Satan", 
        new: "🆕 Yeni Sezon",
        discount: "🏷️ İndirimli",
        limited: "⚠️ Sınırlı Stok",
        eco: "🌱 Ekolojik",
        save: "Kaydet", addMedia: "Ekle", video: "Video",
        alert: "Lütfen en az 1 fotoğraf, isim, fiyat ve kategori giriniz."
    };

    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [discountPrice, setDiscountPrice] = useState('');
    const [description, setDescription] = useState('');
    
    const [selectedColors, setSelectedColors] = useState([]);
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [category, setCategory] = useState(''); 
    
    const [isFeatured, setIsFeatured] = useState(false);
    const [isBestSeller, setIsBestSeller] = useState(false);
    const [isNewArrival, setIsNewArrival] = useState(false);
    const [isDiscount, setIsDiscount] = useState(false);
    const [isLimited, setIsLimited] = useState(false);
    const [isEco, setIsEco] = useState(false);

    const [mediaList, setMediaList] = useState([]);
    const [targetRegion, setTargetRegion] = useState(editProduct?.targetRegion || editProduct?.target_region || 'TR'); 

    useEffect(() => {
        if (editProduct) {
            setName(textValue(editProduct.rawName ?? editProduct.name));
            setPrice(editProduct.price ? editProduct.price.toString() : '');
            setDiscountPrice((editProduct.discountPrice ?? editProduct.discount_price)?.toString() || '');
            setDescription(textValue(editProduct.rawDescription ?? editProduct.description));
            
            setSelectedColors(Array.isArray(editProduct.colors) ? editProduct.colors : []);
            setSelectedSizes(Array.isArray(editProduct.sizes) ? editProduct.sizes : []);
            
            setCategory(editProduct.category || ''); 
            
            setIsFeatured(editProduct.isFeatured || false);
            setIsBestSeller(editProduct.isBestSeller || false);
            setIsNewArrival(editProduct.isNewArrival || false);
            setIsDiscount(editProduct.isDiscount || false);
            setIsLimited(editProduct.isLimited || false);
            setIsEco(editProduct.isEco || false);

            if (editProduct.media && editProduct.media.length > 0) {
                setMediaList(editProduct.media);
            } else if (editProduct.image_urls && editProduct.image_urls.length > 0) {
                setMediaList(editProduct.image_urls.map(url => ({ type: 'image', uri: url })));
            } else if (editProduct.img) {
                setMediaList([{ type: 'image', uri: editProduct.img }]);
            }
        }
    }, [editProduct]);

    const toggleSelection = (item, type) => {
        if (type === 'color') {
            if (selectedColors.includes(item)) setSelectedColors(selectedColors.filter(c => c !== item));
            else setSelectedColors([...selectedColors, item]);
        } else if (type === 'size') {
            if (selectedSizes.includes(item)) setSelectedSizes(selectedSizes.filter(s => s !== item));
            else setSelectedSizes([...selectedSizes, item]);
        }
    };

    const pickMedia = async () => {
        const currentImages = mediaList.filter(m => m.type === 'image').length;
        if (currentImages >= 5) { Alert.alert("Limit", "Maksimum fotoğraf sayısına ulaştınız."); return; }

        Alert.alert("Medya Ekle", "Ne eklemek istersiniz?", [
            { text: "Fotoğraf", onPress: () => launchPicker('image') },
            { text: "İptal", style: "cancel" }
        ]);
    };

    const launchPicker = async (type) => {
        if (saveLock.current || pickerLock.current) return;
        pickerLock.current = true;
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) { Alert.alert('Fotoğraf izni gerekli', 'Fotoğraf eklemek için galeri erişimine izin verin.'); return; }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true
            });
            if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                setMediaList(previous => previous.filter(m => m.type === 'image').length >= 5 ? previous : [...previous, { type: 'image', uri: asset.uri, base64: asset.base64 }]);
            }
        } catch (error) { Alert.alert('Fotoğraf seçilemedi', error.message || 'Tekrar deneyin.'); }
        finally { pickerLock.current = false; }
    };

    const uploadImage = async (uri, base64) => {
        if (/^https?:\/\//i.test(uri)) return uri;
        if (uploadCache.current.has(uri)) return uploadCache.current.get(uri);
        const encoded = base64 || await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        if (!encoded) throw new Error('Fotoğraf okunamadı. Lütfen yeniden seçin.');
        const buffer = decode(encoded);
        const bytes = new Uint8Array(buffer);
        // Match the real file format instead of labelling every upload as JPEG.
        let ext, contentType;
        if (bytes[0] === 255 && bytes[1] === 216) { ext = 'jpg'; contentType = 'image/jpeg'; }
        else if (bytes[0] === 137 && bytes[1] === 80) { ext = 'png'; contentType = 'image/png'; }
        else if (bytes[0] === 71 && bytes[1] === 73) { ext = 'gif'; contentType = 'image/gif'; }
        else if (String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') { ext = 'webp'; contentType = 'image/webp'; }
        else throw new Error('Desteklenmeyen fotoğraf biçimi. JPEG veya PNG bir fotoğraf seçin.');
        const filename = `product_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const bucket = supabase.storage.from('product-images');
        const { error } = await bucket.upload(filename, buffer, { contentType, upsert: false });
        if (error) throw error;
        const { data } = bucket.getPublicUrl(filename);
        if (!data?.publicUrl) throw new Error('Fotoğraf bağlantısı alınamadı.');
        uploadCache.current.set(uri, data.publicUrl);
        return data.publicUrl;
    };

    const decode = (base64) => {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };

    const removeMedia = (index) => {
        const newList = [...mediaList];
        newList.splice(index, 1);
        setMediaList(newList);
    };

    // ✅ DÜZELTİLEN KAYDETME İŞLEMİ
    const handleSave = async () => {
        if (saveLock.current) return;
        if (user?.is_admin !== true) return Alert.alert('Yetki gerekli', 'Ürünleri yalnızca yönetici hesapları kaydedebilir.');
        const validMoney = value => /^\d+(\.\d{1,2})?$/.test(value.trim().replace(',', '.')) && Number(value.trim().replace(',', '.')) > 0 && Number.isFinite(Number(value.trim().replace(',', '.')));
        if (!validMoney(price) || (discountPrice.trim() && (!validMoney(discountPrice) || Number(discountPrice.replace(',', '.')) >= Number(price.replace(',', '.'))))) {
            Alert.alert('Fiyatı kontrol edin', 'Geçerli bir fiyat girin. İndirimli fiyat normal fiyattan düşük olmalı.');
            return;
        }
        if (!name.trim() || !price || !category || !mediaList.some(m => m.type === 'image')) { 
            Alert.alert("Hata", t.alert);
            return;
        }

        saveLock.current = true;
        setUploading(true);

        try {
            // 🚨 EKSİK OLAN KISIM EKLENDİ: Önce resimleri tek tek Supabase'e yüklüyoruz
            const uploadedMedia = await Promise.all(
                mediaList.map(async (media) => {
                    if (media.uri.startsWith('http')) {
                        return media; // Zaten yüklüyse veya linkse aynen bırak
                    }
                    const publicUrl = await uploadImage(media.uri, media.base64);
                    return { ...media, uri: publicUrl }; // Yerel URI'yi public URL ile değiştir
                })
            );

            // Virgül ile girilen fiyatları noktaya çevirip sayıya dönüştürüyoruz
            const finalPrice = parseFloat(price.replace(',', '.'));
            const finalDiscountPrice = discountPrice.trim() ? parseFloat(discountPrice.replace(',', '.')) : null;

            const productData = {
                name: editProduct?.rawName && typeof editProduct.rawName === 'object' ? { ...editProduct.rawName, [editLanguage]: name.trim() } : name.trim(), 
                price: finalPrice,
                discountPrice: finalDiscountPrice,
                description: editProduct?.rawDescription && typeof editProduct.rawDescription === 'object' ? { ...editProduct.rawDescription, [editLanguage]: description.trim() } : description.trim(),
                category, 
                media: uploadedMedia,
                img: uploadedMedia.length > 0 ? uploadedMedia[0].uri : null,
                
                isFeatured, isBestSeller, isNewArrival,
                isDiscount, isLimited, isEco,
                
                colors: selectedColors,
                sizes: selectedSizes,
                targetRegion: targetRegion, 
                
                rating: editProduct ? editProduct.rating : 0,
                reviewCount: editProduct ? editProduct.reviewCount : 0,
                soldCount: editProduct ? editProduct.soldCount : 0,
            };

            const saved = editProduct
                ? await updateProduct(editProduct.id, productData)
                : await addProduct(productData);
            if (!saved?.id) throw new Error('Kayıt doğrulanamadı. ShopContext dosyasının güncel olduğundan emin olun.');
            
            saveLock.current = false;
            navigation.goBack();

        } catch (error) {
            console.log("Kaydetme hatası:", error);
            Alert.alert("Ürün kaydedilemedi", error.message || "Lütfen tekrar deneyin.");
        } finally {
            saveLock.current = false;
            setUploading(false);
        }
    };

    useEffect(() => navigation.addListener('beforeRemove', event => {
        if (saveLock.current) event.preventDefault();
    }), [navigation]);

    const renderOption = (item, isSelected, type) => (
        <TouchableOpacity
            key={item}
            style={[
                styles.optionBtn, { backgroundColor: theme.cardBg, borderColor: theme.border },
                isSelected && { backgroundColor: '#B18A46', borderColor: '#B18A46' }
            ]}
            onPress={() => toggleSelection(item, type)}
        >
            <Text style={[styles.optionText, { color: theme.text }, isSelected && { color: 'white' }]}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t.header}</Text>
                
                {uploading ? (
                    <ActivityIndicator color="#B18A46" />
                ) : (
                    <TouchableOpacity onPress={handleSave}><Text style={styles.saveText}>{t.save}</Text></TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
            >
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
                    <View pointerEvents={uploading ? 'none' : 'auto'} style={{ opacity: uploading ? 0.6 : 1 }}>
                    <View style={styles.hero}><Text style={styles.heroEyebrow}>PİTO SHOP · ÜRÜN STÜDYOSU</Text><Text style={styles.heroTitle}>{editProduct ? 'Ürününe yeni bir dokunuş.' : 'Yeni bir ürün, yeni bir keşif.'}</Text><Text style={styles.heroBody}>Fotoğrafları, fiyatı ve ürün seçeneklerini tek yerden düzenle.</Text></View>
                    
                    <Text style={[styles.label, {color:theme.text}]}>{t.media}</Text>
                    <View style={styles.mediaRow}>
                        <TouchableOpacity style={styles.addBtn} onPress={pickMedia}>
                            <Ionicons name="add" size={30} color="#666" />
                            <Text style={{fontSize:10, color:'#666'}}>{t.addMedia}</Text>
                        </TouchableOpacity>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {mediaList.map((item, index) => (
                                <View key={index} style={styles.mediaItem}>
                                    {item.type === 'video' ? (
                                        <View style={[styles.mediaThumb, {backgroundColor:'black', justifyContent:'center', alignItems:'center'}]}>
                                            <Ionicons name="videocam" size={20} color="white" />
                                        </View>
                                    ) : (
                                        <TouchableOpacity accessibilityLabel="Kapak fotoğrafı yap" onPress={() => setMediaList(previous => [previous[index], ...previous.filter((_, i) => i !== index)])}><Image source={{ uri: item.uri }} style={styles.mediaThumb} />{index === 0 && <View style={styles.coverBadge}><Text style={styles.coverText}>KAPAK</Text></View>}</TouchableOpacity>
                                    )}
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeMedia(index)}>
                                        <Ionicons name="close-circle" size={20} color="red" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    <Text style={[styles.helper, { color: theme.subText }]}>İlk fotoğraf mağazada kapak olarak görünür. Fotoğrafa dokunarak kapağı değiştirebilirsin.</Text>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Ürün bilgileri</Text>
                    <Text style={[styles.label, {color:theme.text}]}>{t.name}</Text>
                    <TextInput style={[styles.input, {color:theme.text, borderColor:theme.border, backgroundColor:theme.cardBg}]} value={name} onChangeText={setName} />

                    <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                        <View style={{width:'48%'}}>
                            <Text style={[styles.label, {color:theme.text}]}>{t.price}</Text>
                            <TextInput style={[styles.input, {color:theme.text, borderColor:theme.border, backgroundColor:theme.cardBg}]} value={price} onChangeText={setPrice} keyboardType="numeric" />
                        </View>
                        <View style={{width:'48%'}}>
                            <Text style={[styles.label, {color:theme.text}]}>{t.disc}</Text>
                            <TextInput style={[styles.input, {color:theme.text, borderColor:theme.border, backgroundColor:theme.cardBg}]} value={discountPrice} onChangeText={setDiscountPrice} keyboardType="numeric" />
                        </View>
                    </View>

                    <Text style={[styles.label, {color:theme.text}]}>Satış bölgesi</Text>
                    <View style={styles.optionsContainer}>{[['TR', 'Türkiye · TL'], ['AU', 'Avustralya · AUD'], ['GLOBAL', 'Tüm bölgeler']].map(([value, title]) => <TouchableOpacity key={value} onPress={() => setTargetRegion(value)} style={[styles.optionBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }, { backgroundColor: theme.cardBg, borderColor: theme.border }, targetRegion === value && { backgroundColor: '#142239' }]}><Text style={{ color: targetRegion === value ? '#FFFFFF' : theme.text, fontSize: 12 }}>{title}</Text></TouchableOpacity>)}</View>
                    <Text style={[styles.label, {color:theme.text}]}>{t.catLabel}:</Text>
                    <View style={styles.optionsContainer}>
                        {[...new Set([...t.categories, ...(category ? [category] : [])])].map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.optionBtn, { backgroundColor: theme.cardBg, borderColor: theme.border },
                                    category === cat && { backgroundColor: '#B18A46', borderColor: '#B18A46' }
                                ]}
                                onPress={() => setCategory(cat)}
                            >
                                <Text style={[styles.optionText, { color: theme.text }, category === cat && { color: 'white' }]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.label, {color:theme.text, marginTop:20}]}>{t.color}:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{flexDirection:'row', paddingBottom:5}}>
                            {OPTIONS.colors.map(color => renderOption(color, selectedColors.includes(color), 'color'))}
                        </View>
                    </ScrollView>

                    <Text style={[styles.label, {color:theme.text, marginTop:20}]}>{t.size}:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{flexDirection:'row', paddingBottom:5}}>
                            {OPTIONS.sizes.map(size => renderOption(size, selectedSizes.includes(size), 'size'))}
                        </View>
                    </ScrollView>

                    <View style={styles.switchContainer}>
                        <Text style={{fontWeight:'bold', marginBottom:10, color:theme.text}}>Ürün Etiketleri</Text>
                        <View style={styles.switchRow}><Text style={{color:theme.text}}>{t.feat}</Text><Switch value={isFeatured} onValueChange={setIsFeatured} trackColor={{false:"#767577", true: "#FFD700"}} /></View>
                        <View style={styles.switchRow}><Text style={{color:theme.text}}>{t.best}</Text><Switch value={isBestSeller} onValueChange={setIsBestSeller} trackColor={{false:"#767577", true: "orange"}} /></View>
                        <View style={styles.switchRow}><Text style={{color:theme.text}}>{t.new}</Text><Switch value={isNewArrival} onValueChange={setIsNewArrival} trackColor={{false:"#767577", true: "#B18A46"}} /></View>
                        <View style={styles.switchRow}><Text style={{color:theme.text}}>{t.discount}</Text><Switch value={isDiscount} onValueChange={setIsDiscount} trackColor={{false:"#767577", true: "#E91E63"}} /></View>
                        <View style={styles.switchRow}><Text style={{color:theme.text}}>{t.limited}</Text><Switch value={isLimited} onValueChange={setIsLimited} trackColor={{false:"#767577", true: "#FF5252"}} /></View>
                        <View style={styles.switchRow}><Text style={{color:theme.text}}>{t.eco}</Text><Switch value={isEco} onValueChange={setIsEco} trackColor={{false:"#767577", true: "#4CAF50"}} /></View>
                    </View>

                    <Text style={[styles.label, {color:theme.text}]}>{t.desc}</Text>
                    <TextInput 
                        style={[styles.input, {height:120, textAlignVertical:'top', color:theme.text, borderColor:theme.border, backgroundColor:theme.cardBg}]} 
                        value={description} 
                        onChangeText={setDescription} 
                        multiline 
                    />

                    <TouchableOpacity style={styles.bottomSave} onPress={handleSave}><Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" /><Text style={styles.bottomSaveText}>{editProduct ? 'Değişiklikleri kaydet' : 'Ürünü kaydet'}</Text></TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    hero: { backgroundColor: '#142239', borderRadius: 24, padding: 22, marginBottom: 14 },
    heroEyebrow: { color: '#D9BC82', fontSize: 9, letterSpacing: 1.5, fontWeight: '800' },
    heroTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', marginTop: 12, lineHeight: 32 },
    heroBody: { color: '#BBC5D2', fontSize: 12, lineHeight: 20, marginTop: 10 },
    helper: { fontSize: 11, lineHeight: 18, marginTop: 6 },
    sectionTitle: { fontSize: 21, fontWeight: '800', marginTop: 26 },
    coverBadge: { position: 'absolute', left: 7, bottom: 7, backgroundColor: '#142239', borderRadius: 6, padding: 5 },
    coverText: { color: '#E4C990', fontSize: 8, fontWeight: '800' },
    bottomSave: { backgroundColor: '#142239', borderRadius: 18, padding: 18, marginTop: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
    bottomSaveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(177,138,70,0.15)' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    saveText: { color: '#B18A46', fontWeight: 'bold', fontSize: 16 },
    label: { fontWeight: '700', fontSize: 12, marginBottom: 9, marginTop: 18 },
    input: { borderWidth: 1, borderRadius: 16, padding: 15, fontSize: 15 },
    mediaRow: { flexDirection: 'row', marginBottom: 10 },
    addBtn: { width: 100, height: 110, backgroundColor: '#f0f0f0', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    mediaItem: { position: 'relative', marginRight: 10 },
    mediaThumb: { width: 100, height: 110, borderRadius: 16 },
    removeBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: 'white', borderRadius: 16 },
    
    switchContainer: { marginTop: 20, backgroundColor: 'rgba(0,0,0,0.05)', padding: 15, borderRadius: 16 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

    optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
    optionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, marginRight: 8, marginBottom: 8, backgroundColor: 'white' },
    optionText: { fontSize: 13, color: '#555', fontWeight: '600' }
});

export default AddEditProductScreen;