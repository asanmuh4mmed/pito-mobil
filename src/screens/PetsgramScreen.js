import React, { useState, useContext, useRef, useEffect, useCallback } from 'react';
import { 
    View, Text, StyleSheet, FlatList, Image, Dimensions, TouchableOpacity, 
    StatusBar, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, 
    Keyboard, ActivityIndicator, Animated, PanResponder 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext'; 
import { SocialContext } from '../context/SocialContext'; 
import { COLORS } from '../constants/colors';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

const TRANSLATIONS = {
    TR: {
        headerTitle: "Petsgram",
        permissionRequired: "İzin Gerekli",
        permissionMsg: "Galeriye erişim izni vermelisiniz.",
        postedTitle: "Harika!",
        postedMsg: "Pito'da paylaşıldı 🐾",
        loginRequired: "Giriş Yap",
        loginMsg: "Paylaşmak veya işlem yapmak için giriş yapmalısın.",
        reported: "Bildirildi",
        following: "Takipte",
        follow: "Takip Et",
        noPosts: "Henüz paylaşım yok.",
        firstPost: "İlk Paylaşımı Sen Yap!",
        cancel: "İptal",
        newPost: "Yeni Gönderi",
        share: "Paylaş",
        captionPlaceholder: "Açıklama...",
        comments: "Yorumlar",
        commentPlaceholder: "Yorum yap...",
        deletePost: "Bu Gönderiyi Sil",
        report: "Şikayet Et",
        now: "Şimdi",
        uploading: "Yükleniyor...",
        addText: "Yazı Ekle",
        textPlaceholder: "Buraya yaz..."
    },
    AU: {
        headerTitle: "Petsgram",
        permissionRequired: "Permission Required",
        permissionMsg: "Gallery permission is required.",
        postedTitle: "Awesome!",
        postedMsg: "Shared on Pito 🐾",
        loginRequired: "Log In",
        loginMsg: "You must log in to share or interact.",
        reported: "Reported",
        following: "Following",
        follow: "Follow",
        noPosts: "No posts yet.",
        firstPost: "Be the first to post!",
        cancel: "Cancel",
        newPost: "New Post",
        share: "Share",
        captionPlaceholder: "Caption...",
        comments: "Comments",
        commentPlaceholder: "Add a comment...",
        deletePost: "Delete Post",
        report: "Report",
        now: "Just now",
        uploading: "Uploading...",
        addText: "Add Text",
        textPlaceholder: "Type here..."
    }
};

// ✅ Pati Animasyonu Bileşeni
const BigPawAnimation = ({ visible }) => {
    const scaleValue = useRef(new Animated.Value(0)).current;
    const opacityValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            scaleValue.setValue(0);
            opacityValue.setValue(1);

            Animated.parallel([
                Animated.spring(scaleValue, {
                    toValue: 1,
                    friction: 5,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.delay(500),
                    Animated.timing(opacityValue, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <View style={styles.bigPawContainer}>
            <Animated.View style={{ transform: [{ scale: scaleValue }], opacity: opacityValue }}>
                <Ionicons name="paw" size={100} color={COLORS.primary} style={{ textShadowColor: 'black', textShadowRadius: 10 }} />
            </Animated.View>
        </View>
    );
};

const PostItem = React.memo(({ item, isVisible, user, activeLang, t, handlers }) => {
    const isLikedByMe = user && item.likedBy && item.likedBy.includes(String(user.id));
    const likeCount = item.likes || 0;
    const [showPaw, setShowPaw] = useState(false);

    const player = useVideoPlayer(item.type === 'video' ? item.image : null, player => {
        player.loop = true;
    });

    useEffect(() => {
        if (item.type === 'video' && player) {
            isVisible ? player.play() : player.pause();
        }
    }, [isVisible, player, item.type]);

    const handleLikePress = () => {
        handlers.toggleLike(item.id);
        if (!isLikedByMe) {
            setShowPaw(true);
            setTimeout(() => setShowPaw(false), 1000);
        }
    };

    // ✅ JSON PARSE İŞLEMİ (Veritabanındaki overlay_text JSON mı düz yazı mı?)
    let overlayData = null;
    try {
        if (item.overlay_text) {
            // Eğer JSON formatındaysa parse et, değilse düz yazı olarak kabul et
            overlayData = item.overlay_text.startsWith('{') 
                ? JSON.parse(item.overlay_text) 
                : { text: item.overlay_text, x: 0, y: 0, fontSize: 24, hasBg: true, font: 'System' };
        }
    } catch (e) {
        // Hata durumunda varsayılan
        overlayData = { text: item.overlay_text, x: 0, y: 0, fontSize: 24, hasBg: true, font: 'System' };
    }

    return (
        <View style={styles.postContainer}>
            <View style={styles.imageWrapper}>
                {item.type === 'video' ? (
                    <VideoView player={player} style={styles.fullImage} contentFit="cover" nativeControls={false} />
                ) : (
                    <Image source={{ uri: item.image }} style={styles.fullImage} resizeMode="contain" />
                )}

                {/* ✅ DİNAMİK YAZI GÖSTERİMİ */}
                {overlayData && overlayData.text && (
                    <View style={[
                        styles.overlayTextContainer, 
                        { 
                            transform: [{ translateX: overlayData.x || 0 }, { translateY: overlayData.y || 0 }],
                            // Eğer pozisyon 0,0 ise (eski veri) ortala
                            ...(overlayData.x === 0 && overlayData.y === 0 ? { position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center' } : { position: 'absolute', top: 0, left: 0 })
                        }
                    ]}>
                        <Text style={[
                            styles.overlayText, 
                            { 
                                fontSize: overlayData.fontSize || 24,
                                backgroundColor: overlayData.hasBg ? 'rgba(0,0,0,0.5)' : 'transparent',
                                fontFamily: overlayData.font === 'Serif' ? 'serif' : (overlayData.font === 'Mono' ? 'monospace' : 'System'),
                                textShadowColor: overlayData.hasBg ? 'transparent' : 'black',
                                textShadowRadius: overlayData.hasBg ? 0 : 5,
                                textShadowOffset: {width: 1, height: 1}
                            }
                        ]}>
                            {overlayData.text}
                        </Text>
                    </View>
                )}
            </View>
            
            <View style={styles.overlay} />
            <BigPawAnimation visible={showPaw} />

            <View style={styles.rightSidebar}>
                <View style={styles.sidebarItemGroup}>
                    <TouchableOpacity style={styles.sidebarItem} onPress={handleLikePress}>
                        <Ionicons name={isLikedByMe ? "paw" : "paw-outline"} size={34} color={isLikedByMe ? COLORS.primary : "white"} />
                        <Text style={[styles.sidebarText, isLikedByMe && { color: COLORS.primary }]}>{likeCount}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.sidebarItem} onPress={() => handlers.openComments(item.id)}>
                        <Ionicons name="chatbubble-ellipses-outline" size={32} color="white" />
                        <Text style={styles.sidebarText}>{item.comments ? item.comments.length : 0}</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.sidebarItem, { marginTop: 20 }]} onPress={() => handlers.openMenu(item)}>
                    <Ionicons name="ellipsis-vertical" size={24} color="white" style={{ opacity: 0.8 }} />
                </TouchableOpacity>
            </View>

            <View style={styles.bottomInfoContainer}>
                <View style={styles.userInfoRow}>
                    <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center'}} onPress={() => handlers.goToProfile(item.userId, item.user, item.userAvatar)}>
                        <Image source={{ uri: item.userAvatar || 'https://placekitten.com/50/50' }} style={styles.avatar} />
                        <Text style={styles.username}>@{item.user}</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.description} numberOfLines={3}>
                    <Text style={{fontWeight: 'bold'}}>{item.user} </Text>
                    {item.description}
                </Text>
            </View>
        </View>
    );
});

// ✅ GELİŞMİŞ UPLOAD ÖNİZLEME (EDİTÖR)
const UploadEditor = ({ uri, type, overlayData, setOverlayData, showControls, setShowControls }) => {
    const player = useVideoPlayer(type === 'video' ? uri : null, player => { player.loop = true; player.play(); });
    
    // PanResponder: Sürükle Bırak İşlemleri
    const pan = useRef(new Animated.ValueXY()).current;
    
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: pan.x._value,
                    y: pan.y._value
                });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pan.flattenOffset();
                // Konumu State'e kaydet
                setOverlayData(prev => ({ ...prev, x: pan.x._value, y: pan.y._value }));
            }
        })
    ).current;

    const toggleFont = () => {
        const fonts = ['System', 'Serif', 'Mono'];
        const currentIndex = fonts.indexOf(overlayData.font);
        const nextFont = fonts[(currentIndex + 1) % fonts.length];
        setOverlayData(prev => ({ ...prev, font: nextFont }));
    };

    return (
        <View style={styles.previewContainer}>
            <View style={styles.mediaContainer}>
                {type === 'video' ? (
                    <VideoView player={player} style={{width: '100%', height: '100%'}} contentFit="cover" />
                ) : (
                    <Image source={{ uri }} style={styles.uploadPreviewImage} />
                )}
            </View>

            {/* ✅ SÜRÜKLENEBİLİR YAZI KATMANI */}
            {overlayData.text ? (
                <Animated.View
                    {...panResponder.panHandlers}
                    style={[
                        { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
                        styles.draggableTextContainer
                    ]}
                >
                    <TouchableOpacity onPress={() => setShowControls(!showControls)}>
                        <Text style={[
                            styles.overlayText,
                            { 
                                fontSize: overlayData.fontSize,
                                backgroundColor: overlayData.hasBg ? 'rgba(0,0,0,0.5)' : 'transparent',
                                fontFamily: overlayData.font === 'Serif' ? 'serif' : (overlayData.font === 'Mono' ? 'monospace' : 'System'),
                                textShadowColor: overlayData.hasBg ? 'transparent' : 'black',
                                textShadowRadius: overlayData.hasBg ? 0 : 5,
                                textShadowOffset: {width: 1, height: 1}
                            }
                        ]}>
                            {overlayData.text}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            ) : null}

            {/* ✅ DÜZENLEME ARAÇ ÇUBUĞU */}
            {showControls && overlayData.text ? (
                <View style={styles.editorToolbar}>
                    <TouchableOpacity onPress={() => setOverlayData(prev => ({ ...prev, fontSize: Math.max(12, prev.fontSize - 2) }))} style={styles.toolBtn}>
                        <Ionicons name="remove" size={24} color="white" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={() => setOverlayData(prev => ({ ...prev, fontSize: Math.min(60, prev.fontSize + 2) }))} style={styles.toolBtn}>
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setOverlayData(prev => ({ ...prev, hasBg: !prev.hasBg }))} style={styles.toolBtn}>
                        <Ionicons name={overlayData.hasBg ? "contrast" : "contrast-outline"} size={24} color="white" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={toggleFont} style={styles.toolBtn}>
                        <Text style={{color:'white', fontWeight:'bold'}}>Aa</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
        </View>
    );
};

const PetsgramScreen = ({ navigation, route }) => {
  const { user, toggleFollow, country } = useContext(AuthContext); 
  const { posts, addPost, deletePost, toggleLike, addComment, toggleCommentLike } = useContext(SocialContext);

  const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
  const t = TRANSLATIONS[activeLang];

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [tempMedia, setTempMedia] = useState(null); 
  const [mediaType, setMediaType] = useState('image'); 
  const [caption, setCaption] = useState('');
  
  // ✅ YENİ: Gelişmiş Yazı State'i (JSON olarak saklanacak)
  const [overlayData, setOverlayData] = useState({
      text: '',
      x: 0,
      y: 0,
      fontSize: 24,
      hasBg: true,
      font: 'System'
  });
  const [showOverlayInput, setShowOverlayInput] = useState(false);
  const [showEditorControls, setShowEditorControls] = useState(true);

  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [activePostId, setActivePostId] = useState(null); 
  const [visiblePostId, setVisiblePostId] = useState(null); 
  const [newComment, setNewComment] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedPostForMenu, setSelectedPostForMenu] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const commentInputRef = useRef(null);
  const flatListRef = useRef(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
      if (viewableItems.length > 0) setVisiblePostId(viewableItems[0].item.id);
  }, []);

  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };

  const handlers = {
      toggleLike, toggleFollow,
      openComments: (id) => { setActivePostId(id); setCommentModalVisible(true); },
      openMenu: (post) => { setSelectedPostForMenu(post); setMenuVisible(true); },
      goToProfile: (targetUserId, targetUserName, targetUserAvatar) => {
          setCommentModalVisible(false);
          if (user && String(targetUserId) === String(user.id)) navigation.navigate('Profile');
          else navigation.push('UserProfile', { userId: targetUserId, userName: targetUserName, userAvatar: targetUserAvatar });
      }
  };

  const pickMedia = async () => {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert(t.permissionRequired, t.permissionMsg);
        
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All, 
            allowsEditing: true, 
            aspect: [9, 16],
            quality: 0.8,
            videoMaxDuration: 60 
        });

        if (!result.canceled) { 
            const asset = result.assets[0];
            setTempMedia(asset.uri); 
            setMediaType(asset.type); 
            // Reset overlay data
            setOverlayData({ text: '', x: 0, y: 0, fontSize: 24, hasBg: true, font: 'System' });
            setUploadModalVisible(true); 
        }
    } catch (error) {
        console.log("Galeri Hatası:", error);
    }
  };

  const handleSharePost = async () => {
    if (!user) return Alert.alert(t.loginRequired, t.loginMsg);

    try {
        setIsUploading(true);
        const ext = tempMedia.substring(tempMedia.lastIndexOf('.') + 1);
        const fileName = `${user.id}/${Date.now()}.${ext}`;
        const formData = new FormData();
        formData.append('file', { uri: tempMedia, name: fileName, type: mediaType === 'video' ? 'video/quicktime' : 'image/jpeg' });

        const { error: uploadError } = await supabase.storage.from('posts').upload(fileName, formData, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('posts').getPublicUrl(fileName);
        
        // ✅ VERİTABANINA JSON OLARAK KAYDET
        const overlayJson = overlayData.text ? JSON.stringify(overlayData) : null;

        const newPostData = {
            user_id: user.id,
            description: caption,
            image: publicUrlData.publicUrl,
            type: mediaType,
            overlay_text: overlayJson, // JSON String
            likes: 0,
            liked_by: [],
            created_at: new Date()
        };

        const { data: insertedData, error: dbError } = await supabase.from('posts').insert(newPostData).select().single();
        if (dbError) throw dbError;

        addPost({
            ...newPostData,
            id: insertedData.id.toString(),
            user: user.fullname,
            userId: String(user.id),
            userAvatar: user.avatar,
            comments: []
        });

        setUploadModalVisible(false);
        setCaption('');
        setTempMedia(null);
        Alert.alert(t.postedTitle, t.postedMsg);

    } catch (error) {
        Alert.alert("Hata", "Yükleme başarısız: " + (error.message || "Bilinmeyen hata"));
    } finally {
        setIsUploading(false);
    }
  };

  const handleAddComment = () => {
    if (newComment.trim() === '' || !user) return;
    addComment(activePostId, { id: Date.now().toString(), user: user.fullname, userId: String(user.id), userAvatar: user.avatar, text: newComment, likedBy: [], likes: 0, date: t.now });
    setNewComment('');
    Keyboard.dismiss();
  };

  const handleMenuAction = (action) => {
      setMenuVisible(false);
      if (!selectedPostForMenu) return;
      if (action === 'delete') deletePost(selectedPostForMenu.id);
      if (action === 'report') Alert.alert(t.reported);
  };

  const renderCommentItem = ({ item }) => {
      const isCommentLiked = item.likedBy && user && item.likedBy.includes(String(user.id));
      return (
        <View style={styles.commentRow}>
            <Image source={{ uri: item.userAvatar }} style={styles.commentAvatar} />
            <View style={styles.commentContent}>
                <Text style={[styles.commentUser, {color:'white'}]}>{item.user}</Text>
                <Text style={styles.commentText}>{item.text}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleCommentLike(activePostId, item.id)}>
                <Ionicons name={isCommentLiked ? "heart" : "heart-outline"} size={14} color={isCommentLiked ? "#FF3B30" : "#888"} />
            </TouchableOpacity>
        </View>
      );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}><Ionicons name="chevron-back" size={28} color="white" /></TouchableOpacity>
        <Text style={styles.headerTitle}>{t.headerTitle}</Text>
        <TouchableOpacity onPress={pickMedia} style={styles.headerBtn}><Ionicons name="add-circle-outline" size={28} color="white" /></TouchableOpacity>
      </View>
      
      {posts.length === 0 ? (
        <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={80} color="#555" />
            <Text style={styles.emptyText}>{t.noPosts}</Text>
            <TouchableOpacity style={styles.uploadBtnFirst} onPress={pickMedia}><Text style={{color:'white', fontWeight:'bold'}}>{t.firstPost}</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList 
            ref={flatListRef} 
            data={posts} 
            renderItem={({ item }) => <PostItem item={item} isVisible={visiblePostId === item.id} user={user} activeLang={activeLang} t={t} handlers={handlers} />}
            keyExtractor={item => item.id} 
            pagingEnabled 
            showsVerticalScrollIndicator={false} 
            snapToInterval={height} 
            decelerationRate="fast"
            getItemLayout={(data, index) => ({ length: height, offset: height * index, index })}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
        />
      )}
      
      {/* PAYLAŞIM MODALI */}
      <Modal visible={uploadModalVisible} animationType="slide" transparent={true}>
         <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
            <View style={styles.modalContainer}>
                <View style={[styles.uploadContent, { backgroundColor: '#222' }]}>
                    
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => !isUploading && setUploadModalVisible(false)} disabled={isUploading}>
                            <Text style={{color:'white'}}>{t.cancel}</Text>
                        </TouchableOpacity>
                        <Text style={{color:'white', fontWeight:'bold'}}>{t.newPost}</Text>
                        <TouchableOpacity onPress={handleSharePost} disabled={isUploading}>
                            {isUploading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={{color:COLORS.primary, fontWeight:'bold'}}>{t.share}</Text>}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.uploadBody}>
                        {/* EDİTÖR ALANI */}
                        <View style={styles.editorContainer}>
                            {tempMedia && (
                                <UploadEditor 
                                    uri={tempMedia} 
                                    type={mediaType} 
                                    overlayData={overlayData} 
                                    setOverlayData={setOverlayData}
                                    showControls={showEditorControls}
                                    setShowControls={setShowEditorControls}
                                />
                            )}
                            
                            {/* Yazı Ekle Butonu */}
                            <TouchableOpacity style={styles.addTextButton} onPress={() => setShowOverlayInput(!showOverlayInput)}>
                                <Ionicons name="text" size={24} color="white" />
                            </TouchableOpacity>

                            {/* Yazı Giriş Alanı */}
                            {showOverlayInput && (
                                <View style={styles.overlayInputWrapper}>
                                    <TextInput 
                                        style={styles.overlayInput}
                                        placeholder={t.textPlaceholder}
                                        placeholderTextColor="#ccc"
                                        value={overlayData.text}
                                        onChangeText={(text) => setOverlayData(prev => ({ ...prev, text }))}
                                        autoFocus
                                        multiline
                                        maxLength={50}
                                    />
                                    <TouchableOpacity style={styles.closeOverlayInput} onPress={() => setShowOverlayInput(false)}>
                                        <Ionicons name="checkmark-circle" size={40} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        <TextInput 
                            style={styles.captionInput} 
                            placeholder={t.captionPlaceholder} 
                            placeholderTextColor="#888" 
                            multiline 
                            value={caption} 
                            onChangeText={setCaption} 
                            editable={!isUploading}
                        />
                    </View>
                </View>
            </View>
         </KeyboardAvoidingView>
      </Modal>

      {/* YORUM MODALI */}
      <Modal visible={commentModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCommentModalVisible(false)}>
         <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1, justifyContent:'flex-end'}}>
            <TouchableOpacity style={{flex:1}} onPress={() => setCommentModalVisible(false)} />
            <View style={styles.commentSheet}>
                <View style={{alignItems:'center', paddingTop:10, paddingBottom:5}}><View style={{width:40, height:4, backgroundColor:'#444', borderRadius:2}} /></View>
                <View style={styles.sheetHeader}>
                    <Text style={{color:'white', fontWeight:'bold', fontSize:16}}>{t.comments}</Text>
                    <TouchableOpacity onPress={() => setCommentModalVisible(false)}><Ionicons name="close" size={24} color="white" /></TouchableOpacity>
                </View>
                <FlatList 
                    data={posts.find(p => p.id === activePostId)?.comments || []} 
                    keyExtractor={item => item.id} 
                    contentContainerStyle={{paddingBottom: 20}}
                    renderItem={renderCommentItem}
                />
                <View style={styles.commentInputRow}>
                    <Image source={{ uri: user?.avatar || 'https://placekitten.com/50/50' }} style={styles.inputAvatar} />
                    <View style={styles.inputWrapper}>
                        <TextInput ref={commentInputRef} style={styles.commentInput} placeholder={t.commentPlaceholder} placeholderTextColor="#888" value={newComment} onChangeText={setNewComment} />
                        <TouchableOpacity onPress={handleAddComment} disabled={newComment.length === 0}><Text style={{color: newComment.length > 0 ? COLORS.primary : '#555', fontWeight:'bold', marginRight:15}}>{t.share}</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
         </KeyboardAvoidingView>
      </Modal>

      {/* MENU MODALI */}
      <Modal visible={menuVisible} animationType="fade" transparent={true} onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
            <View style={styles.menuBox}>
                {user && selectedPostForMenu && (String(selectedPostForMenu.userId) === String(user.id)) ? (
                    <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuAction('delete')}>
                        <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                        <Text style={[styles.menuOptionText, {color: '#FF3B30'}]}>{t.deletePost}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.menuOption} onPress={() => handleMenuAction('report')}>
                        <Ionicons name="alert-circle-outline" size={24} color="#FF3B30" />
                        <Text style={[styles.menuOptionText, {color: '#FF3B30'}]}>{t.report}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  header: { position: 'absolute', top: 50, left: 0, right: 0, zIndex: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  headerBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },
  postContainer: { width: width, height: height, backgroundColor: 'black', justifyContent: 'center' },
  imageWrapper: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' },
  fullImage: { width: width, height: height, backgroundColor: 'black' }, 
  
  // ✅ OVERLAY TEXT
  overlayTextContainer: { position: 'absolute', zIndex: 20 },
  overlayText: { 
      color: 'white', 
      fontWeight: 'bold', 
      textAlign: 'center', 
      paddingVertical: 5, 
      paddingHorizontal: 15, 
      borderRadius: 10,
      overflow: 'hidden'
  },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
  rightSidebar: { position: 'absolute', right: 15, bottom: 120, alignItems: 'center', zIndex: 99, elevation: 10 },
  sidebarItemGroup: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 30, paddingVertical: 15, paddingHorizontal: 5 },
  sidebarItem: { marginBottom: 20, alignItems: 'center', width: 50 },
  sidebarText: { color: 'white', fontSize: 12, fontWeight: '700', marginTop: 4 },
  bottomInfoContainer: { position: 'absolute', bottom: 0, left: 0, right: 70, paddingHorizontal: 15, paddingBottom: 40, paddingTop: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderTopRightRadius: 25 },
  userInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'white', marginRight: 12 },
  username: { color: 'white', fontWeight: 'bold', fontSize: 17 },
  description: { color: 'white', fontSize: 15, lineHeight: 22, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#777', fontSize: 16, marginTop: 10 },
  uploadBtnFirst: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-start', paddingTop: 50 },
  uploadContent: { margin: 20, borderRadius: 15, padding: 20, height: 550 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  uploadBody: { flexDirection: 'column' },
  
  // EDITOR STYLES
  editorContainer: { width: '100%', height: 350, borderRadius: 15, overflow: 'hidden', marginBottom: 15, backgroundColor: '#000', position: 'relative' },
  previewContainer: { width: '100%', height: '100%' },
  mediaContainer: { width: '100%', height: '100%' },
  uploadPreviewImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  
  draggableTextContainer: { position: 'absolute', zIndex: 30, alignSelf:'center', top: '40%' },
  
  editorToolbar: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 10 },
  toolBtn: { marginHorizontal: 15, padding: 5 },

  addTextButton: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20, zIndex: 40 },
  
  overlayInputWrapper: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  overlayInput: { color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center', width: '80%', padding: 10, borderBottomWidth:1, borderBottomColor:'white' },
  closeOverlayInput: { position: 'absolute', bottom: 50 },

  captionInput: { color: 'white', fontSize: 16, textAlignVertical: 'top', height: 60 },
  
  commentSheet: { backgroundColor: '#121212', height: '65%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  commentRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-start' },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  commentContent: { flex: 1 },
  commentUser: { color: 'white', fontWeight: 'bold', fontSize: 13, marginRight: 8 },
  commentText: { color: '#eee', fontSize: 14, marginTop: 2, lineHeight: 18 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#333' },
  inputAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#262626', borderRadius: 25, paddingLeft: 15, height: 45 },
  commentInput: { flex: 1, color: 'white', fontSize: 14 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menuBox: { backgroundColor: '#222', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  menuOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  menuOptionText: { color: 'white', fontSize: 16, marginLeft: 15, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#333' },
  bigPawContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 100, pointerEvents: 'none' },
});

export default PetsgramScreen;