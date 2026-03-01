import React, { useState, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ShopContext } from '../context/ShopContext';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { COLORS } from '../constants/colors';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase'; // ✅ Supabase eklendi

const AddReviewScreen = ({ navigation, route }) => {
    // productId parametresini alıyoruz
    const { productId } = route.params;
    
    const { user, country } = useContext(AuthContext);
    const { theme } = useContext(ThemeContext);

    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';

    const t = {
        TR: { title: "Yorum Yap", ph: "Deneyimlerinizi paylaşın...", addPhoto: "Fotoğraf Ekle", submit: "Yorumu Gönder", err: "Lütfen puan verin ve yorum yazın.", success: "Yorumunuz yayınlandı!", uploadErr: "Fotoğraf yüklenirken hata oluştu." },
        AU: { title: "Write Review", ph: "Share your experience...", addPhoto: "Add Photo", submit: "Submit Review", err: "Please rate and write a comment.", success: "Review posted!", uploadErr: "Error uploading photo." }
    }[activeLang];

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [images, setImages] = useState([]); // { uri, base64 } objeleri tutulacak
    const [loading, setLoading] = useState(false);

    // 📸 GALERİDEN RESİM SEÇ
    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true, // Supabase'e yüklemek için base64 gerekli
        });
        
        if (!result.canceled) {
            setImages([...images, { uri: result.assets[0].uri, base64: result.assets[0].base64 }]);
        }
    };

    // ☁️ RESİM YÜKLEME (SUPABASE)
    const uploadImageToSupabase = async (base64) => {
        try {
            const filename = `review_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const arrayBuffer = decode(base64);

            const { data, error } = await supabase.storage
                .from('review-images') // Bucket adı (Supabase'de oluşturulmalı)
                .upload(filename, arrayBuffer, {
                    contentType: 'image/jpeg'
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('review-images')
                .getPublicUrl(filename);

            return publicUrl;
        } catch (e) {
            console.log("Resim yükleme hatası:", e);
            return null;
        }
    };

    // Base64 decode yardımcısı
    const decode = (base64) => {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    };

    // 💾 KAYDETME
    const handleSubmit = async () => {
        if (rating === 0 || !comment.trim()) {
            Alert.alert("Eksik", t.err);
            return;
        }

        setLoading(true);

        try {
            // 1. Varsa resimleri yükle ve URL'leri al
            const uploadedUrls = [];
            if (images.length > 0) {
                for (const img of images) {
                    const url = await uploadImageToSupabase(img.base64);
                    if (url) uploadedUrls.push(url);
                }
            }

            // 2. Veritabanına Yorum Ekle
            const { error } = await supabase
                .from('reviews')
                .insert([{
                    product_id: parseInt(productId), // bigint olduğu için integer'a çeviriyoruz
                    user_id: user.id,
                    rating: rating,
                    comment: comment,
                    images: uploadedUrls // text[] sütununa dizi olarak gönderiyoruz
                }]);

            if (error) throw error;

            Alert.alert("Teşekkürler", t.success, [
                { text: "Tamam", onPress: () => navigation.goBack() }
            ]);

        } catch (error) {
            console.log("Yorum hatası:", error);
            Alert.alert("Hata", "Yorum gönderilemedi. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    const removeImage = (index) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="close" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
                <View style={{width:28}}/>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Yıldızlar */}
                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setRating(star)}>
                            <Ionicons 
                                name={star <= rating ? "star" : "star-outline"} 
                                size={40} 
                                color="#FFD700" 
                                style={{ marginHorizontal: 5 }}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Yorum Alanı */}
                <TextInput 
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.cardBg }]} 
                    multiline 
                    placeholder={t.ph} 
                    placeholderTextColor={theme.subText}
                    value={comment}
                    onChangeText={setComment}
                />

                {/* Fotoğraf Ekleme */}
                <View style={{marginBottom: 20}}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                            <Ionicons name="camera" size={30} color={COLORS.primary} />
                            <Text style={{fontSize:10, color: COLORS.primary}}>{t.addPhoto}</Text>
                        </TouchableOpacity>
                        
                        {images.map((img, index) => (
                            <View key={index} style={styles.imageWrapper}>
                                <Image source={{ uri: img.uri }} style={styles.thumb} />
                                <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                                    <Ionicons name="close-circle" size={20} color="red" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.submitText}>{t.submit}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    title: { fontSize: 18, fontWeight: 'bold' },
    starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
    input: { height: 120, padding: 15, borderRadius: 12, borderWidth: 1, textAlignVertical: 'top', marginBottom: 20 },
    addPhotoBtn: { width: 80, height: 80, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    imageWrapper: { position: 'relative', marginRight: 10 },
    thumb: { width: 80, height: 80, borderRadius: 10 },
    removeBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: 'white', borderRadius: 10 },
    submitBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 12, alignItems: 'center' },
    submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default AddReviewScreen;