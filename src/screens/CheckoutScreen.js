import React, { useContext, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CartContext } from '../context/CartContext';
import { ShopContext } from '../context/ShopContext';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { COLORS } from '../constants/colors';
import { Audio } from 'expo-av'; 

// Şehir Verisi
import { CITY_DATA } from '../constants/cities'; 

const CheckoutScreen = ({ navigation }) => {
    const { theme: appTheme, isDarkMode } = useContext(ThemeContext);
    const theme = isDarkMode ? { ...appTheme, background: '#0B131E', cardBg: '#1A2533', text: '#F7F4EE', subText: '#A0AAB5', border: '#293647' } : { ...appTheme, background: '#F8F5EF', cardBg: '#FFFFFF', text: '#142239', subText: '#727989', border: '#EAE4D8' };
    const orderLock = useRef(false);
    const completedOrder = useRef(null);
    const accountRef = useRef(null);
    // createOrderData fonksiyonunu CartContext'ten çekiyoruz
    const { cart, cartLoading, getTotalPrice, clearCart, createOrderData } = useContext(CartContext);
    const { addOrder } = useContext(ShopContext);
    const { user, country, updateUser } = useContext(AuthContext);
    accountRef.current = user?.id;

    // Animasyon Değerleri
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
    const currency = activeLang === 'AU' ? 'AUD' : 'TL';

    // Şehir Verisi
    const rawCities = CITY_DATA[activeLang] || {}; 
    const citiesData = Object.keys(rawCities).map(city => ({
        name: city,
        districts: rawCities[city]
    })).sort((a, b) => a.name.localeCompare(b.name));

    // --- DİL DESTEĞİ ---
    const t = activeLang === 'AU' ? {
        title: "Order details",
        addressTitle: "📍 Shipping Address",
        name: "Full Name",
        phone: "Phone Number",
        address: "Street Address",
        city: "City",
        district: "District",
        selectCity: "Select City",
        selectDistrict: "Select District",
        summary: "Order Summary",
        subtotal: "Subtotal",
        shipping: "Shipping",
        free: "Free",
        total: "Total Amount",
        confirm: "Complete Order",
        successTitle: "Order received",
        successMsg: "Your order has been received.",
        orderNo: "Order No:",
        homeBtn: "Return to Shop",
        error: "Missing Information",
        errorMsg: "Please fill in all address fields.",
        payError: "Payment Failed",
        serverError: "Could not connect to server.",
        notificationMsg: "Your order has been received successfully! Click for details."
    } : {
        title: "Sipariş bilgileri",
        addressTitle: "📍 Teslimat Adresi",
        name: "Ad Soyad",
        phone: "Telefon Numarası",
        address: "Adres (Mahalle, Cadde, No)",
        city: "Şehir",
        district: "İlçe",
        selectCity: "Şehir Seçiniz",
        selectDistrict: "İlçe Seçiniz",
        summary: "Sipariş Özeti",
        subtotal: "Ara Toplam",
        shipping: "Kargo",
        free: "Ücretsiz",
        total: "Toplam Tutar",
        confirm: "Siparişi Tamamla",
        successTitle: "Sipariş alındı",
        successMsg: "Siparişiniz başarıyla alındı.",
        orderNo: "Sipariş No:",
        homeBtn: "Alışverişe Dön",
        error: "Eksik Bilgi",
        errorMsg: "Lütfen adres bilgilerini eksiksiz doldurunuz.",
        payError: "Ödeme Başarısız",
        serverError: "Sunucu ile bağlantı kurulamadı.",
        notificationMsg: "Siparişiniz başarıyla alındı! Detaylar için tıklayın."
    };

    // --- STATE ---
    const [fullName, setFullName] = useState(user?.fullname || '');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    
    const [selectedCity, setSelectedCity] = useState(null);
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [cityModalVisible, setCityModalVisible] = useState(false);
    const [districtModalVisible, setDistrictModalVisible] = useState(false);

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState('');

    useEffect(() => {
        const prefix = activeLang === 'AU' ? '+61 ' : '+90 ';
        setSelectedCity(null);
        setSelectedDistrict(null);
        if (!phone.startsWith(prefix)) {
            setPhone(prefix);
        }
    }, [activeLang]);

    // ✅ SES VE BİLDİRİM
    const playSuccessSoundAndNotify = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/sounds/paw.mp3') 
            );
            sound.setOnPlaybackStatusUpdate(status => {
                if (status.isLoaded && status.didJustFinish) sound.unloadAsync().catch(() => {});
            });
            await sound.playAsync();
        } catch (error) {
            console.log("Ses hatası:", error);
        }

        if (user) {
            // Bildirim veritabanına yazılabilir veya yerel state güncellenebilir
            // Şimdilik AuthContext üzerinden user state'i güncelliyoruz (Opsiyonel)
            const newNotification = {
                id: Date.now(),
                fromUserId: 'system_shop',
                fromUser: 'Pito Shop',
                fromUserAvatar: null, 
                type: 'order_success', 
                message: t.notificationMsg,
                date: new Date().toISOString(),
                read: false
            };
            const updatedNotifications = [newNotification, ...(user.notifications || [])];
            await updateUser({ notifications: updatedNotifications });
        }
    };

    // 🚀 GERÇEK SİPARİŞ OLUŞTURMA (VERİTABANI)
    const handlePlaceOrder = async () => {
        if (orderLock.current || completedOrder.current) return;
        if (!user) return Alert.alert('Giriş gerekli', 'Sipariş vermek için hesabınıza giriş yapın.');
        if (cartLoading || cart.length === 0) return Alert.alert('Sepet', 'Sepetiniz boş veya henüz yüklenmedi.');
        const digits = phone.replace(/\D/g, '');
        const newErrors = {};
        if (fullName.trim().length < 2) newErrors.fullName = true;
        if (digits.length < 10 || digits.length > 15) newErrors.phone = true;
        if (address.trim().length < 5) newErrors.address = true;
        const cityEntry = citiesData.find(c => c.name === selectedCity);
        if (!cityEntry) newErrors.city = true;
        if (!cityEntry?.districts.includes(selectedDistrict)) newErrors.district = true;
        setErrors(newErrors);
        if (Object.keys(newErrors).length) return Alert.alert(t.error, t.errorMsg);
        orderLock.current = true;
        setLoading(true);
        const buyerId = user.id;
        try {
            const orderData = createOrderData({ name: fullName.trim(), phone: phone.trim(), address: `${address.trim()}, ${selectedDistrict}/${selectedCity}` });
            if (!orderData) throw new Error('Sipariş verisi oluşturulamadı.');
            const result = await addOrder(orderData);
            const id = typeof result === 'string' ? result : result?.id;
            if (!id) {
                // The older context returns true: don't invite another order after a confirmed write.
                if (result === true) {
                    completedOrder.current = 'legacy';
                    throw new Error('Sipariş kaydedildi fakat numarası alınamadı. Yeniden sipariş vermeyin; profilinizdeki siparişleri kontrol edin. ShopContext dosyasını da güncelleyin.');
                }
                throw new Error('Sipariş kaydı doğrulanamadı. Yeniden denemeden önce profilinizdeki siparişleri kontrol edin.');
            }
            completedOrder.current = id;
            if (accountRef.current !== buyerId) return;
            setCreatedOrderId(id);
            clearCart();
            setSuccessVisible(true);
            // Optional effects cannot change the recorded order result.
            playSuccessSoundAndNotify().catch(error => console.log('Sipariş kaydedildi; bildirim tamamlanamadı:', error.message));
        } catch (error) {
            Alert.alert('Sipariş', error.message || t.serverError);
        } finally {
            orderLock.current = false;
            setLoading(false);
        }
    };

    useEffect(() => navigation.addListener('beforeRemove', event => {
        if (orderLock.current) event.preventDefault();
    }), [navigation]);

    // --- MODAL RENDER ---
    const renderSelectionModal = (visible, setVisible, data, onSelect, title) => (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={() => setVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
                        <TouchableOpacity onPress={() => setVisible(false)}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={data}
                        keyExtractor={(item) => (typeof item === 'object' ? item.name : item)}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.modalItem}
                                onPress={() => {
                                    onSelect(item);
                                    setVisible(false);
                                    if(title === t.selectCity) setErrors(prev => ({...prev, city: false}));
                                    if(title === t.selectDistrict) setErrors(prev => ({...prev, district: false}));
                                }}
                            >
                                <Text style={[styles.modalItemText, { color: theme.text }]}>
                                    {typeof item === 'object' ? item.name : item}
                                </Text>
                                <Ionicons name="chevron-forward" size={18} color="#ccc" />
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>
        </Modal>
    );

    // --- BAŞARI EKRANI ---
    if (successVisible) {
        return (
            <SafeAreaView style={[styles.successContainer, { backgroundColor: theme.background }]}>
                <View style={[styles.successCard, { backgroundColor: theme.cardBg }]}>
                    <View style={styles.successIconBg}>
                        <Ionicons name="checkmark" size={60} color="white" />
                    </View>
                    <Text style={[styles.successTitle, { color: theme.text }]}>{t.successTitle}</Text>
                    <Text style={styles.successMsg}>{t.successMsg}</Text>
                    
                    <View style={styles.dashedLine} />
                    
                    <View style={[styles.orderIdBox, { backgroundColor: theme.cardBg }]}>
                        <Text style={styles.orderLabel}>{t.orderNo}</Text>
                        <Text style={[styles.orderValue, { color: theme.text }]}>{createdOrderId}</Text>
                    </View>

                    <TouchableOpacity 
                        style={styles.homeBtn} 
                        onPress={() => {
                            setSuccessVisible(false);
                            navigation.navigate('Shop'); 
                        }}
                    >
                        <Text style={styles.homeBtnText}>{t.homeBtn}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: theme.cardBg }]}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t.title}</Text>
                <View style={{width: 40}}/>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 35 }} showsVerticalScrollIndicator={false}>
                
                <Animated.View pointerEvents={loading ? 'none' : 'auto'} style={{ opacity: fadeAnim }}>
                    <View style={styles.intro}><Text style={styles.introLabel}>PİTO SHOP</Text><Text style={styles.introTitle}>{activeLang === 'AU' ? 'One last look.' : 'Son bir kontrol.'}</Text><Text style={styles.introText}>{activeLang === 'AU' ? 'Review your items and delivery details.' : 'Ürünlerini ve teslimat bilgilerini gözden geçir.'}</Text></View>
                    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>{cart.map(item => <View key={String(item.id)} style={styles.productRow}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{item.name}</Text><Text style={{ color: theme.subText, fontSize: 11, marginTop: 5 }}>{[item.selectedColor, item.selectedSize, item.qrName && `QR: ${item.qrName}`].filter(Boolean).join(' · ')}</Text></View><Text style={{ color: theme.subText, marginHorizontal: 10 }}>×{item.quantity}</Text><Text style={{ color: '#B18A46', fontWeight: '700' }}>{(Number(item.price) * item.quantity).toFixed(2)} {currency}</Text></View>)}</View>
                    
                    {/* 1. ADRES BÖLÜMÜ */}
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.addressTitle}</Text>
                    <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                        <TextInput 
                            style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }, errors.fullName && styles.inputError]} 
                            placeholder={t.name} placeholderTextColor="#999" 
                            value={fullName} onChangeText={setFullName} 
                        />
                        <TextInput 
                            style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }, errors.phone && styles.inputError]} 
                            placeholder={t.phone} placeholderTextColor="#999" 
                            keyboardType="phone-pad" value={phone} onChangeText={setPhone} 
                        />
                        <TextInput 
                            style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }, errors.address && styles.inputError]} 
                            placeholder={t.address} placeholderTextColor="#999" 
                            value={address} onChangeText={setAddress} 
                        />
                        
                        <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                            <TouchableOpacity 
                                style={[styles.pickerBtn, {width:'48%', backgroundColor: theme.background, borderColor: theme.border}, errors.city && styles.inputError]} 
                                onPress={() => setCityModalVisible(true)}
                            >
                                <Text style={{color: selectedCity ? theme.text : '#999'}} numberOfLines={1}>{selectedCity || t.selectCity}</Text>
                                <Ionicons name="chevron-down" size={18} color="#999" />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.pickerBtn, {width:'48%', backgroundColor: theme.background, borderColor: theme.border}, errors.district && styles.inputError, !selectedCity && {opacity: 0.5}]} 
                                onPress={() => selectedCity && setDistrictModalVisible(true)}
                                disabled={!selectedCity}
                            >
                                <Text style={{color: selectedDistrict ? theme.text : '#999'}} numberOfLines={1}>{selectedDistrict || t.selectDistrict}</Text>
                                <Ionicons name="chevron-down" size={18} color="#999" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 2. ÖZET */}
                    <View style={[styles.summaryCard, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.row}><Text style={styles.summaryLabel}>{t.subtotal}</Text><Text style={[styles.summaryValue, { color: theme.text }]}>{getTotalPrice()} {currency}</Text></View>
                        <View style={styles.row}><Text style={styles.summaryLabel}>{t.shipping}</Text><Text style={{color:'#4CAF50', fontWeight:'bold'}}>{t.free}</Text></View>
                        <View style={styles.divider} />
                        <View style={styles.row}><Text style={[styles.totalLabel, { color: theme.text }]}>{t.total}</Text><Text style={styles.totalValue}>{getTotalPrice()} {currency}</Text></View>
                    </View>

                    <Text style={{ color: theme.subText, fontSize: 12, lineHeight: 19, marginTop: 18 }}>{activeLang === 'AU' ? 'This step creates an order record. It does not collect a payment.' : 'Bu adım sipariş kaydı oluşturur. Karttan ödeme alınmaz.'}</Text>
                    <TouchableOpacity style={styles.payBtn} onPress={handlePlaceOrder} disabled={loading || cartLoading || !cart.length || !!completedOrder.current}>
                        {loading ? <ActivityIndicator color="white" /> : (
                            <View style={{flexDirection:'row', alignItems:'center'}}>
                                <Text style={styles.payText}>{t.confirm}</Text>
                                <Ionicons name="arrow-forward" size={20} color="white" style={{marginLeft:10}} />
                            </View>
                        )}
                    </TouchableOpacity>

                </Animated.View>
            </ScrollView>

            {/* MODALLAR */}
            {renderSelectionModal(cityModalVisible, setCityModalVisible, citiesData, (item) => { setSelectedCity(item.name); setSelectedDistrict(null); }, t.selectCity)}
            {renderSelectionModal(districtModalVisible, setDistrictModalVisible, selectedCity ? (citiesData.find(c => c.name === selectedCity)?.districts || []) : [], (item) => setSelectedDistrict(item), t.selectDistrict)}

        </SafeAreaView>
    );
};

