import React, { useContext, useState, useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Modal, ScrollView, Animated, Dimensions, TextInput, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { ThemeContext } from '../context/ThemeContext';
import { CartContext } from '../context/CartContext'; 
import { ShopContext } from '../context/ShopContext'; 
import { AuthContext } from '../context/AuthContext'; 
import * as RNIap from 'react-native-iap'; 

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - 52) / 2; 

// Mağaza vurgu rengi
const SHOP_ACCENT = '#B18A46';

const itemSKUs = Platform.select({
    ios: ['com.oxpi.pito.qr_collar_ios'],
    android: ['com.oxpi.pito.qr_collar', 'com.oxpi.pito.premium_badge'],
});

const ProductCard = ({ item, navigation, t, handleBuy, activeLang, toggleFavorite, isFavorite, showToast, theme }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const mediaData = item.media && item.media.length > 0 
        ? item.media 
        : (item.image_urls && item.image_urls.length > 0 ? item.image_urls.map(url => ({ type: 'image', uri: url })) : [{ type: 'image', uri: item.img }]);

    const handleFavoritePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.4, duration: 150, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
        ]).start();

        toggleFavorite(item.id);

        if (!isFavorite) {
            showToast(activeLang === 'AU' ? 'Product added to favorites!' : 'Ürün favorilere eklendi!');
        }
    };

    useEffect(() => {
        if (mediaData.length <= 1) return;
        const interval = setInterval(() => {
            let nextIndex = activeIndex + 1;
            if (nextIndex >= mediaData.length) nextIndex = 0;
            setActiveIndex(nextIndex);
            if (flatListRef.current) flatListRef.current.scrollToIndex({ index: nextIndex, animated: true });
        }, 2500); 
        return () => clearInterval(interval);
    }, [activeIndex, mediaData.length]);

    const onViewRef = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
    });
    const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

    return (
        <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.cardBg }]} 
            onPress={() => navigation.navigate('ProductDetail', { product: item })}
            activeOpacity={0.9}
        >
            <View style={{ height: CARD_WIDTH * 1.15, width: '100%' }}>
                <FlatList
                    ref={flatListRef}
                    data={mediaData}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(_, index) => index.toString()}
                    onViewableItemsChanged={onViewRef.current}
                    viewabilityConfig={viewConfigRef.current}
                    renderItem={({ item: media }) => (
                        <View style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.15, justifyContent:'center', alignItems:'center', backgroundColor: '#F0EEE9' }}>
                            {media.type === 'video' ? (
                                <View style={{justifyContent:'center', alignItems:'center'}}>
                                    <Ionicons name="videocam" size={40} color="#666" />
                                    <Text style={{fontSize:10, color:'#666', marginTop:5}}>Video</Text>
                                </View>
                            ) : (
                                media.uri ? <Image source={{ uri: media.uri }} style={{ width: CARD_WIDTH - 16, height: CARD_WIDTH * 1.15 - 16, resizeMode: 'contain' }} /> : <Ionicons name="bag-outline" size={42} color={SHOP_ACCENT} />
                            )}
                        </View>
                    )}
                />
                {mediaData.length > 1 && (
                    <View style={styles.pagination}>
                        {mediaData.map((_, i) => (
                            <View key={i} style={[styles.dot, i === activeIndex && {backgroundColor: SHOP_ACCENT, width: 8}]} />
                        ))}
                    </View>
                )}
            </View>
            
            <TouchableOpacity style={[styles.favBtn, {backgroundColor: theme.cardBg}]} onPress={handleFavoritePress} activeOpacity={0.8}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={22} color={isFavorite ? "#FF4D4D" : theme.subText} />
                </Animated.View>
            </TouchableOpacity>

            <View style={styles.infoContainer}>
            {/* ✅ DİNAMİK ÜRÜN ETİKETLERİ */}
            <View style={styles.tagContainer}>
                {item.isFeatured && <View style={[styles.badgeBase, {backgroundColor: '#EDE0C7'}]}><Text style={[styles.badgeText, {color: '#000'}]}>★ {t.feat}</Text></View>}
                {item.isBestSeller && <View style={[styles.badgeBase, {backgroundColor: '#A97B42'}]}><Text style={[styles.badgeText, {color: '#fff'}]}>🔥 {t.best}</Text></View>}
                {item.isNewArrival && <View style={[styles.badgeBase, {backgroundColor: SHOP_ACCENT}]}><Text style={[styles.badgeText, {color: '#fff'}]}>🆕 {t.newTag}</Text></View>}
                {(item.isDiscount || item.discountPrice) && <View style={[styles.badgeBase, {backgroundColor: '#A65446'}]}><Text style={[styles.badgeText, {color: '#fff'}]}>🏷️ {t.discountTag}</Text></View>}
                {item.isLimited && <View style={[styles.badgeBase, {backgroundColor: '#FF5252'}]}><Text style={[styles.badgeText, {color: '#fff'}]}>⚠️ {t.limited}</Text></View>}
                {item.isEco && <View style={[styles.badgeBase, {backgroundColor: '#4CAF50'}]}><Text style={[styles.badgeText, {color: '#fff'}]}>🌱 {t.eco}</Text></View>}
            </View>


                <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{item.name}</Text>
                
                {/* DİNAMİK FİYAT GÖSTERİMİ */}
                <View style={styles.priceRow}>
                    {item.discountPrice ? (
                        <View style={{ flexDirection: 'column' }}>
                            <Text style={styles.oldPrice}>{item.price} {t.currency}</Text>
                            <Text style={styles.price}>{item.discountPrice} <Text style={{fontSize:12}}>{t.currency}</Text></Text>
                        </View>
                    ) : (
                        <Text style={styles.price}>{item.price} <Text style={{fontSize:12}}>{t.currency}</Text></Text>
                    )}
                </View>
                
                <TouchableOpacity style={styles.buyBtn} onPress={() => handleBuy(item)}>
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.buyText}>{t.addToCart}</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

