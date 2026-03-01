import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput, Alert, Platform, FlatList, ActivityIndicator, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler'; 

import { COLORS } from '../constants/colors';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// --- ANİMASYONLU LİSTE ELEMANI ---
const AnimatedItem = ({ children, index }) => {
    const slideAnim = useRef(new Animated.Value(50)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                delay: index * 100, // Sırayla gelmesi için gecikme
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                delay: index * 100,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {children}
        </Animated.View>
    );
};

const VaccineReportScreen = ({ navigation }) => {
    const { theme } = useContext(ThemeContext);
    const { user, country } = useContext(AuthContext);

    const activeLang = country?.code || 'TR';

    // --- DİL PAKETİ ---
    const TEXTS = {
        TR: {
            headerTitle: "Aşı Karnesi",
            petNameSuffix: "'in Dostu",
            subHeader: "Sağlık Kimliği & Takip",
            listTitle: "Aşı Takvimi",
            empty: "Henüz aşı kaydı bulunmuyor.",
            emptySub: "Yeni bir aşı eklemek için (+) butonuna dokunun.",
            modalTitle: "Yeni Aşı Oluştur",
            labelName: "Aşı Adı",
            labelDate: "Uygulama Tarihi",
            phName: "Örn: Kuduz, Karma 1...",
            btnSave: "Kaydet",
            btnDelete: "Sil",
            done: "Tamamlandı",
            upcoming: "Planlandı",
            past: "Geçmiş",
            alertDone: "tarihinde yapıldı. ✅",
            alertUpcoming: "tarihinde yapılması planlanıyor. ⏳",
            alertTitle: "Aşı Detayı",
            alertDeleteTitle: "Kaydı Sil",
            alertDeleteMsg: "Bu aşı kaydını silmek istediğinize emin misiniz?",
            cancel: "Vazgeç",
            ok: "Tamam"
        },
        AU: {
            headerTitle: "Vaccine Card",
            petNameSuffix: "'s Buddy",
            subHeader: "Health ID & Tracking",
            listTitle: "Vaccine Schedule",
            empty: "No vaccine records found.",
            emptySub: "Tap the (+) button to add a new record.",
            modalTitle: "Create New Vaccine",
            labelName: "Vaccine Name",
            labelDate: "Date Administered",
            phName: "E.g. Rabies, Core...",
            btnSave: "Save",
            btnDelete: "Delete",
            done: "Completed",
            upcoming: "Scheduled",
            past: "Past",
            alertDone: "was administered on",
            alertUpcoming: "is scheduled for",
            alertTitle: "Vaccine Details",
            alertDeleteTitle: "Delete Record",
            alertDeleteMsg: "Are you sure you want to delete this record?",
            cancel: "Cancel",
            ok: "OK"
        }
    };

    const t = TEXTS[activeLang];

    // --- STATE'LER ---
    const [vaccines, setVaccines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    
    const [vacName, setVacName] = useState('');
    const [vacDate, setVacDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Animasyonlar
    const headerAnim = useRef(new Animated.Value(-100)).current;

    // --- 1. YÜKLEME ---
    useEffect(() => {
        if (user) {
            loadVaccines();
        }
        requestNotificationPermission();
        
        // Header Animasyonu Başlat
        Animated.spring(headerAnim, {
            toValue: 0,
            friction: 5,
            tension: 40,
            useNativeDriver: true
        }).start();

    }, [user]);

    const requestNotificationPermission = async () => {
        const { status } = await Notifications.requestPermissionsAsync();
    };

    // ✅ VERİTABANINDAN ÇEKME
    const loadVaccines = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('vaccines')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: true });

            if (error) throw error;
            setVaccines(data || []);
        } catch (e) {
            console.log("Aşı yükleme hatası:", e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- 2. BİLDİRİM ---
    const scheduleNotification = async (name, date) => {
        const trigger = new Date(date);
        trigger.setHours(9, 0, 0); 
        if (trigger < new Date()) return;

        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: activeLang === 'TR' ? "💉 Aşı Zamanı!" : "💉 Vaccine Time!",
                    body: `${name}`,
                    sound: true,
                },
                trigger: trigger, 
            });
        } catch (e) { console.log(e); }
    };

    // --- 3. EKLEME (DB) ---
    const handleAddVaccine = async () => {
        if (!vacName) return;

        const newStatus = vacDate < new Date() ? 'done' : 'upcoming';

        try {
            const { data, error } = await supabase
                .from('vaccines')
                .insert([{
                    user_id: user.id,
                    name: vacName,
                    date: vacDate.toISOString(),
                    status: newStatus
                }])
                .select()
                .single();

            if (error) throw error;

            setVaccines(prev => [...prev, data].sort((a, b) => new Date(a.date) - new Date(b.date)));

            if (newStatus === 'upcoming') {
                await scheduleNotification(vacName, vacDate);
            }

            setVacName('');
            setVacDate(new Date());
            setModalVisible(false);

        } catch (e) {
            console.log("Aşı ekleme hatası:", e.message);
            Alert.alert("Hata", "Aşı eklenemedi.");
        }
    };

    // --- 4. SİLME (DB) ---
    const deleteVaccine = async (id) => {
        try {
            const { error } = await supabase
                .from('vaccines')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setVaccines(prev => prev.filter(v => v.id !== id));
        } catch (e) {
            console.log("Aşı silme hatası:", e.message);
            Alert.alert("Hata", "Silinemedi.");
        }
    };

    // --- 5. TIKLAMA DETAYI ---
    const handleItemPress = (item) => {
        const dateStr = formatDate(item.date);
        let msg = "";
        
        if (activeLang === 'TR') {
            msg = item.status === 'done' 
                ? `${item.name} aşısı ${dateStr} ${t.alertDone}` 
                : `${item.name} aşısı ${dateStr} ${t.alertUpcoming}`;
        } else {
            msg = item.status === 'done' 
                ? `${item.name} vaccine ${t.alertDone} ${dateStr}. ✅` 
                : `${item.name} vaccine ${t.alertUpcoming} ${dateStr}. ⏳`;
        }

        Alert.alert(t.alertTitle, msg, [{ text: t.ok }]);
    };

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || vacDate;
        setShowDatePicker(Platform.OS === 'ios');
        setVacDate(currentDate);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    };

    // --- SWIPE ACTION (SİLME BUTONU) ---
    const renderRightActions = (id) => {
        return (
            <TouchableOpacity 
                style={styles.deleteAction} 
                onPress={() => {
                    Alert.alert(t.alertDeleteTitle, t.alertDeleteMsg, [
                        { text: t.cancel, style: "cancel" },
                        { text: t.btnDelete, style: "destructive", onPress: () => deleteVaccine(id) }
                    ]);
                }}
            >
                <View style={styles.deleteIconContainer}>
                    <Ionicons name="trash-outline" size={24} color="white" />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={[styles.container, { backgroundColor: '#F4F9FA' }]}>
                
                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                        <Ionicons name="chevron-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t.headerTitle}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn}>
                        <Ionicons name="add" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                {/* İÇERİK */}
                <View style={{ flex: 1, paddingHorizontal: 20 }}>
                    
                    {loading ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
                    ) : (
                        <FlatList 
                            data={vaccines}
                            keyExtractor={(item) => item.id.toString()}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 100 }}
                            ListHeaderComponent={
                                <Animated.View style={{ transform: [{ translateY: headerAnim }], marginBottom: 20 }}>
                                    {/* PET KİMLİK KARTI */}
                                    <View style={styles.petCard}>
                                        <View style={styles.petCardContent}>
                                            <View style={styles.avatarBorder}>
                                                <Image 
                                                    source={{ uri: user?.avatar || 'https://placekitten.com/200/200' }} 
                                                    style={styles.petAvatar} 
                                                />
                                            </View>
                                            <View style={{flex: 1}}>
                                                <Text style={styles.petName}>{user?.fullname || 'User'}{t.petNameSuffix}</Text>
                                                <Text style={styles.petDetail}>{t.subHeader}</Text>
                                                <View style={styles.idBadge}>
                                                    <Ionicons name="paw" size={12} color="white" style={{marginRight:4}} />
                                                    <Text style={styles.idText}>Pito ID: {user?.id.toString().slice(0,6).toUpperCase()}</Text>
                                                </View>
                                            </View>
                                            <Ionicons name="medical" size={40} color="rgba(255,255,255,0.2)" />
                                        </View>
                                    </View>
                                    
                                    <View style={{flexDirection:'row', alignItems:'center', marginTop: 10, marginBottom: 5}}>
                                        <Ionicons name="calendar" size={18} color="#00838F" style={{marginRight: 6}} />
                                        <Text style={styles.sectionTitle}>{t.listTitle}</Text>
                                    </View>
                                </Animated.View>
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <View style={styles.emptyIconBox}>
                                        <Ionicons name="shield-checkmark-outline" size={50} color="#00ACC1" />
                                    </View>
                                    <Text style={styles.emptyText}>{t.empty}</Text>
                                    <Text style={styles.emptySubText}>{t.emptySub}</Text>
                                </View>
                            }
                            renderItem={({ item, index }) => (
                                <AnimatedItem index={index}>
                                    <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                                        <TouchableOpacity 
                                            style={styles.vaccineItem}
                                            onPress={() => handleItemPress(item)}
                                            activeOpacity={0.9}
                                        >
                                            {/* Sol Çizgi (Status Indicator) */}
                                            <View style={[styles.statusLine, { backgroundColor: item.status === 'done' ? '#4CAF50' : '#FF9800' }]} />
                                            
                                            <View style={styles.vacContent}>
                                                <View style={{flex:1}}>
                                                    <Text style={styles.vacName}>{item.name}</Text>
                                                    <View style={{flexDirection:'row', alignItems:'center', marginTop: 4}}>
                                                        <Ionicons name="time-outline" size={14} color="#888" style={{marginRight: 4}} />
                                                        <Text style={styles.vacDate}>{formatDate(item.date)}</Text>
                                                    </View>
                                                </View>
                                                
                                                <View style={[styles.statusChip, { 
                                                    backgroundColor: item.status === 'done' ? '#E8F5E9' : '#FFF3E0',
                                                    borderColor: item.status === 'done' ? '#C8E6C9' : '#FFE0B2'
                                                }]}>
                                                    <Text style={[styles.statusText, { 
                                                        color: item.status === 'done' ? '#2E7D32' : '#EF6C00' 
                                                    }]}>
                                                        {item.status === 'done' ? t.done : t.upcoming}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    </Swipeable>
                                </AnimatedItem>
                            )}
                        />
                    )}
                </View>

                {/* --- EKLEME MODALI --- */}
                <Modal visible={modalVisible} transparent={true} animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t.modalTitle}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                    <Ionicons name="close" size={20} color="#555" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>{t.labelName}</Text>
                            <TextInput 
                                style={styles.input}
                                placeholder={t.phName}
                                placeholderTextColor="#999"
                                value={vacName}
                                onChangeText={setVacName}
                            />

                            <Text style={[styles.label, {marginTop: 20}]}>{t.labelDate}</Text>
                            <TouchableOpacity 
                                style={styles.dateBtn} 
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={{ color: '#333', fontSize: 16 }}>{formatDate(vacDate)}</Text>
                                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={vacDate}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                    minimumDate={new Date(2020, 0, 1)}
                                />
                            )}

                            <TouchableOpacity style={styles.saveBtn} onPress={handleAddVaccine}>
                                <Text style={styles.saveBtnText}>{t.btnSave}</Text>
                                <Ionicons name="checkmark-circle" size={20} color="white" style={{marginLeft: 8}} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#006064' },
    iconBtn: { padding: 8, backgroundColor: 'white', borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    addBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: COLORS.primary, shadowOffset:{width:0, height:4}, shadowOpacity:0.3 },

    // PET CARD (ID CARD STYLE)
    petCard: { 
        backgroundColor: COLORS.primary, 
        borderRadius: 24, 
        padding: 20, 
        marginBottom: 10, 
        elevation: 8, 
        shadowColor: COLORS.primary, shadowOffset:{width:0, height:8}, shadowOpacity:0.3, shadowRadius: 10,
        overflow: 'hidden'
    },
    petCardContent: { flexDirection: 'row', alignItems: 'center' },
    avatarBorder: { padding: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 40, marginRight: 15 },
    petAvatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: 'white' },
    petName: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    petDetail: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
    idBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8, alignSelf: 'flex-start' },
    idText: { color: 'white', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#006064' },

    // LIST ITEMS (FLOATING CARDS)
    vaccineItem: { 
        flexDirection: 'row', 
        backgroundColor: 'white', 
        borderRadius: 16, 
        marginBottom: 12, 
        elevation: 3, 
        shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 5,
        overflow: 'hidden'
    },
    statusLine: { width: 6, height: '100%' },
    vacContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 15 },
    vacName: { fontSize: 16, fontWeight: '700', color: '#333' },
    vacDate: { color: '#666', fontSize: 13, fontWeight: '500' },
    
    statusChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

    // SWIPE ACTIONS
    deleteAction: { width: 80, marginBottom: 12, justifyContent: 'center', alignItems: 'center' },
    deleteIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FF5252', justifyContent: 'center', alignItems: 'center', elevation: 2 },

    // EMPTY STATE
    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyIconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E0F7FA', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyText: { color: '#006064', fontSize: 18, fontWeight: 'bold' },
    emptySubText: { color: '#78909C', fontSize: 14, marginTop: 5, textAlign: 'center', paddingHorizontal: 40 },

    // MODAL
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
    modalContent: { backgroundColor: 'white', borderRadius: 24, padding: 25, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    closeBtn: { padding: 5, backgroundColor: '#F5F5F5', borderRadius: 15 },
    label: { fontWeight: '700', marginBottom: 8, color: '#006064', fontSize: 14 },
    input: { padding: 15, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#EEE', fontSize: 16, color: '#333' },
    dateBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#EEE' },
    saveBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 30, elevation: 5, shadowColor: COLORS.primary, shadowOffset:{width:0, height:4}, shadowOpacity:0.3 },
    saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default VaccineReportScreen;