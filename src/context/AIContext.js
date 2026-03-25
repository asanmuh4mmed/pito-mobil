import React, { createContext, useState, useContext } from 'react';
import { AuthContext } from './AuthContext';

export const AIContext = createContext();

export const AIProvider = ({ children }) => {
  const { country } = useContext(AuthContext); 
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const activeLang = country?.code || 'TR';
  
  const systemInstruction = activeLang === 'TR' 
    ? "Sen Pito'nun veteriner asistanı VeterinerBOT'sun. Sadece hayvan bakımı hakkında kısa, tatlı ve emojili cevaplar ver. Tıbbi teşhis koyma."
    : "You are VetBOT. Give short, friendly advice about pets with emojis. No medical diagnosis.";

  // ✨ YENİ: Groq API Endpoint'i ve Şifresi
  const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

  const sendMessageToBot = async (userMessage) => {
    const newUserMsg = { id: Date.now().toString() + Math.random().toString(36).substring(7), text: userMessage, sender: 'user' };
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    // 📸 Fotoğraf kontrolü (Yapay zekanın çökmesini engeller)
    if (userMessage.startsWith('IMAGE_CODE::')) {
        setTimeout(() => {
            const botImageReply = activeLang === 'TR' 
                ? "Ne kadar tatlı bir fotoğraf! 🐾 Şu an fotoğrafları tam olarak göremiyorum ama bana sorunu yazarak anlatırsan seve seve yardımcı olurum!" 
                : "What a cute photo! 🐾 I can't see images clearly right now, but if you describe the issue to me, I'll gladly help!";
            
            setMessages(prev => [...prev, { id: Date.now().toString(), text: botImageReply, sender: 'bot' }]);
            setIsTyping(false);
        }, 1500);
        return; 
    }

    try {
      // 15 Saniyelik Zaman Aşımı Koruyucusu
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); 

      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            model: "llama-3.1-8b-instant", // Güncel model buraya eklendi
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 200
        }),
        signal: controller.signal 
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.log("Groq Red Kodu:", response.status, errText);
        throw new Error(`Groq reddetti: Kod ${response.status}`);
      }

      const data = await response.json();
      
      let botReply = data.choices[0]?.message?.content || "Miyav! Şu an kafam biraz karışık 🐾";
      
      const newBotMsg = { id: Date.now().toString(), text: botReply.trim(), sender: 'bot' };
      setMessages(prev => [...prev, newBotMsg]);

    } catch (error) {
      console.error("AI Hatası Detayı:", error);
      
      const errorMsg = { 
        id: Date.now().toString(), 
        text: activeLang === 'TR' 
          ? "İnternet bağlantısında bir sorun var veya sunucu çok yoğun. Lütfen birazdan tekrar dene 📡" 
          : "There is a network issue or the server is busy. Please try again later 📡", 
        sender: 'bot' 
      };
      setMessages(prev => [...prev, errorMsg]);

    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
      setMessages([]);
  };

  return (
    <AIContext.Provider value={{ messages, sendMessageToBot, isTyping, clearChat }}>
      {children}
    </AIContext.Provider>
  );
};