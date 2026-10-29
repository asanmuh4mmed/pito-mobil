import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, FlatList, Dimensions, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { ThemeContext } from '../context/ThemeContext';
import { CartContext } from '../context/CartContext';
import { ShopContext } from '../context/ShopContext';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

// Pito Modern Mor Rengi (Sabit olarak tanımladım)
const PITO_PURPLE = '#B18A46';

const ProductDetailScreen = ({ route, navigation }) => {
    const { products, favorites, toggleFavorite } = useContext(ShopContext);
    const { theme: appTheme, isDarkMode } = useContext(ThemeContext);
    const theme = isDarkMode ? { ...appTheme, background: '#0B131E', cardBg: '#1A2533', text: '#F7F4EE', subText: '#A0AAB5' } : { ...appTheme, background: '#F8F5EF', cardBg: '#FFFFFF', text: '#142239', subText: '#727989' };
    const { addToCart, cart = [] } = useContext(CartContext);
    const { user, country } = useContext(AuthContext);

    const paramsProduct = route.params?.product || {};
    const product = products.find(p => String(p.id) === String(paramsProduct.id)) || paramsProduct;

    const isFavorite = favorites.some(fav => (typeof fav === 'object' ? String(fav.productId) === String(product.id) : String(fav) === String(product.id)));
    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
    
    const t = activeLang === 'AU' ? 
        { 
            reviews: "Reviews", seeAll: "See All", addReview: "Write a Review", 
            buyFirst: "Buy this item to leave a review.", color: "Color", size: "Size", 
            desc: "Description", added: "Added to Cart", successMsg: "Product added successfully!", 
            ok: "OK", new: "New", total: "Total", addToCart: "Add to Cart", noReview: "No reviews yet.",
            discount: "SALE", best: "BEST", newTag: "NEW"
        } : 
        { 
            reviews: "Değerlendirmeler", seeAll: "Tümünü Gör", addReview: "Yorum Yap", 
            buyFirst: "Yorum yapmak için ürünü satın almalısınız.", color: "Renk", size: "Beden", 
            desc: "Açıklama", added: "Sepete Eklendi", successMsg: "Ürün başarıyla sepete eklendi.", 
            ok: "Tamam", new: "Yeni", total: "Toplam", addToCart: "Sepete Ekle", noReview: "Henüz yorum yok.",
            discount: "İNDİRİM", best: "POPÜLER", newTag: "YENİ"
        };

    const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || null);
    const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || null);
    
    const [reviewsList, setReviewsList] = useState([]);
    const [hasBought, setHasBought] = useState(false);
    const [loadingReviews, setLoadingReviews] = useState(true);

    const [adding, setAdding] = useState(false);
    const addLock = useRef(false);
    const reviewRequest = useRef(0);
    const [reviewError, setReviewError] = useState(false);
    const [qrVisible, setQrVisible] = useState(false);
    const [qrName, setQrName] = useState('');
    const [zoomUri, setZoomUri] = useState(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef(null);

    const mediaData = product.media && product.media.length > 0 
        ? product.media 
        : (product.image_urls?.length ? product.image_urls.map(url => ({ type: 'image', uri: url })) : [{ type: 'image', uri: product.img }]);

    useEffect(() => {
        fetchRealtimeData();
        return () => { reviewRequest.current += 1; };
    }, [product.id, user?.id]);

    const fetchRealtimeData = async () => {
        const request = ++reviewRequest.current;
        setLoadingReviews(true);
        setHasBought(false);
        setReviewsList([]);
        setReviewError(false);
        try {
            const { data, error } = await supabase.from('reviews').select('*, users:pito_public_profiles (fullname)')
                .eq('product_id', product.id).order('created_at', { ascending: false });
            if (request !== reviewRequest.current) return;
            if (error) setReviewError(true);
            else setReviewsList((data || []).map(r => ({ id: r.id, user: r.users?.fullname || 'Misafir', rating: Math.max(0, Math.min(5, Math.round(Number(r.rating) || 0))), comment: r.comment, date: r.created_at })));
            if (user) {
                // The schema stores items in order_items, not an orders.items column.
                const { data: orders, error: orderError } = await supabase.from('orders')
                    .select('id,status,order_items!inner(product_id)').eq('user_id', user.id)
                    .eq('order_items.product_id', product.id);
                if (request === reviewRequest.current && !orderError) {
                    setHasBought((orders || []).some(order =>
                        ['teslim edildi', 'delivered', 'completed', 'tamamlandı'].includes(String(order.status || '').toLocaleLowerCase('tr-TR'))
                    ));
                }
            }
        } catch (error) {
            if (request === reviewRequest.current) setReviewError(true);
        } finally {
            if (request === reviewRequest.current) setLoadingReviews(false);
        }
    };

    useEffect(() => {
        setSelectedColor(product.colors?.[0] || null);
        setSelectedSize(product.sizes?.[0] || null);
        setActiveIndex(0);
    }, [product.id]);

    const onViewRef = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
    });
    const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

    const handleAddToCart = async (confirmedQrName = null) => {
        if (addLock.current) return;
        if (!product.id) return Alert.alert('Ürün bulunamadı', 'Mağazaya dönüp tekrar deneyin.');
        addLock.current = true;
        setAdding(true);
        try {
            const { data: current, error } = await supabase.from('products').select('*').eq('id', product.id).single();
            if (error || !current) throw new Error('Ürün bilgisi doğrulanamadı. Bağlantınızı kontrol edip tekrar deneyin.');
            if (current.target_region && current.target_region !== 'GLOBAL' && current.target_region !== activeLang) throw new Error('Bu ürün seçili satış bölgesinde bulunmuyor.');
            if (current.sku || product.sku) throw new Error('Bu ürünün uygulama içi satın alma bağlantısı henüz tamamlanmadı.');
            const stock = Number(current.stock);
            const quantity = cart.filter(p => String(p.id) === String(current.id)).reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
            if (!Number.isInteger(stock) || stock <= quantity) throw new Error(stock <= 0 ? 'Bu ürünün stoğu tükenmiş.' : 'Sepetinizdeki miktar mevcut stok sınırına ulaştı.');
            if (current.colors?.length && !current.colors.includes(selectedColor)) throw new Error('Geçerli bir renk seçin. Ürün seçenekleri değiştiyse sayfayı yeniden açın.');
            if (current.sizes?.length && !current.sizes.includes(selectedSize)) throw new Error('Geçerli bir beden seçin. Ürün seçenekleri değiştiyse sayfayı yeniden açın.');
            const needsQr = /QR|Kodlu/i.test(current.category || '');
            if (needsQr && !confirmedQrName?.trim()) { setQrVisible(true); return; }
            const finalPrice = Number(current.discount_price ?? current.price);
            if (!Number.isFinite(finalPrice) || finalPrice <= 0) throw new Error('Ürün fiyatı geçersiz.');
            // Current CartContext merges by product ID. Prevent losing a different option.
            const existing = cart.find(p => String(p.id) === String(current.id));
            if (existing && ((existing.selectedColor || null) !== selectedColor || (existing.selectedSize || null) !== selectedSize || (existing.qrName || null) !== (needsQr ? confirmedQrName.trim() : null))) {
                throw new Error('Bu ürün farklı seçeneklerle sepetinizde bulunuyor. Seçenekleri değiştirmek için önce mevcut ürünü sepetten kaldırın.');
            }
            const added = await addToCart({ ...product, ...current, id: existing?.id ?? product.id, img: current.image_urls?.[0] || null, price: finalPrice, discountPrice: current.discount_price, selectedColor, selectedSize, qrName: needsQr ? confirmedQrName.trim() : null });
            if (added === false) return;
            setQrVisible(false);
            Alert.alert(t.added, t.successMsg, [{ text: t.ok, onPress: () => navigation.goBack() }]);
        } catch (error) { Alert.alert(activeLang === 'AU' ? 'Could not add to cart' : 'Sepete eklenemedi', error.message); }
        finally { addLock.current = false; setAdding(false); }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { backgroundColor: theme.cardBg }]}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.iconBtn, { backgroundColor: theme.cardBg }]} 
                    onPress={() => toggleFavorite(product.id)}
                >
                    <Ionicons 
                        name={isFavorite ? "heart" : "heart-outline"} 
                        size={24} 
                        color={isFavorite ? "#FF3B30" : theme.text} 
                    />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                
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
                            <View style={{ width: width, height: 350, backgroundColor: '#F0EEE9', justifyContent:'center', alignItems:'center' }}>
                                {item.type === 'video' ? (
                                    <View style={{alignItems:'center'}}>
                                        <Ionicons name="videocam" size={60} color="#666" />
                                        <Text style={{marginTop:10, color:'#666'}}>Video Preview</Text>
                                    </View>
                                ) : (
                                    item.uri && /^https?:\/\//i.test(item.uri) ? <TouchableOpacity activeOpacity={0.9} onPress={() => setZoomUri(item.uri)}><Image source={{ uri: item.uri }} style={styles.image} /></TouchableOpacity> : <View style={{ alignItems: 'center', gap: 10 }}><Ionicons name="image-outline" size={50} color={PITO_PURPLE} /><Text style={{ color: '#727989' }}>Görsel henüz yüklenmemiş</Text></View>
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
                <View style={[styles.infoContainer, { backgroundColor: theme.cardBg }]}>
                    <View style={styles.productMeta}><Text style={styles.categoryLabel}>{product.category || 'Pito shop'}</Text><Text style={[styles.stockLabel, { color: Number(product.stock) > 0 ? '#37836C' : '#AD5A4F' }]}>{Number(product.stock) > 0 ? (activeLang === 'AU' ? 'In stock' : 'Stokta') : (activeLang === 'AU' ? 'Out of stock' : 'Stokta yok')}</Text></View>
                    <Text style={[styles.name, { color: theme.text }]}>{product.name}</Text>
                    
                    <View style={styles.ratingContainer}>
                        <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(177,138,70,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12}}>
                            <Ionicons name="star" size={14} color="#FFD700" />
                            <Text style={[styles.ratingText, {color: theme.text}]}>
                                {product.rating > 0 ? product.rating : t.new}
                            </Text>
                        </View>
                        <Text style={{marginLeft: 10, color: '#999', fontSize: 14}}>({reviewsList.length} {t.reviews})</Text>
                    </View>

                    {/* ETİKETLER */}
                    <View style={styles.tagsRow}>
                        {!!product.discountPrice && (
                            <View style={[styles.badge, { backgroundColor: '#FF5252' }]}>
                                <Text style={styles.badgeText}>{t.discount}</Text>
                            </View>
                        )}
                        {product.isBestSeller && (
                            <View style={[styles.badge, { backgroundColor: '#FDCB6E' }]}>
                                <Text style={[styles.badgeText, { color: '#000' }]}>🔥 {t.best}</Text>
                            </View>
                        )}
                        {product.isNewArrival && (
                            <View style={[styles.badge, { backgroundColor: '#00E5FF' }]}>
                                <Text style={[styles.badgeText, { color: '#000' }]}>🆕 {t.newTag}</Text>
                            </View>
                        )}
                    </View>

                    {/* ✅ FİYAT ALANI (İNDİRİMLİ İSE ÇİZİKLİ) */}
                    <View style={styles.priceContainer}>
                        {product.discountPrice ? (
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                                <Text style={styles.newPrice}>{product.discountPrice} <Text style={{fontSize: 16}}>{activeLang === 'AU' ? 'AUD' : 'TL'}</Text></Text>
                                <Text style={styles.oldPrice}>{product.price} {activeLang === 'AU' ? 'AUD' : 'TL'}</Text>
                            </View>
                        ) : (
                            <Text style={styles.newPrice}>{product.price} <Text style={{fontSize: 16}}>{activeLang === 'AU' ? 'AUD' : 'TL'}</Text></Text>
                        )}
                    </View>

                    {/* Renk Seçimi */}
                    {product.colors && product.colors.length > 0 && (
                        <View style={styles.optionSection}>
                            <Text style={[styles.optionTitle, {color:theme.text}]}>{t.color}:</Text>
                            <View style={styles.optionsRow}>
                                {product.colors.map((c) => (
                                    <TouchableOpacity key={c} style={[styles.optionBtn, selectedColor === c && styles.optionBtnActive]} onPress={() => setSelectedColor(c)}>
                                        <Text style={[styles.optionText, { color: theme.text }, selectedColor === c && styles.optionTextActive]}>{c}</Text>
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
                                        <Text style={[styles.optionText, { color: theme.text }, selectedSize === s && styles.optionTextActive]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    <Text style={[styles.sectionHeader, {color:theme.text}]}>{t.desc}</Text>
                    <Text style={[styles.description, {color:theme.subText}]}>{product.description || (activeLang === 'AU' ? 'No description provided.' : 'Bu ürün için henüz açıklama eklenmemiş.')}</Text>

                    {/* YORUMLAR */}
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:20, marginBottom:10}}>
                        <Text style={[styles.sectionHeader, {color:theme.text, margin:0}]}>{t.reviews}</Text>
                        {reviewsList.length > 0 && (
                            <TouchableOpacity onPress={() => navigation.navigate('AllReviews', { listingId: null, listingName: null, productId: product.id, productName: product.name })}>
                                <Text style={{color: PITO_PURPLE, fontWeight:'bold'}}>{t.seeAll}</Text>
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
                        <View style={[styles.buyFirstBox, { backgroundColor: theme.background }]}>
                            <Ionicons name="information-circle-outline" size={18} color={theme.subText} />
                            <Text style={{color:theme.subText, fontSize:12, marginLeft:5, flex:1}}>
                                {t.buyFirst}
                            </Text>
                        </View>
                    )}

                    {/* Yorum Listesi Önizleme */}
                    {loadingReviews ? (
                        <ActivityIndicator color={PITO_PURPLE} size="small" />
                    ) : (
                        reviewError ? <TouchableOpacity onPress={fetchRealtimeData}><Text style={{ color: PITO_PURPLE }}>Yorumlar yüklenemedi. Tekrar dene.</Text></TouchableOpacity> : reviewsList.length > 0 ? (
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
                    <Text style={{color:theme.subText, fontSize:12, fontWeight: 'bold'}}>{t.total}</Text>
                    <Text style={[styles.totalPrice, {color: theme.text}]}>
                        {/* ✅ Sepet fiyatında indirimliyi göster */}
                        {product.discountPrice || product.price} <Text style={{fontSize: 16}}>{activeLang === 'AU' ? 'AUD' : 'TL'}</Text>
                    </Text>
                </View>
                <TouchableOpacity style={[styles.addToCartBtn, adding && { opacity: 0.5 }]} disabled={adding} onPress={() => handleAddToCart()}>
                    <Ionicons name="cart" size={20} color="white" style={{marginRight: 8}} />
                    <Text style={styles.addToCartText}>{adding ? 'Kontrol ediliyor…' : t.addToCart}</Text>
                </TouchableOpacity>
            </View>
            <Modal visible={!!zoomUri} animationType="fade" onRequestClose={() => setZoomUri(null)}><SafeAreaView style={{ flex: 1, backgroundColor: '#0B131E' }}><TouchableOpacity accessibilityLabel="Kapat" style={{ padding: 20, alignSelf: 'flex-end' }} onPress={() => setZoomUri(null)}><Ionicons name="close" size={30} color="#FFFFFF" /></TouchableOpacity>{zoomUri && <Image source={{ uri: zoomUri }} style={{ flex: 1, width: '100%' }} resizeMode="contain" />}</SafeAreaView></Modal>
            <Modal visible={qrVisible} transparent animationType="fade" onRequestClose={() => { if (!adding) setQrVisible(false); }}><View style={styles.modalOverlay}><View style={[styles.qrSheet, { backgroundColor: theme.cardBg }]}><Text style={[styles.sectionHeader, { color: theme.text }]}>QR tasma ismi</Text><TextInput value={qrName} onChangeText={setQrName} maxLength={60} editable={!adding} placeholder="Örn: Pamuk" placeholderTextColor={theme.subText} style={[styles.qrInput, { color: theme.text }]} /><TouchableOpacity disabled={adding || !qrName.trim()} style={[styles.addToCartBtn, { marginTop: 16, justifyContent: 'center', opacity: adding || !qrName.trim() ? 0.5 : 1 }]} onPress={() => handleAddToCart(qrName)}><Text style={styles.addToCartText}>{adding ? 'Kontrol ediliyor…' : t.addToCart}</Text></TouchableOpacity><TouchableOpacity disabled={adding} style={{ padding: 18, alignItems: 'center' }} onPress={() => setQrVisible(false)}><Text style={{ color: theme.subText }}>Vazgeç</Text></TouchableOpacity></View></View></Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    productMeta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
    categoryLabel: { color: '#B18A46', fontSize: 11, fontWeight: '800', letterSpacing: 0.7 },
    stockLabel: { fontSize: 11, fontWeight: '700' },
    totalPrice: { fontSize: 21, fontWeight: '800', marginTop: 4 },
    modalOverlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(11,19,30,0.7)' },
    qrSheet: { padding: 22, borderRadius: 26 },
    qrInput: { borderWidth: 1, borderColor: '#B18A46', borderRadius: 14, padding: 15, fontSize: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
    iconBtn: { backgroundColor: 'white', padding: 8, borderRadius: 20, elevation:5, shadowColor:'#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.2, shadowRadius:3 },
    
    // Galeri Stili
    image: { width: width - 32, height: 326, margin: 12, resizeMode: 'contain' },
    pagination: { flexDirection: 'row', position: 'absolute', bottom: 15, alignSelf: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 4 },
    // ✅ Mor Renk Uygulandı
    activeDot: { backgroundColor: PITO_PURPLE, width: 10, height: 10, borderRadius: 5 },

    infoContainer: { padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -20, backgroundColor: 'white' },
    
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 8 },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

    name: { fontSize: 27, fontWeight: '800', marginBottom: 10 },
    ratingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    ratingText: { marginLeft: 5, fontSize: 14, fontWeight: '600' },
    
    priceContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 15 },
    oldPrice: { fontSize: 18, color: '#999', textDecorationLine: 'line-through', marginLeft: 10, fontWeight: 'bold' },
    // ✅ Mor Renk Uygulandı
    newPrice: { fontSize: 26, fontWeight: 'bold', color: PITO_PURPLE },
    
    optionSection: { marginBottom: 15 },
    optionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    optionsRow: { flexDirection: 'row', flexWrap: 'wrap' },
    optionBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 10, marginBottom: 10 },
    // ✅ Mor Renk Uygulandı
    optionBtnActive: { backgroundColor: PITO_PURPLE, borderColor: PITO_PURPLE },
    optionText: { color: '#333' },
    optionTextActive: { color: 'white', fontWeight: 'bold' },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
    description: { fontSize: 14, lineHeight: 22 },
    reviewCard: { padding: 15, borderRadius: 10, marginBottom: 10 },
    reviewUser: { fontWeight: 'bold', fontSize: 14 },
    reviewComment: { marginTop: 5, fontSize: 14 },
    
    buyFirstBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, marginBottom: 15 },
    writeReviewBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor: '#4CAF50', padding: 10, borderRadius: 8, marginBottom: 15 },
    
    bottomBar: { width: '100%', padding: 16, borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    // ✅ Mor Renk Uygulandı
    addToCartBtn: { backgroundColor: '#142239', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12 },
    addToCartText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default ProductDetailScreen;