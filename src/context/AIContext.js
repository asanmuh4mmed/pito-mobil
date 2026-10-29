import React, { createContext, useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { requestAi, aiErrorText } from '../utils/requestAi';
export const AIContext = createContext();
export const AIProvider = ({ children }) => {
    const { user, language } = useContext(AuthContext);
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const run = useRef({ version: 0, busy: false, controller: null, live: true });
    const accountId = useRef(user?.id); accountId.current = user?.id;
    const clearChat = () => {
        run.current.version++; run.current.controller?.abort(); run.current.busy = false;
        setMessages([]); setIsTyping(false);
    };
    useEffect(() => { clearChat(); }, [user?.id]);
    useEffect(() => {
        run.current.live = true;
        return () => { run.current.live = false; run.current.version++; run.current.controller?.abort(); };
    }, []);
    const sendMessageToBot = async input => {
        if (run.current.busy || typeof input !== 'string' || !input.trim()) return;
        const english = language === 'EN';
        if (!user?.id) {
            setMessages(prev => [...prev, { id: `${Date.now()}-auth`, text: aiErrorText({ code: 'auth' }, english), sender: 'bot' }]);
            return;
        }
        const ownerId = user.id;
        const version = ++run.current.version;
        const current = () => run.current.live && run.current.version === version && accountId.current === ownerId;
        const controller = new AbortController(); run.current.controller = controller;
        run.current.busy = true; setIsTyping(true);
        setMessages(prev => [...prev, { id: `${Date.now()}-user-${version}`, text: input, sender: 'user' }]);
        try {
            let text;
            if (input.startsWith('IMAGE_CODE::')) {
                text = english ? 'I cannot analyse photos in this chat. Please describe the issue, or use the photo prediction screen. 🐾' : 'Bu sohbette fotoğrafları analiz edemiyorum. Sorunu yazıyla anlatabilir veya fotoğraf tahmini ekranını kullanabilirsin. 🐾';
            } else {
                const data = await requestAi({ kind: 'chat', text: input, language: english ? 'EN' : 'TR' }, controller.signal);
                text = data.reply;
            }
            if (current()) setMessages(prev => [...prev, { id: `${Date.now()}-bot-${version}`, text, sender: 'bot' }]);
        } catch (error) {
            if (current()) setMessages(prev => [...prev, { id: `${Date.now()}-error-${version}`, text: aiErrorText(error, english), sender: 'bot' }]);
        } finally {
            if (current()) { run.current.busy = false; run.current.controller = null; setIsTyping(false); }
        }
    };
    return <AIContext.Provider value={{ messages, sendMessageToBot, isTyping, clearChat }}>{children}</AIContext.Provider>;
};
