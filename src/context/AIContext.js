import React, { createContext, useState, useContext } from 'react';
import { AuthContext } from './AuthContext';

export const AIContext = createContext();

export const AIProvider = ({ children }) => {
  const { country } = useContext(AuthContext); 
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  const activeLang = country?.code || 'TR';
  
  // Botun kişiliği (Prompt)
  const systemInstruction = activeLang === 'TR' 
    ? "Sen Pito uygulamasının veteriner asistanı VeterinerBOT'sun. Kedi, köpek ve kuşlar hakkında kısa, samimi ve emojili tavsiyeler ver. Tıbbi teşhis koyma."
    : "You are VetBOT. Give short, friendly advice about pets with emojis. No medical diagnosis.";

  // ✅ AI API Endpoint'i artık .env dosyasından çekiliyor
  const AI_BASE_URL = process.env.EXPO_PUBLIC_AI_ENDPOINT || 'https://text.pollinations.ai';

  const sendMessageToBot = async (userMessage) => {
    // 1. Kullanıcı mesajını ekrana bas
    const newUserMsg = { id: Date.now().toString(), text: userMessage, sender: 'user' };
    const newHistory = [...messages, newUserMsg];
    setMessages(newHistory);
    setIsTyping(true);

    try {
      // 2. AI İsteği
      // Prompt'u URL uyumlu hale getiriyoruz
      const fullPrompt = `${systemInstruction} Kullanıcı dedi ki: "${userMessage}"`;
      const encodedPrompt = encodeURIComponent(fullPrompt);
      
      // Rastgele seed ekliyoruz ki aynı soruya hep aynı cevabı vermesin (Canlılık katar)
      const randomSeed = Math.floor(Math.random() * 10000);

      // Model olarak 'openai' (GPT-4o mini) kullanıyoruz. 
      const response = await fetch(
        `${AI_BASE_URL}/${encodedPrompt}?model=openai&seed=${randomSeed}`
      );

      if (!response.ok) {
        throw new Error("Sunucu yanıt vermedi");
      }

      // Bu API direkt metin (text) döner, JSON değil.
      const botReply = await response.text();

      // 3. Botun cevabını ekrana bas
      const newBotMsg = { id: (Date.now() + 1).toString(), text: botReply, sender: 'bot' };
      setMessages(prev => [...prev, newBotMsg]);

    } catch (error) {
      console.error("AI Hatası:", error);
      const errorMsg = { 
        id: (Date.now() + 1).toString(), 
        text: "İnternet bağlantısında bir sorun var sanırım, şu an ulaşamıyorum 📡", 
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