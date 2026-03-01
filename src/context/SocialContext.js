import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // ✅ Supabase eklendi
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

            // Supabase verisini UI formatına dönüştür
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
                comments: post.comments || [], // JSONB olarak geliyor
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
        }
        newLikeCount = newLikedBy.length;

        // 1. UI Güncelle (Hız için)
        const updatedPosts = [...posts];
        updatedPosts[postIndex] = { ...post, likedBy: newLikedBy, likes: newLikeCount };
        setPosts(updatedPosts);

        // 2. DB Güncelle
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

    // 🔖 KAYDETME (BOOKMARK)
    const toggleSave = async (postId) => {
        if (!user) return;

        const isSaved = savedPostIds.includes(postId);
        
        // UI Güncelle
        if (isSaved) {
            setSavedPostIds(prev => prev.filter(id => id !== postId));
        } else {
            setSavedPostIds(prev => [...prev, postId]);
        }

        // DB İşlemi
        try {
            if (isSaved) {
                // Sil
                await supabase
                    .from('bookmarks')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('post_id', postId);
            } else {
                // Ekle
                await supabase
                    .from('bookmarks')
                    .insert({ user_id: user.id, post_id: postId });
            }
        } catch (e) {
            console.log("Bookmark DB hatası:", e);
        }
    };

    // ➕ YENİ POST EKLE (UI güncellemek için)
    const addPost = (newPost) => {
        setPosts(prev => [newPost, ...prev]);
    };

    // 🗑️ POST SİLME
    const deletePost = async (postId) => {
        try {
            // Önce UI'dan kaldır
            setPosts(prev => prev.filter(p => p.id !== postId));

            // Sonra DB'den sil
            const { error } = await supabase.from('posts').delete().eq('id', postId);
            if (error) throw error;

        } catch (e) {
            console.log("Post silme hatası:", e);
            fetchPosts(); // Hata varsa geri yükle
        }
    };

    // 💬 YORUM EKLEME
    const addComment = async (postId, commentObject) => {
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;

        const updatedComments = [...(posts[postIndex].comments || []), commentObject];

        // UI Güncelle
        const updatedPosts = [...posts];
        updatedPosts[postIndex] = { ...updatedPosts[postIndex], comments: updatedComments };
        setPosts(updatedPosts);

        // DB Güncelle
        try {
            await supabase
                .from('posts')
                .update({ comments: updatedComments })
                .eq('id', postId);
        } catch (e) {
            console.log("Yorum DB hatası:", e);
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

        // UI Update
        const updatedPosts = [...posts];
        updatedPosts[postIndex] = { ...post, comments: updatedComments };
        setPosts(updatedPosts);

        // DB Update
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