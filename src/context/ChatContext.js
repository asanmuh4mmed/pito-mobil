import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy'; 
import { supabase } from '../lib/supabase'; 
import { AuthContext } from './AuthContext'; 
import { playSound } from '../utils/SoundManager';
import { sendPushNotification } from '../utils/sendPushNotification';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, 
    shouldPlaySound: true, 
    shouldSetBadge: true,
  }),
});

// React Native uploads must use the image bytes rather than a Blob.
const decodeChatImage = (base64) => {
  const binary = atob(base64.replace(/^data:[^,]*,/, '').replace(/\s/g, ''));
  if (!binary.length) throw new Error('Fotoğraf dosyası boş.');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const getChatImageFormat = (buffer, asset, uri) => {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xFF && bytes[1] === 0xD8) return { ext: 'jpg', mime: 'image/jpeg' };
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return { ext: 'png', mime: 'image/png' };
  if (bytes[0] === 0x47 && bytes[1] === 0x49) return { ext: 'gif', mime: 'image/gif' };
  const header = String.fromCharCode(...bytes.slice(0, 16));
  if (header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  if (header.includes('ftyphei') || header.includes('ftypmif1')) return { ext: 'heic', mime: 'image/heic' };
  const extension = (asset?.fileName || uri).split('?')[0].split('.').pop().toLowerCase();
  const formats = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif' };
  const ext = Object.keys(formats).find(key => formats[key] === asset?.mimeType) || extension;
  if (!formats[ext]) throw new Error('Fotoğraf formatı belirlenemedi. JPG veya PNG seçin.');
  return { ext, mime: formats[ext] };
};

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);
  const deletedThroughRef = useRef({});
  const accountIdRef = useRef(user?.id);
  accountIdRef.current = user?.id;
  useEffect(() => { deletedThroughRef.current = {}; }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }

    requestNotificationPermissions();
    fetchMessages();

    const channel = supabase
      .channel('public-messages-channel') 
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        
        const newMessage = payload.new;
        
        if (newMessage.sender_id !== user.id && newMessage.receiver_id === user.id) {
            playSound('noti');
            triggerLocalNotification(
                "PITO'dan Yeni Mesaj 🐾", 
                newMessage.image ? "📷 Fotoğraf gönderdi." : newMessage.text
            );
        }

        fetchMessages(); 
      })
      .subscribe((status) => {
        console.log("Supabase Realtime Durumu:", status); 
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
        console.log("Bildirim izni verilmedi!");
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

  const fetchMessages = async () => {
    const requestedUserId = user?.id;
    if (!requestedUserId) return;
    try {
      const { data: hiddenRooms, error: hiddenError } = await supabase
        .from('chat_history_deletions').select('room_id, deleted_through').eq('user_id', requestedUserId);
      if (hiddenError) throw hiddenError;
      if (accountIdRef.current !== requestedUserId) return;
      for (const row of hiddenRooms || []) {
        const previous = deletedThroughRef.current[row.room_id];
        if (!previous || Date.parse(row.deleted_through) > Date.parse(previous)) deletedThroughRef.current[row.room_id] = row.deleted_through;
      }
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(id, fullname, avatar),
          receiver:receiver_id(id, fullname, avatar)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const chats = {};
      
      if (accountIdRef.current !== requestedUserId) return;
      data.forEach(msg => {
        const cutoff = deletedThroughRef.current[msg.room_id];
        if (cutoff && Date.parse(msg.created_at) <= Date.parse(cutoff)) return;
        if (!chats[msg.room_id]) {
          const isSender = msg.sender_id === user.id;
          const partner = isSender ? msg.receiver : msg.sender;

          chats[msg.room_id] = {
            id: msg.room_id,
            participants: [
              { id: user.id, name: user.fullname, avatar: user.avatar },
              { id: partner?.id, name: partner?.fullname, avatar: partner?.avatar }
            ],
            messages: [],
            lastMessage: '',
            lastMessageDate: ''
          };
        }
        
        const formattedMsg = {
          id: msg.id,
          text: msg.text,
          image: msg.image,
          type: msg.image ? 'image' : 'text', 
          senderId: msg.sender_id,
          createdAt: msg.created_at,
          isRead: msg.is_read,
          reactions: msg.reactions || [] 
        };

        chats[msg.room_id].messages.push(formattedMsg);
        
        const previewText = msg.image ? '📷 Fotoğraf' : (msg.text || '');
        chats[msg.room_id].lastMessage = previewText;
        chats[msg.room_id].lastMessageDate = msg.created_at;
      });

      const sortedChats = Object.values(chats).sort((a, b) => 
        new Date(b.lastMessageDate) - new Date(a.lastMessageDate)
      );

      setConversations(sortedChats);

    } catch (e) {
      console.log("Mesaj çekme hatası:", e);
    }
  };

  const sendMessage = async (chatId, sender, receiver, text, listingId, listingName, image = null, type = 'text', relatedId = null, imageAsset = null) => {
    if (!user || !sender?.id || !receiver?.id) return { success: false, error: 'Mesaj için giriş yapmalısınız.' };
    playSound('noti');
    const room_id = chatId || [sender.id, receiver.id].sort().join('_');
    const tempMessage = {
      id: `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: text || '', image, type: image ? 'image' : 'text', senderId: sender.id,
      createdAt: new Date().toISOString(), isRead: false, reactions: [], status: 'sending'
    };
    const participants = [
      { id: sender.id, name: sender.fullname, avatar: sender.avatar },
      { id: receiver.id, name: receiver.fullname, avatar: receiver.avatar }
    ];
    const updateRoom = (prev, messages) => {
      const cutoff = deletedThroughRef.current[room_id];
      if (cutoff) messages = messages.filter(message => Date.parse(message.createdAt) > Date.parse(cutoff));
      if (!messages.length) return prev.filter(chat => chat.id !== room_id);
      const existing = prev.find(chat => chat.id === room_id);
      const last = messages[messages.length - 1];
      const room = { ...existing, id: room_id, participants: existing?.participants || participants,
        messages, lastMessage: last ? (last.image ? '📷 Fotoğraf' : last.text || '') : '',
        lastMessageDate: last?.createdAt || '' };
      return [...prev.filter(chat => chat.id !== room_id), room]
        .sort((a, b) => new Date(b.lastMessageDate || 0) - new Date(a.lastMessageDate || 0));
    };
    setConversations(prev => updateRoom(prev, [...(prev.find(chat => chat.id === room_id)?.messages || []), tempMessage]));
    let insertedMsg;
    let finalImageUrl = image;
    try {
      if (image && !/^https?:\/\//i.test(image)) {
        const base64 = imageAsset?.base64 || await FileSystem.readAsStringAsync(image, { encoding: FileSystem.EncodingType.Base64 });
        const bytes = decodeChatImage(base64);
        const format = getChatImageFormat(bytes, imageAsset, image);
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${format.ext}`;
        const { error: uploadError } = await supabase.storage.from('chat-images')
          .upload(fileName, bytes, { contentType: format.mime, upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('chat-images').getPublicUrl(fileName);
        if (!data?.publicUrl) throw new Error('Fotoğraf adresi oluşturulamadı.');
        finalImageUrl = data.publicUrl;
      }
      const result = await supabase.from('messages').insert([{
        room_id, sender_id: sender.id, receiver_id: receiver.id,
        text: text || '', image: finalImageUrl, is_read: false
      }]).select().single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error('Mesaj kaydedilemedi.');
      insertedMsg = result.data;
      const savedMessage = { ...tempMessage, id: insertedMsg.id, image: finalImageUrl,
        createdAt: insertedMsg.created_at || tempMessage.createdAt, status: 'sent' };
      // New objects are essential: memoized message rows must receive changed props.
      setConversations(prev => {
        const messages = (prev.find(chat => chat.id === room_id)?.messages || [])
          .filter(message => message.id !== tempMessage.id && String(message.id) !== String(insertedMsg.id));
        return updateRoom(prev, [...messages, savedMessage].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
      });
    } catch (e) {
      console.error('Mesaj veya fotoğraf gönderilemedi:', e);
      setConversations(prev => {
        const messages = (prev.find(chat => chat.id === room_id)?.messages || []).filter(message => message.id !== tempMessage.id);
        if (!messages.length) return prev.filter(chat => chat.id !== room_id);
        return updateRoom(prev, messages);
      });
      return { success: false, error: e.message || 'Mesaj gönderilemedi.' };
    }
    // A notification error must not turn an already saved message into a failure.
    try {
      const { data: pushResult, error: pushError } = await supabase.functions.invoke('send-message-push', {
        body: { message_id: insertedMsg.id },
      });
      if (pushError || pushResult?.success === false) {
        console.log('Mesaj kaydedildi; bildirim sunucusu gönderimi doğrulayamadı.');
      }

    } catch (e) {
      console.log('Mesaj kaydedildi; bildirim gönderilemedi:', e);
    }
    return { success: true, message: insertedMsg };
  };

  const reactToMessage = async (chatId, messageId, reactionType = '🐾') => {
    if (reactionType === '🐾') playSound('paw');
    try {
      console.log("Reaksiyon gönderildi:", messageId);
    } catch (e) {
      console.log("Reaksiyon hatası:", e);
    }
  };

  const deleteMessage = async (chatId, messageId) => {
    if (!user) return;

    const prevConversations = [...conversations];

    setConversations(prev => prev.map(chat => {
        if (chat.id === chatId) {
            return { ...chat, messages: chat.messages.filter(m => m.id !== messageId) };
        }
        return chat;
    }));

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id); 
        
      if (error) {
          console.error("Supabase silme hatası:", error.message);
          setConversations(prevConversations); 
          throw error;
      }
    } catch (e) {
      console.log("Mesaj silme işlemi başarısız:", e);
    }
  };

  const deleteConversation = async (chatId) => {
    const requestedUserId = user?.id;
    if (!requestedUserId) return { success: false, error: 'Giriş yapmalısınız.' };
    try {
      const { data: cutoff, error } = await supabase.rpc('delete_my_chat_history', { p_room_id: String(chatId) });
      if (error) throw error;
      if (!cutoff || !Number.isFinite(Date.parse(cutoff))) throw new Error('Silme onayı alınamadı.');
      if (accountIdRef.current === requestedUserId) {
        deletedThroughRef.current[chatId] = cutoff;
        setConversations(prev => prev.map(chat => {
          if (String(chat.id) !== String(chatId)) return chat;
          const messages = chat.messages.filter(message => Date.parse(message.createdAt) > Date.parse(cutoff));
          const last = messages[messages.length - 1];
          return { ...chat, messages, lastMessage: last ? (last.image ? '📷 Fotoğraf' : last.text || '') : '', lastMessageDate: last?.createdAt || '' };
        }).filter(chat => chat.messages.length > 0));
      }
      return { success: true };
    } catch (error) {
      console.error('Sohbet silinemedi:', error);
      return { success: false, error: error.message || 'Sohbet silinemedi.' };
    }
  };

  const markAsRead = async (chatId, currentUserId) => {
    setConversations(prev => prev.map(chat => {
        if (chat.id === chatId) {
            const updatedMessages = chat.messages.map(m => 
                (String(m.senderId) !== String(currentUserId) && !m.isRead) ? { ...m, isRead: true } : m
            );
            return { ...chat, messages: updatedMessages };
        }
        return chat;
    }));

    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('room_id', chatId)
        .eq('receiver_id', currentUserId)
        .eq('is_read', false);
    } catch (e) {
      console.log("Okundu işaretleme hatası:", e);
    }
  };

  const getUnreadCount = (currentUserId) => {
    if (!currentUserId) return 0;
    let count = 0;
    conversations.forEach(chat => {
      const unreadInChat = chat.messages.filter(m => 
        String(m.senderId) !== String(currentUserId) && !m.isRead
      ).length;
      count += unreadInChat;
    });
    return count;
  };

  return (
    <ChatContext.Provider value={{ 
        conversations, sendMessage, markAsRead, getUnreadCount, 
        reactToMessage, deleteMessage, deleteConversation 
    }}>
      {children}
    </ChatContext.Provider>
  );
};