import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const AdminUsersScreen = ({ navigation }) => {
    const { theme } = useContext(ThemeContext);
    const { country } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';

    const TEXTS = {
        TR: {
            title: "Kullanıcı Listesi",
            searchPlaceholder: "İsim veya e-posta ara...",
            totalUsers: "Toplam Kullanıcı",
            viewProfile: "Profili Gör",
            noUser: "Kullanıcı bulunamadı.",
            admin: "Yönetici"
        },
        AU: {
            title: "User List",
            searchPlaceholder: "Search name or email...",
            totalUsers: "Total Users",
            viewProfile: "View Profile",
            noUser: "No user found.",
            admin: "Admin"
        }
    };
    const t = TEXTS[activeLang];

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const fetchAllUsers = async () => {
        try {
            setLoading(true);
            // Tüm kullanıcıları çek (En son kayıt olan en üstte)
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

    const renderItem = ({ item }) => (
        <TouchableOpacity 
            style={[styles.userRow, { backgroundColor: theme.cardBg, borderColor: theme.border }]} 
            onPress={() => handleUserClick(item)}
        >
            <View style={styles.userInfo}>
                {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: COLORS.primary }]}>
                        <Text style={styles.avatarText}>{item.fullname?.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
                
                <View style={{ marginLeft: 15, flex: 1 }}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={[styles.name, { color: theme.text }]}>{item.fullname}</Text>
                        {item.is_admin && (
                            <View style={styles.adminBadge}>
                                <Text style={styles.adminText}>{t.admin}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
                    <Text style={{fontSize: 10, color: theme.subText, marginTop: 2}}>
                        {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color={theme.subText} />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t.title}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Arama Çubuğu */}
            <View style={[styles.searchContainer, { backgroundColor: theme.cardBg }]}>
                <Ionicons name="search" size={20} color={theme.subText} style={{ marginRight: 10 }} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder={t.searchPlaceholder}
                    placeholderTextColor={theme.subText}
                    value={search}
                    onChangeText={handleSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                        <Ionicons name="close-circle" size={18} color={theme.subText} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Toplam Sayı */}
            <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                <Text style={{ color: theme.subText }}>{t.totalUsers}: {filteredUsers.length}</Text>
            </View>

            {loading ? (
                <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ color: theme.subText }}>{t.noUser}</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    
    searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, paddingHorizontal: 15, paddingVertical: 12, borderRadius: 12, marginBottom: 15 },
    searchInput: { flex: 1, fontSize: 16 },

    userRow: { padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: 'transparent' },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    name: { fontSize: 16, fontWeight: 'bold' },
    email: { fontSize: 13, color: '#888', marginTop: 2 },
    
    adminBadge: { marginLeft: 8, backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    adminText: { fontSize: 10, color: COLORS.primary, fontWeight: 'bold' }
});

export default AdminUsersScreen;