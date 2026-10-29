import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
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

const AdminUsersScreen = ({ navigation }) => {
    const { theme, isDarkMode } = useContext(ThemeContext);
    const { country } = useContext(AuthContext);
    
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    // Açılır / Kapanır Buton State'leri
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const [showUserList, setShowUserList] = useState(false);

    // Bildirim State'leri
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');
    const [isSendingNotif, setIsSendingNotif] = useState(false);

    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';

    const TEXTS = {
        TR: {
            title: "Yönetici Paneli",
            searchPlaceholder: "İsim veya e-posta ara...",
            totalUsers: "Toplam Kullanıcı",
            viewProfile: "Profili Gör",
            noUser: "Kullanıcı bulunamadı.",
            admin: "Yönetici",
            error: "Hata",
            fillFields: "Lütfen başlık ve mesaj içeriğini doldurun.",
            warning: "Uyarı",
            noUsers: "Bildirim gönderilecek hiçbir kullanıcı bulunamadı.",
            success: "Başarılı",
            notifSent: "kullanıcıya bildirim gönderildi!",
            notifError: "Bildirim gönderilirken bir sorun oluştu.",
            toggleNotifBtn: "Toplu Bildirim Gönder 📢",
            toggleUsersBtn: "Kullanıcı Listesi 👥",
            notifTitle: "Bildirim Başlığı (Örn: Yeni Özellik!)",
            notifBody: "Bildirim İçeriği (Örn: Pito'ya beklenen güncelleme geldi...)",
            send: "Tek Tuşla Bildirim Gönder"
        },
        AU: {
            title: "Admin Panel",
            searchPlaceholder: "Search name or email...",
            totalUsers: "Total Users",
            viewProfile: "View Profile",
            noUser: "No user found.",
            admin: "Admin",
            error: "Error",
            fillFields: "Please fill in the title and message content.",
            warning: "Warning",
            noUsers: "No users found to send notifications.",
            success: "Success",
            notifSent: "users were notified!",
            notifError: "A problem occurred while sending the notification.",
            toggleNotifBtn: "Send Global Notification 📢",
            toggleUsersBtn: "User List 👥",
            notifTitle: "Notification Title (e.g., New Feature!)",
            notifBody: "Notification Content (e.g., The expected update is here...)",
            send: "Send Push Notification"
        }
    };
    const t = TEXTS[activeLang];

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const fetchAllUsers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setUsers(data || []);
            setFilteredUsers(data || []);
        } catch (error) {
            console.log("User fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearch(text);
        if (text) {
            const newData = users.filter(item => {
                const itemData = item.fullname ? item.fullname.toUpperCase() : ''.toUpperCase();
                const emailData = item.email ? item.email.toUpperCase() : ''.toUpperCase();
                const textData = text.toUpperCase();
                return itemData.indexOf(textData) > -1 || emailData.indexOf(textData) > -1;
            });
            setFilteredUsers(newData);
        } else {
            setFilteredUsers(users);
        }
    };

    const handleUserClick = (selectedUser) => {
        navigation.navigate('UserProfile', {
            userId: selectedUser.id,
            userName: selectedUser.fullname,
            userAvatar: selectedUser.avatar
        });
    };

    const sendGlobalNotification = async () => {
        if (!notifTitle.trim() || !notifBody.trim()) {
            Alert.alert(t.error, t.fillFields);
            return;
        }

        setIsSendingNotif(true);

        try {
            const { data, error } = await supabase
                .from('users')
                .select('expo_push_token')
                .not('expo_push_token', 'is', null);

            if (error) throw error;
            if (!data || data.length === 0) {
                Alert.alert(t.warning, t.noUsers);
                setIsSendingNotif(false);
                return;
            }

            const messages = data.map(user => ({
                to: user.expo_push_token,
                sound: 'default',
                title: notifTitle,
                body: notifBody,
                data: { type: 'global_announcement' },
            }));

            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messages),
            });

            if (response.ok) {
                Alert.alert(t.success, `${data.length} ${t.notifSent}`);
                setNotifTitle('');
                setNotifBody('');
                setShowNotifPanel(false); 
            } else {
                throw new Error("Expo API'ye ulaşılamadı.");
            }
        } catch (error) {
            console.log("Global Bildirim Hatası:", error);
            Alert.alert(t.error, t.notifError);
        } finally {
            setIsSendingNotif(false);
        }
    };

    const renderHeader = () => (
        <View style={{ paddingBottom: 10 }}>
            {/* 1. BİLDİRİM GÖNDERME BUTONU */}
            <TouchableOpacity 
                style={[styles.accordionBtn, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: isDarkMode ? PITO_COLORS.navyLight : PITO_COLORS.primary }]}
                onPress={() => setShowNotifPanel(!showNotifPanel)}
                activeOpacity={0.8}
            >
                <View style={styles.accordionHeaderLeft}>
                    <Ionicons name="megaphone" size={22} color={PITO_COLORS.primary} />
                    <Text style={[styles.accordionBtnText, { color: theme.text }]}>{t.toggleNotifBtn}</Text>
                </View>
                <Ionicons name={showNotifPanel ? "chevron-up" : "chevron-down"} size={22} color={PITO_COLORS.primary} />
            </TouchableOpacity>

            {/* BİLDİRİM PANELİ FORMU */}
            {showNotifPanel && (
                <View style={[styles.notifPanel, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.cardBg, borderColor: isDarkMode ? PITO_COLORS.navyLight : PITO_COLORS.primary }]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.background, color: theme.text, borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border }]}
                        placeholder={t.notifTitle}
                        placeholderTextColor={PITO_COLORS.grayText}
                        value={notifTitle}
                        onChangeText={setNotifTitle}
                        maxLength={50}
                    />
                    
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.background, color: theme.text, borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border }]}
                        placeholder={t.notifBody}
                        placeholderTextColor={PITO_COLORS.grayText}
                        value={notifBody}
                        onChangeText={setNotifBody}
                        multiline
                        numberOfLines={4}
                    />

                    <TouchableOpacity 
                        style={[styles.sendButton, isSendingNotif && { opacity: 0.7 }]} 
                        onPress={sendGlobalNotification}
                        disabled={isSendingNotif}
                    >
                        {isSendingNotif ? (
                            <ActivityIndicator color={PITO_COLORS.navyBg} />
                        ) : (
                            <>
                                <Ionicons name="paper-plane" size={18} color={PITO_COLORS.navyBg} style={{ marginRight: 8 }} />
                                <Text style={styles.sendButtonText}>{t.send}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* 2. TOPLAM KULLANICILAR BUTONU */}
            <TouchableOpacity 
                style={[styles.accordionBtn, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: isDarkMode ? PITO_COLORS.navyLight : PITO_COLORS.primary, marginTop: 15 }]}
                onPress={() => setShowUserList(!showUserList)}
                activeOpacity={0.8}
            >
                <View style={styles.accordionHeaderLeft}>
                    <Ionicons name="people" size={22} color={PITO_COLORS.primary} />
                    <Text style={[styles.accordionBtnText, { color: theme.text }]}>
                        {t.toggleUsersBtn} ({users.length})
                    </Text>
                </View>
                <Ionicons name={showUserList ? "chevron-up" : "chevron-down"} size={22} color={PITO_COLORS.primary} />
            </TouchableOpacity>

            {/* KULLANICI ARAMA VE BİLGİ ALANI */}
            {showUserList && (
                <View style={{ marginTop: 15 }}>
                    <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, borderWidth: 1 }]}>
                        <Ionicons name="search" size={20} color={PITO_COLORS.primary} style={{ marginRight: 10 }} />
                        <TextInput
                            style={[styles.searchInput, { color: theme.text }]}
                            placeholder={t.searchPlaceholder}
                            placeholderTextColor={PITO_COLORS.grayText}
                            value={search}
                            onChangeText={handleSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')}>
                                <Ionicons name="close-circle" size={18} color={PITO_COLORS.grayText} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={{ marginBottom: 15 }}>
                        <Text style={{ color: theme.subText, fontWeight: '600' }}>{t.totalUsers}: {filteredUsers.length}</Text>
                    </View>
                </View>
            )}
        </View>
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity 
            style={[styles.userRow, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border }]} 
            onPress={() => handleUserClick(item)}
            activeOpacity={0.8}
        >
            <View style={styles.userInfo}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={[styles.avatar, { borderColor: PITO_COLORS.primary, borderWidth: 1 }]} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: PITO_COLORS.primary }]}>
                        <Text style={styles.avatarText}>{item.fullname?.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
                
                <View style={{ marginLeft: 15, flex: 1 }}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.fullname}</Text>
                        {item.is_admin && (
                            <View style={[styles.adminBadge, { backgroundColor: isDarkMode ? 'rgba(197, 160, 89, 0.2)' : 'rgba(197, 160, 89, 0.1)' }]}>
                                <Text style={styles.adminText}>{t.admin}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.email, { color: isDarkMode ? PITO_COLORS.grayText : '#888' }]} numberOfLines={1}>{item.email}</Text>
                    <Text style={{fontSize: 10, color: theme.subText, marginTop: 4}}>
                        {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color={PITO_COLORS.primary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.background }]}>
            {/* Premium Header */}
            <View style={[styles.header, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderBottomColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, borderBottomWidth: 1 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: isDarkMode ? PITO_COLORS.navyLight : 'rgba(0,0,0,0.05)' }]}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t.title}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
                    <ActivityIndicator size="large" color={PITO_COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={showUserList ? filteredUsers : []}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        showUserList ? (
                            <View style={{ alignItems: 'center', marginTop: 50 }}>
                                <Ionicons name="people-outline" size={50} color={PITO_COLORS.grayText} style={{marginBottom: 10}} />
                                <Text style={{ color: theme.subText, fontWeight: '600' }}>{t.noUser}</Text>
                            </View>
                        ) : null
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { padding: 8, borderRadius: 12 },
    headerTitle: { fontSize: 20, fontWeight: '800' },
    
    accordionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
    accordionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    accordionBtnText: { fontSize: 16, fontWeight: 'bold', marginLeft: 12 },

    searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 16, marginBottom: 15 },
    searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },

    userRow: { padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: PITO_COLORS.navyBg, fontSize: 20, fontWeight: 'bold' },
    name: { fontSize: 16, fontWeight: '700', flex: 1 },
    email: { fontSize: 13, marginTop: 2, fontWeight: '500' },
    
    adminBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    adminText: { fontSize: 10, color: PITO_COLORS.primary, fontWeight: '800', letterSpacing: 0.5 },

    notifPanel: { padding: 18, borderRadius: 16, borderWidth: 1, marginTop: 10 },
    input: { borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 12, borderWidth: 1, fontSize: 14, fontWeight: '500' },
    textArea: { height: 90, textAlignVertical: 'top' },
    sendButton: { backgroundColor: PITO_COLORS.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
    sendButtonText: { color: PITO_COLORS.navyBg, fontWeight: 'bold', fontSize: 15 }
});

export default AdminUsersScreen;