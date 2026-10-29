import React, { useState, useContext, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, StatusBar, TextInput, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ShopContext } from '../context/ShopContext';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const ShopAdminOrdersScreen = ({ navigation }) => {
    const { orders = [], updateOrder, deleteOrder, fetchOrders, resetOrderCount } = useContext(ShopContext); 
    const { theme: appTheme, isDarkMode } = useContext(ThemeContext);
    const { user } = useContext(AuthContext);
    const isAdmin = user?.is_admin === true;
    const theme = isDarkMode ? { ...appTheme, type: 'dark', background: '#0B131E', cardBg: '#1A2533', text: '#F7F4EE', subText: '#A0AAB5', border: '#293647' } : { ...appTheme, type: 'light', background: '#F8F5EF', cardBg: '#FFFFFF', text: '#142239', subText: '#727989', border: '#EAE4D8' };
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('Tümü');
    const [refreshing, setRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const busyRef = useRef(false);
    const services = useRef({ fetchOrders, resetOrderCount });
    services.current = { fetchOrders, resetOrderCount };

    const [language, setLanguage] = useState('TR');

    const refresh = useCallback(async () => {
        if (!isAdmin) return;
        setRefreshing(true);
        try {
            if (!services.current.fetchOrders) throw new Error('ShopContext dosyasını da güncelleyin.');
            await services.current.fetchOrders({ throwOnError: true });
            services.current.resetOrderCount?.();
            setFetchError('');
        } catch (error) { setFetchError(error.message || 'Siparişler yüklenemedi.'); }
        finally { setRefreshing(false); }
    }, [isAdmin]);
    useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
    const group = status => {
        const value = String(status || '').toLocaleLowerCase('tr-TR');
        if (value.includes('iptal') || value.includes('cancel')) return 'İptal';
        if (value.includes('teslim') || value.includes('delivered') || value.includes('completed')) return 'Teslim';
        if (value.includes('kargo') || value.includes('shipped')) return 'Kargoda';
        return 'Aktif';
    };
    const visibleOrders = useMemo(() => orders.filter(order => {
        const text = [order.id, order.full_name, order.userName, order.phone, order.user_phone, order.address, order.user_address].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');
        return text.includes(search.trim().toLocaleLowerCase('tr-TR')) && (filter === 'Tümü' || group(order.status) === filter);
    }).sort((a, b) => (Date.parse(b.created_at) || 0) - (Date.parse(a.created_at) || 0)), [orders, search, filter]);
    const formatMoney = value => Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '—';
    // Old orders do not record a currency. Do not infer it from the administrator's region.
    const currencyOf = order => order.currency || order.currency_code || '';

    const TRANSLATIONS = {
        TR: {
            title: "Gelen Siparişler",
            noOrders: "Henüz sipariş yok.",
            status: "Durum",
            total: "Toplam",
            errorTitle: "Hata",
            errorCtx: "ShopContext içinde gerekli fonksiyon eksik.",
            currency: "₺", 
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
            qrInfo: "QR İsim:"
        },
        EN: {
            title: "Incoming Orders",
            noOrders: "No orders yet.",
            status: "Status",
            total: "Total",
            errorTitle: "Error",
            errorCtx: "Required function is missing in ShopContext.",
            currency: "₺", 
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
    
    const t = TRANSLATIONS[language];

    const statuses = [
        ['Sipariş Onaylandı', 'checkmark-circle-outline', t.confirmed],
        ['Sipariş Hazırlanıyor', 'cube-outline', t.preparing],
        ['Sipariş Kargoya Verildi', 'car-outline', t.shipped],
        ['Sipariş Teslim Edildi', 'bag-check-outline', t.delivered],
        ['Sipariş İptal Edildi', 'close-circle-outline', t.cancelled],
    ];
    const handleChangeStatus = order => {
        if (isAdmin && !busyRef.current) setSelectedOrder(order);
    };
    const handleUpdate = async (id, newStatus) => {
        if (!isAdmin || busyRef.current) return;
        busyRef.current = true; setBusyId(String(id));
        try {
            const saved = await updateOrder(id, { status: newStatus });
            if (!saved?.id) throw new Error('Güncelleme doğrulanamadı. ShopContext dosyasını da güncelleyin.');
            setSelectedOrder(null);
        } catch (error) { Alert.alert('Durum güncellenemedi', error.message); }
        finally { busyRef.current = false; setBusyId(null); }
    };
    const requestStatus = (order, status) => {
        if (status === 'Sipariş İptal Edildi') {
            Alert.alert('Siparişi iptal et', 'Bu işlem yalnızca sipariş durumunu değiştirir. Otomatik ücret iadesi veya stok iadesi yapmaz.', [
                { text: t.cancel, style: 'cancel' },
                { text: 'İptal et', style: 'destructive', onPress: () => handleUpdate(order.id, status) },
            ]);
        } else handleUpdate(order.id, status);
    };
    const handleDeleteOrder = id => {
        if (!isAdmin || busyRef.current) return;
        Alert.alert(t.delete, t.deleteConfirm + ' Ödeme veya stok iadesi yapılmaz.', [
            { text: t.cancel, style: 'cancel' },
            { text: t.delete, style: 'destructive', onPress: async () => {
                if (busyRef.current) return;
                busyRef.current = true; setBusyId(String(id));
                try {
                    const result = await deleteOrder(id);
                    if (!result?.success) throw new Error('Silme doğrulanamadı. ShopContext dosyasını da güncelleyin.');
                } catch (error) { Alert.alert('Sipariş silinemedi', error.code === '23503' ? 'Sipariş kalemleri bu kayda bağlı. Geçmişi korumak için siparişi iptal edebilirsiniz.' : error.message); }
                finally { busyRef.current = false; setBusyId(null); }
            } },
        ]);
    };

    const getStatusColor = (status) => {
        if (!status) return '#3B82F6'; // Modern Blue
        if (status.includes('İptal') || status.includes('Cancelled')) return '#EF4444'; // Modern Red
        if (status.includes('Teslim') || status.includes('Delivered')) return '#10B981'; // Modern Green
        if (status.includes('Kargo') || status.includes('Shipped')) return '#F59E0B'; // Modern Orange
        return '#3B82F6'; 
    };

    const renderOrder = ({ item }) => {
        const statusColor = getStatusColor(item.status);

        let displayDate = item.date || item.created_at;
        try {
            if (item.created_at) {
                // Sadece gün ve saati daha temiz göstermek için
                const d = new Date(item.created_at);
                if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
                displayDate = d.toLocaleDateString() + ' - ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }
        } catch (e) { displayDate = '—'; }

        const isDark = theme.type === 'dark';

        return (
            <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text selectable style={[styles.orderId, { color: theme.text }]}>#{item.id.toString().slice(0, 8).toUpperCase()}</Text>
                        <Text style={[styles.date, { color: theme.subText }]}>{displayDate}</Text>
                    </View>
                    <TouchableOpacity disabled={!!busyId} accessibilityLabel="Siparişi sil" onPress={() => handleDeleteOrder(item.id)} style={styles.deleteIconBtn}>
                        <Ionicons name="trash" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.userInfo}>
                    <View style={styles.userInfoRow}>
                        <Ionicons name="person-outline" size={16} color={theme.subText} style={styles.userIcon} />
                        <Text style={[styles.userText, { color: theme.text }]}>{item.full_name || item.userName || 'İsimsiz'}</Text>
                    </View>
                    <View style={styles.userInfoRow}>
                        <Ionicons name="call-outline" size={16} color={theme.subText} style={styles.userIcon} />
                        <Text style={[styles.userText, { color: theme.text }]}>{item.phone || item.user_phone || item.userPhone || '-'}</Text>
                    </View>
                    <View style={styles.userInfoRow}>
                        <Ionicons name="location-outline" size={16} color={theme.subText} style={styles.userIcon} />
                        <Text style={[styles.userText, { color: theme.text }]} selectable>{item.address || item.user_address || item.userAddress || '-'}</Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]} />

                <View style={styles.productsContainer}>
                    {(item.items || item.order_items || []).map((prod, index) => (
                        <View key={index} style={styles.productRow}>
                            <View style={styles.productDot} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>
                                    {prod.quantity}x <Text style={{ fontWeight: '400' }}>{prod.name || prod.product_name}</Text>
                                </Text>
                                
                                {!!(prod.qrName || prod.qr_name) && (
                                    <View style={[styles.qrInfoContainer, { backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : '#EFF6FF' }]}>
                                        <Ionicons name="qr-code" size={12} color={isDark ? '#60A5FA' : '#3B82F6'} />
                                        <Text style={[styles.qrText, { color: isDark ? '#60A5FA' : '#1D4ED8' }]}> 
                                            {t.qrInfo} <Text style={{fontWeight:'700'}}>{prod.qrName || prod.qr_name}</Text>
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <Text style={{ color: theme.subText, fontSize: 13, fontWeight: '600' }}>
                                {formatMoney(Number(prod.price) * Number(prod.quantity))} {currencyOf(item)}
                            </Text>
                        </View>
                    ))}
                </View>

                {!currencyOf(item) && <Text style={[styles.metaNote, { color: theme.subText }]}>Bu kayıtta para birimi bilgisi yok.</Text>}
                {busyId === String(item.id) && <ActivityIndicator color="#B18A46" style={{ marginTop: 12 }} />}
                <View style={[styles.footer, { borderTopColor: isDark ? '#333' : '#F0F0F0' }]}>
                    <View>
                        <Text style={[styles.totalLabel, { color: theme.subText }]}>{t.total}</Text>
                        <Text style={[styles.total, { color: '#B18A46' }]}>{formatMoney(item.total_price ?? item.totalPrice)} {currencyOf(item)}</Text>
                    </View>
                    
                    <TouchableOpacity 
                        style={[styles.statusBadge, { backgroundColor: statusColor + '15', borderColor: statusColor + '30', borderWidth: 1 }]} 
                        disabled={!!busyId} onPress={() => handleChangeStatus(item)}
                    >
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusText, { color: statusColor }]}>{item.status || t.preparing}</Text>
                        <Ionicons name="chevron-down" size={14} color={statusColor} style={{marginLeft: 6, marginTop: 1}} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (!isAdmin) return <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}><View style={styles.emptyContainer}><Ionicons name="lock-closed-outline" size={40} color="#B18A46" /><Text style={{ color: theme.text, marginVertical: 20 }}>Bu bölüm yalnızca yöneticiler içindir.</Text><TouchableOpacity onPress={() => navigation.goBack()}><Text style={{ color: '#B18A46' }}>Geri dön</Text></TouchableOpacity></View></SafeAreaView>;
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={theme.type === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={[styles.header, { borderBottomColor: theme.type === 'dark' ? '#333' : '#F0F0F0' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>{t.title} <Text style={styles.titleCount}>({orders.length})</Text></Text>
                <View style={{ width: 44 }} /> {/* Başlığı tam ortalamak için */}
            </View>

            <FlatList
                refreshing={refreshing}
                onRefresh={refresh}
                ListHeaderComponent={<View>
                    <View style={styles.hero}><Text style={styles.eyebrow}>PİTO SHOP · YÖNETİM</Text><Text style={styles.heroTitle}>Siparişler bir arada.</Text><Text style={styles.heroText}>{orders.length} kayıt · {orders.filter(o => group(o.status) === 'Aktif').length} aktif sipariş</Text></View>
                    <View style={[styles.search, { backgroundColor: theme.cardBg, borderColor: theme.border }]}><Ionicons name="search-outline" size={20} color={theme.subText} /><TextInput style={[styles.searchInput, { color: theme.text }]} value={search} onChangeText={setSearch} placeholder="Sipariş no, müşteri veya telefon ara" placeholderTextColor={theme.subText} autoCorrect={false} />{!!search && <TouchableOpacity accessibilityLabel="Aramayı temizle" onPress={() => setSearch('')}><Ionicons name="close-circle" size={20} color={theme.subText} /></TouchableOpacity>}</View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 18 }}>{['Tümü', 'Aktif', 'Kargoda', 'Teslim', 'İptal'].map(f => <TouchableOpacity key={f} accessibilityState={{ selected: filter === f }} onPress={() => setFilter(f)} style={[styles.filterChip, { backgroundColor: filter === f ? '#142239' : theme.cardBg }]}><Text style={{ color: filter === f ? '#FFFFFF' : theme.text, fontWeight: '700', fontSize: 12 }}>{f}</Text></TouchableOpacity>)}</ScrollView>
                    {!!fetchError && <TouchableOpacity onPress={refresh} style={styles.errorBox}><Text style={{ color: '#B54D43', fontSize: 12 }}>{fetchError} · Yenilemek için dokun.</Text></TouchableOpacity>}
                </View>}
                data={visibleOrders}
                renderItem={renderOrder}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons name="cube-outline" size={40} color={theme.subText} />
                        </View>
                        <Text style={[styles.emptyText, { color: theme.subText }]}>{refreshing ? 'Siparişler yükleniyor…' : search || filter !== 'Tümü' ? 'Bu aramaya uygun sipariş yok.' : t.noOrders}</Text>
                    </View>
                }
            />
            <Modal visible={!!selectedOrder} transparent animationType="slide" onRequestClose={() => { if (!busyId) setSelectedOrder(null); }}>
                <View style={styles.overlay}><TouchableOpacity style={StyleSheet.absoluteFillObject} disabled={!!busyId} onPress={() => setSelectedOrder(null)} accessibilityLabel="Kapat" /><SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: theme.cardBg }]}><View style={styles.sheetHandle} /><Text style={[styles.title, { color: theme.text }]}>{t.changeStatus}</Text><Text style={[styles.metaNote, { color: theme.subText }]}>#{String(selectedOrder?.id || '').slice(0, 8).toUpperCase()} · Durum değişikliği ödeme almaz.</Text><ScrollView>{statuses.map(([value, icon, text]) => <TouchableOpacity key={value} disabled={!!busyId} style={[styles.statusOption, { borderBottomColor: theme.border }]} onPress={() => requestStatus(selectedOrder, value)}><Ionicons name={icon} size={23} color={getStatusColor(value)} /><Text style={{ flex: 1, color: theme.text, fontSize: 14 }}>{text}</Text>{selectedOrder?.status === value && <Ionicons name="checkmark" size={20} color="#B18A46" />}</TouchableOpacity>)}</ScrollView>{!!busyId && <ActivityIndicator color="#B18A46" />}<TouchableOpacity disabled={!!busyId} style={{ padding: 17, alignItems: 'center' }} onPress={() => setSelectedOrder(null)}><Text style={{ color: theme.subText }}>{t.cancel}</Text></TouchableOpacity></SafeAreaView></View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    hero: { backgroundColor: '#142239', borderRadius: 25, padding: 23, marginBottom: 18 },
    eyebrow: { color: '#D9BC82', fontSize: 9, letterSpacing: 1.5, fontWeight: '800' },
    heroTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 12 },
    heroText: { color: '#BBC5D2', fontSize: 12, marginTop: 12 },
    search: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, marginBottom: 14 },
    searchInput: { flex: 1, minHeight: 48, fontSize: 12 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 13 },
    errorBox: { padding: 14, backgroundColor: 'rgba(181,77,67,0.08)', borderRadius: 14, marginBottom: 15 },
    metaNote: { fontSize: 11, lineHeight: 18, marginTop: 12 },
    overlay: { flex: 1, backgroundColor: 'rgba(11,19,30,0.65)', justifyContent: 'flex-end' },
    sheet: { padding: 24, maxHeight: '85%', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
    sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#9CA4AF', alignSelf: 'center', marginBottom: 22 },
    statusOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 17, borderBottomWidth: StyleSheet.hairlineWidth },
    container: { 
        flex: 1 
    },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 12,
        borderBottomWidth: 1, 
    },
    iconBtn: { 
        padding: 10, 
        backgroundColor: 'rgba(0,0,0,0.02)', 
        borderRadius: 14 
    },
    title: { 
        fontSize: 18, 
        fontWeight: '700',
        letterSpacing: 0.5
    },
    titleCount: {
        fontSize: 16,
        fontWeight: '500',
        opacity: 0.5
    },
    listContent: {
        padding: 20, 
        paddingBottom: 100
    },
    card: { 
        padding: 18, 
        borderRadius: 20, 
        marginBottom: 16, 
        // Modern, soft gölgelendirme
        elevation: 4, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 6 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)'
    },
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16 
    },
    orderId: { 
        fontWeight: '800', 
        fontSize: 16,
        letterSpacing: 0.5 
    },
    date: { 
        fontSize: 12, 
        marginTop: 4,
        fontWeight: '500'
    },
    deleteIconBtn: { 
        padding: 10, 
        backgroundColor: 'rgba(239, 68, 68, 0.1)', 
        borderRadius: 12 
    },
    userInfo: { 
        marginBottom: 8,
        gap: 8
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userIcon: {
        marginRight: 10,
        opacity: 0.7
    },
    userText: { 
        fontSize: 14,
        fontWeight: '500',
        flex: 1
    },
    divider: { 
        height: 1, 
        marginVertical: 16,
        borderRadius: 1
    },
    productsContainer: {
        gap: 12,
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    productDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#B18A46',
        marginTop: 6,
        marginRight: 10,
        opacity: 0.5
    },
    qrInfoContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginTop: 6, 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 6, 
        alignSelf: 'flex-start' 
    }, 
    qrText: { 
        fontSize: 11,
        marginLeft: 4 
    },
    footer: { 
        flexDirection: 'row', flexWrap: 'wrap', gap: 14,
        justifyContent: 'space-between', alignItems: 'center', marginTop: 20, 
        paddingTop: 16, 
        borderTopWidth: 1 
    },
    totalLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2
    },
    total: { 
        fontSize: 18, 
        fontWeight: '800'
    },
    statusBadge: { 
        paddingHorizontal: 14, 
        paddingVertical: 8, 
        borderRadius: 20, 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8
    },
    statusText: { 
        fontWeight: '700', 
        fontSize: 12 
    },
    emptyContainer: {
        alignItems: 'center', 
        marginTop: '30%',
        paddingHorizontal: 20
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0,0,0,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    emptyText: {
        fontWeight: '600',
        fontSize: 15,
        opacity: 0.8
    }
});

export default ShopAdminOrdersScreen;