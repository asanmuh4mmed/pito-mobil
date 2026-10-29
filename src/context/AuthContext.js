import React, { createContext, useState, useEffect, useRef } from 'react';
import { Alert, Platform, AppState } from 'react-native'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications'; 
import Constants from 'expo-constants'; 
import { supabase } from '../lib/supabase'; 
import { playSound } from '../utils/SoundManager'; 

export const AuthContext = createContext();

// One serialized scheduler per JS runtime, including React Strict Mode remounts.
let generalReminderWork = Promise.resolve();
const GENERAL_REMINDER_ID = 'pito-general-reminder-v1';
const GENERAL_REMINDER_TYPE = 'pito_general_reminder';
const GENERAL_REMINDER_SECONDS = 172800;
const syncGeneralReminder = () => {
    const run = async () => {
        if (Platform.OS === 'web') return;
        const requests = await Notifications.getAllScheduledNotificationsAsync();
        const validInterval = request => {
            const trigger = request.trigger;
            return trigger?.type === 'timeInterval' && trigger.repeats === true &&
                Number(trigger.seconds) === GENERAL_REMINDER_SECONDS;
        };
        const belongsToGeneralReminder = request =>
            request.identifier === GENERAL_REMINDER_ID ||
            request.content?.data?.type === GENERAL_REMINDER_TYPE ||
            // Migrate only the exact legacy general reminder, never vaccine/message notices.
            (request.content?.title === 'Pito 🐾' &&
             request.content?.body === 'Yeni ilanlar var, göz atmak ister misin?' &&
             validInterval(request));
        const existing = requests.filter(belongsToGeneralReminder);
        const keep = existing.find(request => request.identifier === GENERAL_REMINDER_ID && validInterval(request)) ||
            existing.find(validInterval);
        let keepId = keep?.identifier;
        if (!keepId) {
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default', importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250], lightColor: '#FF231F7C',
                });
            }
            keepId = await Notifications.scheduleNotificationAsync({
                identifier: GENERAL_REMINDER_ID,
                content: {
                    title: 'Pito 🐾', body: 'Yeni ilanlar var, göz atmak ister misin?',
                    sound: true, badge: 1, data: { type: GENERAL_REMINDER_TYPE },
                },
                trigger: { type: 'timeInterval', seconds: GENERAL_REMINDER_SECONDS, repeats: true,
                    ...(Platform.OS === 'android' ? { channelId: 'default' } : {}) },
            });
        }
        // Keep the original due date; cancel only redundant requests from this feature.
        for (const request of existing) {
            if (request.identifier !== keepId) await Notifications.cancelScheduledNotificationAsync(request.identifier);
        }
        console.log(keep ? '⏰ Genel hatırlatma korundu; diğer hatırlatmalar değiştirilmedi.' :
            '⏰ İki günlük genel hatırlatma oluşturuldu; diğer hatırlatmalar değiştirilmedi.');
    };
    generalReminderWork = generalReminderWork.then(run).catch(error => {
        console.log('Genel hatırlatma kurulamadı:', error.message);
    });
    return generalReminderWork;
};


