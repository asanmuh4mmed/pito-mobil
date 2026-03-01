import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { ThemeContext } from '../context/ThemeContext';
import { CartContext } from '../context/CartContext';
import { ShopContext } from '../context/ShopContext';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase'; // ✅ Supabase eklendi

const { width } = Dimensions.get('window');

const ProductDetailScreen = ({ route, navigation }) => {
    // Context verileri
    const { products, favorites, toggleFavorite } = useContext(ShopContext);
    const { theme } = useContext(ThemeContext);
    const { addToCart } = useContext(CartContext);
    const { user, country } = useContext(AuthContext);

    const paramsProduct = route.params.product;
    
    // Ürünü Context listesinden bul (Güncel fiyat/stok için) veya param'dan al
    const product = products.find(p => p.id === paramsProduct.id) || paramsProduct;

    // ✅ Favori Durumu (Context, DB ile senkronize çalışır)
    const isFavorite = favorites.some(fav => (typeof fav === 'object' ? fav.productId === product.id : fav === product.id));

    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
    
    const t = activeLang === 'AU' ? 
        { 
            reviews: "Reviews", seeAll: "See All", addReview: "Write a Review", 
            buyFirst: "Buy this item to leave a review.", color: "Color", size: "Size", 
            desc: "Description", added: "Added to Cart", successMsg: "Product added successfully!", 
            ok: "OK", new: "New", total: "Total", addToCart: "Add to Cart", noReview: "No reviews yet."
        } : 
        { 
            reviews: "Değerlendirmeler", seeAll: "Tümünü Gör", addReview: "Yorum Yap", 
            buyFirst: "Yorum yapmak için ürünü satın almalısınız.", color: "Renk", size: "Beden", 
            desc: "Açıklama", added: "Sepete Eklendi", successMsg: "Ürün başarıyla sepete eklendi.", 
            ok: "Tamam", new: "Yeni", total: "Toplam", addToCart: "Sepete Ekle", noReview: "Henüz yorum yok."
        };

    const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || null);
    const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || null);
    
    // ✅ STATE: Veritabanından gelen dinamik veriler
    const [reviewsList, setReviewsList] = useState([]);
    const [hasBought, setHasBought] = useState(false);
    const [loadingReviews, setLoadingReviews] = useState(true);

    // --- GALERİ STATE ---
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef(null);

    // Medya verisini hazırla (DB yapısına uygun kontrol)
    const mediaData = product.media && product.media.length > 0 
        ? product.media 
        : (product.image_urls ? product.image_urls.map(url => ({ type: 'image', uri: url })) : [{ type: 'image', uri: product.img }]);

    // ✅ VERİTABANI: Yorumları ve Satın Alma Durumunu Çek
    useEffect(() => {
        fetchRealtimeData();
    }, [product.id, user]);

    const fetchRealtimeData = async () => {
        setLoadingReviews(true);
        try {
            // 1. Yorumları Çek (reviews tablosundan)
            const { data: reviewsData, error } = await supabase
                .from('reviews')
                .select(`*, users (fullname)`) // Kullanıcı adını da al
                .eq('product_id', product.id)
                .order('created_at', { ascending: false });

            if (!error && reviewsData) {
                // UI formatına dönüştür
                const formattedReviews = reviewsData.map(r => ({
                    id: r.id,
                    user: r.users?.fullname || 'Misafir',
                    rating: r.rating,
                    comment: r.comment,
                    date: r.created_at
                }));
                setReviewsList(formattedReviews);
            }

            // 2. Satın Alma Kontrolü (orders tablosundan)
            if (user) {
                // Siparişlerin içindeki 'items' JSONB kolonunu kontrol etmemiz gerek
                // Supabase'de JSON içinde arama yapmak için filtreleme:
                const { data: ordersData } = await supabase
                    .from('orders')
                    .select('items')
                    .eq('user_id', user.id);

                if (ordersData) {
                    // Kullanıcının tüm sipariş kalemlerini tara
                    const purchased = ordersData.some(order => 
                        order.items && Array.isArray(order.items) && 
                        order.items.some(item => String(item.id) === String(product.id))
                    );
                    setHasBought(purchased);
                }
            }
        } catch (error) {
            console.log("Ürün detay veri hatası:", error);
        } finally {
            setLoadingReviews(false);
        }
    };

    // ✅ OTOMATİK KAYDIRMA (AUTO SLIDE)
    useEffect(() => {
        if (mediaData.length <= 1) return; 
        const interval = setInterval(() => {
            let nextIndex = activeIndex + 1;
            if (nextIndex >= mediaData.length) nextIndex = 0;
            setActiveIndex(nextIndex);
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        }, 3000); 
        return () => clearInterval(interval);
    }, [activeIndex, mediaData.length]);

    const onViewRef = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
    });
    const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

    const handleAddToCart = () => {
        const finalPrice = product.discountPrice ? product.discountPrice : product.price;
        const productToAdd = {
            ...product,
            selectedColor,
            selectedSize,
            price: finalPrice 
        };
        addToCart(productToAdd);
        Alert.alert(t.added, t.successMsg, [{ text: t.ok, onPress: () => navigation.goBack() }]);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
                </TouchableOpacity>
                
                {/* Favori Butonu */}
                <TouchableOpacity 
                    style={styles.iconBtn} 
                    onPress={() => toggleFavorite(product.id)}
                >
                    <Ionicons 
                        name={isFavorite ? "heart" : "heart-outline"} 
                        size={24} 
                        color={isFavorite ? "#FF3B30" : COLORS.dark} 
                    />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                
                {/* GALERİ SLIDER */}
                <View style={{ height: 350, width: width }}>
                    <FlatList
                        ref={flatListRef}
                        data={mediaData}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(_, index) => index.toString()}
                        onViewableItemsChanged={onViewRef.current}
                        viewabilityConfig={viewConfigRef.current}
                        renderItem={({ item }) => (
                            <View style={{ width: width, height: 350, backgroundColor: '#f0f0f0', justifyContent:'center', alignItems:'center' }}>
                                {item.type === 'video' ? (
                                    <View style={{alignItems:'center'}}>
                                        <Ionicons name="videocam" size={60} color="#666" />
                                        <Text style={{marginTop:10, color:'#666'}}>Video Preview</Text>
                                    </View>
                                ) : (
                                    <Image source={{ uri: item.uri }} style={styles.image} />
                                )}
                            </View>
                        )}
                    />
                    {mediaData.length > 1 && (
                        <View style={styles.pagination}>
                            {mediaData.map((_, i) => (
                                <View key={i} style={[styles.dot, i === activeIndex && styles.activeDot]} />
                            ))}
                        </View>
                    )}
                </View>

                {/* Ürün Bilgileri */}
                <View style={styles.infoContainer}>
                    <Text style={[styles.name, { color: theme.text }]}>{product.name}</Text>
                    
                    <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={[styles.ratingText, {color: theme.text}]}>
                            {/* Puan ortalamasını hesapla veya mevcut değeri kullan */}
                            {product.rating > 0 ? product.rating : t.new} ({reviewsList.length})
                        </Text>
                    </View>

                    <View style={styles.priceContainer}>
                        {product.discountPrice ? (
                            <>
                                <Text style={styles.oldPrice}>{product.price}</Text>
                                <Text style={styles.newPrice}>{product.discountPrice} {activeLang === 'AU' ? 'AUD' : 'TL'}</Text>
                            </>
                        ) : (
                            <Text style={styles.newPrice}>{product.price} {activeLang === 'AU' ? 'AUD' : 'TL'}</Text>
                        )}
                    </View>

                    {/* Renk Seçimi */}
                    {product.colors && product.colors.length > 0 && (
                        <View style={styles.optionSection}>
                            <Text style={[styles.optionTitle, {color:theme.text}]}>{t.color}:</Text>
                            <View style={styles.optionsRow}>
                                {product.colors.map((c) => (
                                    <TouchableOpacity key={c} style={[styles.optionBtn, selectedColor === c && styles.optionBtnActive]} onPress={() => setSelectedColor(c)}>
                                        <Text style={[styles.optionText, selectedColor === c && styles.optionTextActive]}>{c}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Beden Seçimi */}
                    {product.sizes && product.sizes.length > 0 && (
                        <View style={styles.optionSection}>
                            <Text style={[styles.optionTitle, {color:theme.text}]}>{t.size}:</Text>
                            <View style={styles.optionsRow}>
                                {product.sizes.map((s) => (
                                    <TouchableOpacity key={s} style={[styles.optionBtn, selectedSize === s && styles.optionBtnActive]} onPress={() => setSelectedSize(s)}>
                                        <Text style={[styles.optionText, selectedSize === s && styles.optionTextActive]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    <Text style={[styles.sectionHeader, {color:theme.text}]}>{t.desc}</Text>
                    <Text style={[styles.description, {color:theme.subText}]}>{product.description}</Text>

                    {/* YORUMLAR (DB'den Gelenler) */}
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:20, marginBottom:10}}>
                        <Text style={[styles.sectionHeader, {color:theme.text, margin:0}]}>{t.reviews} ({reviewsList.length})</Text>
                        {reviewsList.length > 0 && (
                            <TouchableOpacity onPress={() => navigation.navigate('AllReviews', { listingId: null, listingName: null, productId: product.id, productName: product.name })}>
                                <Text style={{color: COLORS.primary, fontWeight:'bold'}}>{t.seeAll}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Yorum Yap Butonu */}
                    {hasBought ? (
                        <TouchableOpacity 
                            style={styles.writeReviewBtn} 
                            onPress={() => navigation.navigate('AddReview', { productId: product.id })}
                        >
                            <Ionicons name="create-outline" size={20} color="white" />
                            <Text style={{color:'white', fontWeight:'bold', marginLeft:5}}>{t.addReview}</Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={{color:theme.subText, fontSize:12, fontStyle:'italic', marginBottom:10}}>
                            {t.buyFirst}
                        </Text>
                    )}

                    {/* Yorum Listesi Önizleme */}
                    {loadingReviews ? (
                        <ActivityIndicator color={COLORS.primary} size="small" />
                    ) : (
                        reviewsList.length > 0 ? (
                            reviewsList.slice(0, 2).map((rev, i) => (
                                <View key={i} style={[styles.reviewCard, {backgroundColor: theme.cardBg}]}>
                                    <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                                        <Text style={[styles.reviewUser, {color:theme.text}]}>{rev.user}</Text>
                                        <View style={{flexDirection:'row'}}>{[...Array(rev.rating)].map((_,k)=><Ionicons key={k} name="star" size={12} color="#FFD700"/>)}</View>
                                    </View>
                                    <Text style={[styles.reviewComment, {color:theme.subText}]} numberOfLines={2}>{rev.comment}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={{color:theme.subText, fontStyle:'italic'}}>{t.noReview}</Text>
                        )
                    )}
                </View>
            </ScrollView>

            {/* Sticky Bottom Bar */}
            <View style={[styles.bottomBar, { backgroundColor: theme.cardBg }]}>
                <View>
                    <Text style={{color:theme.subText, fontSize:12}}>{t.total}</Text>
                    <Text style={[styles.totalPrice, {color: COLORS.primary}]}>
                        {product.discountPrice || product.price} {activeLang === 'AU' ? 'AUD' : 'TL'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart}>
                    <Text style={styles.addToCartText}>{t.addToCart}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, position:'absolute', top:30, left:0, right:0, zIndex:10 },
    iconBtn: { backgroundColor: 'white', padding: 8, borderRadius: 20, elevation:5, shadowColor:'#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.2, shadowRadius:3 },
    
    // Galeri Stili
    image: { width: width, height: 350, resizeMode: 'cover' },
    pagination: { flexDirection: 'row', position: 'absolute', bottom: 15, alignSelf: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 4 },
    activeDot: { backgroundColor: COLORS.primary, width: 10, height: 10, borderRadius: 5 },

    infoContainer: { padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -20, backgroundColor: 'white' },
    name: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
    ratingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    ratingText: { marginLeft: 5, fontSize: 14, fontWeight: '600' },
    priceContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    oldPrice: { fontSize: 16, color: '#999', textDecorationLine: 'line-through', marginRight: 10 },
    newPrice: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
    optionSection: { marginBottom: 15 },
    optionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    optionsRow: { flexDirection: 'row', flexWrap: 'wrap' },
    optionBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 10, marginBottom: 10 },
    optionBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    optionText: { color: '#333' },
    optionTextActive: { color: 'white', fontWeight: 'bold' },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
    description: { fontSize: 14, lineHeight: 22 },
    reviewCard: { padding: 15, borderRadius: 10, marginBottom: 10 },
    reviewUser: { fontWeight: 'bold', fontSize: 14 },
    reviewComment: { marginTop: 5, fontSize: 14 },
    writeReviewBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor: '#4CAF50', padding: 10, borderRadius: 8, marginBottom: 15 },
    bottomBar: { position: 'absolute', bottom: 0, width: '100%', padding: 15, borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    addToCartBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },
    addToCartText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    totalPrice: { fontSize: 20, fontWeight: 'bold' }
});

export default ProductDetailScreen;