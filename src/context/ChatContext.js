import React, { createContext, useState, useEffect, useContext } from 'react';
import * as Notifications from 'expo-notifications'; // 🔔 BİLDİRİM KÜTÜPHANESİ EKLENDİ
import { supabase } from '../lib/supabase'; 
import { AuthContext } from './AuthContext'; 
import { playSound } from '../utils/SoundManager';

// --- BİLDİRİM AYARLARI (Uygulama açıkken bildirimin nasıl görüneceği) ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Ekranın üstünden düşsün
    shouldPlaySound: true, // Expo'nun kendi sesi (SoundManager ile de destekliyoruz)
    shouldSetBadge: true,
  }),
});

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);

  // 🔄 1. Uygulama açıldığında bildirim izni al, mesajları çek ve dinlemeyi başlat
  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }

    // Bildirim izni isteme
    requestNotificationPermissions();

    fetchMessages();

    // 📡 CANLI DİNLEME (Realtime)
    const channel = supabase
      .channel('db-messages')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        
        // ✨ YENİ: EĞER BİZE YENİ BİR MESAJ GELDİYSE BİLDİRİM GÖSTER VE SES ÇAL
        if (payload.eventType === 'INSERT') {
            const newMessage = payload.new;
            // Eğer mesajı gönderen biz değilsek ve alıcı bizsek
            if (newMessage.sender_id !== user.id && newMessage.receiver_id === user.id) {
                // Sesi çal (Yeni noti.mp3 sesini kullanıyoruz)
                playSound('noti');
                
                // Üstten düşen lokal bildirimi tetikle
                triggerLocalNotification(
                    "PITO'dan Yeni Mesaj 🐾", 
                    newMessage.image ? "📷 Fotoğraf gönderdi." : newMessage.text
                );
            }
        }

        fetchMessages(); // Listeyi tazele
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 🔔 BİLDİRİM İZNİ VE GÖNDERME FONKSİYONLARI
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
      trigger: null, // null demek "hemen şimdi göster" demek
    });
  };

  // ✅ VERİTABANINDAN MESAJLARI ÇEK VE SOHBET LİSTESİ OLUŞTUR
  const fetchMessages = async () => {
    try {
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
      
      data.forEach(msg => {
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

  // 📤 MESAJ GÖNDER
  const sendMessage = async (chatId, sender, receiver, text, listingId, listingName, image = null, type = 'text', relatedId = null) => {
    if (!user) return;

    // Kendi gönderdiğimiz mesajlarda da ses çalıyoruz (Yeni noti.mp3 sesini kullanıyoruz)
    playSound('noti');

    const room_id = chatId || [sender.id, receiver.id].sort().join('_');
    
    const tempMessage = {
      id: Date.now(), 
      text: text || '',
      image: image, 
      type: image ? 'image' : 'text',
      senderId: sender.id,
      createdAt: new Date().toISOString(),
      isRead: false,
      reactions: []
    };

    setConversations(prev => {
      const updated = [...prev];
      const chatIndex = updated.findIndex(c => c.id === room_id);

      if (chatIndex > -1) {
        updated[chatIndex].messages.push(tempMessage);
        updated[chatIndex].lastMessage = image ? '📷 Fotoğraf' : text;
        updated[chatIndex].lastMessageDate = tempMessage.createdAt;
      } else {
        updated.push({
          id: room_id,
          participants: [
            { id: sender.id, name: sender.fullname, avatar: sender.avatar },
            { id: receiver.id, name: receiver.fullname, avatar: receiver.avatar }
          ],
          messages: [tempMessage],
          lastMessage: image ? '📷 Fotoğraf' : text,
          lastMessageDate: tempMessage.createdAt
        });
      }
      return updated.sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate));
    });

    try {
      let finalImageUrl = image;

      if (image && image.startsWith('file://')) {
          const ext = image.split('.').pop() || 'jpeg';
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          
          const response = await fetch(image);
          const blob = await response.blob();

          const { error: uploadError } = await supabase
              .storage
              .from('chat-images')
              .upload(fileName, blob, {
                  contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
              });

          if (uploadError) {
              console.log("Resim yüklenemedi:", uploadError);
              throw uploadError;
          }

          const { data: publicUrlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);
          finalImageUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase
        .from('messages')
        .insert([{
          room_id: room_id,
          sender_id: sender.id,
          receiver_id: receiver.id,
          text: text || '',
          image: finalImageUrl, 
          is_read: false
        }]);

      if (error) throw error;

    } catch (e) {
      console.log("Mesaj gönderme hatası:", e);
    }
  };

  // ❤️ MESAJ REAKSİYONU
  const reactToMessage = async (chatId, messageId, reactionType = '🐾') => {
    if (reactionType === '🐾') playSound('paw');

    try {
      console.log("Reaksiyon gönderildi:", messageId);
    } catch (e) {
      console.log("Reaksiyon hatası:", e);
    }
  };

  // 🗑️ MESAJ SİL
  const deleteMessage = async (chatId, messageId) => {
    if (!user) return;

    setConversations(prev => prev.map(chat => {
        if (chat.id === chatId) {
            return { ...chat, messages: chat.messages.filter(m => m.id !== messageId) };
        }
        return chat;
    }));

    try {
      await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id); 
    } catch (e) {
      console.log("Mesaj silme hatası:", e);
    }
  };

  // 🗑️ SOHBETİ SİL
  const deleteConversation = async (chatId) => {
    if (!user) return;

    setConversations(prev => prev.filter(c => c.id !== chatId));

    try {
      await supabase
        .from('messages')
        .delete()
        .eq('room_id', chatId)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
    } catch (e) {
      console.log("Sohbet silme hatası:", e);
    }
  };

  // 👀 OKUNDU OLARAK İŞARETLE
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

  // 🔔 OKUNMAMIŞ SAYISI
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