export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]); 
    
    // ✅ GLOBAL DİL STATE'İ EKLENDİ
    const [language, setLanguage] = useState('TR');
    const userWriteLocks = useRef(new Set());
    const avatarUploadCache = useRef(new Map());
    const authRuntime = useRef({ live: false, version: 0, session: null, timer: null, loadedId: null, pendingId: null });
 

    // Preserve vaccine and other scheduled notifications.
    const scheduleBiDailyNotification = () => syncGeneralReminder();

    useEffect(() => {
        const runtime = authRuntime.current;
        runtime.live = true;
        const initialVersion = runtime.version;

        // This callback must stay synchronous: schedule network work after it returns.
        const applySession = (nextSession, event) => {
            if (!runtime.live) return;
            const previousId = runtime.session?.user?.id;
            const nextId = nextSession?.user?.id;
            runtime.session = nextSession;
            setSession(nextSession);

            if (!nextId) {
                runtime.version++;
                clearTimeout(runtime.timer);
                runtime.loadedId = null;
                runtime.pendingId = null;
                setUser(null);
                setLoading(false);
                // Local storage is also deferred outside the auth callback.
                runtime.timer = setTimeout(() => {
                    if (runtime.live && !runtime.session) {
                        void AsyncStorage.removeItem('userSession').catch(() => {});
                    }
                }, 0);
                return;
            }

            const accountChanged = previousId !== nextId;
            if (accountChanged) {
                runtime.loadedId = null;
                setUser(null);
            }
            if (!accountChanged && event !== 'USER_UPDATED' &&
                (runtime.loadedId === nextId || runtime.pendingId === nextId)) return;

            const requestVersion = ++runtime.version;
            runtime.pendingId = nextId;
            clearTimeout(runtime.timer);
            if (accountChanged) setLoading(true);
            runtime.timer = setTimeout(() => {
                if (!runtime.live || runtime.version !== requestVersion) return;
                void fetchUserDetails(nextId, requestVersion);
            }, 0);
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
            applySession(nextSession, event);
        });

        // Fallback for client versions where INITIAL_SESSION arrives later or is absent.
        const bootstrapTimer = setTimeout(() => {
            void supabase.auth.getSession().then(({ data, error }) => {
                if (!runtime.live || runtime.version !== initialVersion) return;
                if (error) console.log('Session check error:', error.message);
                applySession(data?.session || null, 'INITIAL_SESSION');
            }).catch(error => {
                if (runtime.live && runtime.version === initialVersion) {
                    console.log('Session check error:', error.message);
                    setLoading(false);
                }
            });
        }, 0);
        scheduleBiDailyNotification();
        loadAllUsers();
        return () => {
            runtime.live = false;
            runtime.version++;
            clearTimeout(runtime.timer);
            clearTimeout(bootstrapTimer);
            runtime.pendingId = null;
            subscription?.unsubscribe();
        };
    }, []);

    // ÇEVRİMİÇİ DURUM TAKİBİ
    useEffect(() => {
        if (!user?.id) return;

        const updateOnlineStatus = async (status) => {
            try {
                await supabase
                    .from('users')
                    .update({ is_online: status, last_seen: new Date() })
                    .eq('id', user.id);
            } catch (error) {
                console.log("Online status error:", error);
            }
        };

        updateOnlineStatus(true);

        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                updateOnlineStatus(true);
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                updateOnlineStatus(false);
            }
        });

        return () => {
            subscription.remove();
            updateOnlineStatus(false);
        };
    }, [user?.id]);

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
            
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ?? 
                Constants?.easConfig?.projectId;

            if (!projectId) {
                console.log("Project ID bulunamadı! eas.json veya app.json kontrol edilmeli.");
                token = (await Notifications.getExpoPushTokenAsync()).data;
            } else {
                token = (await Notifications.getExpoPushTokenAsync({
                    projectId: projectId,
                })).data;
            }
            
            return token;
            
        } catch (error) {
            console.log("Push Token hatası:", error);
            return null;
        }
    };

    const triggerLocalNotification = async (title, body) => {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: title,
                body: body,
                sound: true, 
            },
            trigger: null,
        });
    };

    // KULLANICI BİLGİLERİNİ CANLI DİNLEME (REALTIME)
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`user_changes_${user.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
                (payload) => {
                    if (!authRuntime.current.live || authRuntime.current.session?.user?.id !== user.id) return;
                    const oldNotifs = user?.notifications || [];
                    const newNotifs = payload.new.notifications || [];

                    if (newNotifs.length > oldNotifs.length) {
                        const latestNotif = newNotifs[0]; 
                        
                        const isNotificationsEnabled = payload.new.notification_settings?.enabled !== false;
                        
                        if (latestNotif && !latestNotif.read && isNotificationsEnabled) {
                            playSound('noti');
                            triggerLocalNotification(
                                "Petsgram'dan Yeni Bildirim 🐾", 
                                latestNotif.message
                            );
                        }
                    }

                    setUser(prev => prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev);
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user?.id]);

    const fetchUserDetails = async (userId, requestVersion) => {
        const runtime = authRuntime.current;
        const isCurrent = () => runtime.live && runtime.version === requestVersion && runtime.session?.user?.id === userId;
        try {
            const { data: dbUser, error } = await supabase.from('users').select('*').eq('id', userId).single();
            if (!isCurrent()) return;
            if (error || !dbUser) {
                console.log('Database user error:', error?.message || 'Profil bulunamadı.');
                return;
            }
            const { data: followingData, error: followingError } = await supabase.from('follows')
                .select('following_id').eq('follower_id', userId);
            if (!isCurrent()) return;
            if (followingError) console.log('Following load error:', followingError.message);
            const finalUser = {
                ...dbUser,
                email: runtime.session?.user?.email || dbUser.email,
                following: followingError ? [] : (followingData || []).map(f => f.following_id),
                is_admin: dbUser.is_admin === true,
            };
            runtime.loadedId = userId;
            setUser(finalUser);
            // Permission prompts and Expo token registration must not block profile loading.
            void (async () => {
                try {
                    if (!isCurrent()) return;
                    const pushToken = await registerForPushNotificationsAsync();
                    if (!isCurrent() || !pushToken || dbUser.expo_push_token === pushToken) return;
                    const { error: pushError } = await supabase.from('users')
                        .update({ expo_push_token: pushToken }).eq('id', userId);
                    if (pushError) { console.log('Push Token DB kayıt hatası:', pushError.message); return; }
                    if (isCurrent()) setUser(prev => prev?.id === userId ? { ...prev, expo_push_token: pushToken } : prev);
                } catch (error) { console.log('Push Token hatası:', error.message); }
            })();
        } catch (error) {
            if (isCurrent()) console.log('Fetch Error:', error.message);
        } finally {
            if (isCurrent()) {
                runtime.pendingId = null;
                setLoading(false);
            }
        }
    };

    const loadAllUsers = async () => {
        try {
            const { data, error } = await supabase.from('pito_public_profiles').select('*').limit(50);
            if (!error && data) setAllUsers(data);
        } catch (e) { console.log("Load Users Error", e); }
    };

    const uploadImage = async (asset, ownerId) => {
        const uri = typeof asset === 'string' ? asset : asset?.uri;
        if (!uri) throw new Error('Fotoğraf bulunamadı. Lütfen yeniden seçin.');
        const cacheKey = `${ownerId}:${uri}`;
        if (avatarUploadCache.current.has(cacheKey)) return avatarUploadCache.current.get(cacheKey);
        let bytes;
        if (asset?.base64) {
            const encoded = asset.base64;
            if (encoded.length > 12 * 1024 * 1024) throw new Error('Fotoğraf çok büyük. Daha küçük bir fotoğraf seçin.');
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            const clean = encoded.replace(/=+$/, '');
            bytes = new Uint8Array(Math.floor(clean.length * 6 / 8));
            let bits = 0, buffer = 0, offset = 0;
            for (const char of clean) {
                const value = alphabet.indexOf(char);
                if (value < 0) throw new Error('Fotoğraf okunamadı. Lütfen yeniden seçin.');
                buffer = (buffer << 6) | value; bits += 6;
                if (bits >= 8) { bits -= 8; bytes[offset++] = (buffer >> bits) & 255; }
            }
        } else {
            const response = await fetch(uri);
            bytes = new Uint8Array(await response.arrayBuffer());
        }
        if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error('Fotoğraf boş veya 8 MB sınırını aşıyor.');
        let ext, mime;
        if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) { ext = 'jpg'; mime = 'image/jpeg'; }
        else if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) { ext = 'png'; mime = 'image/png'; }
        else if (String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') { ext = 'webp'; mime = 'image/webp'; }
        else throw new Error('JPEG, PNG veya WebP biçiminde bir fotoğraf seçin.');
        const fileName = `${ownerId}/${Date.now()}_${Math.random().toString(36).slice(2,10)}.${ext}`;
        const { error } = await supabase.storage.from('avatars').upload(fileName, bytes.buffer, { contentType: mime, upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        if (!data?.publicUrl) throw new Error('Fotoğraf adresi alınamadı.');
        avatarUploadCache.current.set(cacheKey, data.publicUrl);
        if (avatarUploadCache.current.size > 10) avatarUploadCache.current.delete(avatarUploadCache.current.keys().next().value);
        return data.publicUrl;
    };

    const updateUser = async (updatedData) => {
        const ownerId = user?.id;
        const runtime = authRuntime.current;
        const requestVersion = runtime.version;
        const isCurrent = () => runtime.live && runtime.version === requestVersion && runtime.session?.user?.id === ownerId;
        if (!ownerId || !isCurrent()) return { success: false, error: 'Oturum geçerli değil. Yeniden giriş yapın.' };
        // Compatibility: existing notification settings/list and badge controls also call updateUser.
        const allowed = new Set(['fullname', 'username', 'bio', 'avatar', 'notifications', 'notification_settings']);
        if (!updatedData || typeof updatedData !== 'object' || Array.isArray(updatedData)) return { success: false, error: 'Geçersiz profil verisi.' };
        const fields = Object.keys(updatedData);
        if (!fields.length || fields.some(key => !allowed.has(key))) return { success: false, error: 'Bu alanlar profil üzerinden değiştirilemez.' };
        const lockKeys = fields.map(key => `${ownerId}:${key}`);
        if (lockKeys.some(key => userWriteLocks.current.has(key))) return { success: false, error: 'Bu bilgiler kaydediliyor. Lütfen bekleyin.' };
        lockKeys.forEach(key => userWriteLocks.current.add(key));
        try {
            const updates = { ...updatedData };
            for (const key of ['fullname', 'username']) {
                if (key in updates) {
                    if (typeof updates[key] !== 'string' || !updates[key].trim()) throw new Error('İsim ve kullanıcı adı boş olamaz.');
                    updates[key] = updates[key].trim();
                }
            }
            if ('bio' in updates) {
                if (updates.bio !== null && typeof updates.bio !== 'string') throw new Error('Geçersiz biyografi.');
                updates.bio = updates.bio?.trim() || null;
            }
            if ('notifications' in updates && !Array.isArray(updates.notifications)) throw new Error('Geçersiz bildirim listesi.');
            if ('notification_settings' in updates && (!updates.notification_settings || typeof updates.notification_settings !== 'object' || Array.isArray(updates.notification_settings))) throw new Error('Geçersiz bildirim ayarları.');
            if ('avatar' in updates && updates.avatar !== null) {
                const avatar = updates.avatar;
                if (typeof avatar === 'object' || (typeof avatar === 'string' && /^(file|content|ph):/i.test(avatar))) {
                    updates.avatar = await uploadImage(avatar, ownerId);
                } else if (typeof avatar !== 'string' || !/^https?:\/\//i.test(avatar)) throw new Error('Geçersiz fotoğraf adresi.');
            }
            if (!isCurrent()) throw new Error('Hesap değişti. Lütfen profilinizi yeniden açın.');
            const { data: saved, error } = await supabase.from('users').update(updates).eq('id', ownerId)
                .select(['id', ...fields].join(',')).single();
            if (error) throw error;
            if (!saved || saved.id !== ownerId) throw new Error('Profil güncellemesi doğrulanamadı.');
            if (!isCurrent()) throw new Error('Hesap değişti. Güncel profili yeniden açın.');
            const confirmed = Object.fromEntries(fields.map(key => [key, saved[key]]));
            setUser(prev => isCurrent() && prev?.id === ownerId ? { ...prev, ...confirmed } : prev);
            setAllUsers(prev => prev.map(item => item.id === ownerId ? {
                ...item, ...Object.fromEntries(['fullname','username','bio','avatar'].filter(key => fields.includes(key)).map(key => [key, saved[key]]))
            } : item));
            return { success: true, data: saved };
        } catch (error) {
            return { success: false, error: error.message || 'Profil kaydedilemedi.' };
        } finally { lockKeys.forEach(key => userWriteLocks.current.delete(key)); }
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
                        country: 'TR', // Sabitlendi
                        city: city, 
                        district: district,
                        account_type: accountType,
                        is_online: true 
                    } 
                }
            });

            if (error) throw error;

            if (data?.user?.id) {
                (async () => {
                    try {
                        const { data: adminUser } = await supabase
                            .from('users')
                            .select('id, fullname, avatar')
                            .eq('email', 'petspito@gmail.com')
                            .single();

                        if (adminUser) {
                            const room_id = [adminUser.id, data.user.id].sort().join('_');
                            
                            const welcomeText = `Merhaba! Pito'ya hoş geldin 🐾 \n\nBurada can dostlarımız için yuva arayabilir, Petsgram'da sevimli anılarınızı paylaşabilir ve diğer hayvanseverlerle kolayca iletişime geçebilirsin. \n\nDaha fazla cana ulaşabilmemiz için Pito'yu hayvansever arkadaşlarınla paylaşıp topluluğumuzun büyümesine destek olursan çok seviniriz! Birlikte daha güçlüyüz. ❤️`;

                            await supabase.from('messages').insert([{
                                room_id: room_id,
                                sender_id: adminUser.id,
                                receiver_id: data.user.id,
                                text: welcomeText,
                                is_read: false
                            }]);
                            
                            console.log("🚀 Hoş geldin mesajı başarıyla gönderildi!");
                        }
                    } catch (msgError) {
                        console.log("❌ Hoş geldin mesajı gönderilemedi:", msgError);
                    }
                })();
            }

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
        if (user?.id) {
            await supabase.from('users').update({ is_online: false }).eq('id', user.id);
        }
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
    
    const changePassword = async (newPassword) => {
        try { const { error } = await supabase.auth.updateUser({ password: newPassword }); return error ? { success: false, message: error.message } : { success: true, message: "Password updated." }; } catch (e) { return { success: false, message: e.message }; }
    };

    const resetPassword = async (email, newPassword) => {
        try {
            const { error } = await supabase.rpc('update_user_password_by_email', {
                p_email: email,
                p_new_password: newPassword
            });

            if (error) {
                console.log("RPC Şifre Sıfırlama Hatası:", error.message);
                throw new Error("Şifre güncellenemedi. Veritabanı yapılandırması (RPC) gerekiyor.");
            }

            return { success: true };
        } catch (e) {
            return { success: false, message: e.message };
        }
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
            user, session, allUsers, isLoading: loading, 
            language, setLanguage, 
            register, login, logout, updateUser, verifyEmail,
            toggleFollow, removeFollower, blockUser,
            changePassword, resetPassword, checkEmailExists, 
            deleteUserAccount, updateNotificationPreference, deleteNotification, markNotificationsAsRead,

        }}>
            {children}
        </AuthContext.Provider>
    );
};