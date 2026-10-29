import React, { useContext, useState, useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, 
    Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Animated, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { SocialContext } from '../context/SocialContext'; 

const TRANSLATIONS = {
    TR: {
        headerTitle: "Pito Dünyası",
        whatAreYouThinking: "Ne düşünüyorsun",
        share: "Paylaş",
        cancel: "Vazgeç",
        like: "Beğen",
        comment: "Yorum",
        emptyFeed: "Henüz bir gönderi yok. İlk paylaşan sen ol!",
        loginRequired: "Gönderi paylaşmak için giriş yapmalısın.",
        writeComment: "Yorumunu yaz...",
        delete: "Sil",
        deleteConfirmTitle: "Gönderiyi Sil",
        deleteConfirmMsg: "Bu gönderiyi silmek istediğinden emin misin?",
        commentsTitle: "Yorumlar",
        noComments: "İlk yorumu sen yap!"
    },
    AU: {
        headerTitle: "Pito World",
        whatAreYouThinking: "What's on your mind",
        share: "Share",
        cancel: "Cancel",
        like: "Like",
        comment: "Comment",
        emptyFeed: "No posts yet. Be the first to share!",
        loginRequired: "You must be logged in to post.",
        writeComment: "Write your comment...",
        delete: "Delete",
        deleteConfirmTitle: "Delete Post",
        deleteConfirmMsg: "Are you sure you want to delete this post?",
        commentsTitle: "Comments",
        noComments: "Be the first to comment!"
    }
};

const timeAgo = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return `${Math.max(seconds, 0)} sn önce`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    return `${days} gün önce`;
};

const AnimatedPawButton = ({ isLiked, count, onPress, theme, t }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.3, duration: 120, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
        onPress();
    };

    return (
        <TouchableOpacity style={styles.actionBtn} onPress={handlePress} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons name={isLiked ? "paw" : "paw-outline"} size={22} color={isLiked ? "#FFD700" : theme.subText} />
            </Animated.View>
            <Text style={[styles.actionText, { color: isLiked ? "#FFD700" : theme.subText }]}>{count || 0} {t.like}</Text>
        </TouchableOpacity>
    );
};

