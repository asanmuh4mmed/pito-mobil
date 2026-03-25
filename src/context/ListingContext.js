import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase'; 
import { AuthContext } from './AuthContext'; 
import { playSound } from '../utils/SoundManager'; 

export const ListingContext = createContext();

export const ListingProvider = ({ children }) => {
    // ✨ 1. country objesini AuthContext'ten çekiyoruz
    const { user, country } = useContext(AuthContext); 
    
    const [urgentList, setUrgentList] = useState([]);
    const [mateList, setMateList] = useState([]);
    const [vetList, setVetList] = useState([]);
    const [sitterList, setSitterList] = useState([]);
    const [reviews, setReviews] = useState([]); 
    
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchListings();
        
        const subscription = supabase
            .channel('public:listings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
                fetchListings();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [country]); // ✨ 2. Ülke değiştiğinde listeyi anında yenilemesi için eklendi

    // --- VERİLERİ ÇEK (listings tablosundan) ---
    const fetchListings = async () => {
        try {
            setLoading(true);
            
            // ✨ 3. Aktif ülkenin kodunu belirliyoruz
            const activeLang = country?.code || 'TR';
            
            const { data, error } = await supabase
                .from('listings')
                .select('*, users ( fullname, avatar, id )') 
                .eq('country_code', activeLang) // ✨ 4. Sadece bu ülkenin ilanlarını çek
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

                // ✨ 5. Her iki dilin kategori isimlerini kapsayan filtreleme
                setUrgentList(formattedData.filter(item => 
                    ['Sahiplendirme', 'Adopt', 'Looking for Home'].includes(item.category)
                ));
                setMateList(formattedData.filter(item => 
                    ['Eş Arayanlar', 'Find Mate', 'Looking for Mate'].includes(item.category)
                ));
                setVetList(formattedData.filter(item => 
                    ['Veteriner Klinikleri', 'Vet Clinics', 'Veterinary Clinics'].includes(item.category)
                ));
                setSitterList(formattedData.filter(item => 
                    ['Bakıcı', 'Pet Sitter', 'Find Pet Sitter'].includes(item.category)
                ));
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
                    owner_id: user.id,
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

    // --- İLAN SİLME ---
    const deleteListing = async (listingId) => {
        if (!user) return; 

        try {
            const { error } = await supabase
                .from('listings')
                .delete()
                .eq('id', listingId)
                .eq('owner_id', user.id); 

            if (error) throw error;
            fetchListings();
            
        } catch (e) {
            console.log("Silme hatası:", e.message);
        }
    };

    // --- İLAN GÜNCELLEME ---
    const updateListing = async (listingId, updates) => {
        if (!user) return; 

        try {
            const dbUpdates = {};
            if (updates.isFound !== undefined) dbUpdates.is_found = updates.isFound;
            if (updates.title) dbUpdates.name = updates.title;

            const { error } = await supabase
                .from('listings')
                .update(dbUpdates)
                .eq('id', listingId)
                .eq('owner_id', user.id); 

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