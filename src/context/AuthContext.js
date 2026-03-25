import React, { createContext, useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications'; // ✅ Uzaktan bildirimler için eklendi
import Constants from 'expo-constants'; // ✅ YENİ: Proje kimliğini (projectId) bulmak için eklendi
import { supabase } from '../lib/supabase'; 
import { playSound } from '../utils/SoundManager'; 

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]); 
    const [country, setCountry] = useState({ name: 'Türkiye', code: 'TR', flag: '🇹🇷' });

    useEffect(() => {
        checkUser();
        
        // AUTH LISTENER
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            
            if (event === 'SIGNED_IN' && session) {
                await fetchUserDetails(session.user.id);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setSession(null);
                await AsyncStorage.removeItem('userSession');
            } else if (event === 'USER_UPDATED') {
                if (session?.user) {
                    await fetchUserDetails(session.user.id);
                }
            }
        });

        loadAllUsers();

        return () => subscription?.unsubscribe();
    }, []);

    // ✅ GÜNCELLENDİ: CİHAZIN PUSH TOKEN'INI ALMA FONKSİYONU
    const registerForPushNotificationsAsync = async () => {
        let token;
        try {
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            
            if (finalStatus !== 'granted') {
                console.log('Bildirim izni verilmedi!');
                return null;
            }
            
            // ✨ YENİ: Standalone (Play Store) uygulamaları için Proje Kimliği (projectId) gerekiyor
            const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
            
            if (!projectId) {
                console.log("Project ID bulunamadı, token alınamıyor!");
            }

            // Token alırken projectId'yi parametre olarak gönderiyoruz
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: projectId,
            })).data;
            
            return token;
        } catch (error) {
            console.log("Push Token hatası:", error);
            return null;
        }
    };

    // ✅ BİLDİRİMLER İÇİN LOKAL UYARI FONKSİYONU
    const triggerLocalNotification = async (title, body) => {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: title,
                body: body,
                sound: true, 
            },
            trigger: null, // Hemen göster
        });
    };

    // ✅ KULLANICI BİLGİLERİNİ CANLI DİNLEME (REALTIME)
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`user_changes_${user.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
                (payload) => {
                    const oldNotifs = user?.notifications || [];
                    const newNotifs = payload.new.notifications || [];

                    if (newNotifs.length > oldNotifs.length) {
                        const latestNotif = newNotifs[0]; 
                        
                        // Kullanıcının bildirim ayarını kontrol et (Kapalıysa false döner)
                        const isNotificationsEnabled = payload.new.notification_settings?.enabled !== false;
                        
                        // Eğer bildirim okunmamışsa VE kullanıcı ayarlardan bildirimleri kapatmadıysa banner göster
                        if (latestNotif && !latestNotif.read && isNotificationsEnabled) {
                            playSound('noti');
                            triggerLocalNotification(
                                "Petsgram'dan Yeni Bildirim 🐾", 
                                latestNotif.message
                            );
                        }
                    }

                    setUser(prev => ({ ...prev, ...payload.new }));
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user?.id]);

    const checkUser = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            if (session?.user) {
                await fetchUserDetails(session.user.id);
            }
        } catch (e) {
            console.log('Session check error:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserDetails = async (userId) => {
        try {
            const { data: dbUser, error } = await supabase
                .from('users')
                .select('*') 
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.log("Database user error:", error.message);
                return;
            }

            if (dbUser) {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                
                const { data: followingData } = await supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', userId);

                const followingIds = followingData ? followingData.map(f => f.following_id) : [];

                const finalUser = {
                    ...dbUser,
                    email: authUser?.email || dbUser.email,
                    following: followingIds,
                    donation_points: dbUser.donation_points || 0,
                    is_admin: dbUser.is_admin || false 
                };

                // GİRİŞTE PUSH TOKEN AL VE GEREKİRSE DB GÜNCELLE
                const pushToken = await registerForPushNotificationsAsync();
                if (pushToken && dbUser.expo_push_token !== pushToken) {
                    await supabase.from('users').update({ expo_push_token: pushToken }).eq('id', userId);
                    finalUser.expo_push_token = pushToken;
                }

                setUser(finalUser);
                
                if (dbUser.country) {
                    const countryObj = dbUser.country === 'TR' 
                        ? { name: 'Türkiye', code: 'TR', flag: '🇹🇷' } 
                        : { name: 'Australia', code: 'AU', flag: '🇦🇺' };
                    setCountry(countryObj);
                }
            }
        } catch (error) {
            console.log("Fetch Error:", error);
        }
    };

    const loadAllUsers = async () => {
        try {
            const { data, error } = await supabase.from('users').select('*').limit(50);
            if (!error && data) setAllUsers(data);
        } catch (e) { console.log("Load Users Error", e); }
    };

    const uploadImage = async (uri) => {
        try {
            const ext = uri.substring(uri.lastIndexOf('.') + 1);
            const fileName = `${user.id}/${Date.now()}.${ext}`;

            const formData = new FormData();
            formData.append('file', {
                uri: uri,
                name: fileName,
                type: 'image/jpeg',
            });

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, formData, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            return publicData.publicUrl;

        } catch (error) {
            console.log("Image upload error:", error.message);
            throw error;
        }
    };

    const updateUser = async (updatedData) => {
        if (!user) return { success: false, error: "User not found" };

        try {
            const updates = { ...updatedData };
            if (updates.email) delete updates.email;

            if (updates.avatar && updates.avatar.startsWith('file://')) {
                try {
                    const publicUrl = await uploadImage(updates.avatar);
                    updates.avatar = publicUrl; 
                } catch (uploadError) {
                    return { success: false, error: "Image upload failed." };
                }
            }

            const { error: dbError } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user.id);

            if (dbError) throw dbError;

            const updatedUserLocal = { ...user, ...updates };
            if (updates.avatar) {
                const cleanUrl = updates.avatar.split('?')[0];
                updatedUserLocal.avatar = `${cleanUrl}?t=${new Date().getTime()}`;
            }

            setUser(updatedUserLocal);
            
            return { success: true };

        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const incrementDonationPoints = async () => {
        if (!user) return { success: false };

        try {
            const currentPoints = user.donation_points || 0;
            const newPoints = currentPoints + 1;

            const { error } = await supabase
                .from('users')
                .update({ donation_points: newPoints })
                .eq('id', user.id);

            if (error) throw error;

            setUser(prev => ({ ...prev, donation_points: newPoints }));
            return { success: true, newPoints };
        } catch (error) {
            console.error("Donation increment error:", error.message);
            return { success: false, error: error.message };
        }
    };

    // ✅ EKSİK OLAN ROZET TAKMA FONKSİYONU BURAYA EKLENDİ
    const equipBadge = async (badgeItem) => {
        if (!user) return;
        try {
            // Zaten var olan updateUser fonksiyonunu kullanarak hem DB'yi hem state'i güncelliyoruz
            await updateUser({ activeBadge: badgeItem });
        } catch (error) {
            console.log("Rozet takma hatası:", error);
        }
    };

    const register = async (username, fullname, email, password, countryCode, city, district, accountType) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { 
                    data: { 
                        username, 
                        fullname, 
                        country: countryCode, 
                        city: city, 
                        district: district,
                        account_type: accountType,
                        donation_points: 0 
                    } 
                }
            });

            if (error) throw error;
            return { success: true, session: data.session }; 
        } catch (e) { 
            return { success: false, message: e.message }; 
        }
    };

    const verifyEmail = async (email, token) => {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'signup'
            });

            if (error) throw error;
            return { success: true, session: data.session };
        } catch (e) {
            return { success: false, message: "Invalid or expired code." };
        }
    };

    const login = async (email, password) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            return { success: true };
        } catch (e) { 
            return { success: false, message: "Invalid email or password." }; 
        }
    };

    const logout = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setLoading(false);
    };

    const toggleFollow = async (targetUserId) => {
        if (!user) return;
        if (user.id === targetUserId) return; 

        try {
            const { data: existingFollow } = await supabase
                .from('follows')
                .select('*')
                .eq('follower_id', user.id)
                .eq('following_id', targetUserId)
                .single();

            let newFollowingList = user.following ? [...user.following] : [];

            if (existingFollow) {
                await supabase.from('follows').delete().eq('id', existingFollow.id);
                newFollowingList = newFollowingList.filter(id => id !== targetUserId);
            } else {
                await supabase.from('follows').insert({ 
                    follower_id: user.id, 
                    following_id: targetUserId 
                });
                playSound('follow'); 
                if (!newFollowingList.includes(targetUserId)) {
                    newFollowingList.push(targetUserId);
                }
            }

            setUser(prev => ({
                ...prev,
                following: newFollowingList
            }));

        } catch (error) {
            console.log("Follow Error:", error);
        }
    };

    const blockUser = async (targetUserId) => {
        if (!user) return;
        try {
            await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: targetUserId });
            
            await supabase.from('follows').delete().match({ follower_id: user.id, following_id: targetUserId });
            await supabase.from('follows').delete().match({ follower_id: targetUserId, following_id: user.id });

            setUser(prev => ({
                ...prev,
                following: (prev.following || []).filter(id => id !== targetUserId)
            }));
            
            return { success: true };
        } catch (error) {
            console.log("Block error:", error);
            return { success: false, error: error.message };
        }
    };

    const removeFollower = async (followerId) => { 
        try { 
            await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', user.id); 
        } catch (e) { console.log(e); } 
    };

    const updateCountry = async (newC) => { setCountry(newC); if (user) await updateUser({ country: newC.code }); };
    
    const changePassword = async (newPassword) => {
        try { const { error } = await supabase.auth.updateUser({ password: newPassword }); return error ? { success: false, message: error.message } : { success: true, message: "Password updated." }; } catch (e) { return { success: false, message: e.message }; }
    };

    const deleteUserAccount = async () => {
        if (!user) return;
        try {
            setLoading(true);
            try {
                await supabase.from('deleted_users_archive').insert({
                    original_user_id: user.id, 
                    fullname: user.fullname, 
                    email: user.email, 
                    phone: user.phone || null
                });
            } catch (archiveError) {
                console.log("Arşive eklenemedi:", archiveError.message);
            }

            const { error } = await supabase.from('users').delete().eq('id', user.id);
            if (error) throw error;
            
            await logout();
            return { success: true };
        } catch (e) { 
            setLoading(false); 
            return { success: false, message: e.message }; 
        }
    };

    const updateNotificationPreference = async (isEnabled) => {
        if (!user) return;
        try { await updateUser({ notification_settings: { enabled: isEnabled, sound: isEnabled } }); } 
        catch (e) { console.log(e); }
    };

    const checkEmailExists = async (email) => {
        try { const { data } = await supabase.from('users').select('id').eq('email', email).single(); return !!data; } catch { return false; }
    };

    const deleteNotification = async (notifId) => {
        if (!user || !user.notifications) return;
        const updatedNotifs = user.notifications.filter(n => n.id !== notifId);
        setUser(prev => ({ ...prev, notifications: updatedNotifs })); 
        try {
            await supabase.from('users').update({ notifications: updatedNotifs }).eq('id', user.id);
        } catch (e) {
            console.log("Bildirim silme hatası:", e);
        }
    }; 

    const markNotificationsAsRead = async () => {
        if (!user || !user.notifications) return;
        const hasUnread = user.notifications.some(n => !n.read);
        if (!hasUnread) return;
        const updatedNotifs = user.notifications.map(n => ({ ...n, read: true }));
        setUser(prev => ({ ...prev, notifications: updatedNotifs })); 
        try {
            await supabase.from('users').update({ notifications: updatedNotifs }).eq('id', user.id);
        } catch (e) {
            console.log("Bildirim okundu yapma hatası:", e);
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, session, allUsers, isLoading: loading, country, 
            register, login, logout, updateUser, verifyEmail,
            toggleFollow, removeFollower, blockUser,
            changePassword, updateCountry, checkEmailExists,
            deleteUserAccount, updateNotificationPreference, deleteNotification, markNotificationsAsRead,
            incrementDonationPoints, equipBadge // ✅ equipBadge BURAYA EKLENDİ
        }}>
            {children}
        </AuthContext.Provider>
    );
};