import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ShopContext } from '../context/ShopContext';
import { COLORS } from '../constants/colors';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';

const ShopAdminScreen = ({ navigation }) => {
    // ✅ Veritabanı işlemleri için Context'ten fonksiyonları alıyoruz
    const { products, deleteProduct, unreadOrderCount, resetOrderCount, fetchProducts } = useContext(ShopContext);
    const { theme } = useContext(ThemeContext);
    const { country } = useContext(AuthContext);

    const activeLang = country?.code === 'TR' ? 'TR' : 'AU';

    // Sayfa her açıldığında verilerin güncel olduğundan emin oluyoruz
    useEffect(() => {
        if (fetchProducts) {
            fetchProducts();
        }
    }, []);

    const TEXTS = {
        TR: { 
            title: "Ürün Yönetimi", 
            deleteTitle: "Ürünü Sil", 
            deleteMsg: "Bu ürünü veritabanından kalıcı olarak silmek istediğinize emin misiniz?", 
            cancel: "Vazgeç", 
            delete: "Sil", 
            currency: "TL", 
            categoryLabel: "Kategori: ",
            tags: { 
                featured: "★ Öne Çıkan", 
                best: "🔥 Çok Satan", 
                new: "🆕 Yeni",
                discount: "🏷️ İndirimli",
                limited: "⚠️ Sınırlı Stok",
                eco: "🌱 Ekolojik"
            },
            categories: {
                cat_food: "Kedi Maması",
                dog_food: "Köpek Maması",
                bird_food: "Kuş Yemi",
                toys: "Oyuncak",
                accessories: "Aksesuar",
                clothing: "Giyim",
                care: "Bakım & Sağlık",
                beds: "Yatak & Taşıma",
                tech: "Teknoloji"
            }
        },
        AU: { 
            title: "Product Management", 
            deleteTitle: "Delete Product", 
            deleteMsg: "Are you sure you want to permanently delete this product from the database?", 
            cancel: "Cancel", 
            delete: "Delete", 
            currency: "AUD", 
            categoryLabel: "Category: ",
            tags: { 
                featured: "★ Featured", 
                best: "🔥 Best Seller", 
                new: "🆕 New",
                discount: "🏷️ Sale",
                limited: "⚠️ Limited Stock",
                eco: "🌱 Eco-Friendly"
            },
            categories: {
                cat_food: "Cat Food",
                dog_food: "Dog Food",
                bird_food: "Bird Food",
                toys: "Toys",
                accessories: "Accessories",
                clothing: "Clothing",
                care: "Care & Health",
                beds: "Beds & Carriers",
                tech: "Technology"
            }
        }
    };
    const t = TEXTS[activeLang];

    const handleGoToOrders = () => {
        resetOrderCount();
        navigation.navigate('ShopAdminOrders');
    };

    // ✅ VERİTABANINDAN SİLME İŞLEMİ
    const handleDelete = (id) => {
        Alert.alert(t.deleteTitle, t.deleteMsg, [
            { text: t.cancel, style: "cancel" },
            { 
                text: t.delete, 
                style: "destructive", 
                onPress: async () => {
                    try {
                        // Context içindeki deleteProduct fonksiyonu Supabase'den silme işlemini yapar
                        await deleteProduct(id); 
                        // Silme işleminden sonra listeyi tazelemeye gerek kalmaz çünkü context state'i günceller
                    } catch (error) {
                        console.error("Silme hatası:", error);
                        Alert.alert("Hata", "Ürün silinirken bir sorun oluştu.");
                    }
                }
            }
        ]);
    };

    const getRegionIcon = (region) => {
        if (region === 'TR') return '🇹🇷';
        if (region === 'AU') return '🇦🇺';
        return '🌍'; 
    };

    const getCategoryName = (key) => {
        return t.categories[key] || key || '-';
    };

    const renderItem = ({ item }) => (
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
            {/* Ürün Resmi */}
            <Image source={{ uri: item.img }} style={styles.image} />
            
            <View style={styles.info}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.price}>{item.price} {t.currency}</Text>
                
                {/* Kategori */}
                <Text style={{fontSize: 11, color: theme.subText, marginTop: 2, fontStyle:'italic'}}>
                    {t.categoryLabel}{getCategoryName(item.category)}
                </Text>

                {/* Hedef Bölge */}
                <View style={styles.regionBadge}>
                    <Text style={{fontSize:10, fontWeight:'bold', color:'#555'}}>
                        {getRegionIcon(item.targetRegion)} {item.targetRegion || 'GLOBAL'}
                    </Text>
                </View>

                {/* Etiketler */}
                <View style={{flexDirection:'row', flexWrap:'wrap', marginTop:5, gap: 4}}>
                    {item.isFeatured && <Text style={[styles.tagText, {color:'#FFD700'}]}>{t.tags.featured}</Text>}
                    {item.isBestSeller && <Text style={[styles.tagText, {color:'#FF4500'}]}>{t.tags.best}</Text>}
                    {item.isNewArrival && <Text style={[styles.tagText, {color:'#1E90FF'}]}>{t.tags.new}</Text>}
                    {item.isDiscount && <Text style={[styles.tagText, {color:'#E91E63'}]}>{t.tags.discount}</Text>}
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity onPress={() => navigation.navigate('AddEditProduct', { product: item })} style={styles.editBtn}>
                    <Ionicons name="create-outline" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                
                <Text style={[styles.title, { color: theme.text }]}>{t.title}</Text>
                
                <TouchableOpacity onPress={handleGoToOrders}>
                    <View>
                        <Ionicons name="list-circle-outline" size={32} color={theme.text} />
                        {unreadOrderCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unreadOrderCount}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>

            {/* Ürün Listesi */}
            <FlatList
                data={products}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                ListEmptyComponent={
                    <View style={{alignItems:'center', marginTop:50}}>
                        <Text style={{color: theme.subText}}>Henüz ürün eklenmemiş.</Text>
                    </View>
                }
            />

            {/* Ürün Ekle Butonu */}
            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddEditProduct')}>
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth:1, borderBottomColor:'#eee' },
    title: { fontSize: 20, fontWeight: 'bold' },
    card: { flexDirection: 'row', padding: 10, borderRadius: 10, marginBottom: 10, alignItems: 'center', elevation: 2 },
    image: { width: 80, height: 80, borderRadius: 8, backgroundColor:'#eee', resizeMode: 'cover' },
    info: { flex: 1, marginLeft: 15 },
    name: { fontWeight: 'bold', fontSize: 16 },
    price: { color: COLORS.primary, fontWeight: 'bold' },
    actions: { flexDirection: 'column', gap: 10 }, 
    editBtn: { backgroundColor: '#4CAF50', padding: 8, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { backgroundColor: '#FF3B30', padding: 8, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
    fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    badge: { position: 'absolute', top: -2, right: -2, backgroundColor: 'red', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth:1, borderColor:'white' },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    tagText: { fontSize:10, fontWeight:'bold', marginRight: 5 },
    regionBadge: { marginTop: 4, backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' }
});

export default ShopAdminScreen;