import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // ✅ Supabase Bağlantısı
import { AuthContext } from './AuthContext';
import { Audio } from 'expo-av'; 

export const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
    const { country, user } = useContext(AuthContext);
    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';

    const [orders, setOrders] = useState([]);
    const [unreadOrderCount, setUnreadOrderCount] = useState(0);
    const [allProducts, setAllProducts] = useState([]);
    const [favorites, setFavorites] = useState([]); 

    // 1. Uygulama açılınca ürünleri çek
    useEffect(() => {
        fetchProducts();
    }, []);

    // 2. Kullanıcı değişince siparişleri ve favorileri çek
    useEffect(() => {
        if (user) {
            fetchOrders();
            fetchFavorites();
        } else {
            setOrders([]);
            setFavorites([]);
        }
    }, [user]);

    // ✅ SES ÇALMA (Hata Korumalı)
    const playOrderSound = async () => {
        try {
            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/paw.mp3') 
            );
            await sound.playAsync();
        } catch (error) { 
            console.log("Ses çalınamadı, işlem devam ediyor.");
        }
    };

    // ✅ VERİTABANINDAN ÜRÜNLERİ ÇEK
    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAllProducts(data || []);
        } catch (e) {
            console.log("Ürün çekme hatası:", e.message);
        }
    };

    // ✅ VERİTABANINDAN SİPARİŞLERİ ÇEK
    const fetchOrders = async () => {
        if (!user) return;
        try {
            const ADMIN_EMAILS = ['admin@pito.com', 'asanmuh4mmed@gmail.com', 'petspito@gmail.com'];
            const isAdmin = ADMIN_EMAILS.includes(user.email);

            let query = supabase
                .from('orders')
                .select(`
                    *,
                    order_items (*)
                `)
                .order('created_at', { ascending: false });
            
            if (!isAdmin) { 
                 query = query.eq('user_id', user.id);
            }

            const { data, error } = await query;
            if (error) throw error;

            const formattedOrders = data.map(order => ({
                ...order,
                items: order.order_items ? order.order_items.map(item => ({
                    ...item,
                    name: item.product_name, 
                    img: item.image,
                    id: item.product_id
                })) : []
            }));

            setOrders(formattedOrders || []);
        } catch (e) {
            console.log("Sipariş çekme hatası:", e.message);
        }
    };

    // ✅ FAVORİLERİ ÇEK
    const fetchFavorites = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('favorites')
                .select('product_id')
                .eq('user_id', user.id);

            if (error) throw error;

            const formattedFavs = data.map(f => ({ userId: user.id, productId: f.product_id }));
            setFavorites(formattedFavs);
        } catch (e) {
            console.log("Favori çekme hatası:", e.message);
        }
    };

    // ✅ ÜRÜN EKLE (Admin)
    const addProduct = async (newProduct) => {
        try {
            const { data, error } = await supabase
                .from('products')
                .insert([{
                    name: newProduct.name,
                    description: newProduct.description,
                    price: parseFloat(newProduct.price),
                    category: newProduct.category,
                    image_urls: newProduct.media ? newProduct.media.map(m => m.uri) : [],
                    stock: parseInt(newProduct.stock || 0),
                    target_region: newProduct.targetRegion || 'GLOBAL'
                }])
                .select();

            if (error) throw error;
            
            if (data) {
                setAllProducts([data[0], ...allProducts]);
            }
        } catch (e) {
            console.log("Ürün ekleme hatası:", e.message);
        }
    };

    // ✅ ÜRÜN GÜNCELLE
    const updateProduct = async (id, updatedData) => {
        try {
            let dataToSend = { ...updatedData };
            if (updatedData.media) {
                dataToSend.image_urls = updatedData.media.map(m => m.uri);
                delete dataToSend.media;
            }

            const { error } = await supabase
                .from('products')
                .update(dataToSend)
                .eq('id', id);

            if (error) throw error;
            setAllProducts(allProducts.map(p => p.id === id ? { ...p, ...updatedData } : p));
        } catch (e) {
            console.log("Güncelleme hatası:", e.message);
        }
    };

    // ✅ ÜRÜN SİL
    const deleteProduct = async (id) => {
        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) {
                console.error("Supabase delete error:", error.message);
                throw error;
            }

            setAllProducts(prevProducts => prevProducts.filter(p => p.id !== id));
            console.log("Ürün başarıyla silindi:", id);
        } catch (e) {
            console.log("Silme hatası:", e.message);
            alert("Ürün silinemedi: " + e.message);
        }
    };

    // 🚀 SİPARİŞ OLUŞTUR (GÜVENLİK GÜNCELLEMESİ YAPILDI)
    const addOrder = async (newOrder) => {
        try {
            console.log("Sipariş veritabanına işleniyor ve güvenlik doğrulaması yapılıyor...");

            // 1. GÜVENLİK: İstemciden gelen fiyatlara güvenmiyoruz. 
            // Ürün ID'lerini alıp gerçek fiyatları Supabase'den çekiyoruz.
            const productIds = newOrder.items.map(item => item.product_id || item.id);
            
            const { data: realProducts, error: productError } = await supabase
                .from('products')
                .select('*')
                .in('id', productIds);

            if (productError) throw productError;
            if (!realProducts || realProducts.length === 0) throw new Error("Ürünler veritabanında bulunamadı.");

            let secureTotalPrice = 0;
            const secureOrderItemsData = [];

            // 2. Sepetteki her ürünün gerçek fiyatını hesapla
            newOrder.items.forEach(item => {
                const dbProduct = realProducts.find(p => p.id === (item.product_id || item.id));
                if (!dbProduct) throw new Error(`Geçersiz ürün tespit edildi: ID ${item.product_id || item.id}`);

                // İndirimli fiyatı varsa onu, yoksa normal fiyatı al
                const rawPrice = dbProduct.discount_price || dbProduct.price;
                let actualPrice = parseFloat(rawPrice);

                const quantity = item.quantity || 1;
                secureTotalPrice += (actualPrice * quantity);

                // Veritabanı için güvenli detay satırını oluştur
                secureOrderItemsData.push({
                    product_id: dbProduct.id,
                    product_name: typeof dbProduct.name === 'object' ? (dbProduct.name[activeLang] || dbProduct.name.TR) : dbProduct.name,
                    price: actualPrice, // Telefondan geleni DEĞİL, veritabanından çekileni yazıyoruz!
                    quantity: quantity,
                    image: dbProduct.image_urls && dbProduct.image_urls.length > 0 ? dbProduct.image_urls[0] : null
                });
            });

            // 3. Ana Siparişi Ekle (Güvenli Toplam Tutar İle)
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    user_id: user.id,
                    full_name: newOrder.user_name || newOrder.userName, 
                    phone: newOrder.user_phone || newOrder.userPhone,
                    address: newOrder.user_address || newOrder.userAddress,
                    total_price: secureTotalPrice, // ✅ GÜVENLİ TUTAR BURADA
                    status: 'Hazırlanıyor'
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 4. Sipariş Detaylarını Ekle (order_id'yi iliştirerek)
            const finalItemsToInsert = secureOrderItemsData.map(item => ({
                ...item,
                order_id: orderData.id 
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(finalItemsToInsert);

            if (itemsError) {
                // Detay eklenemezse ana siparişi silip işlemi iptal et (Rollback)
                await supabase.from('orders').delete().eq('id', orderData.id);
                throw itemsError;
            }

            // 5. UI Güncelle (Kullanıcının gördüğü listeye ekle)
            const fullOrder = { ...orderData, items: finalItemsToInsert };
            setOrders([fullOrder, ...orders]);
            setUnreadOrderCount(prev => prev + 1);
            
            await playOrderSound(); 

            return true; // Başarılı

        } catch (e) {
            console.log("Sipariş oluşturma hatası:", e.message);
            return false; // Başarısız
        }
    };

    // ✅ SİPARİŞ DURUMU GÜNCELLE
    const updateOrder = async (orderId, updates) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update(updates)
                .eq('id', orderId);

            if (error) throw error;

            setOrders(orders.map(o => o.id === orderId ? { ...o, ...updates } : o));
        } catch (e) {
            console.log("Sipariş güncelleme hatası:", e);
        }
    };

    // ✅ SİPARİŞ SİL
    const deleteOrder = async (orderId) => {
        try {
            const { error } = await supabase.from('orders').delete().eq('id', orderId);
            if (error) throw error;
            setOrders(orders.filter(o => o.id !== orderId));
        } catch (e) {
            console.log("Sipariş silme hatası:", e);
        }
    };

    // ✅ FAVORİ İŞLEMLERİ
    const toggleFavorite = async (productId) => {
        if (!user) return;

        const exists = favorites.some(fav => fav.userId === user.id && fav.productId === productId);
        
        if (exists) {
            setFavorites(favorites.filter(fav => fav.productId !== productId));
        } else {
            setFavorites([...favorites, { userId: user.id, productId }]);
        }

        try {
            if (exists) {
                await supabase
                    .from('favorites')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('product_id', productId);
            } else {
                await supabase
                    .from('favorites')
                    .insert([{ user_id: user.id, product_id: productId }]);
            }
        } catch (e) {
            console.log("Favori işlem hatası:", e.message);
        }
    };

    // ✅ YORUM EKLEME
    const addReview = async (productId, reviewData) => {
        try {
            const { error } = await supabase
                .from('reviews')
                .insert([{
                    product_id: productId,
                    user_id: user.id,
                    rating: reviewData.rating,
                    comment: reviewData.comment
                }]);

            if (error) throw error;

            const updatedProducts = allProducts.map(product => {
                if (product.id === productId) {
                    const oldReviews = product.reviews || []; 
                    const newReviews = [reviewData, ...oldReviews];
                    return { ...product, reviews: newReviews, reviewCount: newReviews.length };
                }
                return product;
            });
            setAllProducts(updatedProducts);

        } catch (e) {
            console.log("Yorum hatası:", e.message);
        }
    };

    const resetOrderCount = () => { setUnreadOrderCount(0); };

    const checkIfUserBought = (userId, productId) => {
        return orders.some(order => 
            order.user_id === userId && 
            Array.isArray(order.items) && 
            order.items.some(item => item.product_id === productId || item.id === productId)
        );
    };

    const localizedProducts = allProducts.map(p => ({
        ...p,
        name: (p.name && typeof p.name === 'object' && p.name[activeLang]) ? p.name[activeLang] : p.name,
        description: (p.description && typeof p.description === 'object' && p.description[activeLang]) ? p.description[activeLang] : p.description,
        img: p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : null,
        targetRegion: p.target_region || 'GLOBAL' 
    }));

    return (
        <ShopContext.Provider value={{ 
            products: localizedProducts, 
            addProduct, 
            updateProduct, 
            deleteProduct, 
            fetchProducts, 
            orders, 
            addOrder, 
            updateOrder, 
            deleteOrder, 
            unreadOrderCount, 
            resetOrderCount,
            checkIfUserBought, 
            addReview,
            favorites, 
            toggleFavorite 
        }}>
            {children}
        </ShopContext.Provider>
    );
};