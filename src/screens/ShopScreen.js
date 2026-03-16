import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, Modal, ScrollView, Animated, Dimensions, TextInput, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { ThemeContext } from '../context/ThemeContext';
import { CartContext } from '../context/CartContext'; 
import { ShopContext } from '../context/ShopContext'; 
import { AuthContext } from '../context/AuthContext'; 

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width / 2) - 25; 

// --- ÖZEL ÜRÜN KARTI BİLEŞENİ ---
const ProductCard = ({ item, navigation, t, handleBuy, activeLang, toggleFavorite, isFavorite, showToast, theme }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Resim verisi kontrolü (Database'den gelen format uyumluluğu)
    const mediaData = item.media && item.media.length > 0 
        ? item.media 
        : (item.image_urls && item.image_urls.length > 0 ? item.image_urls.map(url => ({ type: 'image', uri: url })) : [{ type: 'image', uri: item.img }]);

    const handleFavoritePress = () => {
        // Kalp Animasyonu
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
            <View style={{ height: 160, width: '100%' }}>
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
                        <View style={{ width: CARD_WIDTH, height: 160, justifyContent:'center', alignItems:'center', backgroundColor: theme.type === 'dark' ? '#333' : '#f0f0f0' }}>
                            {media.type === 'video' ? (
                                <View style={{justifyContent:'center', alignItems:'center'}}>
                                    <Ionicons name="videocam" size={40} color="#666" />
                                    <Text style={{fontSize:10, color:'#666', marginTop:5}}>Video</Text>
                                </View>
                            ) : (
                                <Image source={{ uri: media.uri }} style={{ width: CARD_WIDTH, height: 160, resizeMode: 'cover' }} />
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
            
            <View style={styles.tagContainer}>
                {item.discountPrice && <View style={styles.discountBadge}><Text style={styles.discountText}>{t.discount}</Text></View>}
                {item.isBestSeller && <View style={[styles.badgeBase, {backgroundColor: '#FDCB6E'}]}><Text style={[styles.badgeText, {color: '#000'}]}>🔥 {activeLang === 'AU' ? 'BEST' : 'POPÜLER'}</Text></View>}
                {item.isNewArrival && <View style={[styles.badgeBase, {backgroundColor: '#00E5FF'}]}><Text style={[styles.badgeText, {color: '#000'}]}>🆕 {activeLang === 'AU' ? 'NEW' : 'YENİ'}</Text></View>}
            </View>

            <TouchableOpacity style={[styles.favBtn, {backgroundColor: theme.cardBg}]} onPress={handleFavoritePress} activeOpacity={0.8}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={22} color={isFavorite ? "#FF4D4D" : theme.subText} />
                </Animated.View>
            </TouchableOpacity>

            <View style={styles.infoContainer}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <View style={styles.priceRow}>
                    {item.discountPrice ? (
                        <>
                            <Text style={styles.oldPrice}>{item.price}</Text>
                            <Text style={styles.price}>{item.discountPrice} <Text style={{fontSize:12}}>{t.currency}</Text></Text>
                        </>
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
    const { theme, isDarkMode } = useContext(ThemeContext);
    
    const [modalVisible, setModalVisible] = useState(false);
    
    // ✅ GÜVENLİ ADMIN KONTROLÜ
    const isAdmin = user && user.is_admin === true;

    const activeLang = country?.code || 'TR';

    // ✅ QR KOD MODAL STATE
    const [qrModalVisible, setQrModalVisible] = useState(false);
    const [qrText, setQrText] = useState('');
    const [pendingItem, setPendingItem] = useState(null);

    // ✅ "YAKINDA" ANİMASYONU STATE'İ
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    const t = {
        TR: { 
            title: "Mağaza", discount: "İNDİRİM", addToCart: "Sepete Ekle", currency: "TL", 
            cartTitle: "Sepetim", emptyCart: "Sepetiniz boş.", total: "Toplam:", checkout: "Siparişi Tamamla", ok: "Tamam",
            qrTitle: "QR Kod Bilgisi", qrLabel: "Tasmanın üzerine yazılacak ismi giriniz:", 
            qrPlace: "Örn: Pamuk", save: "Kaydet", cancel: "Vazgeç",
            comingSoon: "Çok Yakında\nHizmetinizde!",
            comingSoonDesc: "Siz ve sevimli dostlarınız için harika ürünler hazırlıyoruz. Lütfen beklemede kalın."
        },
        AU: { 
            title: "Shop", discount: "SALE", addToCart: "Add to Cart", currency: "AUD", 
            cartTitle: "My Cart", emptyCart: "Your cart is empty.", total: "Total:", checkout: "Checkout", ok: "OK",
            qrTitle: "QR Code Info", qrLabel: "Enter the name to be printed on the tag:", 
            qrPlace: "E.g. Fluffy", save: "Save", cancel: "Cancel",
            comingSoon: "Coming Soon!",
            comingSoonDesc: "We are preparing amazing products for you and your furry friends. Please stay tuned."
        }
    }[activeLang];

    // Ülke filtresi (Target Region)
    const filteredProducts = products.filter(p => !p.targetRegion || p.targetRegion === 'GLOBAL' || p.targetRegion === activeLang);

    const [animatingItem, setAnimatingItem] = useState(null);
    const animationValue = useRef(new Animated.Value(0)).current;
    
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const toastAnim = useRef(new Animated.Value(100)).current; 

    useEffect(() => {
        // "Yakında" yazısı için giriş animasyonu
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                easing: Easing.out(Easing.exp),
                useNativeDriver: true,
            })
        ]).start();
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
        const finalPrice = item.discountPrice ? item.discountPrice : item.price;
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

    const handleBuy = (item) => {
        // Kategori Kontrolü (QR ürünleri için)
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
                <Text style={[styles.headerTitle, {color: theme.text}]}>{t.title}</Text>
                
                <View style={{flexDirection:'row'}}>
                    {/* ✅ SADECE ADMIN OLANLAR BUTONU GÖRÜR */}
                    {isAdmin && (
                        <TouchableOpacity onPress={() => navigation.navigate('ShopAdmin')} style={[styles.iconBtn, {marginRight:10, backgroundColor: 'rgba(91, 75, 196, 0.1)'}]}>
                            <Ionicons name="construct" size={22} color="#5B4BC4" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.iconBtn, {backgroundColor: theme.cardBg}]}>
                        <Ionicons name="cart" size={24} color="#6C5CE7" />
                        {getCartCount() > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{getCartCount()}</Text></View>}
                    </TouchableOpacity>
                </View>
            </View>
            
            {/* ✅ "YAKINDA" EKRANI */}
            <View style={[styles.comingSoonContainer, { backgroundColor: theme.background }]}>
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center', paddingHorizontal: 40 }}>
                    <Ionicons name="storefront-outline" size={100} color="#6C5CE7" style={{ marginBottom: 20, opacity: 0.8 }} />
                    <Text style={[styles.comingSoonText, { color: '#6C5CE7' }]}>{t.comingSoon}</Text>
                    <Text style={[styles.comingSoonDesc, { color: theme.subText }]}>{t.comingSoonDesc}</Text>
                    
                    <View style={styles.decorCircles}>
                        <View style={[styles.circle, { backgroundColor: '#FDCB6E', width: 20, height: 20, top: -40, left: -60 }]} />
                        <View style={[styles.circle, { backgroundColor: '#00E5FF', width: 15, height: 15, top: 20, right: -50 }]} />
                        <View style={[styles.circle, { backgroundColor: '#FD79A8', width: 25, height: 25, bottom: -30, left: 30 }]} />
                    </View>
                </Animated.View>
            </View>

            {/* FlatList artık sadece dekoratif olarak boş bir şekilde arkada gizli kalacak veya tamamen kaldırılabilir. */}
            <View style={{ display: 'none' }}>
                <FlatList
                    data={filteredProducts}
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
                    keyExtractor={item => item.id}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                    contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={{alignItems:'center', marginTop:50}}>
                            <Text style={{color: theme.subText, fontSize:16, fontWeight:'bold'}}>
                                {activeLang === 'AU' ? 'No products found.' : 'Ürün bulunamadı.'}
                            </Text>
                        </View>
                    }
                />
            </View>

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

            {/* ✅ QR KOD MODALI */}
            <Modal visible={qrModalVisible} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBg, padding: 25, minHeight: 'auto', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderRadius: 25 }]}>
                        <Text style={{fontSize:18, fontWeight:'bold', color: '#6C5CE7', marginBottom:10}}>{t.qrTitle}</Text>
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
                            <TouchableOpacity onPress={handleConfirmQr} style={{backgroundColor: '#6C5CE7', paddingVertical:10, paddingHorizontal:20, borderRadius:8}}>
                                <Text style={{color:'white', fontWeight:'bold'}}>{t.save}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* SEPET MODALI */}
            <Modal visible={modalVisible} transparent={true} animationType="slide">
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
                                                <Text style={{fontSize:11, color: '#6C5CE7', fontWeight:'bold'}}>
                                                    QR: {item.qrName}
                                                </Text>
                                            )}
                                            {(item.selectedColor || item.selectedSize) && <Text style={{fontSize:10, color:theme.subText}}>{item.selectedColor} {item.selectedSize}</Text>}
                                        </View>
                                        <View style={styles.quantityControl}>
                                            <TouchableOpacity onPress={() => decreaseQuantity(item.id)} style={styles.qBtn}><Ionicons name="remove" size={16} color="#6C5CE7" /></TouchableOpacity>
                                            <Text style={styles.qText}>{item.quantity}</Text>
                                            <TouchableOpacity onPress={() => addToCart(item)} style={styles.qBtn}><Ionicons name="add" size={16} color="#6C5CE7" /></TouchableOpacity>
                                        </View>
                                        <TouchableOpacity onPress={() => removeFromCart(item.id)} style={{ marginLeft: 10 }}><Ionicons name="trash-outline" size={20} color="#FF4D4D" /></TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                        {cart.length > 0 && (
                            <View style={{ marginTop: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}><Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>{t.total}</Text><Text style={{ fontSize: 18, fontWeight: 'bold', color: '#6C5CE7' }}>{getTotalPrice()} {t.currency}</Text></View>
                                <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}><Text style={styles.checkoutText}>{t.checkout}</Text><Ionicons name="arrow-forward" size={20} color="white" style={{marginLeft:5}}/></TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, zIndex: 10 },
    headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
    iconBtn: { padding: 8, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.1, shadowRadius:4 },
    
    // YAKINDA TASARIMI
    comingSoonContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 5
    },
    comingSoonText: {
        fontSize: 32,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 15,
        lineHeight: 40,
        letterSpacing: 1
    },
    comingSoonDesc: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
        opacity: 0.8
    },
    decorCircles: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1
    },
    circle: {
        position: 'absolute',
        borderRadius: 50,
        opacity: 0.6
    },

    card: { width: '48%', borderRadius: 20, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity:0.1, shadowRadius:8, overflow: 'hidden' },
    
    pagination: { flexDirection: 'row', position: 'absolute', bottom: 10, alignSelf: 'center' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)', marginHorizontal: 3 },
    activeDot: { backgroundColor: 'white', width: 8 },

    tagContainer: { position: 'absolute', top: 10, left: 10, zIndex: 10, alignItems: 'flex-start' },
    discountBadge: { backgroundColor: '#FF5252', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
    discountText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    badgeBase: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
    badgeText: { fontSize: 10, fontWeight: 'bold' },

    favBtn: { position: 'absolute', top: 10, right: 10, zIndex: 10, padding: 6, borderRadius: 20, elevation: 3 },

    infoContainer: { padding: 12 },
    name: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
    priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    price: { fontSize: 16, color: '#6C5CE7', fontWeight: 'bold' },
    oldPrice: { textDecorationLine: 'line-through', color: '#B0BEC5', fontSize: 12, marginRight: 6 },
    buyBtn: { backgroundColor: '#6C5CE7', paddingVertical: 10, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    buyText: { color: 'white', fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
    
    cartBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF4D4D', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
    cartBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    
    toastContainer: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#333', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, zIndex: 999, elevation: 5 },
    toastText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', alignItems: 'center' },
    modalContent: { width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, minHeight: '45%', paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    cartImage: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F5F5F5' },
    cartName: { fontSize: 15, fontWeight: '600' },
    cartPrice: { fontSize: 13, color: '#6C5CE7', fontWeight: 'bold', marginTop: 2 },
    quantityControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(108, 92, 231, 0.1)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
    qBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
    qText: { marginHorizontal: 10, fontWeight: 'bold', color: '#6C5CE7' },
    checkoutBtn: { backgroundColor: '#6C5CE7', padding: 18, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', shadowColor: '#6C5CE7', shadowOffset: {width:0, height:4}, shadowOpacity:0.3, shadowRadius:8 },
    checkoutText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    flyingImage: { position: 'absolute', top: height / 2 - 80, left: width / 2 - 80, width: 160, height: 160, borderRadius: 20, zIndex: 999 },

    qrInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, marginTop: 5 }
});

export default ShopScreen;