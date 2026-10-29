import React, { useState, useEffect, useContext, memo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// --- BİLDİRİM PANELİ (KLAVYE KAPANMA SORUNUNU ÇÖZMEK İÇİN İZOLE EDİLDİ) ---
const NotificationPanel = memo(({ theme, t }) => {
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');
    const [isSendingNotif, setIsSendingNotif] = useState(false);

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

            const validTokens = data
                .map(u => u.expo_push_token)
                .filter(token => token && (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken')));

            if (validTokens.length === 0) {
                Alert.alert(t.warning, t.noValidTokens);
                setIsSendingNotif(false);
                return;
            }

            const messages = validTokens.map(token => ({
                to: token,
                sound: 'default',
                title: notifTitle,
                body: notifBody,
                data: { type: 'global_announcement' },
            }));

            let successCount = 0;
            for (let i = 0; i < messages.length; i += 100) {
                const chunk = messages.slice(i, i + 100);
                const response = await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Accept-encoding': 'gzip, deflate',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(chunk),
                });

                if (!response.ok) {
                    throw new Error("Expo API'ye ulaşılamadı.");
                }
                successCount += chunk.length;
            }

            Alert.alert(t.success, `${successCount} ${t.notifSent}`);
            setNotifTitle('');
            setNotifBody('');

        } catch (error) {
            console.log("Global Bildirim Hatası:", error);
            Alert.alert(t.error, t.notifError);
        } finally {
            setIsSendingNotif(false);
        }
    };

    return (
        <View style={[styles.notifPanel, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={styles.notifHeader}>
                <Ionicons name="megaphone-outline" size={22} color={COLORS.primary} />
                <Text style={[styles.notifHeaderTitle, { color: theme.text }]}>{t.sendGlobal}</Text>
            </View>

            <TextInput
                style={[styles.input, { backgroundColor: theme.type === 'dark' ? '#1A2533' : '#F8F9FA', color: theme.text }]}
                placeholder={t.notifTitle}
                placeholderTextColor={theme.subText}
                value={notifTitle}
                onChangeText={setNotifTitle}
                maxLength={50}
            />
            
            <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.type === 'dark' ? '#1A2533' : '#F8F9FA', color: theme.text }]}
                placeholder={t.notifBody}
                placeholderTextColor={theme.subText}
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
                    <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                    <Text style={styles.sendButtonText}>{t.send}</Text>
                )}
            </TouchableOpacity>
        </View>
    );
});

// --- LİSTE BAŞLIĞI (BİLDİRİMLER VE AKORDEONLAR BURADA YER ALIR) ---
const ListHeader = memo(({ activeSection, toggleSection, search, handleSearch, theme, t, usersCount, listingsCount }) => {
    return (
        <View style={{ paddingBottom: 15 }}>
            <NotificationPanel theme={theme} t={t} />

            <View style={{ marginTop: 10 }}>
                <TouchableOpacity 
                    style={[styles.accordionBtn, { backgroundColor: activeSection === 'users' ? COLORS.primary : theme.cardBg, borderColor: theme.border }]} 
                    onPress={() => toggleSection('users')}
                    activeOpacity={0.8}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="people-outline" size={20} color={activeSection === 'users' ? '#FFF' : theme.text} />
                        <Text style={[styles.accordionText, { color: activeSection === 'users' ? '#FFF' : theme.text }]}>{t.usersTab}</Text>
                    </View>
                    <Ionicons name={activeSection === 'users' ? "chevron-up" : "chevron-down"} size={20} color={activeSection === 'users' ? '#FFF' : theme.subText} />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.accordionBtn, { backgroundColor: activeSection === 'listings' ? COLORS.primary : theme.cardBg, borderColor: theme.border }]} 
                    onPress={() => toggleSection('listings')}
                    activeOpacity={0.8}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="list-outline" size={20} color={activeSection === 'listings' ? '#FFF' : theme.text} />
                        <Text style={[styles.accordionText, { color: activeSection === 'listings' ? '#FFF' : theme.text }]}>{t.listingsTab}</Text>
                    </View>
                    <Ionicons name={activeSection === 'listings' ? "chevron-up" : "chevron-down"} size={20} color={activeSection === 'listings' ? '#FFF' : theme.subText} />
                </TouchableOpacity>
            </View>

            {activeSection && (
                <View style={{ marginTop: 20 }}>
                    <View style={[styles.searchContainer, { backgroundColor: theme.type === 'dark' ? '#1A2533' : '#F8F9FA', borderColor: theme.border }]}>
                        <Ionicons name="search-outline" size={20} color={theme.subText} style={{ marginRight: 10 }} />
                        <TextInput
                            style={[styles.searchInput, { color: theme.text }]}
                            placeholder={activeSection === 'users' ? t.searchUsers : t.searchListings}
                            placeholderTextColor={theme.subText}
                            value={search}
                            onChangeText={handleSearch}
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')} style={{ padding: 5 }}>
                                <Ionicons name="close-circle" size={18} color={theme.subText} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={{ color: theme.subText, fontSize: 13, marginTop: 10, marginLeft: 5 }}>
                        {activeSection === 'users' ? t.totalUsers : t.totalListings}: <Text style={{fontWeight: 'bold', color: theme.text}}>{activeSection === 'users' ? usersCount : listingsCount}</Text>
                    </Text>
                </View>
            )}
        </View>
    );
});

