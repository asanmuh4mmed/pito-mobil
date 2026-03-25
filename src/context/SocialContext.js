import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from './AuthContext'; 
import { playSound } from '../utils/SoundManager'; 

export const SocialContext = createContext();

export const SocialProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [posts, setPosts] = useState([]);
    const [savedPostIds, setSavedPostIds] = useState([]); 
    const [loading, setLoading] = useState(true);

    // 1. Verileri Çek
    useEffect(() => {
        fetchPosts();
        if (user) {
            fetchSavedPosts();
        }
    }, [user]);

    // ✅ POSTLARI ÇEK
    const fetchPosts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    users ( fullname, avatar, id )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedPosts = data.map(post => ({
                id: post.id,
                userId: post.user_id,
                user: post.users?.fullname || 'Bilinmeyen Kullanıcı',
                userAvatar: post.users?.avatar || null,
                description: post.description,
                image: post.image,
                type: post.type || 'image',
                likes: post.likes || 0,
                likedBy: post.liked_by || [],
                comments: post.comments || [], 
                created_at: post.created_at
            }));

            setPosts(formattedPosts);
        } catch (e) {
            console.log("Post çekme hatası:", e.message);
        } finally {
            setLoading(false);
        }
    };

    // ✅ KAYDEDİLENLERİ ÇEK
    const fetchSavedPosts = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('bookmarks')
                .select('post_id')
                .eq('user_id', user.id);

            if (error) throw error;

            const ids = data.map(item => item.post_id);
            setSavedPostIds(ids);
        } catch (e) {
            console.log("Bookmark hatası:", e.message);
        }
    };

    // ❤️ BİLDİRİM GÖNDERME YARDIMCI FONKSİYONU (HEM DB HEM PUSH NOTIFICATION)
    const sendNotification = async (receiverId, type, message) => {
        // Eğer kişi kendi gönderisini beğenirse/yorumlarsa bildirim gitmesin
        // Not: Test için kendi kendine bildirim atmak istersen bu satırı yorum satırı yapabilirsin
        if (!user || user.id === receiverId) return;

        const newNotification = {
            id: Date.now().toString(), 
            type: type, 
            message: message,
            fromUserId: user.id,
            fromUser: user.fullname || user.username,
            fromUserAvatar: user.avatar,
            read: false, 
            date: new Date().toISOString()
        };

        try {
            // 1. ADIM: Bildirimi veritabanına ve zil ikonuna kaydet (RPC Fonksiyonumuz)
            const { error: dbError } = await supabase.rpc('add_user_notification', {
                target_user_id: receiverId,
                notif_obj: newNotification
            });

            if (dbError) throw dbError;
            console.log("Bildirim RPC ile veritabanına eklendi!");

           // 2. ADIM: UZAKTAN BİLDİRİM (PUSH NOTIFICATION) GÖNDERME 
            // Bildirimi alacak olan kullanıcının cihaz token'ını VE BİLDİRİM AYARINI çekiyoruz
            const { data: receiverData, error: tokenError } = await supabase
                .from('users')
                .select('expo_push_token, notification_settings') // ✨ YENİ: Ayarları da çektik
                .eq('id', receiverId)
                .single();

            if (tokenError) {
                console.log("Kullanıcı verisi çekilirken hata:", tokenError.message);
                return;
            }

            const pushToken = receiverData?.expo_push_token;
            // ✨ YENİ: Kullanıcı bildirimleri ayarlardan kapattıysa false döner (varsayılanı true kabul ediyoruz)
            const isNotificationsEnabled = receiverData?.notification_settings?.enabled !== false;

            // Hem token varsa HEM DE bildirim ayarı açıksa Push at
            if (pushToken && isNotificationsEnabled) {
                const response = await fetch('https://exp.host/--/api/v2/push/send', {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Accept-encoding': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        to: pushToken,
                        sound: 'default',
                        title: "Petsgram'dan Yeni Bildirim 🐾",
                        body: message,
                        data: { type: type, fromUser: user.username }, 
                    }),
                });
                
                const pushResult = await response.json();
                console.log("Push Bildirimi sonucu:", pushResult);
            } else {
                console.log("Karşı tarafın cihaz Token'ı yok veya bildirimleri KAPALI. Sadece zil ikonuna eklendi.");
            }

        } catch (error) {
            console.log("Genel bildirim gönderme hatası:", error);
        }
    };

    // ❤️ BEĞENİ (LIKE) 
    const toggleLike = async (postId) => {
        if (!user) return;
        playSound('paw'); 

        const userIdStr = String(user.id);
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;

        const post = posts[postIndex];
        const currentLikes = post.likedBy || [];
        const isLiked = currentLikes.includes(userIdStr);
        
        let newLikedBy;
        let newLikeCount;

        if (isLiked) {
            newLikedBy = currentLikes.filter(id => id !== userIdStr);
        } else {
            newLikedBy = [...currentLikes, userIdStr];
            
            // ✨ BEĞENİ YAPILDIĞINDA BİLDİRİM FONKSİYONUNU TETİKLE
            const notifMessage = `${user.fullname || user.username} gönderini beğendi. ❤️`;
            sendNotification(post.userId, 'like', notifMessage);
        }
        newLikeCount = newLikedBy.length;

        const updatedPosts = [...posts];
        updatedPosts[postIndex] = { ...post, likedBy: newLikedBy, likes: newLikeCount };
        setPosts(updatedPosts);

        try {
            await supabase
                .from('posts')
                .update({ 
                    liked_by: newLikedBy,
                    likes: newLikeCount 
                })
                .eq('id', postId);
        } catch (e) {
            console.log("Like DB hatası:", e);
        }
    };

    // 💬 YORUM EKLEME
    const addComment = async (postId, commentObject) => {
        if (!user) return; 

        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;

        const post = posts[postIndex];
        const updatedComments = [...(post.comments || []), commentObject];

        const updatedPosts = [...posts];
        updatedPosts[postIndex] = { ...post, comments: updatedComments };
        setPosts(updatedPosts);

        // ✨ YORUM YAPILDIĞINDA BİLDİRİM FONKSİYONUNU TETİKLE
        const notifMessage = `${user.fullname || user.username} gönderine yorum yaptı: "${commentObject.text.substring(0, 20)}${commentObject.text.length > 20 ? '...' : ''}"`;
        sendNotification(post.userId, 'comment', notifMessage);

        try {
            await supabase
                .from('posts')
                .update({ comments: updatedComments })
                .eq('id', postId);
        } catch (e) {
            console.log("Yorum DB hatası:", e);
        }
    };

    // 🔖 KAYDETME (BOOKMARK)
    const toggleSave = async (postId) => {
        if (!user) return;

        const isSaved = savedPostIds.includes(postId);
        
        if (isSaved) {
            setSavedPostIds(prev => prev.filter(id => id !== postId));
        } else {
            setSavedPostIds(prev => [...prev, postId]);
        }

        try {
            if (isSaved) {
                await supabase
                    .from('bookmarks')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('post_id', postId);
            } else {
                await supabase
                    .from('bookmarks')
                    .insert({ user_id: user.id, post_id: postId });
            }
        } catch (e) {
            console.log("Bookmark DB hatası:", e);
        }
    };

    // ➕ YENİ POST EKLE 
    const addPost = (newPost) => {
        setPosts(prev => [newPost, ...prev]);
    };

    // 🗑️ POST SİLME
    const deletePost = async (postId) => {
        try {
            setPosts(prev => prev.filter(p => p.id !== postId));
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;
        } catch (e) {
            console.log("Post silme hatası:", e);
            fetchPosts(); 
        }
    };

    // ❤️ YORUM BEĞENİSİ
    const toggleCommentLike = async (postId, commentId) => {
        if (!user) return;
        const currentUserId = String(user.id);
        
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;

        const post = posts[postIndex];
        const updatedComments = post.comments.map(c => {
            if (c.id === commentId) {
                const currentLikes = c.likedBy || [];
                const isLiked = currentLikes.includes(currentUserId);
                let newLikes;
                
                if (isLiked) newLikes = currentLikes.filter(id => id !== currentUserId);
                else newLikes = [...currentLikes, currentUserId];
                
                return { ...c, likedBy: newLikes, likes: newLikes.length };
            }
            return c;
        });

        const updatedPosts = [...posts];
        updatedPosts[postIndex] = { ...post, comments: updatedComments };
        setPosts(updatedPosts);

        try {
            await supabase
                .from('posts')
                .update({ comments: updatedComments })
                .eq('id', postId);
        } catch (e) {
            console.log("Yorum like hatası:", e);
        }
    };

    return (
        <SocialContext.Provider value={{ 
            posts, 
            savedPostIds, 
            addPost, 
            deletePost, 
            toggleSave, 
            toggleLike, 
            addComment,
            toggleCommentLike,
            loading 
        }}>
            {children}
        </SocialContext.Provider>
    );
};