import React, { createContext, useState, useEffect } from 'react';
import { Alert } from 'react-native'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
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

    // ✅ KULLANICI BİLGİLERİNİ CANLI DİNLEME (REALTIME)
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('public:users')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
                (payload) => {
                    // Puan, admin durumu veya profil değiştiğinde kullanıcıyı güncelle
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
            // 1. Kullanıcı tablosundan verileri çek
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
                
                // 2. Takip edilenleri çek
                const { data: followingData } = await supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', userId);

                const followingIds = followingData ? followingData.map(f => f.following_id) : [];

                // 3. Kullanıcı objesini oluştur
                const finalUser = {
                    ...dbUser,
                    email: authUser?.email || dbUser.email,
                    following: followingIds,
                    donation_points: dbUser.donation_points || 0,
                    is_admin: dbUser.is_admin || false 
                };

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

    // ✅ BAĞIŞ YAPILDIĞINDA BAĞIŞ SAYISINI (+1) ARTIRAN FONKSİYON
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

            // Local state'i de güncelle
            setUser(prev => ({ ...prev, donation_points: newPoints }));
            return { success: true, newPoints };
        } catch (error) {
            console.error("Donation increment error:", error.message);
            return { success: false, error: error.message };
        }
    };

    // --- AUTH OPERATIONS ---

    const register = async (username, fullname, email, password, countryCode, city, district) => {
        setLoading(true);
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
                        donation_points: 0 // Başlangıçta 0 bağış puanı 
                    } 
                }
            });

            if (error) throw error;
            setLoading(false);
            return { success: true, session: data.session }; 
        } catch (e) { 
            setLoading(false); 
            return { success: false, message: e.message }; 
        }
    };

    const verifyEmail = async (email, token) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'signup'
            });

            if (error) throw error;
            setLoading(false);
            return { success: true, session: data.session };
        } catch (e) {
            setLoading(false);
            return { success: false, message: "Invalid or expired code." };
        }
    };

    const login = async (email, password) => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            setLoading(false);
            return { success: true };
        } catch (e) { 
            setLoading(false); 
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

    // --- FOLLOW SYSTEM ---
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
                // UNFOLLOW
                await supabase.from('follows').delete().eq('id', existingFollow.id);
                newFollowingList = newFollowingList.filter(id => id !== targetUserId);
            } else {
                // FOLLOW
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

    // --- OTHER FUNCTIONS ---
    const updateCountry = async (newC) => { setCountry(newC); if (user) await updateUser({ country: newC.code }); };
    
    const changePassword = async (newPassword) => {
        try { const { error } = await supabase.auth.updateUser({ password: newPassword }); return error ? { success: false, message: error.message } : { success: true, message: "Password updated." }; } catch (e) { return { success: false, message: e.message }; }
    };

    // ✅ GÜNCELLENDİ: Hata Yönetimi İyileştirildi (RLS Engeli Aşımı)
    const deleteUserAccount = async () => {
        if (!user) return;
        try {
            setLoading(true);
            
            // 1. Arşive eklemeyi dener. RLS engellerse Catch bloğuna düşer ama işlemi durdurmaz.
            try {
                await supabase.from('deleted_users_archive').insert({
                    original_user_id: user.id, 
                    fullname: user.fullname, 
                    email: user.email, 
                    phone: user.phone || null
                });
            } catch (archiveError) {
                console.log("Arşive eklenemedi (RLS kuralı kapalı olabilir):", archiveError.message);
            }

            // 2. Ana kullanıcı silinir.
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

    const resetPassword = async (email, newPassword) => { /* Reset password flow */ };
    const deleteNotification = async () => {}; 
    const markNotificationsAsRead = async () => {};

    return (
        <AuthContext.Provider value={{ 
            user, session, allUsers, isLoading: loading, country, 
            register, login, logout, updateUser, verifyEmail,
            toggleFollow, removeFollower, blockUser,
            changePassword, updateCountry, checkEmailExists, resetPassword,
            deleteUserAccount, updateNotificationPreference, deleteNotification, markNotificationsAsRead,
            incrementDonationPoints // ✅ DIŞARIYA AÇILDI
        }}>
            {children}
        </AuthContext.Provider>
    );
};