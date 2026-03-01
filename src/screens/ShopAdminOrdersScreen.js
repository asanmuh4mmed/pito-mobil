import React, { useContext, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ShopContext } from '../context/ShopContext';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../constants/colors';

const ShopAdminOrdersScreen = ({ navigation }) => {
    // ✅ ShopContext'ten gerekli fonksiyonları ve veriyi çekiyoruz
    // (ShopContext.js içinde addOrder, updateOrder, deleteOrder DB'ye bağlı)
    const { orders, updateOrder, deleteOrder, fetchOrders, resetOrderCount } = useContext(ShopContext); 
    const { theme } = useContext(ThemeContext);
    const { country } = useContext(AuthContext);

    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';

    // Ekran açıldığında siparişleri tazele ve okunmamış sayısını sıfırla
    useEffect(() => {
        if (fetchOrders) fetchOrders();
        if (resetOrderCount) resetOrderCount();
    }, []);

    const TEXTS = {
        TR: {
            title: "Gelen Siparişler",
            noOrders: "Henüz sipariş yok.",
            status: "Durum",
            total: "Toplam",
            
            // DURUMLAR
            confirmed: "Sipariş Onaylandı",
            preparing: "Sipariş Hazırlanıyor",
            shipped: "Sipariş Kargoya Verildi",
            delivered: "Sipariş Teslim Edildi",
            cancelled: "Sipariş İptal Edildi",

            changeStatus: "Durumu Değiştir",
            selectStatus: "Yeni durumu seçiniz:",
            cancel: "Vazgeç",
            delete: "Siparişi Sil",
            deleteConfirm: "Bu siparişi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
            qrInfo: "QR Kod İsim:"
        },
        AU: {
            title: "Incoming Orders",
            noOrders: "No orders yet.",
            status: "Status",
            total: "Total",

            // STATUSES
            confirmed: "Order Confirmed",
            preparing: "Order Preparing",
            shipped: "Order Shipped",
            delivered: "Order Delivered",
            cancelled: "Order Cancelled",

            changeStatus: "Change Status",
            selectStatus: "Select new status:",
            cancel: "Cancel",
            delete: "Delete Order",
            deleteConfirm: "Are you sure you want to delete this order? This cannot be undone.",
            qrInfo: "QR Name:"
        }
    };
    const t = TEXTS[activeLang];

    // ✅ SİPARİŞ DURUMU GÜNCELLEME MODALI
    const handleChangeStatus = (orderId) => {
        Alert.alert(
            t.changeStatus,
            t.selectStatus,
            [
                { text: t.confirmed, onPress: () => handleUpdate(orderId, 'Sipariş Onaylandı') },
                { text: t.preparing, onPress: () => handleUpdate(orderId, 'Sipariş Hazırlanıyor') },
                { text: t.shipped, onPress: () => handleUpdate(orderId, 'Sipariş Kargoya Verildi') },
                { text: t.delivered, onPress: () => handleUpdate(orderId, 'Sipariş Teslim Edildi') },
                { text: t.cancelled, onPress: () => handleUpdate(orderId, 'Sipariş İptal Edildi'), style: 'destructive' },
                { text: t.cancel, style: "cancel" }
            ]
        );
    };

    const handleUpdate = async (id, newStatus) => {
        if (updateOrder) {
            await updateOrder(id, { status: newStatus });
        } else {
            Alert.alert("Hata", "ShopContext içinde updateOrder fonksiyonu eksik.");
        }
    };

    // ✅ SİPARİŞ SİLME
    const handleDeleteOrder = (orderId) => {
        Alert.alert(
            t.delete,
            t.deleteConfirm,
            [
                { text: t.cancel, style: "cancel" },
                { 
                    text: t.delete, 
                    style: 'destructive', 
                    onPress: async () => {
                        if (deleteOrder) {
                            await deleteOrder(orderId);
                        } else {
                            Alert.alert("Hata", "ShopContext içinde deleteOrder fonksiyonu eksik.");
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status) => {
        if (!status) return '#2196F3'; // Mavi (Varsayılan)
        if (status.includes('İptal') || status.includes('Cancelled')) return '#FF3B30'; // Kırmızı
        if (status.includes('Teslim') || status.includes('Delivered')) return '#4CAF50'; // Yeşil
        if (status.includes('Kargo') || status.includes('Shipped')) return '#FF9800'; // Turuncu
        return '#2196F3'; // Mavi (Diğerleri)
    };

    const renderOrder = ({ item }) => {
        const statusColor = getStatusColor(item.status);

        // Tarih formatlama (Supabase formatı için kontrol)
        let displayDate = item.date || item.created_at;
        try {
            if (item.created_at) {
                displayDate = new Date(item.created_at).toLocaleString();
            }
        } catch (e) {}

        return (
            <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                {/* Üst Kısım: ID ve Silme Butonu */}
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={[styles.orderId, { color: theme.text }]}>#{item.id.toString().slice(0, 8)}...</Text>
                        <Text style={styles.date}>{displayDate}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteOrder(item.id)} style={styles.deleteIconBtn}>
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
                
                {/* Müşteri Bilgileri */}
                <View style={styles.userInfo}>
                    <Text style={[styles.user, {color:theme.subText}]}>👤 {item.full_name || item.userName || 'İsimsiz'}</Text>
                    <Text style={[styles.user, {color:theme.subText}]}>📞 {item.phone || item.userPhone || '-'}</Text>
                    <Text style={[styles.user, {color:theme.subText}]}>📍 {item.address || item.userAddress || '-'}</Text>
                </View>

                <View style={styles.divider} />

                {/* Ürünler Listesi */}
                {item.items && item.items.map((prod, index) => (
                    <View key={index} style={{ marginBottom: 8 }}>
                        <Text style={{color:theme.text, fontSize:14}}>
                            • <Text style={{fontWeight: 'bold'}}>{prod.quantity}x</Text> {prod.name || prod.product_name} 
                            <Text style={{color:theme.subText, fontSize:12}}> ({prod.price} {activeLang === 'AU' ? 'AUD' : 'TL'})</Text>
                        </Text>
                        
                        {/* ✅ QR KOD BİLGİSİ VARSA GÖSTER */}
                        {prod.qrName && (
                            <View style={styles.qrInfoContainer}>
                                <Ionicons name="qr-code-outline" size={14} color={COLORS.primary} />
                                <Text style={styles.qrText}> {t.qrInfo} <Text style={{fontWeight:'bold'}}>{prod.qrName}</Text></Text>
                            </View>
                        )}
                    </View>
                ))}

                <View style={styles.footer}>
                    <Text style={styles.total}>{item.total_price || item.totalPrice} {activeLang === 'AU' ? 'AUD' : 'TL'}</Text>
                    
                    {/* Durum Değiştirme Butonu */}
                    <TouchableOpacity 
                        style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]} 
                        onPress={() => handleChangeStatus(item.id)}
                    >
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status || t.preparing}</Text>
                        <Ionicons name="chevron-down" size={14} color={statusColor} style={{marginLeft:5}} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>{t.title} ({orders.length})</Text>
                <View style={{width:24}}/>
            </View>

            <FlatList
                data={orders}
                renderItem={renderOrder}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="cube-outline" size={60} color={theme.subText} />
                        <Text style={{textAlign:'center', marginTop:10, color: theme.subText}}>{t.noOrders}</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth:1, borderBottomColor:'#eee' },
    title: { fontSize: 18, fontWeight: 'bold' },
    card: { padding: 15, borderRadius: 12, marginBottom: 15, elevation: 3, shadowColor:'#000', shadowOffset:{width:0, height:2}, shadowOpacity:0.1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems:'flex-start', marginBottom: 10 },
    orderId: { fontWeight: 'bold', fontSize: 16 },
    date: { color: '#999', fontSize: 12 },
    deleteIconBtn: { padding: 5, backgroundColor: '#FFEBEE', borderRadius: 20 },
    userInfo: { marginBottom: 5 },
    user: { fontSize: 14, marginBottom: 4 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop:10, borderTopWidth:1, borderTopColor:'#f5f5f5' },
    total: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection:'row', alignItems:'center' },
    statusText: { fontWeight: 'bold', fontSize: 12 },
    emptyContainer: { alignItems:'center', marginTop: 50 },
    
    // ✅ QR KOD STİLİ
    qrInfoContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginLeft: 10, backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
    qrText: { fontSize: 12, color: '#1565C0' }
});

export default ShopAdminOrdersScreen;