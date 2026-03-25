import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase'; // Supabase client
import { AuthContext } from './AuthContext';

export const GameContext = createContext();

export const GAME_IDS = {
    CATCH: '1',
    MEMORY: '2',
    RUNNER: '3',
    FLAPPY: '4', 
    BUBBLE: '5', 
    TOWER: '6', 
    QUIZ: '7', // ✅ Pito Quiz Eklendi
    TILE: '8', // ✅ Pito Karoları (Tile Match) Eklendi
    DONATE: 'donate' 
};

export const GameProvider = ({ children }) => {
    const { user } = useContext(AuthContext); 

    const [userPoints, setUserPoints] = useState(0); 
    const [weeklyLeaderboard, setWeeklyLeaderboard] = useState([]); 
    const [allTimeLeaderboard, setAllTimeLeaderboard] = useState([]); 

    // --- Kullanıcı Puanını Getir ---
    const fetchUserPoints = async () => {
        if (!user) return;
        
        try {
            const { data, error } = await supabase
                .from('user_total_scores')
                .select('total_score')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error("Puan çekerken Supabase hatası:", error);
                return;
            }

            if (data) {
                setUserPoints(parseInt(data.total_score, 10) || 0);
            } else {
                setUserPoints(0);
            }
        } catch (error) {
            console.error("Puan çekme genel hatası:", error);
        }
    };

    // --- Haftalık Sıralamayı Getir ---
    const fetchLeaderboard = async () => {
        try {
            const { data, error } = await supabase
                .from('weekly_leaderboard')
                .select('*')
                .limit(10); 

            if (error) {
                console.error("Haftalık sıralama çekerken Supabase hatası:", error);
                return;
            }

            if (data) {
                setWeeklyLeaderboard(data);
            }
        } catch (error) {
            console.error("Haftalık Sıralama hatası:", error);
        }
    };

    // --- Genel Sıralamayı (Tüm Zamanlar) Getir ---
    const fetchAllTimeLeaderboard = async () => {
        try {
            const { data, error } = await supabase
                .from('all_time_leaderboard') 
                .select('*')
                .limit(10); 

            if (error) {
                console.error("Genel sıralama çekerken Supabase hatası:", error);
                return;
            }

            if (data) {
                setAllTimeLeaderboard(data);
            }
        } catch (error) {
            console.error("Genel Sıralama hatası:", error);
        }
    };

    // --- SKOR KAYDETME (Oyun Bittiğinde Çağırılacak) ---
    const saveGameScore = async (gameId, rawScore) => {
        if (!user) return 0;

        try {
            // ✅ GÜVENLİK: Gelen skorun kesinlikle Matematiksel Sayı (Integer) olduğundan emin oluyoruz!
            const earnedPoints = parseInt(rawScore, 10) || 0; 

            if (earnedPoints > 0) {
                // 1. Supabase'e Yaz
                const { error } = await supabase
                    .from('game_scores')
                    .insert({
                        user_id: user.id,
                        game_id: gameId,
                        score: earnedPoints 
                    });

                if (!error) {
                    console.log(`Skor eklendi! Kazanılan Puan: ${earnedPoints}`);
                    
                    // 2. State'i matematiksel olarak güvenle güncelle
                    setUserPoints(prev => (parseInt(prev, 10) || 0) + earnedPoints); 
                    
                    // 3. Veritabanından kesin doğrulama için puanları tekrar çek ve listeleri yenile
                    await fetchUserPoints(); 
                    fetchLeaderboard(); 
                    fetchAllTimeLeaderboard(); 
                } else {
                    console.error("Skor insert hatası:", error);
                }
            }
            
            return earnedPoints;

        } catch (e) {
            console.error("Skor kaydetme hatası:", e);
            return 0;
        }
    };

    // --- PUAN HARCAMA (Bağış Yapıldığında Çağırılacak) ---
    const spendPoints = async (amount) => {
        const spendAmount = parseInt(amount, 10) || 0;
        if (!user || userPoints < spendAmount) return false;

        try {
            // Veri tabanına eksi (-) skor olarak ekleyerek bakiyeden düşürüyoruz
            const { error } = await supabase 
                .from('game_scores')
                .insert({
                    user_id: user.id,
                    game_id: GAME_IDS.DONATE,
                    score: -spendAmount 
                });

            if (!error) {
                console.log(`Bağış yapıldı! Harcanan Puan: ${spendAmount}`);
                
                // State'ten düş
                setUserPoints(prev => (parseInt(prev, 10) || 0) - spendAmount); 
                
                // Supabase'den güncel veriyi çekerek eşitle
                await fetchUserPoints();
                
                return true;
            } else {
                console.error("Puan harcama insert hatası:", error);
            }
            return false;
        } catch (e) {
            console.error("Puan harcama hatası:", e);
            return false;
        }
    };

    // --- KULLANICI GİRİŞ YAPTIĞINDA TÜM LİSTELERİ ÇEK ---
    useEffect(() => {
        if (user) {
            fetchUserPoints();
            fetchLeaderboard();
            fetchAllTimeLeaderboard(); 
        }
    }, [user]);

    return (
        <GameContext.Provider value={{ 
            userPoints,          
            weeklyLeaderboard,
            allTimeLeaderboard,  
            saveGameScore,
            spendPoints,         
            fetchUserPoints,     
            fetchLeaderboard,    
            fetchAllTimeLeaderboard, 
            GAME_IDS
        }}>
            {children}
        </GameContext.Provider>
    );
};