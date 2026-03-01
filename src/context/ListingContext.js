import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase'; 
import { AuthContext } from './AuthContext'; 
import { playSound } from '../utils/SoundManager'; 

export const ListingContext = createContext();

export const ListingProvider = ({ children }) => {
    const { user } = useContext(AuthContext); 
    
    const [urgentList, setUrgentList] = useState([]);
    const [mateList, setMateList] = useState([]);
    const [vetList, setVetList] = useState([]);
    const [sitterList, setSitterList] = useState([]);
    const [reviews, setReviews] = useState([]); 
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchListings();
        
        // 'listings' tablosunu dinle (Anlık güncelleme için)
        const subscription = supabase
            .channel('public:listings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
                fetchListings();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    // --- VERİLERİ ÇEK (listings tablosundan) ---
    const fetchListings = async () => {
        try {
            setLoading(true);
            
            const { data, error } = await supabase
                .from('listings')
                .select('*, users ( fullname, avatar, id )') 
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedData = data.map(item => ({
                    ...item,
                    ownerId: item.owner_id, 
                    
                    ownerName: item.users?.fullname || 'Kullanıcı',
                    ownerAvatar: item.users?.avatar || null,
                    
                    img: (item.images && item.images.length > 0) ? item.images[0] : (item.img || 'https://via.placeholder.com/150'),
                    
                    subtitle: item.breed || item.city || 'Detay Yok'
                }));

                setUrgentList(formattedData.filter(item => item.category === 'Sahiplendirme' || item.category === 'Adopt'));
                setMateList(formattedData.filter(item => item.category === 'Eş Arayanlar' || item.category === 'Find Mate'));
                setVetList(formattedData.filter(item => item.category === 'Veteriner Klinikleri' || item.category === 'Vet Clinics'));
                setSitterList(formattedData.filter(item => item.category === 'Bakıcı' || item.category === 'Pet Sitter'));
            }

        } catch (e) {
            console.log("İlan çekme hatası:", e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- İLAN EKLEME (listings tablosuna) ---
    const addListing = async (category, newListing) => {
        if (!user) return { success: false, msg: 'Giriş yapmalısınız.' };

        try {
            playSound('post'); 

            const mainImage = newListing.media && newListing.media.length > 0 ? newListing.media[0].uri : null;
            const allImages = newListing.media ? newListing.media.map(m => m.uri) : [];

            const { error } = await supabase
                .from('listings')
                .insert({
                    owner_id: user.id, // Sahip ID'si ekleniyor
                    name: newListing.name, 
                    description: newListing.description,
                    category: category, 
                    price: newListing.price || 0,
                    img: mainImage, 
                    images: allImages, 
                    city: newListing.city || '',
                    district: newListing.district || '',
                    phone: newListing.phone,
                    address: newListing.address,
                    breed: newListing.breed,
                    age: newListing.age,
                    gender: newListing.gender,
                    is_found: false
                });

            if (error) throw error;
            
            await fetchListings();
            
            return { success: true };

        } catch (e) {
            console.log("Ekleme hatası:", e.message);
            return { success: false, msg: e.message };
        }
    };

    // --- İLAN SİLME (GÜVENLİK YAMASI YAPILDI) ---
    const deleteListing = async (listingId) => {
        if (!user) return; // Kullanıcı giriş yapmamışsa engelle

        try {
            const { error } = await supabase
                .from('listings')
                .delete()
                .eq('id', listingId)
                .eq('owner_id', user.id); // 🚨 GÜVENLİK: Sadece bana ait olan ilanı sil!

            if (error) throw error;
            
            fetchListings();
            
        } catch (e) {
            console.log("Silme hatası:", e.message);
        }
    };

    // --- İLAN GÜNCELLEME (GÜVENLİK YAMASI YAPILDI) ---
    const updateListing = async (listingId, updates) => {
        if (!user) return; // Kullanıcı giriş yapmamışsa engelle

        try {
            const dbUpdates = {};
            if (updates.isFound !== undefined) dbUpdates.is_found = updates.isFound;
            if (updates.title) dbUpdates.name = updates.title;

            const { error } = await supabase
                .from('listings')
                .update(dbUpdates)
                .eq('id', listingId)
                .eq('owner_id', user.id); // 🚨 GÜVENLİK: Sadece bana ait olan ilanı güncelle!

            if (error) throw error;
            
            fetchListings(); 
            
        } catch (e) {
            console.log("Güncelleme hatası:", e.message);
        }
    };

    const addReview = async (listingId, reviewData) => {
        console.log("Yorum özelliği eklenecek:", listingId, reviewData);
    };

    return (
        <ListingContext.Provider value={{ 
            urgentList, mateList, vetList, sitterList, reviews, loading,
            addListing, deleteListing, updateListing, addReview, fetchListings 
        }}>
            {children}
        </ListingContext.Provider>
    );
};