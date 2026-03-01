import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase'; // Supabase client
import { AuthContext } from './AuthContext';

export const GameContext = createContext();

export const GAME_IDS = {
    CATCH: '1',
    MEMORY: '2',
    RUNNER: '3',
    DONATE: 'donate' // Bağış yapıldığında kullanılacak ID
};

export const GameProvider = ({ children }) => {
    const { user } = useContext(AuthContext); 

    const [userPoints, setUserPoints] = useState(0); 
    const [weeklyLeaderboard, setWeeklyLeaderboard] = useState([]); 
    const [allTimeLeaderboard, setAllTimeLeaderboard] = useState([]); // ✅ YENİ: Genel Sıralama State'i

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
                setUserPoints(data.total_score || 0);
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

    // --- ✅ YENİ: Genel Sıralamayı (Tüm Zamanlar) Getir ---
    const fetchAllTimeLeaderboard = async () => {
        try {
            const { data, error } = await supabase
                .from('all_time_leaderboard') // Veri tabanındaki genel sıralama view/tablo adı
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
            // ✅ Divider (Bölen) mantığı kaldırıldı. 
            // Tüm oyunlardan saf puan (10, 20, 50 vb.) gelecek ve doğrudan eklenecek.
            const earnedPoints = rawScore; 

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
                    
                    // ✅ 2. 3 TABLOYU ANINDA GÜNCELLE
                    setUserPoints(prev => prev + earnedPoints); // Ekranda anında günceller
                    fetchLeaderboard(); // Haftalık listeyi yenile
                    fetchAllTimeLeaderboard(); // Genel listeyi yenile
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
        if (!user || userPoints < amount) return false;

        try {
            // Veri tabanına eksi (-) skor olarak ekleyerek bakiyeden düşürüyoruz
            const { error } = await supabase
                .from('game_scores')
                .insert({
                    user_id: user.id,
                    game_id: GAME_IDS.DONATE,
                    score: -amount 
                });

            if (!error) {
                console.log(`Bağış yapıldı! Harcanan Puan: ${amount}`);
                setUserPoints(prev => prev - amount); // Ekranda anında düşürür
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
            fetchAllTimeLeaderboard(); // ✅ Başlangıçta genel listeyi de çek
        }
    }, [user]);

    return (
        <GameContext.Provider value={{ 
            userPoints,          
            weeklyLeaderboard,
            allTimeLeaderboard,  // ✅ Eklendi (Liderlik tablosu ekranına gidecek)
            saveGameScore,
            spendPoints,         
            fetchUserPoints,     
            fetchLeaderboard,    
            fetchAllTimeLeaderboard, // ✅ Eklendi
            GAME_IDS
        }}>
            {children}
        </GameContext.Provider>
    );
};