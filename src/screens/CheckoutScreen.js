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
    const { theme } = useContext(ThemeContext);
    // createOrderData fonksiyonunu CartContext'ten çekiyoruz
    const { cart, getTotalPrice, clearCart, createOrderData } = useContext(CartContext);
    const { addOrder } = useContext(ShopContext);
    const { user, country, updateUser } = useContext(AuthContext);

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
        title: "Checkout",
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
        successTitle: "Order Successful! 🎉",
        successMsg: "Your order has been received.",
        orderNo: "Order No:",
        homeBtn: "Return to Shop",
        error: "Missing Information",
        errorMsg: "Please fill in all address fields.",
        payError: "Payment Failed",
        serverError: "Could not connect to server.",
        notificationMsg: "Your order has been received successfully! Click for details."
    } : {
        title: "Ödeme",
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
        successTitle: "Sipariş Onaylandı! 🎉",
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
        if (!phone.startsWith(prefix)) {
            setPhone(prefix);
        }
    }, [activeLang]);

    // ✅ SES VE BİLDİRİM
    const playSuccessSoundAndNotify = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/paw.mp3') 
            );
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
            updateUser({ notifications: updatedNotifications });
        }
    };

    // 🚀 GERÇEK SİPARİŞ OLUŞTURMA (VERİTABANI)
    const handlePlaceOrder = async () => {
        // 1. Validasyon
        let newErrors = {};
        if (!fullName) newErrors.fullName = true;
        if (phone.length < 10) newErrors.phone = true;
        if (!address) newErrors.address = true;
        if (!selectedCity) newErrors.city = true;
        if (!selectedDistrict) newErrors.district = true;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            Alert.alert(t.error, t.errorMsg);
            return;
        }

        setLoading(true);

        try {
            console.log("Sipariş veritabanına kaydediliyor...");
            
            // Adres bilgilerini birleştir
            const fullAddressInfo = {
                name: fullName,
                phone: phone,
                address: `${address}, ${selectedDistrict}/${selectedCity}`
            };

            // ✅ CartContext'ten sipariş verisini hazırla
            const orderData = createOrderData(fullAddressInfo);

            if (!orderData) {
                throw new Error("Sipariş verisi oluşturulamadı.");
            }

            // ✅ ShopContext üzerinden veritabanına yaz (Supabase)
            const success = await addOrder(orderData);

            if (success) {
                await playSuccessSoundAndNotify();
                clearCart(); // Sepeti boşalt
                setCreatedOrderId(orderData.id); // Oluşturulan ID'yi göster (Veya DB'den dönen ID)
                setSuccessVisible(true);
            } else {
                Alert.alert("Hata", "Sipariş oluşturulurken bir sorun oluştu. Lütfen tekrar deneyin.");
            }

        } catch (error) {
            console.log("Sipariş Hatası:", error);
            Alert.alert("Hata", "Beklenmedik bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    // --- MODAL RENDER ---
    const renderSelectionModal = (visible, setVisible, data, onSelect, title) => (
        <Modal visible={visible} transparent={true} animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={() => setVisible(false)}>
                            <Ionicons name="close" size={24} color="#333" />
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
                                <Text style={styles.modalItemText}>
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
            <SafeAreaView style={styles.successContainer}>
                <View style={styles.successCard}>
                    <View style={styles.successIconBg}>
                        <Ionicons name="checkmark" size={60} color="white" />
                    </View>
                    <Text style={styles.successTitle}>{t.successTitle}</Text>
                    <Text style={styles.successMsg}>{t.successMsg}</Text>
                    
                    <View style={styles.dashedLine} />
                    
                    <View style={styles.orderIdBox}>
                        <Text style={styles.orderLabel}>{t.orderNo}</Text>
                        <Text style={styles.orderValue}>{createdOrderId}</Text>
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
        <SafeAreaView style={[styles.container, { backgroundColor: '#F4F7FE' }]}>
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.title}</Text>
                <View style={{width: 40}}/>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
                
                <Animated.View style={{ opacity: fadeAnim }}>
                    
                    {/* 1. ADRES BÖLÜMÜ */}
                    <Text style={styles.sectionTitle}>{t.addressTitle}</Text>
                    <View style={styles.card}>
                        <TextInput 
                            style={[styles.input, errors.fullName && styles.inputError]} 
                            placeholder={t.name} placeholderTextColor="#999" 
                            value={fullName} onChangeText={setFullName} 
                        />
                        <TextInput 
                            style={[styles.input, errors.phone && styles.inputError]} 
                            placeholder={t.phone} placeholderTextColor="#999" 
                            keyboardType="phone-pad" value={phone} onChangeText={setPhone} 
                        />
                        <TextInput 
                            style={[styles.input, errors.address && styles.inputError]} 
                            placeholder={t.address} placeholderTextColor="#999" 
                            value={address} onChangeText={setAddress} 
                        />
                        
                        <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                            <TouchableOpacity 
                                style={[styles.pickerBtn, {width:'48%'}, errors.city && styles.inputError]} 
                                onPress={() => setCityModalVisible(true)}
                            >
                                <Text style={{color: selectedCity ? '#333' : '#999'}} numberOfLines={1}>{selectedCity || t.selectCity}</Text>
                                <Ionicons name="chevron-down" size={18} color="#999" />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.pickerBtn, {width:'48%'}, errors.district && styles.inputError, !selectedCity && {opacity: 0.5}]} 
                                onPress={() => selectedCity && setDistrictModalVisible(true)}
                                disabled={!selectedCity}
                            >
                                <Text style={{color: selectedDistrict ? '#333' : '#999'}} numberOfLines={1}>{selectedDistrict || t.selectDistrict}</Text>
                                <Ionicons name="chevron-down" size={18} color="#999" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 2. ÖZET */}
                    <View style={styles.summaryCard}>
                        <View style={styles.row}><Text style={styles.summaryLabel}>{t.subtotal}</Text><Text style={styles.summaryValue}>{getTotalPrice()} {currency}</Text></View>
                        <View style={styles.row}><Text style={styles.summaryLabel}>{t.shipping}</Text><Text style={{color:'#4CAF50', fontWeight:'bold'}}>{t.free}</Text></View>
                        <View style={styles.divider} />
                        <View style={styles.row}><Text style={styles.totalLabel}>{t.total}</Text><Text style={styles.totalValue}>{getTotalPrice()} {currency}</Text></View>
                    </View>

                    <TouchableOpacity style={styles.payBtn} onPress={handlePlaceOrder} disabled={loading}>
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
    totalValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },

    // BUTON
    payBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 30, shadowColor: COLORS.primary, shadowOffset: {width:0, height:4}, shadowOpacity:0.3, shadowRadius:8 },
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
    orderValue: { color: '#333', fontSize: 24, fontWeight: '800', marginTop: 5 },
    homeBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 40, borderRadius: 16 },
    homeBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});

export default CheckoutScreen;