// --- STYLES (MODERN) ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    intro: { backgroundColor: '#142239', borderRadius: 24, padding: 23, marginBottom: 18 },
    introLabel: { color: '#D9BC82', fontSize: 10, letterSpacing: 2, fontWeight: '800' },
    introTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', marginTop: 12 },
    introText: { color: '#BBC5D2', fontSize: 12, lineHeight: 20, marginTop: 9 },
    productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { backgroundColor: 'white', padding: 10, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity:0.05, shadowRadius:4 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
    
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10, marginLeft: 5 },
    
    // KART TASARIMI
    card: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 10, elevation: 3, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity:0.05, shadowRadius:8 },
    input: { backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14, marginBottom: 12, fontSize: 15, color: '#333', borderWidth: 1, borderColor: '#F0F0F0' },
    inputError: { borderColor: '#FF5252', borderWidth: 1, backgroundColor: '#FFF0F0' },
    
    pickerBtn: { backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0', flexDirection:'row', justifyContent:'space-between', alignItems:'center' },

    // ÖZET KARTI
    summaryCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginTop: 15, elevation: 2 },
    row: { flexDirection:'row', justifyContent:'space-between', marginBottom: 8 },
    summaryLabel: { color: '#777', fontSize: 14 },
    summaryValue: { color: '#333', fontSize: 14, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    totalValue: { fontSize: 22, fontWeight: '800', color: '#B18A46' },

    // BUTON
    payBtn: { backgroundColor: '#B18A46', padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 30, shadowColor: '#B18A46', shadowOffset: {width:0, height:4}, shadowOpacity:0.3, shadowRadius:8 },
    payText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

    // MODAL STİLLERİ
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, maxHeight: '60%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', flexDirection:'row', justifyContent:'space-between' },
    modalItemText: { fontSize: 16, color: '#333' },

    // BAŞARI EKRANI
    successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F4F7FE' },
    successCard: { backgroundColor: 'white', width: '100%', padding: 40, borderRadius: 30, alignItems: 'center', elevation: 10 },
    successIconBg: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#4CAF50', shadowOpacity: 0.4, shadowRadius: 10 },
    successTitle: { fontSize: 26, fontWeight: '800', color: '#333', marginBottom: 10 },
    successMsg: { fontSize: 16, color: '#777', textAlign: 'center', marginBottom: 30 },
    dashedLine: { width: '100%', height: 1, borderWidth: 1, borderColor: '#DDD', borderStyle: 'dashed', borderRadius: 1, marginBottom: 20 },
    orderIdBox: { backgroundColor: '#F9FAFB', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 15, alignItems: 'center', marginBottom: 30 },
    orderLabel: { color: '#999', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
    orderValue: { color: '#333', fontSize: 13, fontWeight: '700', marginTop: 8, textAlign: 'center' },
    homeBtn: { backgroundColor: '#B18A46', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 16 },
    homeBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default CheckoutScreen;