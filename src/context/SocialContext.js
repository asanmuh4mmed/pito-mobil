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

    const [communityPosts, setCommunityPosts] = useState([]);

    useEffect(() => {
        fetchPosts();
        fetchCommunityPosts(); 
        if (user) {
            fetchSavedPosts();
        }
    }, [user]);

    // =====================================
    // 🌍 PİTO DÜNYASI (YAZILI GÖNDERİLER) BÖLÜMÜ
    // =====================================

    const fetchCommunityPosts = async () => {
        try {
            const { data, error } = await supabase
                .from('community_posts')
                .select(`
                    *,
                    users:pito_public_profiles ( id, fullname, avatar, username )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCommunityPosts(data || []);
        } catch (e) {
            console.log("Community Post çekme hatası:", e.message);
        }
    };

    const addCommunityPost = async (content) => {
        if (!user || !content.trim()) return false;
        try {
            const newPostData = {
                user_id: user.id,
                content: content,
            };
            
            const { data, error } = await supabase
                .from('community_posts')
                .insert([newPostData])
                .select(`*, users:pito_public_profiles ( id, fullname, avatar, username )`)
                .single();
                
            if (error) throw error;
            setCommunityPosts(prev => [data, ...prev]);
            return true; 
        } catch (e) {
            console.log("Community Post ekleme hatası:", e.message);
            return false;
        }
    };

    const deleteCommunityPost = async (postId) => {
        if (!user) return false;
        try {
            // Hızlı bir kullanıcı deneyimi için önce ekrandan anında kaldırıyoruz
            setCommunityPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
            
            // Arka planda veritabanından siliyoruz (Sadece gönderi sahibi silebilir)
            const { error } = await supabase
                .from('community_posts')
                .delete()
                .eq('id', postId)
                .eq('user_id', user.id);

            if (error) throw error;
            return true;
        } catch (e) {
            console.log("Community Post silme hatası:", e.message);
            // Hata olursa ekranı eski haline getirmek için listeyi tekrar çekiyoruz
            fetchCommunityPosts(); 
            return false;
        }
    };

    const toggleCommunityLike = async (postId) => {
        if (!user) return false;
        playSound('paw'); 

        try {
            const post = communityPosts.find(p => p.id === postId);
            if (!post) return;

            const currentLikedBy = post.liked_by || [];
            const isLiked = currentLikedBy.includes(user.id);
            
            if (isLiked) {
                await supabase.from('community_likes').delete().eq('user_id', user.id).eq('post_id', postId);
                await supabase.rpc('decrement_community_likes', { p_id: postId, u_id: user.id }); 
            } else {
                const { error: likeError } = await supabase.from('community_likes').insert({ user_id: user.id, post_id: postId });
                if (likeError) throw likeError;
                const { error: countError } = await supabase.rpc('increment_community_likes', { p_id: postId, u_id: user.id });
                if (countError) throw countError; 
                
                if (post.user_id !== user.id) {
                    void sendNotification('community', 'like', postId);
                }
            }

            setCommunityPosts(prevPosts => prevPosts.map(p => {
                if (p.id === postId) {
                    const newLikedBy = isLiked 
                        ? (p.liked_by || []).filter(id => id !== user.id) 
                        : [...(p.liked_by || []), user.id];
                    
                    return { 
                        ...p, 
                        likes_count: isLiked ? Math.max((p.likes_count || 0) - 1, 0) : (p.likes_count || 0) + 1,
                        liked_by: newLikedBy
                    };
                }
                return p;
            }));

            return !isLiked; 
        } catch (error) {
            console.error("Community Beğeni Hatası:", error);
            return false;
        }
    };

    // ✨ YENİ EKLENEN: Bir gönderinin yorumlarını çekme fonksiyonu
    const fetchCommunityComments = async (postId) => {
        try {
            const { data, error } = await supabase
                .from('community_comments')
                .select(`
                    *,
                    users:pito_public_profiles ( id, fullname, avatar, username )
                `)
                .eq('post_id', postId)
                .order('created_at', { ascending: true }); // Eskiden yeniye sıralı

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Yorumları çekme hatası:", error);
            return [];
        }
    };

    const addCommunityComment = async (postId, text) => {
        if (!user || !text.trim()) return false;
        try {
            const { data, error } = await supabase
                .from('community_comments')
                .insert([{ user_id: user.id, post_id: postId, content: text }])
                .select(`*, users:pito_public_profiles ( id, fullname, avatar, username )`)
                .single();

            if (error) throw error;

            await supabase.rpc('increment_community_comments', { p_id: postId });

            setCommunityPosts(prevPosts => prevPosts.map(p => {
                if (p.id === postId) {
                    return { ...p, comments_count: (p.comments_count || 0) + 1 };
                }
                return p;
            }));

            const post = communityPosts.find(p => p.id === postId);
            if (post && post.user_id !== user.id) {
                void sendNotification('community', 'comment', postId, data.id);
            }

            return data;
        } catch (e) {
            console.error("Community Yorum Hatası:", e);
            return false;
        }
    };

    // =====================================
    // 📸 PETSGRAM BÖLÜMÜ (Mevcut Olanlar)
    // =====================================

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('posts')
                .select(`*, users:pito_public_profiles ( fullname, avatar, id )`)
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

    const fetchSavedPosts = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('bookmarks')
                .select('post_id')
                .eq('user_id', user.id);

            if (error) throw error;
            setSavedPostIds(data.map(item => item.post_id));
        } catch (e) {
            console.log("Bookmark hatası:", e.message);
        }
    };

    const sendNotification = async (source, kind, postId, commentId = null) => {
        try {
            const { data, error } = await supabase.functions.invoke('send-social-push', {
                body: { source, kind, post_id: postId, ...(commentId != null ? { comment_id: commentId } : {}) },
            });
            if (error || data?.success === false) console.log('İşlem kaydedildi; sosyal bildirim doğrulanamadı.');
        } catch { console.log('İşlem kaydedildi; sosyal bildirim gönderilemedi.'); }
    };

    const toggleLike = async (postId) => {
        if (!user) return;
        playSound('paw'); 
        const userIdStr = String(user.id);
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;

        const post = posts[postIndex];
        const currentLikes = post.likedBy || [];
        const isLiked = currentLikes.includes(userIdStr);
        
        let newLikedBy = isLiked ? currentLikes.filter(id => id !== userIdStr) : [...currentLikes, userIdStr];
        


        const updatedPosts = [...posts];
        updatedPosts[postIndex] = { ...post, likedBy: newLikedBy, likes: newLikedBy.length };
        setPosts(updatedPosts);

        try {
            const { error } = await supabase.from('posts').update({ liked_by: newLikedBy, likes: newLikedBy.length }).eq('id', postId);
            if (error) throw error;
            if (!isLiked) void sendNotification('posts', 'like', postId);
        } catch (e) { console.log("Like DB hatası:", e); }
    };

    const addComment = async (postId, commentObject) => {
        if (!user) return; 
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;

        const post = posts[postIndex];
        const updatedComments = [...(post.comments || []), commentObject];

        const updatedPosts = [...posts];
        updatedPosts[postIndex] = { ...post, comments: updatedComments };
        setPosts(updatedPosts);



        try {
            const { error } = await supabase.from('posts').update({ comments: updatedComments }).eq('id', postId);
            if (error) throw error;
            void sendNotification('posts', 'comment', postId, commentObject.id);
        } catch (e) { console.log("Yorum DB hatası:", e); }
    };

    const toggleSave = async (postId) => {
        if (!user) return;
        const isSaved = savedPostIds.includes(postId);
        setSavedPostIds(prev => isSaved ? prev.filter(id => id !== postId) : [...prev, postId]);
        try {
            if (isSaved) await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('post_id', postId);
            else await supabase.from('bookmarks').insert({ user_id: user.id, post_id: postId });
        } catch (e) { console.log("Bookmark DB hatası:", e); }
    };

    const addPost = (newPost) => setPosts(prev => [newPost, ...prev]);

    const deletePost = async (postId) => {
        try {
            setPosts(prev => prev.filter(p => p.id !== postId));
            await supabase.from('posts').delete().eq('id', postId);
        } catch (e) { fetchPosts(); }
    };

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
                let newLikes = isLiked ? currentLikes.filter(id => id !== currentUserId) : [...currentLikes, currentUserId];
                return { ...c, likedBy: newLikes, likes: newLikes.length };
            }
            return c;
        });

        const updatedPosts = [...posts];
        updatedPosts[postIndex] = { ...post, comments: updatedComments };
        setPosts(updatedPosts);

        try {
            const { error } = await supabase.from('posts').update({ comments: updatedComments }).eq('id', postId);
            if (error) throw error;
            void sendNotification('posts', 'comment', postId, commentObject.id);
        } catch (e) { console.log("Yorum like hatası:", e); }
    };

    return (
        <SocialContext.Provider value={{ 
            posts, savedPostIds, addPost, deletePost, toggleSave, toggleLike, addComment, toggleCommentLike, loading,
            communityPosts, fetchCommunityPosts, addCommunityPost, deleteCommunityPost, toggleCommunityLike, addCommunityComment, fetchCommunityComments // ✨ EKLENDİ
        }}>
            {children}
        </SocialContext.Provider>
    );
};