// --- ANA EKRAN ---
const ShopScreen = ({ navigation }) => {


    const { products, favorites, toggleFavorite } = useContext(ShopContext);
    const { cart, addToCart, decreaseQuantity, removeFromCart, getTotalPrice, getCartCount } = useContext(CartContext);
    const { user, country } = useContext(AuthContext); 
    const { theme: appTheme, isDarkMode } = useContext(ThemeContext);
    const theme = { ...appTheme, ...(isDarkMode ? { background: '#0B131E', cardBg: '#1A2533', text: '#F7F4EE', subText: '#A0AAB5', border: '#293647' } : { background: '#F8F5EF', cardBg: '#FFFFFF', text: '#142239', subText: '#727989', border: '#EAE4D8' }), type: isDarkMode ? 'dark' : 'light' };
    
    const [modalVisible, setModalVisible] = useState(false);
    const isAdmin = user && user.is_admin === true;
    const activeLang = country?.code || 'TR';

    const [iapProducts, setIapProducts] = useState([]);
    const [isPurchasing, setIsPurchasing] = useState(false);

    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [qrText, setQrText] = useState('');
    const [pendingItem, setPendingItem] = useState(null);

    // FİLTRE VE SIRALAMA STATE'LERİ
    const [activeFilter, setActiveFilter] = useState('Tümü'); 
    const [sortOrder, setSortOrder] = useState('none'); 
    const [sortModalVisible, setSortModalVisible] = useState(false);

    const t = {
        TR: { 
            title: "Mağaza", addToCart: "Sepete Ekle", currency: "TL", 
            cartTitle: "Sepetim", emptyCart: "Sepetiniz boş.", total: "Toplam:", checkout: "Siparişi Tamamla", ok: "Tamam",
            qrTitle: "QR Kod Bilgisi", qrLabel: "Tasmanın üzerine yazılacak ismi giriniz:", 
            qrPlace: "Örn: Pamuk", save: "Kaydet", cancel: "Vazgeç",
            comingSoon: "Çok Yakında!", desc: "Pito mağazası sizin ve evcil dostlarınız için en iyi ürünlerle çok yakında burada olacak.",
            
            // ✅ ETİKET İSİMLERİ
            feat: "Öne Çıkan", best: "Çok Satan", newTag: "Yeni Sezon", 
            discountTag: "İndirimli", limited: "Sınırlı Stok", eco: "Ekolojik",
            
            // ✅ YENİ KATEGORİLER VE FİLTRELER
            all: "Tümü", discountedOnly: "İndirimdekiler",
            categories: [
                "Kedi Maması", "Köpek Maması", "Kuş Yemi", "Oyuncak", 
                "Aksesuar", "Giyim", "Bakım & Sağlık", 
                "Yatak & Taşıma", "Teknoloji", "QR Kodlu Tasma"
            ],
            
            sortSort: "Sırala", sortAsc: "En Düşük Fiyat", sortDesc: "En Yüksek Fiyat", sortDefault: "Varsayılan"
        },
        AU: { 
            title: "Shop", addToCart: "Add to Cart", currency: "AUD", 
            cartTitle: "My Cart", emptyCart: "Your cart is empty.", total: "Total:", checkout: "Checkout", ok: "OK",
            qrTitle: "QR Code Info", qrLabel: "Enter the name to be printed on the tag:", 
            qrPlace: "E.g. Fluffy", save: "Save", cancel: "Cancel",
            comingSoon: "Coming Soon!", desc: "Pito shop will be here soon with the best products for you and your pets.",
            
            // ✅ ETİKET İSİMLERİ (AU)
            feat: "Featured", best: "Best Seller", newTag: "New Season", 
            discountTag: "Sale", limited: "Limited", eco: "Eco-friendly",
            
            // ✅ YENİ KATEGORİLER VE FİLTRELER (AU)
            all: "All", discountedOnly: "On Sale",
            categories: [
                "Cat Food", "Dog Food", "Bird Seed", "Toys", 
                "Accessories", "Clothing", "Health & Care", 
                "Beds & Carriers", "Technology", "QR Collar"
            ],

            sortSort: "Sort", sortAsc: "Price: Low to High", sortDesc: "Price: High to Low", sortDefault: "Default"
        }
    }[activeLang];

    // FİLTRE VE SIRALAMA MANTIĞI
    const getFilteredAndSortedProducts = () => {
        let result = products.filter(p => !p.targetRegion || p.targetRegion === 'GLOBAL' || p.targetRegion === activeLang);

        // Kategori / İndirim Filtresi
        if (activeFilter === t.discountedOnly) {
            result = result.filter(p => (p.discountPrice && parseFloat(p.discountPrice) > 0) || p.isDiscount);
        } else if (activeFilter !== t.all) {
            result = result.filter(p => p.category === activeFilter);
        }

        // Sıralama (Fiyata göre)
        if (sortOrder === 'asc') {
            result.sort((a, b) => {
                const priceA = a.discountPrice ? parseFloat(a.discountPrice) : parseFloat(a.price);
                const priceB = b.discountPrice ? parseFloat(b.discountPrice) : parseFloat(b.price);
                return priceA - priceB;
            });
        } else if (sortOrder === 'desc') {
            result.sort((a, b) => {
                const priceA = a.discountPrice ? parseFloat(a.discountPrice) : parseFloat(a.price);
                const priceB = b.discountPrice ? parseFloat(b.discountPrice) : parseFloat(b.price);
                return priceB - priceA;
            });
        }

        return result;
    };

    const displayProducts = getFilteredAndSortedProducts();

    // Çip listesini oluştur (Tümü, İndirimdekiler ve Kategori Listesi)
    const filterChips = [t.all, t.discountedOnly, ...t.categories];

    const [animatingItem, setAnimatingItem] = useState(null);
    const animationValue = useRef(new Animated.Value(0)).current;
    
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const toastAnim = useRef(new Animated.Value(100)).current; 

    useEffect(() => {
        const initIAP = async () => {
            try {
                await RNIap.initConnection();
                if (Platform.OS === 'android') {
                    await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
                }
                const p = await RNIap.getProducts({ skus: itemSKUs });
                setIapProducts(p);
            } catch (err) {
                console.warn("IAP Başlatma Hatası:", err.code, err.message);
            }
        };
        // initIAP(); 
    }, []);

    const triggerToast = (message) => {
        setToastMessage(message);
        setShowToast(true);
        Animated.sequence([
            Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }), 
            Animated.delay(2000), 
            Animated.timing(toastAnim, { toValue: 100, duration: 300, useNativeDriver: true }) 
        ]).start(() => setShowToast(false));
    };

    const runAddToCartAnimation = (item, qrName = null) => {
        const finalPrice = item.discountPrice ? parseFloat(item.discountPrice) : parseFloat(item.price);
        const itemToAdd = { ...item, price: finalPrice, qrName: qrName };

        setAnimatingItem(item);
        Animated.sequence([
            Animated.timing(animationValue, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(animationValue, { toValue: 0, duration: 0, useNativeDriver: true })
        ]).start(() => {
            setAnimatingItem(null);
            addToCart(itemToAdd);
        });
    };

    const processGooglePlayPurchase = async (sku) => {
        try {
            setIsPurchasing(true);
            Alert.alert("Test", `Google Play ödeme akışı (${sku}) başlayacak.`);
            setIsPurchasing(false);
        } catch (err) {
            setIsPurchasing(false);
            console.warn(err.code, err.message);
            Alert.alert("Hata", "Ödeme başlatılamadı.");
        }
    };

    const handleBuy = (item) => {
        if (item.sku) {
            processGooglePlayPurchase(item.sku);
            return;
        }

        if (item.category && (item.category.includes('QR') || item.category.includes('Kodlu'))) {
            setPendingItem(item);
            setQrText('');
            setQrModalVisible(true);
        } else {
            runAddToCartAnimation(item);
        }
    };

    const handleConfirmQr = () => {
        if (!qrText.trim()) {
            Alert.alert("Uyarı", activeLang === 'AU' ? "Please enter a name." : "Lütfen bir isim giriniz.");
            return;
        }
        setQrModalVisible(false);
        runAddToCartAnimation(pendingItem, qrText); 
        setPendingItem(null);
    };

    const handleCheckout = () => {
        if (cart.length === 0) return;
        setModalVisible(false);
        navigation.navigate('Checkout');
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, {backgroundColor: theme.cardBg}]}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}><Text style={[styles.headerTitle, {color: theme.text}]}>Pito<Text style={{ color: SHOP_ACCENT }}> shop</Text></Text><Text style={{ color: theme.subText, fontSize: 10, marginTop: 2 }}>{activeLang === 'AU' ? 'A little joy for your pet' : 'Dostuna küçük bir mutluluk'}</Text></View>
                
                {(
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                        {isAdmin && (
                            <TouchableOpacity onPress={() => navigation.navigate('ShopAdmin')} style={[styles.iconBtn, {marginRight:10, backgroundColor: 'rgba(177,138,70,0.12)'}]}>
                                <Ionicons name="construct" size={22} color={SHOP_ACCENT} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.iconBtn, {backgroundColor: theme.cardBg}]}>
                            <Ionicons name="cart" size={24} color={SHOP_ACCENT} />
                            {getCartCount() > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{getCartCount()}</Text></View>}
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <>

                    <View style={{ flex: 1 }}>
                        <FlatList
                            ListHeaderComponent={
                              <View>
                                <View style={styles.editorial}>
                                  <View style={{ flex: 1 }}><Text style={styles.eyebrow}>{activeLang === 'AU' ? 'THE PITO COLLECTION' : 'PİTO KOLEKSİYONU'}</Text><Text style={styles.editorialTitle}>{activeLang === 'AU' ? 'For every little paw.' : 'Onun dünyasına\nbir güzellik kat.'}</Text><Text style={styles.editorialBody}>{activeLang === 'AU' ? 'Explore food, toys and everyday essentials.' : 'Mamadan oyuncağa, günlük ihtiyaçlarını keşfet.'}</Text></View>
                                  <View style={styles.editorialIcon}><Ionicons name="bag-handle-outline" size={36} color="#D9BC82" /><Ionicons name="paw" size={20} color="#D9BC82" /></View>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 20 }}>
                                  {filterChips.map((filter, index) => <TouchableOpacity key={filter} accessibilityRole="button" accessibilityState={{ selected: activeFilter === filter }} activeOpacity={0.8} style={[styles.filterChip, { borderColor: theme.border, backgroundColor: theme.cardBg }, activeFilter === filter && { backgroundColor: '#142239', borderColor: '#142239' }]} onPress={() => setActiveFilter(filter)}>
                                    <Ionicons name={index === 0 ? 'grid-outline' : index === 1 ? 'pricetag-outline' : 'paw-outline'} size={15} color={activeFilter === filter ? '#E4C990' : SHOP_ACCENT} />
                                    <Text style={[styles.filterChipText, { color: activeFilter === filter ? '#FFFFFF' : theme.text }]}>{filter}</Text>
                                  </TouchableOpacity>)}
                                </ScrollView>
                                <View style={styles.collectionHeader}><View style={{ flex: 1 }}><Text style={[styles.collectionTitle, { color: theme.text }]}>{activeFilter === t.all ? (activeLang === 'AU' ? 'Discover the collection' : 'Ürünleri keşfet') : activeFilter}</Text><Text style={[styles.collectionCount, { color: theme.subText }]}>{displayProducts.length} {activeLang === 'AU' ? 'products' : 'ürün'}</Text></View><TouchableOpacity accessibilityRole="button" onPress={() => setSortModalVisible(true)} style={[styles.sortTrigger, { backgroundColor: theme.cardBg, borderColor: theme.border }]}><Ionicons name="options-outline" size={18} color={SHOP_ACCENT} /><Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>{t.sortSort}</Text>{sortOrder !== 'none' && <View style={styles.sortDot} />}</TouchableOpacity></View>
                              </View>
                            }
                            data={displayProducts}
                            renderItem={({ item }) => (
                                <ProductCard 
                                    item={item} 
                                    navigation={navigation} 
                                    t={t} 
                                    handleBuy={handleBuy}
                                    activeLang={activeLang}
                                    toggleFavorite={toggleFavorite} 
                                    isFavorite={favorites.some(fav => (typeof fav === 'object' ? fav.productId === item.id : fav === item.id))}
                                    showToast={triggerToast} 
                                    theme={theme}
                                />
                            )}
                            keyExtractor={item => String(item.id)}
                            numColumns={2}
                            columnWrapperStyle={{ justifyContent: 'space-between' }}
                            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                <View style={{alignItems:'center', marginTop:50}}>
                                    <Ionicons name="cube-outline" size={60} color={theme.subText} style={{opacity: 0.5, marginBottom: 15}} />
                                    <Text style={{color: theme.subText, fontSize:16, fontWeight:'bold'}}>
                                        {activeLang === 'AU' ? 'No products found.' : 'Ürün bulunamadı.'}
                                    </Text>
                                </View>
                            }
                        />
                    </View>

                    {cart.length > 0 && <TouchableOpacity activeOpacity={0.9} accessibilityRole="button" onPress={() => setModalVisible(true)} style={styles.cartDock}><View style={styles.cartDockIcon}><Ionicons name="bag-handle-outline" size={21} color="#E4C990" /></View><View style={{ flex: 1 }}><Text style={styles.cartDockTitle}>{t.cartTitle} · {getCartCount()}</Text><Text style={styles.cartDockSub}>{activeLang === 'AU' ? 'Review your selected products' : 'Seçtiğin ürünleri incele'}</Text></View><Text style={styles.cartDockTotal}>{getTotalPrice()} {t.currency}</Text><Ionicons name="chevron-forward" size={19} color="#E4C990" /></TouchableOpacity>}
                    {showToast && (
                        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }] }]}>
                            <Ionicons name="paw" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.toastText}>{toastMessage}</Text>
                        </Animated.View>
                    )}

                    {animatingItem && (
                        <Animated.Image source={{ uri: animatingItem.img }} style={[styles.flyingImage, {
                            opacity: animationValue.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 0.5, 0] }),
                            transform: [
                                { translateX: animationValue.interpolate({ inputRange: [0, 1], outputRange: [0, width / 2 - 40] }) },
                                { translateY: animationValue.interpolate({ inputRange: [0, 1], outputRange: [0, -height / 2 + 50] }) },
                                { scale: animationValue.interpolate({ inputRange: [0, 1], outputRange: [1, 0.1] }) }
                            ]
                        }]} />
                    )}

                    {/* SIRALAMA MODALI */}
                    <Modal visible={sortModalVisible} transparent={true} animationType="fade" onRequestClose={() => setSortModalVisible(false)}>
                        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
                            <View style={[styles.sortContent, { backgroundColor: theme.cardBg }]}>
                                <Text style={[styles.sortTitle, {color: theme.text}]}>{t.sortSort}</Text>
                                
                                <TouchableOpacity style={styles.sortOption} onPress={() => { setSortOrder('none'); setSortModalVisible(false); }}>
                                    <Text style={[styles.sortText, {color: theme.text}, sortOrder === 'none' && {color: SHOP_ACCENT, fontWeight:'bold'}]}>{t.sortDefault}</Text>
                                    {sortOrder === 'none' && <Ionicons name="checkmark" size={20} color={SHOP_ACCENT} />}
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.sortOption} onPress={() => { setSortOrder('asc'); setSortModalVisible(false); }}>
                                    <Text style={[styles.sortText, {color: theme.text}, sortOrder === 'asc' && {color: SHOP_ACCENT, fontWeight:'bold'}]}>{t.sortAsc}</Text>
                                    {sortOrder === 'asc' && <Ionicons name="checkmark" size={20} color={SHOP_ACCENT} />}
                                </TouchableOpacity>

                                <TouchableOpacity style={[styles.sortOption, {borderBottomWidth: 0}]} onPress={() => { setSortOrder('desc'); setSortModalVisible(false); }}>
                                    <Text style={[styles.sortText, {color: theme.text}, sortOrder === 'desc' && {color: SHOP_ACCENT, fontWeight:'bold'}]}>{t.sortDesc}</Text>
                                    {sortOrder === 'desc' && <Ionicons name="checkmark" size={20} color={SHOP_ACCENT} />}
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Modal>

                    {/* QR KOD MODALI */}
                    <Modal visible={qrModalVisible} transparent={true} animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
                        <View style={styles.modalOverlay}>
                            <View style={[styles.modalContent, { backgroundColor: theme.cardBg, padding: 25, minHeight: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderRadius: 25 }]}>
                                <Text style={{fontSize:18, fontWeight:'bold', color: SHOP_ACCENT, marginBottom:10}}>{t.qrTitle}</Text>
                                <Text style={{color: theme.text, marginBottom:15}}>{t.qrLabel}</Text>
                                
                                <TextInput 
                                    style={[styles.qrInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]} 
                                    placeholder={t.qrPlace}
                                    placeholderTextColor={theme.subText}
                                    value={qrText}
                                    onChangeText={setQrText}
                                />

                                <View style={{flexDirection:'row', justifyContent:'flex-end', marginTop:20}}>
                                    <TouchableOpacity onPress={() => setQrModalVisible(false)} style={{marginRight:15, padding:10}}>
                                        <Text style={{color: theme.subText, fontWeight:'bold'}}>{t.cancel}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleConfirmQr} style={{backgroundColor: SHOP_ACCENT, paddingVertical:10, paddingHorizontal:20, borderRadius:8}}>
                                        <Text style={{color:'white', fontWeight:'bold'}}>{t.save}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* SEPET MODALI */}
                    <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
                        <View style={styles.modalOverlay}>
                            <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                                <View style={styles.modalHeader}>
                                    <Text style={[styles.modalTitle, {color: theme.text}]}>{t.cartTitle} ({getCartCount()})</Text>
                                    <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color={theme.text} /></TouchableOpacity>
                                </View>
                                {cart.length === 0 ? (
                                    <View style={{ alignItems: 'center', marginVertical: 30 }}><Ionicons name="cart-outline" size={50} color={theme.subText} /><Text style={{ color: theme.subText, marginTop: 10 }}>{t.emptyCart}</Text></View>
                                ) : (
                                    <ScrollView style={{ maxHeight: 300 }}>
                                        {cart.map((item) => (
                                            <View key={item.id} style={[styles.cartItem, { borderBottomColor: theme.border }]}>
                                                <Image source={{ uri: item.img }} style={styles.cartImage} />
                                                <View style={{ flex: 1, marginLeft: 10 }}>
                                                    <Text style={[styles.cartName, {color: theme.text}]}>{item.name}</Text>
                                                    <Text style={styles.cartPrice}>{item.price} {t.currency}</Text>
                                                    {item.qrName && (
                                                        <Text style={{fontSize:11, color: SHOP_ACCENT, fontWeight:'bold'}}>
                                                            QR: {item.qrName}
                                                        </Text>
                                                    )}
                                                    {(item.selectedColor || item.selectedSize) && <Text style={{fontSize:10, color:theme.subText}}>{item.selectedColor} {item.selectedSize}</Text>}
                                                </View>
                                                <View style={styles.quantityControl}>
                                                    <TouchableOpacity onPress={() => decreaseQuantity(item.id)} style={styles.qBtn}><Ionicons name="remove" size={16} color={SHOP_ACCENT} /></TouchableOpacity>
                                                    <Text style={styles.qText}>{item.quantity}</Text>
                                                    <TouchableOpacity onPress={() => addToCart(item)} style={styles.qBtn}><Ionicons name="add" size={16} color={SHOP_ACCENT} /></TouchableOpacity>
                                                </View>
                                                <TouchableOpacity onPress={() => removeFromCart(item.id)} style={{ marginLeft: 10 }}><Ionicons name="trash-outline" size={20} color="#FF4D4D" /></TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>
                                )}
                                {cart.length > 0 && (
                                    <View style={{ marginTop: 20 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}><Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>{t.total}</Text><Text style={{ fontSize: 18, fontWeight: 'bold', color: SHOP_ACCENT }}>{getTotalPrice()} {t.currency}</Text></View>
                                        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}><Text style={styles.checkoutText}>{t.checkout}</Text><Ionicons name="arrow-forward" size={20} color="white" style={{marginLeft:5}}/></TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    </Modal>

                    {/* Satın Alma Yükleme Maskesi */}
                    {isPurchasing && (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }]}>
                            <ActivityIndicator size="large" color={SHOP_ACCENT} />
                            <Text style={{color: 'white', marginTop: 10, fontWeight: 'bold'}}>Ödeme İşlemi Başlatılıyor...</Text>
                        </View>
                    )}
            </>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    editorial: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#142239', borderRadius: 24, padding: 22, marginTop: 6 },
    eyebrow: { color: '#D9BC82', fontSize: 9, letterSpacing: 1.8, fontWeight: '800', marginBottom: 10 },
    editorialTitle: { color: '#FFFFFF', fontSize: 26, lineHeight: 31, fontWeight: '800', letterSpacing: -0.7 },
    editorialBody: { color: '#BBC5D2', fontSize: 11, lineHeight: 18, marginTop: 10 },
    editorialIcon: { gap: 10, alignItems: 'center', padding: 12, backgroundColor: 'rgba(217,188,130,0.08)', borderRadius: 24 },
    collectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
    collectionTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    collectionCount: { fontSize: 11, marginTop: 5 },
    sortTrigger: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 11, borderRadius: 13, borderWidth: 1 },
    sortDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: SHOP_ACCENT },
    cartDock: { position: 'absolute', bottom: 16, left: 20, right: 20, backgroundColor: '#142239', flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 22, padding: 15, elevation: 6 },
    cartDockIcon: { backgroundColor: '#29364A', padding: 10, borderRadius: 13 },
    cartDockTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
    cartDockSub: { color: '#BBC5D2', fontSize: 10, marginTop: 4 },
    cartDockTotal: { color: '#E4C990', fontSize: 15, fontWeight: '800' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, zIndex: 10 },
    headerTitle: { fontSize: 23, fontWeight: '800', letterSpacing: -0.8 },
    iconBtn: { padding: 8, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.1, shadowRadius:4 },
    
    // FİLTRE ÇİPLERİ STİLLERİ
    filterChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 15, borderWidth: 1, marginRight: 8 },
    filterChipText: { fontSize: 13, fontWeight: '600' },

    card: { width: CARD_WIDTH, borderRadius: 22, marginBottom: 16, overflow: 'hidden' },
    
    pagination: { flexDirection: 'row', position: 'absolute', bottom: 10, alignSelf: 'center' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 3 },

    // ✅ ETİKET KONTEYNERİ STİLLERİ
    tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 7 },
    badgeBase: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
    badgeText: { fontSize: 9, fontWeight: 'bold' },

    favBtn: { position: 'absolute', top: 10, right: 10, zIndex: 10, padding: 6, borderRadius: 20, elevation: 3 },

    infoContainer: { padding: 12 },
    name: { fontSize: 14, lineHeight: 20, minHeight: 40, fontWeight: '700', marginBottom: 7 },
    priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, minHeight: 20 },
    price: { fontSize: 20, color: SHOP_ACCENT, fontWeight: 'bold' },
    oldPrice: { textDecorationLine: 'line-through', color: '#B0BEC5', fontSize: 12, marginBottom: 2 },
    buyBtn: { backgroundColor: '#142239', paddingVertical: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    buyText: { color: 'white', fontSize: 12, fontWeight: '700', marginLeft: 4 },
    
    cartBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF4D4D', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
    cartBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    
    toastContainer: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#333', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, zIndex: 999, elevation: 5 },
    toastText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', alignItems: 'center' },
    
    // SIRALAMA MODALI
    sortContent: { width: '100%', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 42 },
    sortTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    sortText: { fontSize: 16, fontWeight: '500' },

    modalContent: { width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, minHeight: '45%', paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    cartImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F5F5F5' },
    cartName: { fontSize: 15, fontWeight: '600' },
    cartPrice: { fontSize: 13, color: SHOP_ACCENT, fontWeight: 'bold', marginTop: 2 },
    quantityControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(177,138,70,0.12)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
    qBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    qText: { marginHorizontal: 10, fontWeight: 'bold', color: SHOP_ACCENT },
    checkoutBtn: { backgroundColor: SHOP_ACCENT, padding: 18, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: SHOP_ACCENT, shadowOffset: {width:0, height:4}, shadowOpacity:0.3, shadowRadius:8 },
    checkoutText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    flyingImage: { position: 'absolute', top: height / 2 - 80, left: width / 2 - 80, width: 160, height: 160, borderRadius: 20, zIndex: 999 },
    qrInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, marginTop: 5 },

    emptyMaskContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, paddingBottom: 50 },
    comingSoonText: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    descText: { fontSize: 16, textAlign: 'center', lineHeight: 24 }
});