// --- ANA EKRAN BİLEŞENİ ---
const AdminUsersScreen = ({ navigation }) => {
    const { theme } = useContext(ThemeContext);
    const { country } = useContext(AuthContext);
    
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [listings, setListings] = useState([]);
    const [filteredListings, setFilteredListings] = useState([]);
    
    const [activeSection, setActiveSection] = useState(null); 
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';

    const TEXTS = {
        TR: {
            title: "Yönetici Paneli",
            usersTab: "Kullanıcıları Göster",
            listingsTab: "İlanları Göster",
            searchUsers: "İsim veya e-posta ara...",
            searchListings: "İlan adı veya türü ara...",
            totalUsers: "Toplam Kullanıcı",
            totalListings: "Toplam İlan",
            noUser: "Kullanıcı bulunamadı.",
            noListing: "İlan bulunamadı.",
            admin: "Yönetici",
            error: "Hata",
            fillFields: "Lütfen başlık ve mesaj içeriğini doldurun.",
            warning: "Uyarı",
            noUsers: "Bildirim gönderilecek hiçbir kullanıcı bulunamadı.",
            noValidTokens: "Geçerli bildirim izni (token) olan kullanıcı bulunamadı.",
            success: "Başarılı",
            notifSent: "kullanıcıya bildirim gönderildi!",
            notifError: "Bildirim gönderilirken bir sorun oluştu.",
            sendGlobal: "Herkese Bildirim Gönder",
            notifTitle: "Bildirim Başlığı (Örn: Yeni Özellik!)",
            notifBody: "Bildirim İçeriği (Örn: Pito'ya beklenen güncelleme geldi...)",
            send: "Gönder"
        },
        AU: {
            title: "Admin Panel",
            usersTab: "Show Users",
            listingsTab: "Show Listings",
            searchUsers: "Search name or email...",
            searchListings: "Search ad name or type...",
            totalUsers: "Total Users",
            totalListings: "Total Listings",
            noUser: "No user found.",
            noListing: "No listing found.",
            admin: "Admin",
            error: "Error",
            fillFields: "Please fill in the title and message content.",
            warning: "Warning",
            noUsers: "No users found to send notifications.",
            noValidTokens: "No users found with a valid push token.",
            success: "Success",
            notifSent: "users were notified!",
            notifError: "A problem occurred while sending the notification.",
            sendGlobal: "Send Global Notification",
            notifTitle: "Notification Title (e.g., New Feature!)",
            notifBody: "Notification Content (e.g., The expected update is here...)",
            send: "Send"
        }
    };
    const t = TEXTS[activeLang];

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (usersError) throw usersError;
            setUsers(usersData || []);
            setFilteredUsers(usersData || []);

            const { data: listingsData, error: listingsError } = await supabase
                .from('listings')
                .select('*')
                .order('created_at', { ascending: false });

            if (listingsError) throw listingsError;
            setListings(listingsData || []);
            setFilteredListings(listingsData || []);

        } catch (error) {
            console.log("Data fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearch(text);
        if (!text) {
            setFilteredUsers(users);
            setFilteredListings(listings);
            return;
        }

        const textData = text.toUpperCase();

        if (activeSection === 'users') {
            const newData = users.filter(item => {
                const name = item.fullname ? item.fullname.toUpperCase() : '';
                const email = item.email ? item.email.toUpperCase() : '';
                return name.indexOf(textData) > -1 || email.indexOf(textData) > -1;
            });
            setFilteredUsers(newData);
        } else if (activeSection === 'listings') {
            const newData = listings.filter(item => {
                const name = item.name ? item.name.toUpperCase() : (item.title ? item.title.toUpperCase() : '');
                const category = item.category ? item.category.toUpperCase() : '';
                return name.indexOf(textData) > -1 || category.indexOf(textData) > -1;
            });
            setFilteredListings(newData);
        }
    };

    const toggleSection = (section) => {
        if (activeSection === section) {
            setActiveSection(null);
            setSearch('');
            setFilteredUsers(users);
            setFilteredListings(listings);
        } else {
            setActiveSection(section);
            setSearch('');
            setFilteredUsers(users);
            setFilteredListings(listings);
        }
    };

    const renderUserItem = ({ item }) => (
        <TouchableOpacity 
            style={[styles.rowItem, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]} 
            onPress={() => navigation.navigate('UserProfile', { userId: item.id, userName: item.fullname, userAvatar: item.avatar })}
            activeOpacity={0.7}
        >
            <View style={styles.rowInfo}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: '#E2E8F0' }]}>
                        <Text style={[styles.avatarText, { color: '#64748B' }]}>{item.fullname?.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
                
                <View style={{ marginLeft: 15, flex: 1 }}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.fullname}</Text>
                        {item.is_admin && (
                            <View style={styles.adminBadge}>
                                <Text style={styles.adminText}>{t.admin}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.subText, { color: theme.subText }]} numberOfLines={1}>{item.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.subText} />
            </View>
        </TouchableOpacity>
    );

    const renderListingItem = ({ item }) => {
        const imageSource = item.img || (item.images && item.images[0]);
        return (
            <TouchableOpacity 
                style={[styles.rowItem, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]} 
                onPress={() => navigation.navigate('ListingDetail', { item })}
                activeOpacity={0.7}
            >
                <View style={styles.rowInfo}>
                    {imageSource ? (
                        <Image source={{ uri: imageSource }} style={styles.listingImage} />
                    ) : (
                        <View style={[styles.listingImage, { backgroundColor: theme.type === 'dark' ? '#1A2533' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }]}>
                            <Ionicons name="paw" size={20} color={theme.subText} />
                        </View>
                    )}
                    
                    <View style={{ marginLeft: 15, flex: 1 }}>
                        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.name || item.title}</Text>
                        <Text style={[styles.subText, { color: theme.subText }]} numberOfLines={1}>{item.category}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.subText} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={22} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t.title}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={activeSection === 'users' ? filteredUsers : (activeSection === 'listings' ? filteredListings : [])}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={activeSection === 'users' ? renderUserItem : renderListingItem}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={
                        <ListHeader 
                            activeSection={activeSection}
                            toggleSection={toggleSection}
                            search={search}
                            handleSearch={handleSearch}
                            theme={theme}
                            t={t}
                            usersCount={filteredUsers.length}
                            listingsCount={filteredListings.length}
                        />
                    }
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 15 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        activeSection ? (
                            <View style={styles.centerContainer}>
                                <Ionicons name="document-text-outline" size={40} color={theme.border} />
                                <Text style={{ color: theme.subText, marginTop: 10 }}>{activeSection === 'users' ? t.noUser : t.noListing}</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
    backBtn: { padding: 8, borderRadius: 10 },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    centerContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    
    notifPanel: { padding: 20, borderRadius: 16, borderWidth: 1, elevation: 0 },
    notifHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    notifHeaderTitle: { fontSize: 15, fontWeight: '600', marginLeft: 8 },
    input: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 12, fontSize: 14 },
    textArea: { height: 100, textAlignVertical: 'top', paddingTop: 14 },
    sendButton: { backgroundColor: COLORS.primary, alignItems: 'center', paddingVertical: 14, borderRadius: 10, marginTop: 5 },
    sendButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

    accordionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
    accordionText: { fontSize: 15, fontWeight: '600', marginLeft: 10 },
    
    searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
    searchInput: { flex: 1, fontSize: 14, paddingVertical: 4 },

    rowItem: { paddingVertical: 16, borderBottomWidth: 1 },
    rowInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, fontWeight: '600' },
    listingImage: { width: 48, height: 48, borderRadius: 8 },
    name: { fontSize: 15, fontWeight: '600', flex: 1 },
    subText: { fontSize: 13, marginTop: 3 },
    
    adminBadge: { marginLeft: 8, backgroundColor: 'rgba(197, 160, 89, 0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    adminText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' }
});

export default AdminUsersScreen;