const CommunityFeed = ({ navigation, route }) => {
    const { theme, isDarkMode } = useContext(ThemeContext);
    const { user, country } = useContext(AuthContext);
    
    // ✨ GÜNCEL: Yorumları çekme ve ekleme fonksiyonlarını alıyoruz
    const { communityPosts, addCommunityPost, toggleCommunityLike, addCommunityComment, deleteCommunityPost, fetchCommunityComments } = useContext(SocialContext); 
    
    const [isPostModalVisible, setPostModalVisible] = useState(false);
    const [postText, setPostText] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // ✨ YENİ: Yorum Modal State'leri
    const [isCommentModalVisible, setCommentModalVisible] = useState(false);
    const [currentPostId, setCurrentPostId] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [isCommenting, setIsCommenting] = useState(false);
    const [postComments, setPostComments] = useState([]); // O anki gönderinin yorumları
    const [isLoadingComments, setIsLoadingComments] = useState(false);

    const activeLang = country?.code || 'TR';
    const t = TRANSLATIONS[activeLang];
    const firstName = user?.fullname ? user.fullname.split(' ')[0] : 'Misafir';

    useEffect(() => {
        if (route.params?.action === 'create') {
            setPostModalVisible(true);
        }
    }, [route.params]);

    const handlePostSubmit = async () => {
        if (!postText.trim()) return;
        setIsUploading(true);
        const success = await addCommunityPost(postText);
        if (success) {
            setPostText('');
            setPostModalVisible(false);
        }
        setIsUploading(false);
    };

    const handleDeletePost = (postId) => {
        Alert.alert(
            t.deleteConfirmTitle, t.deleteConfirmMsg,
            [
                { text: t.cancel, style: "cancel" },
                { text: t.delete, style: "destructive", onPress: () => deleteCommunityPost(postId) }
            ]
        );
    };

    const handleUserPress = (postUser) => {
        if (!postUser) return;
        if (user && postUser.id === user.id) navigation.navigate('Profile');
        else navigation.push('UserProfile', { userId: postUser.id, userName: postUser.fullname, userAvatar: postUser.avatar });
    };

    // ✨ YENİ: Yorum Modalı Açıldığında Yorumları Çek
    const openCommentModal = async (postId) => {
        if(!user) return alert(t.loginRequired);
        setCurrentPostId(postId);
        setCommentModalVisible(true);
        setPostComments([]); // Önceki yorumları temizle
        setIsLoadingComments(true);
        
        const fetchedComments = await fetchCommunityComments(postId);
        setPostComments(fetchedComments);
        setIsLoadingComments(false);
    };

    // ✨ YENİ: Yorum Gönderme ve Anında Listeye Ekleme
    const handleCommentSubmit = async () => {
        if (!commentText.trim() || !currentPostId) return;
        setIsCommenting(true);
        
        const newComment = await addCommunityComment(currentPostId, commentText);
        if (newComment) {
            // Yorumu anında listeye ekle, modalı kapatma!
            setPostComments(prev => [...prev, newComment]);
            setCommentText('');
        }
        setIsCommenting(false);
    };

    // Yorum satırı tasarımı
    const renderCommentItem = ({ item }) => (
        <View style={styles.commentItem}>
            <TouchableOpacity onPress={() => { setCommentModalVisible(false); handleUserPress(item.users); }}>
                {item.users?.avatar ? (
                    <Image source={{ uri: item.users.avatar }} style={styles.commentAvatar} />
                ) : (
                    <View style={[styles.commentAvatar, { backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{color: 'white', fontWeight: 'bold'}}>{item.users?.fullname?.charAt(0) || 'P'}</Text>
                    </View>
                )}
            </TouchableOpacity>
            <View style={[styles.commentBubble, { backgroundColor: isDarkMode ? '#333' : '#F0F2F5' }]}>
                <Text style={[styles.commentUserName, { color: theme.text }]}>{item.users?.fullname || "Anonim"}</Text>
                <Text style={[styles.commentContent, { color: theme.text }]}>{item.content}</Text>
            </View>
            <Text style={styles.commentTimeInfo}>{timeAgo(item.created_at)}</Text>
        </View>
    );

    const renderCommunityPost = ({ item }) => {
        const isLiked = item.liked_by?.includes(user?.id);
        const isMyPost = user && item.user_id === user.id;

        return (
            <View style={[styles.postCard, { backgroundColor: theme.cardBg }]}>
                <View style={styles.postHeader}>
                    <TouchableOpacity onPress={() => handleUserPress(item.users)}>
                        {item.users?.avatar ? (
                            <Image source={{ uri: item.users.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={{color: 'white', fontWeight: 'bold'}}>{item.users?.fullname?.charAt(0) || 'P'}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={{ marginLeft: 12, flex: 1 }} onPress={() => handleUserPress(item.users)}>
                        <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>{item.users?.fullname || "Anonim Pati"}</Text>
                        <Text style={styles.postTime}>{timeAgo(item.created_at)}</Text>
                    </TouchableOpacity>

                    {isMyPost && (
                        <TouchableOpacity style={styles.moreBtn} onPress={() => handleDeletePost(item.id)}>
                            <Ionicons name="ellipsis-horizontal" size={20} color={theme.subText} />
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={[styles.postContent, { color: theme.text }]}>{item.content}</Text>

                <View style={[styles.postFooter, { borderTopColor: theme.border }]}>
                    <AnimatedPawButton 
                        isLiked={isLiked} count={item.likes_count} theme={theme} t={t}
                        onPress={() => {
                            if(!user) return alert(t.loginRequired);
                            toggleCommunityLike(item.id);
                        }}
                    />
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openCommentModal(item.id)}>
                        <Ionicons name="chatbubble-outline" size={20} color={theme.subText} />
                        <Text style={[styles.actionText, { color: theme.subText }]}>{item.comments_count || 0} {t.comment}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.cardBg }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t.headerTitle}</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={[styles.createPostBox, { backgroundColor: theme.cardBg }]}>
                <View style={styles.createPostRow}>
                    {user && user.avatar ? (
                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, { backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center' }]}>
                            <Text style={{color: 'white', fontWeight: 'bold'}}>{firstName.charAt(0)}</Text>
                        </View>
                    )}
                    <TouchableOpacity 
                        style={[styles.postInputTrigger, { backgroundColor: isDarkMode ? '#333' : '#F4F0FF' }]}
                        onPress={() => {
                            if(user) setPostModalVisible(true);
                            else alert(t.loginRequired);
                        }}
                    >
                        <Text style={{ color: theme.subText }}>{t.whatAreYouThinking}, {firstName}?</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={communityPosts}
                keyExtractor={item => item.id.toString()}
                renderItem={renderCommunityPost}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 50 }}
                ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.subText }]}>{t.emptyFeed}</Text>}
            />

            {/* GÖNDERİ OLUŞTURMA MODALI */}
            <Modal visible={isPostModalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Gönderi Oluştur</Text>
                            <TouchableOpacity onPress={() => { setPostModalVisible(false); setPostText(''); }} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalUserInfo}>
                            {user && user.avatar ? (
                                <Image source={{ uri: user.avatar }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={{color: 'white', fontWeight: 'bold'}}>{firstName.charAt(0)}</Text>
                                </View>
                            )}
                            <View style={{ marginLeft: 10 }}>
                                <Text style={[styles.userName, { color: theme.text }]}>{user?.fullname || "Misafir"}</Text>
                                <View style={styles.privacyBadge}>
                                    <Ionicons name="earth" size={12} color="#666" style={{marginRight: 4}} />
                                    <Text style={styles.privacyText}>Pito Dünyası</Text>
                                </View>
                            </View>
                        </View>

                        <TextInput
                            style={[styles.postTextInput, { color: theme.text }]}
                            placeholder={`${t.whatAreYouThinking}, ${firstName}?`}
                            placeholderTextColor={theme.subText}
                            multiline
                            autoFocus
                            value={postText}
                            onChangeText={setPostText}
                        />

                        <TouchableOpacity 
                            style={[styles.submitBtn, { backgroundColor: postText.trim() ? '#6C5CE7' : (isDarkMode ? '#333' : '#E0E0E0') }]} 
                            disabled={!postText.trim() || isUploading}
                            onPress={handlePostSubmit}
                        >
                            {isUploading ? <ActivityIndicator color="white" /> : <Text style={[styles.submitBtnText, { color: postText.trim() ? 'white' : theme.subText }]}>{t.share}</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ✨ YENİ: YORUMLARI GÖRME VE YORUM YAPMA MODALI */}
            <Modal visible={isCommentModalVisible} animationType="slide" transparent={true}>
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                    style={styles.modalOverlay}
                >
                    <View style={[styles.commentsModalContent, { backgroundColor: theme.cardBg }]}>
                        
                        {/* Modal Başlığı */}
                        <View style={styles.commentsHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>{t.commentsTitle}</Text>
                            <TouchableOpacity onPress={() => { setCommentModalVisible(false); setCommentText(''); }} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color={theme.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Yorumlar Listesi */}
                        {isLoadingComments ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#6C5CE7" />
                            </View>
                        ) : (
                            <FlatList
                                data={postComments}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={renderCommentItem}
                                contentContainerStyle={{ padding: 15 }}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.subText, marginTop: 20 }}>{t.noComments}</Text>}
                            />
                        )}

                        {/* Alt Yorum Yapma Kutusu */}
                        <View style={[styles.commentInputContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
                            {user && user.avatar ? (
                                <Image source={{ uri: user.avatar }} style={styles.commentInputAvatar} />
                            ) : (
                                <View style={[styles.commentInputAvatar, { backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={{color: 'white', fontWeight: 'bold'}}>{firstName.charAt(0)}</Text>
                                </View>
                            )}
                            <TextInput
                                style={[styles.commentInputForm, { backgroundColor: isDarkMode ? '#333' : '#F0F2F5', color: theme.text }]}
                                placeholder={t.writeComment}
                                placeholderTextColor={theme.subText}
                                multiline
                                value={commentText}
                                onChangeText={setCommentText}
                            />
                            <TouchableOpacity 
                                style={[styles.commentSendBtn, { opacity: commentText.trim() ? 1 : 0.5 }]} 
                                disabled={!commentText.trim() || isCommenting}
                                onPress={handleCommentSubmit}
                            >
                                {isCommenting ? <ActivityIndicator color="#6C5CE7" /> : <Ionicons name="send" size={24} color="#6C5CE7" />}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    backBtn: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    createPostBox: { padding: 18, marginBottom: 10, elevation: 1 },
    createPostRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 46, height: 46, borderRadius: 23 },
    postInputTrigger: { flex: 1, height: 46, borderRadius: 23, justifyContent: 'center', paddingHorizontal: 18, marginLeft: 12 },
    postCard: { padding: 18, marginBottom: 10, elevation: 1 },
    postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    userName: { fontSize: 16, fontWeight: 'bold' },
    postTime: { fontSize: 12, color: '#888', marginTop: 3 },
    moreBtn: { padding: 5 },
    postContent: { fontSize: 15, lineHeight: 24, marginBottom: 18 },
    postFooter: { flexDirection: 'row', borderTopWidth: 0.5, paddingTop: 15 },
    actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 5 },
    actionText: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
    emptyText: { textAlign: 'center', marginTop: 40, fontStyle: 'italic' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, minHeight: '50%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    closeBtn: { backgroundColor: 'rgba(108, 92, 231, 0.1)', padding: 6, borderRadius: 15 },
    modalUserInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    privacyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0E0E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4, alignSelf: 'flex-start' },
    privacyText: { fontSize: 10, fontWeight: '600', color: '#666' },
    postTextInput: { flex: 1, fontSize: 18, textAlignVertical: 'top', minHeight: 120, marginBottom: 20 },
    submitBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 20 },
    submitBtnText: { fontSize: 16, fontWeight: 'bold' },

    // Yorum Modalı Tasarımı
    commentsModalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, flex: 0.8 }, // Ekranın %80'ini kaplar
    commentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5, borderBottomColor: '#E0E0E0' },
    commentItem: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-start' },
    commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
    commentBubble: { flex: 1, padding: 12, borderRadius: 18, borderTopLeftRadius: 4 },
    commentUserName: { fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
    commentContent: { fontSize: 14, lineHeight: 20 },
    commentTimeInfo: { fontSize: 10, color: '#888', marginLeft: 46, marginTop: 4 },
    commentInputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 15, borderTopWidth: 0.5 },
    commentInputAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    commentInputForm: { flex: 1, minHeight: 40, maxHeight: 100, borderRadius: 20, paddingHorizontal: 15, paddingTop: 12, paddingBottom: 12, fontSize: 14 },
    commentSendBtn: { padding: 10, marginLeft: 5 }
});

export default CommunityFeed;