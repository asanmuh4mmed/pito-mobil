import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { AuthContext } from './AuthContext'; 

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [cart, setCart] = useState([]);

    // 🔄 1. UYGULAMA AÇILINCA SEPETİ YÜKLE
    useEffect(() => {
        loadCart();
    }, []);

    // 💾 2. SEPET DEĞİŞİNCE TELEFONA KAYDET (Kalıcılık)
    useEffect(() => {
        saveCart(cart);
    }, [cart]);

    const loadCart = async () => {
        try {
            const storedCart = await AsyncStorage.getItem('user_cart');
            if (storedCart) {
                setCart(JSON.parse(storedCart));
            }
        } catch (e) {
            console.log("Sepet yükleme hatası:", e);
        }
    };

    const saveCart = async (cartData) => {
        try {
            await AsyncStorage.setItem('user_cart', JSON.stringify(cartData));
        } catch (e) {
            console.log("Sepet kayıt hatası:", e);
        }
    };

    const parsePrice = (priceInput) => {
        if (typeof priceInput === 'number') return priceInput;
        if (!priceInput) return 0;
        
        let priceStr = String(priceInput);
        let cleanPrice = priceStr.replace(/[^0-9.,]/g, '');
        cleanPrice = cleanPrice.replace(',', '.');
        return parseFloat(cleanPrice) || 0;
    };

    // 🛒 SEPETE EKLE
    const addToCart = (product) => {
        const rawPrice = product.discountPrice || product.price;
        const finalPrice = parsePrice(rawPrice);

        const productToAdd = { 
            ...product, 
            price: finalPrice 
        };

        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === product.id);
            
            if (existingItem) {
                return prevCart.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            } else {
                return [...prevCart, { ...productToAdd, quantity: 1 }];
            }
        });
    };

    // ➖ MİKTARI AZALT
    const decreaseQuantity = (productId) => {
        setCart((prevCart) => {
            const existingItem = prevCart.find((item) => item.id === productId);
            if (existingItem?.quantity === 1) {
                return prevCart.filter((item) => item.id !== productId);
            } else {
                return prevCart.map((item) =>
                    item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
                );
            }
        });
    };

    // 🗑️ SEPETTEN SİL
    const removeFromCart = (productId) => {
        setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
    };

    // 🧹 SEPETİ TEMİZLE
    const clearCart = () => {
        setCart([]);
        AsyncStorage.removeItem('user_cart');
    };

    // 💰 EKRANDA GÖSTERMEK İÇİN TOPLAM TUTAR (Sadece UI içindir, güvenilir değildir!)
    const getTotalPrice = () => {
        return cart.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0).toFixed(2);
    };

    const getCartCount = () => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    };

    // ✅ GÜVENLİK GÜNCELLEMESİ: SİPARİŞ VERİSİ HAZIRLA
    // Artık toplam tutarı (totalPrice) ve ürün fiyatlarını (price) DİREKT BURADAN GÖNDERMİYORUZ.
    // Bu sadece "Siparişi veren kişi" ve "Hangi üründen kaç adet istediği" bilgisidir.
    // Gerçek fiyat hesaplaması veritabanına yazılırken ShopContext içinde ürün fiyatları tekrar çekilerek yapılacak!
    const createOrderData = (addressInfo) => {
        if (!user) return null;

        return {
            user_id: user.id, // Veritabanı sütun isimlerine (snake_case) uygun hale getirdik
            user_name: addressInfo.name,
            user_phone: addressInfo.phone,
            user_address: addressInfo.address,
            status: 'Hazırlanıyor',
            // Sipariş edilen ürünleri sadeleştirdik (Sadece ID ve Miktar)
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity
            }))
        };
    };

    return (
        <CartContext.Provider value={{ 
            cart, 
            addToCart, 
            decreaseQuantity, 
            removeFromCart, 
            clearCart, 
            getTotalPrice, 
            getCartCount,
            createOrderData 
        }}>
            {children}
        </CartContext.Provider>
    );
};