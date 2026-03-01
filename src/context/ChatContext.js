import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase'; // ✅ Supabase eklendi
import { AuthContext } from './AuthContext'; // ✅ Kullanıcı ID'si için eklendi
import { playSound } from '../utils/SoundManager';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [conversations, setConversations] = useState([]);

  // 🔄 1. Uygulama açıldığında veya kullanıcı değiştiğinde mesajları çek ve dinlemeyi başlat
  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }

    fetchMessages();

    // 📡 CANLI DİNLEME (Realtime)
    const channel = supabase
      .channel('db-messages')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages' 
      }, () => {
        fetchMessages(); // Listeyi tazele
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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

  // 📤 MESAJ GÖNDER (Veritabanına Kaydet)
  const sendMessage = async (chatId, sender, receiver, text, listingId, listingName, image = null, type = 'text', relatedId = null) => {
    if (!user) return;

    playSound('message');

    try {
      const room_id = chatId || [sender.id, receiver.id].sort().join('_');

      const { error } = await supabase
        .from('messages')
        .insert([{
          room_id: room_id,
          sender_id: sender.id,
          receiver_id: receiver.id,
          text: text || '',
          image: image, 
          is_read: false
        }]);

      if (error) throw error;

    } catch (e) {
      console.log("Mesaj gönderme hatası:", e);
    }
  };

  // ❤️ MESAJ REAKSİYONU (Update)
  const reactToMessage = async (chatId, messageId, reactionType = '🐾') => {
    if (reactionType === '🐾') playSound('paw');

    try {
      console.log("Reaksiyon gönderildi (DB kolonu varsa işler):", messageId);
    } catch (e) {
      console.log("Reaksiyon hatası:", e);
    }
  };

  // 🗑️ MESAJ SİL (GÜVENLİK EKLENDİ)
  const deleteMessage = async (chatId, messageId) => {
    if (!user) return;
    try {
      await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id); // 🚨 Sadece mesajı GÖNDEREN silebilir!
    } catch (e) {
      console.log("Mesaj silme hatası:", e);
    }
  };

  // 🗑️ SOHBETİ SİL (Odadaki tüm mesajları siler) (GÜVENLİK EKLENDİ)
  const deleteConversation = async (chatId) => {
    if (!user) return;
    try {
      // 🚨 Sadece odanın içinde olan kişi o odayı silebilir
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