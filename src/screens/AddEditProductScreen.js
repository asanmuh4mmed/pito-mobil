import React, { useState, useContext, useEffect } from 'react';
import { 
    View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, 
    Alert, Image, Switch, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ShopContext } from '../context/ShopContext';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../constants/colors';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase'; // ✅ Storage için gerekli

const AddEditProductScreen = ({ navigation, route }) => {
    // ✅ Context'ten DB fonksiyonlarını al
    const { addProduct, updateProduct } = useContext(ShopContext);
    const { theme } = useContext(ThemeContext);
    const { country } = useContext(AuthContext);
    const editProduct = route.params?.product;

    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
    const [uploading, setUploading] = useState(false); // Yükleme durumu

    const OPTIONS = {
        TR: {
            colors: ["Siyah", "Beyaz", "Kırmızı", "Mavi", "Yeşil", "Sarı", "Turuncu", "Mor", "Pembe", "Kahverengi", "Gri", "Lacivert", "Bej", "Bordo", "Çok Renkli"],
            sizes: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "Standart"]
        },
        AU: {
            colors: ["Black", "White", "Red", "Blue", "Green", "Yellow", "Orange", "Purple", "Pink", "Brown", "Grey", "Navy", "Beige", "Maroon", "Multi"],
            sizes: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "One Size"]
        }
    };

    const t = {
        TR: { 
            header: editProduct ? "Ürünü Düzenle" : "Yeni Ürün", 
            media: "Medya (Max 5 Foto, 1 Video)",
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
            alert: "Lütfen en az 1 fotoğraf, isim, fiyat ve kategori giriniz.",
            region: "Hedef Bölge", global: "Herkes (Global)", tr: "Sadece Türkiye", au: "Sadece Avustralya"
        },
        AU: { 
            header: editProduct ? "Edit Product" : "New Product", 
            media: "Media (Max 5 Photos, 1 Video)",
            name: "Name", price: "Price", disc: "Discount Price",
            color: "Select Colors (Multi)", size: "Select Sizes (Multi)", desc: "Description",
            catLabel: "Category",
            categories: [
                "Cat Food", "Dog Food", "Bird Food", "Toys", 
                "Accessories", "Clothing", "Care & Health", 
                "Beds & Carriers", "Technology", "QR Coded Collar"
            ],
            feat: "★ Featured", 
            best: "🔥 Best Seller", 
            new: "🆕 New Arrival",
            discount: "🏷️ On Sale",
            limited: "⚠️ Limited Stock",
            eco: "🌱 Eco-Friendly",
            save: "Save", addMedia: "Add", video: "Video",
            alert: "Please enter at least 1 photo, name, price and category.",
            region: "Target Region", global: "Global (All)", tr: "Turkey Only", au: "Australia Only"
        }
    }[activeLang];

    // State
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [discountPrice, setDiscountPrice] = useState('');
    const [description, setDescription] = useState('');
    
    const [selectedColors, setSelectedColors] = useState([]);
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [category, setCategory] = useState(''); 
    
    // Etiketler
    const [isFeatured, setIsFeatured] = useState(false);
    const [isBestSeller, setIsBestSeller] = useState(false);
    const [isNewArrival, setIsNewArrival] = useState(false);
    const [isDiscount, setIsDiscount] = useState(false);
    const [isLimited, setIsLimited] = useState(false);
    const [isEco, setIsEco] = useState(false);

    const [mediaList, setMediaList] = useState([]);
    const [targetRegion, setTargetRegion] = useState('GLOBAL'); 

    useEffect(() => {
        if (editProduct) {
            setName(editProduct.name);
            setPrice(editProduct.price ? editProduct.price.toString() : '');
            setDiscountPrice(editProduct.discountPrice ? editProduct.discountPrice.toString() : '');
            setDescription(editProduct.description);
            
            setSelectedColors(Array.isArray(editProduct.colors) ? editProduct.colors : []);
            setSelectedSizes(Array.isArray(editProduct.sizes) ? editProduct.sizes : []);
            
            setCategory(editProduct.category || ''); 
            
            setIsFeatured(editProduct.isFeatured || false);
            setIsBestSeller(editProduct.isBestSeller || false);
            setIsNewArrival(editProduct.isNewArrival || false);
            setIsDiscount(editProduct.isDiscount || false);
            setIsLimited(editProduct.isLimited || false);
            setIsEco(editProduct.isEco || false);

            setTargetRegion(editProduct.targetRegion || 'GLOBAL'); 
            
            // Medya listesini oluştur (Veritabanından gelen URL'leri UI formatına çevir)
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

    // 📸 GALERİDEN MEDYA SEÇME
    const pickMedia = async () => {
        const currentImages = mediaList.filter(m => m.type === 'image').length;
        if (currentImages >= 5) { Alert.alert("Limit", "Maksimum fotoğraf sayısına ulaştınız."); return; }

        Alert.alert("Medya Ekle", "Ne eklemek istersiniz?", [
            { text: "Fotoğraf", onPress: () => launchPicker('image') },
            // Video özelliği şimdilik kapalı kalabilir veya açılabilir
            // { text: "Video", onPress: () => launchPicker('video') }, 
            { text: "İptal", style: "cancel" }
        ]);
    };

    const launchPicker = async (type) => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true 
        });

        if (!result.canceled) {
            setMediaList([...mediaList, { type: type, uri: result.assets[0].uri, base64: result.assets[0].base64 }]);
        }
    };

    // ☁️ RESİM YÜKLEME (SUPABASE STORAGE)
    const uploadImage = async (uri, base64) => {
        try {
            // Eğer zaten http ile başlıyorsa (önceden yüklenmişse) tekrar yükleme
            if (uri.startsWith('http')) return uri;

            const filename = `product_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            
            // Base64'ten Buffer'a çevirme (React Native için ArrayBuffer decode gerekir)
            // Ancak Expo'da FormData ile göndermek daha kolaydır:
            const formData = new FormData();
            formData.append('files', {
                uri: uri,
                name: filename,
                type: 'image/jpeg',
            });

            // Veya Supabase'in JS client'ı arrayBuffer ister.
            // En basiti: base64'ü decode edip yüklemek
            const { data, error } = await supabase.storage
                .from('product-images') // Bucket adı (Supabase panelinden oluşturulmalı)
                .upload(filename, decode(base64), {
                    contentType: 'image/jpeg'
                });

            if (error) {
                // Eğer bucket yoksa hata verebilir, bucket oluşturulmalı
                console.log("Upload Error:", error);
                throw error;
            }

            // Public URL al
            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filename);

            return publicUrl;

        } catch (e) {
            console.log("Resim yükleme hatası (Storage):", e);
            // Hata durumunda URI'yi geri dön (Yerel çalışmaya devam etsin diye)
            return uri; 
        }
    };

    // Base64 decode yardımcısı (Supabase upload için)
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

    // 💾 KAYDETME İŞLEMİ (DATABASE)
    const handleSave = async () => {
        if (!name || !price || !category || mediaList.length === 0) { 
            Alert.alert("Hata", t.alert);
            return;
        }

        setUploading(true);

        try {
            // 1. Resimleri Yükle
            // const uploadedMedia = await Promise.all(mediaList.map(m => uploadImage(m.uri, m.base64)));
            // Not: Supabase Storage kurulumu karmaşıksa şimdilik URI kullanıyoruz.
            // Gerçek storage aktif olduğunda üstteki satır açılır.
            const uploadedMedia = mediaList; // Şimdilik yerel URI veya mevcut URL

            const productData = {
                name, 
                price: parseFloat(price),
                discountPrice: discountPrice ? parseFloat(discountPrice) : null,
                description,
                category, 
                media: uploadedMedia, // Obje listesi
                img: uploadedMedia.length > 0 ? uploadedMedia[0].uri : null, // Ana resim
                
                // Etiketler
                isFeatured, isBestSeller, isNewArrival,
                isDiscount, isLimited, isEco,
                
                colors: selectedColors,
                sizes: selectedSizes,
                targetRegion: targetRegion,
                
                // Eski değerleri koru
                rating: editProduct ? editProduct.rating : 0,
                reviewCount: editProduct ? editProduct.reviewCount : 0,
                soldCount: editProduct ? editProduct.soldCount : 0,
            };

            // 2. Veritabanına Yaz
            if (editProduct) {
                await updateProduct(editProduct.id, productData);
            } else {
                await addProduct(productData);
            }
            
            navigation.goBack();

        } catch (error) {
            console.log("Kaydetme hatası:", error);
            Alert.alert("Hata", "Ürün kaydedilemedi.");
        } finally {
            setUploading(false);
        }
    };

    const renderOption = (item, isSelected, type) => (
        <TouchableOpacity
            key={item}
            style={[
                styles.optionBtn,
                isSelected && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
            ]}
            onPress={() => toggleSelection(item, type)}
        >
            <Text style={[styles.optionText, isSelected && { color: 'white' }]}>{item}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* ÜST BAŞLIK */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="close" size={28} color={theme.text} /></TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t.header}</Text>
                
                {uploading ? (
                    <ActivityIndicator color={COLORS.primary} />
                ) : (
                    <TouchableOpacity onPress={handleSave}><Text style={styles.saveText}>{t.save}</Text></TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
            >
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                    
                    {/* MEDYA ALANI */}
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
                                        <Image source={{ uri: item.uri }} style={styles.mediaThumb} />
                                    )}
                                    <TouchableOpacity style={styles.removeBtn} onPress={() => removeMedia(index)}>
                                        <Ionicons name="close-circle" size={20} color="red" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* İSİM VE FİYATLAR */}
                    <Text style={[styles.label, {color:theme.text}]}>{t.name}</Text>
                    <TextInput style={[styles.input, {color:theme.text, borderColor:theme.border}]} value={name} onChangeText={setName} />

                    <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                        <View style={{width:'48%'}}>
                            <Text style={[styles.label, {color:theme.text}]}>{t.price}</Text>
                            <TextInput style={[styles.input, {color:theme.text, borderColor:theme.border}]} value={price} onChangeText={setPrice} keyboardType="numeric" />
                        </View>
                        <View style={{width:'48%'}}>
                            <Text style={[styles.label, {color:theme.text}]}>{t.disc}</Text>
                            <TextInput style={[styles.input, {color:theme.text, borderColor:theme.border}]} value={discountPrice} onChangeText={setDiscountPrice} keyboardType="numeric" />
                        </View>
                    </View>

                    {/* KATEGORİ SEÇİMİ */}
                    <Text style={[styles.label, {color:theme.text}]}>{t.catLabel}:</Text>
                    <View style={styles.optionsContainer}>
                        {t.categories.map((cat) => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.optionBtn,
                                    category === cat && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                                ]}
                                onPress={() => setCategory(cat)}
                            >
                                <Text style={[styles.optionText, category === cat && { color: 'white' }]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* RENK SEÇİMİ */}
                    <Text style={[styles.label, {color:theme.text, marginTop:20}]}>{t.color}:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{flexDirection:'row', paddingBottom:5}}>
                            {OPTIONS[activeLang].colors.map(color => renderOption(color, selectedColors.includes(color), 'color'))}
                        </View>
                    </ScrollView>

                    {/* BEDEN SEÇİMİ */}
                    <Text style={[styles.label, {color:theme.text, marginTop:20}]}>{t.size}:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{flexDirection:'row', paddingBottom:5}}>
                            {OPTIONS[activeLang].sizes.map(size => renderOption(size, selectedSizes.includes(size), 'size'))}
                        </View>
                    </ScrollView>

                    {/* BÖLGE SEÇİMİ */}
                    <Text style={[styles.label, {color:theme.text, marginTop:20}]}>{t.region}:</Text>
                    <View style={styles.regionRow}>
                        <TouchableOpacity style={[styles.regionBtn, targetRegion === 'GLOBAL' && styles.regionBtnActive]} onPress={() => setTargetRegion('GLOBAL')}>
                            <Text style={[styles.regionText, targetRegion === 'GLOBAL' && styles.regionTextActive]}>🌍 {t.global}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.regionBtn, targetRegion === 'TR' && styles.regionBtnActive]} onPress={() => setTargetRegion('TR')}>
                            <Text style={[styles.regionText, targetRegion === 'TR' && styles.regionTextActive]}>🇹🇷 {t.tr}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.regionBtn, targetRegion === 'AU' && styles.regionBtnActive]} onPress={() => setTargetRegion('AU')}>
                            <Text style={[styles.regionText, targetRegion === 'AU' && styles.regionTextActive]}>🇦🇺 {t.au}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* ETİKET YÖNETİMİ */}
                    <View style={styles.switchContainer}>
                        <Text style={{fontWeight:'bold', marginBottom:10, color:theme.text}}>Ürün Etiketleri</Text>
                        <View style={styles.switchRow}><Text style={{color:theme.text}}>{t.feat}</Text><Switch value={isFeatured} onValueChange={setIsFeatured} trackColor={{false:"#767577", true: "#FFD700"}} /></View>
                        <View style={styles.switchRow}><Text style={{color:theme.text}}>{t.best}</Text><Switch value={isBestSeller} onValueChange={setIsBestSeller} trackColor={{false:"#767577", true: "orange"}} /></View>
                        <View style={styles.switchRow}><Text style={{color:theme.text}}>{t.new}</Text><Switch value={isNewArrival} onValueChange={setIsNewArrival} trackColor={{false:"#767577", true: "blue"}} /></View>
                        <View style={styles.switchRow}><Text style={{color:theme.text}}>{t.discount}</Text><Switch value={isDiscount} onValueChange={setIsDiscount} trackColor={{false:"#767577", true: "#E91E63"}} /></View>
                        <View style={styles.switchRow}><Text style={{color:theme.text}}>{t.limited}</Text><Switch value={isLimited} onValueChange={setIsLimited} trackColor={{false:"#767577", true: "#FF5252"}} /></View>
                        <View style={styles.switchRow}><Text style={{color:theme.text}}>{t.eco}</Text><Switch value={isEco} onValueChange={setIsEco} trackColor={{false:"#767577", true: "#4CAF50"}} /></View>
                    </View>

                    {/* AÇIKLAMA */}
                    <Text style={[styles.label, {color:theme.text}]}>{t.desc}</Text>
                    <TextInput 
                        style={[styles.input, {height:120, textAlignVertical:'top', color:theme.text, borderColor:theme.border}]} 
                        value={description} 
                        onChangeText={setDescription} 
                        multiline 
                    />

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    saveText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
    label: { fontWeight: 'bold', marginBottom: 5, marginTop: 10 },
    input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16 },
    mediaRow: { flexDirection: 'row', marginBottom: 10 },
    addBtn: { width: 70, height: 70, backgroundColor: '#f0f0f0', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    mediaItem: { position: 'relative', marginRight: 10 },
    mediaThumb: { width: 70, height: 70, borderRadius: 10 },
    removeBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: 'white', borderRadius: 10 },
    
    switchContainer: { marginTop: 20, backgroundColor: 'rgba(0,0,0,0.05)', padding: 15, borderRadius: 10 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    
    regionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    regionBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, alignItems: 'center', marginHorizontal: 3, backgroundColor: 'white' },
    regionBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    regionText: { fontSize: 12, color: '#333', fontWeight: '600' },
    regionTextActive: { color: 'white' },

    optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
    optionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, marginRight: 8, marginBottom: 8, backgroundColor: 'white' },
    optionText: { fontSize: 13, color: '#555', fontWeight: '600' }
});

export default AddEditProductScreen;