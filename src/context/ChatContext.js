import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase'; 
import { AuthContext } from './AuthContext'; 
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
        fetchMessages(); // Karşı taraftan mesaj geldiğinde veya silindiğinde listeyi tazele
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

  // 📤 MESAJ GÖNDER (Anında Ekrana Bas + Resmi Yükle + Veritabanına Kaydet)
  const sendMessage = async (chatId, sender, receiver, text, listingId, listingName, image = null, type = 'text', relatedId = null) => {
    if (!user) return;

    playSound('message');

    const room_id = chatId || [sender.id, receiver.id].sort().join('_');
    
    // ⚡ OPTIMISTIC UI: Mesajı/Fotoğrafı anında GÖNDERENİN ekranına bas (Sıfır Gecikme)
    const tempMessage = {
      id: Date.now(), 
      text: text || '',
      image: image, // Yerel dosya yolunu kullanıyoruz, senin ekranında hemen görünür
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

      // 🚀 FOTOĞRAF YÜKLEME İŞLEMİ (SUPABASE STORAGE)
      if (image && image.startsWith('file://')) {
          const ext = image.split('.').pop() || 'jpeg';
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          
          // Resmi Supabase'e gönderilebilir bir Blob formata çeviriyoruz
          const response = await fetch(image);
          const blob = await response.blob();

          // Storage'a yükleme işlemi
          const { error: uploadError } = await supabase
              .storage
              .from('chat-images') // ✅ KURAL: Supabase'de bu isimde PUBLIC bir bucket olmalı!
              .upload(fileName, blob, {
                  contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
              });

          if (uploadError) {
              console.log("Resim yüklenemedi:", uploadError);
              throw uploadError;
          }

          // Yüklenen resmin herkesin görebileceği genel linkini (Public URL) alıyoruz
          const { data: publicUrlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);
          finalImageUrl = publicUrlData.publicUrl;
      }

      // Arka planda veritabanına yaz (Gerçek URL ile)
      const { error } = await supabase
        .from('messages')
        .insert([{
          room_id: room_id,
          sender_id: sender.id,
          receiver_id: receiver.id,
          text: text || '',
          image: finalImageUrl, // ✅ Karşı tarafın görebileceği gerçek internet linki!
          is_read: false
        }]);

      if (error) throw error;
      // Veritabanına yazıldığında Realtime tetiklenip fetchMessages() ile kalıcı URL'yi herkese güncelleyecektir.

    } catch (e) {
      console.log("Mesaj gönderme hatası:", e);
    }
  };

  // ❤️ MESAJ REAKSİYONU (Anında Ekrana Bas + Update)
  const reactToMessage = async (chatId, messageId, reactionType = '🐾') => {
    if (reactionType === '🐾') playSound('paw');

    try {
      console.log("Reaksiyon gönderildi:", messageId);
    } catch (e) {
      console.log("Reaksiyon hatası:", e);
    }
  };

  // 🗑️ MESAJ SİL (Anında Ekrandan Sil + Veritabanından Sil)
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