// true: coming-soon screen for everyone. false: existing shop screen.
const SHOP_COMING_SOON = true;

const ShopComingSoonScreen = ({ navigation }) => {
    const { isDarkMode } = useContext(ThemeContext);
    const { country } = useContext(AuthContext);
    const english = country?.code === 'AU';
    const background = isDarkMode ? '#0B131E' : '#F8F5EF';
    const foreground = isDarkMode ? '#F7F4EE' : '#142239';
    const muted = isDarkMode ? '#A0AAB5' : '#727989';
    const card = isDarkMode ? '#1A2533' : '#FFFFFF';
    const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home');
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 12, gap: 14 }}>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={english ? 'Go back' : 'Geri dön'} onPress={goBack} style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: card, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="arrow-back" size={23} color={foreground} />
                </TouchableOpacity>
                <Text style={{ color: foreground, fontSize: 24, fontWeight: '800', letterSpacing: -0.7 }}>Pito<Text style={{ color: '#B18A46' }}> shop</Text></Text>
            </View>
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <View style={{ backgroundColor: '#142239', borderRadius: 32, padding: 28, alignItems: 'center' }}>
                    <View style={{ width: 112, height: 112, borderRadius: 36, backgroundColor: 'rgba(217,188,130,0.12)', alignItems: 'center', justifyContent: 'center', marginVertical: 16 }}>
                        <Ionicons name="bag-handle-outline" size={61} color="#D9BC82" />
                        <View style={{ position: 'absolute', bottom: 4, right: 4, backgroundColor: '#D9BC82', padding: 8, borderRadius: 14 }}><Ionicons name="paw" size={21} color="#142239" /></View>
                    </View>
                    <Text style={{ color: '#D9BC82', fontSize: 10, letterSpacing: 2, fontWeight: '800', marginTop: 14 }}>{english ? 'SOMETHING LOVELY IS COMING' : 'GÜZEL ŞEYLER HAZIRLANIYOR'}</Text>
                    <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 31, lineHeight: 39, fontWeight: '800', textAlign: 'center', marginTop: 18 }}>{english ? 'Coming soon.' : 'Çok yakında\nhizmetinizde.'}</Text>
                    <Text style={{ color: '#BBC5D2', fontSize: 14, lineHeight: 24, textAlign: 'center', marginTop: 17 }}>{english ? 'We’re getting Pito Shop ready for you and your pet. Little joys and everyday essentials will be here soon.' : 'Can dostunun dünyasına güzellik katacak ürünler için Pito Shop’u hazırlıyoruz. Küçük mutluluklar ve günlük ihtiyaçlar yakında burada.'}</Text>
                    <View style={{ height: 1, backgroundColor: '#334158', alignSelf: 'stretch', marginVertical: 25 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="heart-outline" size={18} color="#D9BC82" /><Text style={{ color: '#D9BC82', fontSize: 12 }}>{english ? 'Made for little paws.' : 'Küçük patiler için, özenle.'}</Text></View>
                </View>
                <Text style={{ color: muted, fontSize: 12, textAlign: 'center', lineHeight: 20, marginTop: 22 }}>{english ? 'Our shop is not open for orders yet.' : 'Mağazamız henüz siparişe açık değildir.'}</Text>
                <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} onPress={goBack} style={{ backgroundColor: card, padding: 17, borderRadius: 18, alignItems: 'center', marginTop: 18, borderWidth: 1, borderColor: 'rgba(177,138,70,0.25)' }}><Text style={{ color: foreground, fontWeight: '700', fontSize: 14 }}>{english ? 'Back to Pito' : 'Pito’ya dön'}</Text></TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const ShopEntryScreen = props => SHOP_COMING_SOON
    ? <ShopComingSoonScreen {...props} />
    : <ShopScreen {...props} />;

export default ShopEntryScreen;