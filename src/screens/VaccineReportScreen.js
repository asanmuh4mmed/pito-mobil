import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput, Alert, Platform, FlatList, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { Swipeable } from 'react-native-gesture-handler'; 

import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

// --- PITO YENİ RENK PALETİ ---
const PITO_COLORS = {
    primary: '#C5A059', 
    primaryDark: '#B08D4B', 
    navyBg: '#0B131E', 
    navySurface: '#1A2533', 
    navyLight: '#243447',
    cream: '#F5F5DC',
    white: '#FFFFFF',
    grayText: '#A0AAB5',
    error: '#FF4757',
    success: '#00B894'
};

// 1. MODAL BİLEŞENİ İZOLE EDİLDİ (Yazı yazarken ana ekranın re-render olmasını engeller)
const AddVaccineModal = ({ visible, onClose, onSave, isDarkMode, theme, t }) => {
    const [vacName, setVacName] = useState('');
    const [vacDate, setVacDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (visible) {
            setVacName('');
            setVacDate(new Date());
        }
    }, [visible]);

    const handleSave = () => {
        if (!vacName.trim()) return;
        onSave(vacName, vacDate);
    };

    const formatDate = (date) => {
        return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    };

    return (
        <Modal 
            visible={visible} 
            transparent={true} 
            animationType="fade"
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <View style={[styles.modalContent, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : 'white' }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{t.modalTitle}</Text>
                        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDarkMode ? PITO_COLORS.navyLight : '#F5F5F5' }]}>
                            <Ionicons name="close" size={20} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.label, { color: theme.text }]}>{t.labelName}</Text>
                    <TextInput 
                        style={[styles.input, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : '#F9FAFB', borderColor: isDarkMode ? PITO_COLORS.navyLight : '#EEE', color: theme.text }]}
                        placeholder={t.phName}
                        placeholderTextColor={PITO_COLORS.grayText}
                        value={vacName}
                        onChangeText={setVacName}
                    />

                    <Text style={[styles.label, {marginTop: 20, color: theme.text }]}>{t.labelDate}</Text>
                    <TouchableOpacity 
                        style={[styles.dateBtn, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : '#F9FAFB', borderColor: isDarkMode ? PITO_COLORS.navyLight : '#EEE' }]} 
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={{ color: theme.text, fontSize: 16 }}>{formatDate(vacDate)}</Text>
                        <Ionicons name="calendar-outline" size={20} color={PITO_COLORS.primary} />
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={vacDate}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(Platform.OS === 'ios');
                                if (selectedDate) setVacDate(selectedDate);
                            }}
                            minimumDate={new Date(2020, 0, 1)}
                        />
                    )}

                    <TouchableOpacity style={[styles.saveBtn, { backgroundColor: PITO_COLORS.primary, shadowColor: PITO_COLORS.primary }]} onPress={handleSave}>
                        <Text style={[styles.saveBtnText, { color: PITO_COLORS.navyBg }]}>{t.btnSave}</Text>
                        <Ionicons name="checkmark-circle" size={20} color={PITO_COLORS.navyBg} style={{marginLeft: 8}} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const VaccineReportScreen = ({ navigation }) => {
    const { user, country } = useContext(AuthContext);
    const { theme, isDarkMode } = useContext(ThemeContext);

    const activeLang = country?.code || 'TR';

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

    const [vaccines, setVaccines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    // 2. USER ID SABİTLENDİ (Sonsuz istek ve re-render döngüsünü çözer)
    useEffect(() => {
        if (user?.id) {
            loadVaccines();
        }
        requestNotificationPermission();
    }, [user?.id]);

    const requestNotificationPermission = async () => {
        await Notifications.requestPermissionsAsync();
    };

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

    const handleAddVaccine = async (vacName, vacDate) => {
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

            setModalVisible(false);

        } catch (e) {
            console.log("Aşı ekleme hatası:", e.message);
            Alert.alert("Hata", "Aşı eklenemedi.");
        }
    };

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

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
    };

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
                <View style={[styles.deleteIconContainer, { backgroundColor: PITO_COLORS.error }]}>
                    <Ionicons name="trash-outline" size={24} color={PITO_COLORS.white} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : '#F4F5F9' }]}>
            
            <View style={[styles.header, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderBottomWidth: 1, borderBottomColor: isDarkMode ? PITO_COLORS.navyLight : '#EBEBEB' }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { backgroundColor: isDarkMode ? PITO_COLORS.navyLight : '#F0F0F0' }]}>
                    <Ionicons name="chevron-back" size={24} color={PITO_COLORS.primary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t.headerTitle}</Text>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.addBtn, { backgroundColor: PITO_COLORS.primary }]}>
                    <Ionicons name="add" size={28} color={PITO_COLORS.navyBg} />
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1, paddingHorizontal: 20 }}>
                
                {/* SABİT PROFiL KARTI */}
                <View style={{ marginTop: 20, marginBottom: 15 }}>
                    <View style={[styles.petCard, { backgroundColor: PITO_COLORS.primary, shadowColor: PITO_COLORS.primary }]}>
                        <View style={styles.petCardContent}>
                            <View style={[styles.avatarBorder, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                <Image 
                                    source={{ uri: user?.avatar || 'https://placekitten.com/200/200' }} 
                                    style={styles.petAvatar} 
                                />
                            </View>
                            <View style={{flex: 1}}>
                                <Text style={[styles.petName, { color: PITO_COLORS.navyBg }]}>{user?.fullname || 'User'}{t.petNameSuffix}</Text>
                                <Text style={[styles.petDetail, { color: 'rgba(11, 19, 30, 0.8)' }]}>{t.subHeader}</Text>
                                <View style={[styles.idBadge, { backgroundColor: 'rgba(11, 19, 30, 0.15)' }]}>
                                    <Ionicons name="paw" size={12} color={PITO_COLORS.navyBg} style={{marginRight:4}} />
                                    <Text style={[styles.idText, { color: PITO_COLORS.navyBg }]}>Pito ID: {user?.id ? user.id.toString().slice(0,6).toUpperCase() : '---'}</Text>
                                </View>
                            </View>
                            <Ionicons name="medical" size={40} color="rgba(11, 19, 30, 0.15)" />
                        </View>
                    </View>
                    
                    <View style={{flexDirection:'row', alignItems:'center', marginTop: 15}}>
                        <Ionicons name="calendar" size={18} color={PITO_COLORS.primary} style={{marginRight: 6}} />
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.listTitle}</Text>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={PITO_COLORS.primary} style={{marginTop: 50}} />
                ) : (
                    <FlatList 
                        data={vaccines}
                        keyExtractor={(item) => String(item.id)}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        removeClippedSubviews={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIconBox, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : 'white' }]}>
                                    <Ionicons name="shield-checkmark-outline" size={50} color={PITO_COLORS.primary} />
                                </View>
                                <Text style={[styles.emptyText, { color: theme.text }]}>{t.empty}</Text>
                                <Text style={[styles.emptySubText, { color: theme.subText }]}>{t.emptySub}</Text>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                                <TouchableOpacity 
                                    style={[styles.vaccineItem, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : 'white' }]}
                                    onPress={() => handleItemPress(item)}
                                    activeOpacity={0.9}
                                >
                                    <View style={[styles.statusLine, { backgroundColor: item.status === 'done' ? PITO_COLORS.success : PITO_COLORS.primaryDark }]} />
                                    
                                    <View style={styles.vacContent}>
                                        <View style={{flex:1}}>
                                            <Text style={[styles.vacName, { color: theme.text }]}>{item.name}</Text>
                                            <View style={{flexDirection:'row', alignItems:'center', marginTop: 4}}>
                                                <Ionicons name="time-outline" size={14} color={theme.subText} style={{marginRight: 4}} />
                                                <Text style={[styles.vacDate, { color: theme.subText }]}>{formatDate(item.date)}</Text>
                                            </View>
                                        </View>
                                        
                                        <View style={[styles.statusChip, { 
                                            backgroundColor: item.status === 'done' ? 'rgba(0, 184, 148, 0.15)' : 'rgba(197, 160, 89, 0.15)',
                                            borderColor: item.status === 'done' ? PITO_COLORS.success : PITO_COLORS.primary
                                        }]}>
                                            <Text style={[styles.statusText, { 
                                                color: item.status === 'done' ? PITO_COLORS.success : PITO_COLORS.primary 
                                            }]}>
                                                {item.status === 'done' ? t.done : t.upcoming}
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </Swipeable>
                        )}
                    />
                )}
            </View>

            {/* AŞI EKLEME MODALI */}
            <AddVaccineModal 
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSave={handleAddVaccine}
                isDarkMode={isDarkMode}
                theme={theme}
                t={t}
            />

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    iconBtn: { padding: 8, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    addBtn: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowOffset:{width:0, height:4}, shadowOpacity:0.3 },

    petCard: { 
        borderRadius: 24, 
        padding: 20, 
        elevation: 8, 
        shadowOffset:{width:0, height:8}, shadowOpacity:0.3, shadowRadius: 10,
        overflow: 'hidden'
    },
    petCardContent: { flexDirection: 'row', alignItems: 'center' },
    avatarBorder: { padding: 3, borderRadius: 40, marginRight: 15 },
    petAvatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: 'white' },
    petName: { fontSize: 20, fontWeight: 'bold' },
    petDetail: { fontSize: 13, marginTop: 2 },
    idBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8, alignSelf: 'flex-start' },
    idText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },

    sectionTitle: { fontSize: 18, fontWeight: 'bold' },

    vaccineItem: { 
        flexDirection: 'row', 
        borderRadius: 16, 
        marginBottom: 12, 
        elevation: 3, 
        shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 5,
        overflow: 'hidden'
    },
    statusLine: { width: 6, height: '100%' },
    vacContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 15 },
    vacName: { fontSize: 16, fontWeight: '700' },
    vacDate: { fontSize: 13, fontWeight: '500' },
    
    statusChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

    deleteAction: { width: 80, marginBottom: 12, justifyContent: 'center', alignItems: 'center' },
    deleteIconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 2 },

    emptyState: { alignItems: 'center', marginTop: 40, minHeight: 200 },
    emptyIconBox: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 2 },
    emptyText: { fontSize: 18, fontWeight: 'bold' },
    emptySubText: { fontSize: 14, marginTop: 5, textAlign: 'center', paddingHorizontal: 40 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 19, 30, 0.7)', justifyContent: 'center', padding: 25 },
    modalContent: { borderRadius: 24, padding: 25, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    closeBtn: { padding: 5, borderRadius: 15 },
    label: { fontWeight: '700', marginBottom: 8, fontSize: 14 },
    input: { padding: 15, borderRadius: 12, borderWidth: 1, fontSize: 16 },
    dateBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1 },
    saveBtn: { flexDirection: 'row', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 30, elevation: 5, shadowOffset:{width:0, height:4}, shadowOpacity:0.3 },
    saveBtnText: { fontWeight: 'bold', fontSize: 16 }
});

export default VaccineReportScreen;