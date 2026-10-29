import React, { createContext, useState, useContext, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase'; // ✅ Supabase Bağlantısı
import { AuthContext } from './AuthContext';
import { Audio } from 'expo-av'; 

// Only known product columns are sent. Omitted fields stay unchanged on updates.
const has = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const money = value => {
    const text = String(value ?? '').trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Fiyat geçerli, pozitif bir tutar olmalı (ör. 149,90).');
    const number = Number(text);
    if (!Number.isFinite(number) || number <= 0) throw new Error('Fiyat sıfırdan büyük olmalı.');
    return number;
};
const productPayload = (input, creating = false) => {
    const out = {};
    for (const key of ['name', 'description', 'category', 'colors', 'sizes']) {
        if (has(input, key)) out[key] = input[key];
    }
    if (creating || has(input, 'name')) {
        const names = typeof input.name === 'object' && input.name !== null ? Object.values(input.name) : [input.name];
        if (!names.some(n => typeof n === 'string' && n.trim())) throw new Error('Ürün adı gerekli.');
    }
    if (creating || has(input, 'price')) out.price = money(input.price);
    if (has(input, 'discountPrice') || has(input, 'discount_price')) {
        const discount = has(input, 'discountPrice') ? input.discountPrice : input.discount_price;
        out.discount_price = discount === '' || discount == null ? null : money(discount);
    }
    const fields = { isFeatured: 'is_featured', isBestSeller: 'is_best_seller', isNewArrival: 'is_new_arrival', isDiscount: 'is_discount', isLimited: 'is_limited', isEco: 'is_eco', targetRegion: 'target_region' };
    for (const [ui, db] of Object.entries(fields)) {
        if (has(input, ui)) out[db] = input[ui];
        else if (has(input, db)) out[db] = input[db];
    }
    if (creating && !out.target_region) out.target_region = 'GLOBAL';
    if (has(input, 'media')) {
        if (!Array.isArray(input.media)) throw new Error('Ürün görselleri geçersiz.');
        out.image_urls = input.media.map(m => m.uri);
    } else if (has(input, 'image_urls')) out.image_urls = input.image_urls;
    if (has(out, 'image_urls') && (!Array.isArray(out.image_urls) || out.image_urls.some(uri => typeof uri !== 'string' || !/^https?:\/\//i.test(uri)))) {
        throw new Error('Görseller önce yüklenmeli; telefona ait yerel dosya adresleri ürün olarak kaydedilemez.');
    }
    return out;
};
const localizedText = (value, language) => value && typeof value === 'object'
    ? String(value[language] || value.TR || value.AU || value.EN || '') : String(value ?? '');

export const ShopContext = createContext();

export const ShopProvider = ({ children }) => {
    const { country, user } = useContext(AuthContext);
    const activeLang = country?.code === 'AU' ? 'AU' : 'TR';

    const [orders, setOrders] = useState([]);
    const [unreadOrderCount, setUnreadOrderCount] = useState(0);
    const [allProducts, setAllProducts] = useState([]);
    const [favorites, setFavorites] = useState([]); 

    const catalogVersion = useRef(0);
    const fetchSequence = useRef(0);
    const pendingWrites = useRef(new Set());
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsError, setProductsError] = useState(null);

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
                require('../../assets/sounds/paw.mp3') 
            );
            await sound.playAsync();
        } catch (error) { 
            console.log("Ses çalınamadı, işlem devam ediyor.");
        }
    };

    // ✅ VERİTABANINDAN ÜRÜNLERİ ÇEK
    const fetchProducts = useCallback(async ({ throwOnError = false } = {}) => {
        const request = ++fetchSequence.current;
        const version = catalogVersion.current;
        setProductsLoading(true);
        try {
            // Pagination avoids silently dropping products beyond the server's row limit.
            const rows = [];
            const pageSize = 500;
            for (let offset = 0; ; offset += pageSize) {
                const { data, error } = await supabase.from('products').select('*')
                    .order('created_at', { ascending: false }).order('id', { ascending: false })
                    .range(offset, offset + pageSize - 1);
                if (error) throw error;
                rows.push(...(data || []));
                if (!data || data.length < pageSize) break;
            }
            // A fetch started before a successful edit must not undo that edit.
            if (request === fetchSequence.current && version === catalogVersion.current) {
                setAllProducts([...new Map(rows.map(row => [String(row.id), row])).values()]);
                setProductsError(null);
            }
            return { success: true };
        } catch (error) {
            if (request === fetchSequence.current) setProductsError(error.message);
            if (throwOnError) throw error;
            return { success: false, error: error.message };
        } finally {
            if (request === fetchSequence.current) setProductsLoading(false);
        }
    }, []);

    // ✅ VERİTABANINDAN SİPARİŞLERİ ÇEK
    const fetchOrders = async ({ throwOnError = false } = {}) => {
        if (!user) return;
        try {
            const isAdmin = user.is_admin === true;

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
            if (throwOnError) throw e;
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

    // Client guard complements (does not replace) products-table RLS policies.
    const productWrite = async (key, operation) => {
        if (user?.is_admin !== true) throw new Error('Bu işlem için yönetici yetkisi gerekli.');
        if (pendingWrites.current.has(key)) throw new Error('Bu ürün için bir işlem zaten devam ediyor.');
        pendingWrites.current.add(key);
        try { return await operation(); }
        finally { pendingWrites.current.delete(key); }
    };
    const mergeSavedProduct = row => {
        catalogVersion.current += 1;
        setAllProducts(previous => {
            const exists = previous.some(p => String(p.id) === String(row.id));
            return exists ? previous.map(p => String(p.id) === String(row.id) ? row : p) : [row, ...previous];
        });
    };
    const addProduct = async newProduct => productWrite('create', async () => {
        const payload = productPayload(newProduct, true);
        if (payload.discount_price != null && payload.discount_price >= payload.price) throw new Error('İndirimli fiyat normal fiyattan düşük olmalı.');
        const { data, error } = await supabase.from('products').insert([payload]).select('*').single();
        if (error) throw error;
        if (!data?.id) throw new Error('Ürün kaydı doğrulanamadı. Tekrar eklemeden önce listeyi yenileyin.');
        mergeSavedProduct(data);
        return data;
    });
    const updateProduct = async (id, updates) => productWrite(String(id), async () => {
        if (id == null) throw new Error('Ürün kimliği gerekli.');
        const payload = productPayload(updates);
        if (!Object.keys(payload).length) throw new Error('Güncellenecek ürün alanı yok.');
        // Read the current prices when a partial price update is requested.
        if (has(payload, 'price') || has(payload, 'discount_price')) {
            const { data: current, error } = await supabase.from('products').select('price,discount_price').eq('id', id).single();
            if (error) throw error;
            const price = payload.price ?? Number(current.price);
            const discount = has(payload, 'discount_price') ? payload.discount_price : current.discount_price;
            if (discount != null && Number(discount) >= price) throw new Error('İndirimli fiyat normal fiyattan düşük olmalı.');
        }
        const { data, error } = await supabase.from('products').update(payload).eq('id', id).select('*').single();
        if (error) throw error;
        if (!data?.id) throw new Error('Güncelleme doğrulanamadı. Yetkinizi ve ürün kaydını kontrol edin.');
        mergeSavedProduct(data);
        return data;
    });
    const deleteProduct = async id => productWrite(String(id), async () => {
        if (id == null) throw new Error('Ürün kimliği gerekli.');
        const { data, error } = await supabase.from('products').delete().eq('id', id).select('id');
        if (error) throw error;
        if (!data?.some(row => String(row.id) === String(id))) throw new Error('Silme doğrulanamadı. Ürün bulunamadı veya silme yetkiniz yok.');
        catalogVersion.current += 1;
        setAllProducts(previous => previous.filter(p => String(p.id) !== String(id)));
        return { success: true, id };
    });

    // 🚀 SİPARİŞ OLUŞTUR
    const addOrder = async (newOrder) => {
        try {
            console.log("Sipariş veritabanına işleniyor ve güvenlik doğrulaması yapılıyor...");

            const productIds = newOrder.items.map(item => item.product_id || item.id);
            
            const { data: realProducts, error: productError } = await supabase
                .from('products')
                .select('*')
                .in('id', productIds);

            if (productError) throw productError;
            if (!realProducts || realProducts.length === 0) throw new Error("Ürünler veritabanında bulunamadı.");

            let secureTotalPrice = 0;
            const secureOrderItemsData = [];

            newOrder.items.forEach(item => {
                const dbProduct = realProducts.find(p => String(p.id) === String(item.product_id || item.id));
                if (!dbProduct) throw new Error(`Geçersiz ürün tespit edildi: ID ${item.product_id || item.id}`);

                const rawPrice = dbProduct.discount_price || dbProduct.price;
                let actualPrice = parseFloat(rawPrice);

                const quantity = item.quantity || 1;
                secureTotalPrice += (actualPrice * quantity);

                secureOrderItemsData.push({
                    product_id: dbProduct.id,
                    product_name: typeof dbProduct.name === 'object' ? (dbProduct.name[activeLang] || dbProduct.name.TR) : dbProduct.name,
                    price: actualPrice, 
                    quantity: quantity,
                    image: dbProduct.image_urls && dbProduct.image_urls.length > 0 ? dbProduct.image_urls[0] : null
                });
            });

            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    user_id: user.id,
                    full_name: newOrder.user_name || newOrder.userName, 
                    phone: newOrder.user_phone || newOrder.userPhone,
                    address: newOrder.user_address || newOrder.userAddress,
                    total_price: secureTotalPrice, 
                    status: 'Hazırlanıyor'
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            const finalItemsToInsert = secureOrderItemsData.map(item => ({
                ...item,
                order_id: orderData.id 
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(finalItemsToInsert);

            if (itemsError) {
                await supabase.from('orders').delete().eq('id', orderData.id);
                throw itemsError;
            }

            const fullOrder = { ...orderData, items: finalItemsToInsert };
            setOrders(previous => [fullOrder, ...previous]);
            setUnreadOrderCount(prev => prev + 1);
            
            // Checkout handles the optional success sound. 

            return orderData.id; 
        } catch (e) {
            console.log("Sipariş oluşturma hatası:", e.message);
            return false; 
        }
    };

    // ✅ SİPARİŞ DURUMU GÜNCELLE
    const updateOrder = async (orderId, updates) => {
        if (user?.is_admin !== true) throw new Error('Yönetici yetkisi gerekli.');
        const allowed = ['Sipariş Onaylandı', 'Sipariş Hazırlanıyor', 'Sipariş Kargoya Verildi', 'Sipariş Teslim Edildi', 'Sipariş İptal Edildi'];
        if (!allowed.includes(updates?.status)) throw new Error('Geçersiz sipariş durumu.');
        const { data, error } = await supabase.from('orders').update({ status: updates.status }).eq('id', orderId).select('id,status').single();
        if (error) throw error;
        if (!data?.id) throw new Error('Güncelleme doğrulanamadı. Veritabanı yetkilerini kontrol edin.');
        setOrders(previous => previous.map(order => String(order.id) === String(orderId) ? { ...order, status: data.status } : order));
        return data;
    };

    const deleteOrder = async orderId => {
        if (user?.is_admin !== true) throw new Error('Yönetici yetkisi gerekli.');
        const { data, error } = await supabase.from('orders').delete().eq('id', orderId).select('id');
        if (error) throw error;
        if (!data?.some(order => String(order.id) === String(orderId))) throw new Error('Silme doğrulanamadı. Sipariş bulunamadı veya silme yetkisi yok.');
        setOrders(previous => previous.filter(order => String(order.id) !== String(orderId)));
        return { success: true, id: orderId };
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
            order.items.some(item => String(item.product_id) === String(productId) || String(item.id) === String(productId))
        );
    };

    // ✅ UI İÇİN VERİ ÇEVİRİMİ (SNAKE_CASE -> CAMELCASE)
    const localizedProducts = useMemo(() => allProducts.map(p => ({
        ...p,
        name: localizedText(p.name, activeLang),
        rawName: p.name,
        description: localizedText(p.description, activeLang),
        rawDescription: p.description,
        img: p.image_urls && p.image_urls.length > 0 ? p.image_urls[0] : null,
        targetRegion: p.target_region || 'GLOBAL',
        
        discountPrice: p.discount_price !== undefined ? p.discount_price : p.discountPrice,
        isFeatured: p.is_featured ?? p.isFeatured,
        isBestSeller: p.is_best_seller ?? p.isBestSeller,
        isNewArrival: p.is_new_arrival ?? p.isNewArrival,
        isDiscount: p.is_discount ?? p.isDiscount,
        isLimited: p.is_limited ?? p.isLimited,
        isEco: p.is_eco ?? p.isEco,
        colors: p.colors || [],
        sizes: p.sizes || []
    })), [allProducts, activeLang]);

    return (
        <ShopContext.Provider value={{ 
            products: localizedProducts,
            productsLoading,
            productsError, 
            addProduct, 
            updateProduct, 
            deleteProduct, 
            fetchProducts, 
            orders,
            fetchOrders,
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