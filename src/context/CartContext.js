import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from './AuthContext';
import { ShopContext } from './ShopContext';

export const CartContext = createContext();
const sameId = (a, b) => String(a) === String(b);
const priceNumber = value => {
    const text = String(value ?? '').trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
    const result = Number(text);
    return Number.isFinite(result) && result > 0 ? result : null;
};
const option = value => value == null || String(value).trim() === '' ? null : String(value).trim();
const validRows = value => {
    if (!Array.isArray(value)) throw new Error('Kayıtlı sepet biçimi geçersiz.');
    const seen = new Set();
    return value.filter(row => {
        if (!row || row.id == null || seen.has(String(row.id)) || !Number.isSafeInteger(row.quantity) || row.quantity <= 0 || priceNumber(row.price) == null) return false;
        seen.add(String(row.id));
        return true;
    }).map(row => ({ ...row, price: priceNumber(row.price) }));
};

export const CartProvider = ({ children }) => {
    const { user, country } = useContext(AuthContext);
    // Optional so the existing provider nesting can stay unchanged.
    const shop = useContext(ShopContext);
    const region = country?.code === 'AU' ? 'AU' : 'TR';
    const storageKey = `pito_cart_v2:${user?.id || 'guest'}:${region}`;
    const activeKey = useRef(storageKey);
    activeKey.current = storageKey;
    const stateRef = useRef({ key: null, rows: [], ready: false });
    const [state, setState] = useState(stateRef.current);
    const [cartError, setCartError] = useState(null);
    const writes = useRef(Promise.resolve());
    const mounted = useRef(true);
    const cart = state.key === storageKey && state.ready ? state.rows : [];
    const cartLoading = state.key !== storageKey || !state.ready;
    const [reload, setReload] = useState(0);

    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => {
        let cancelled = false;
        const key = storageKey;
        stateRef.current = { key, rows: [], ready: false };
        setState(stateRef.current);
        setCartError(null);
        (async () => {
            try {
                await writes.current;
                const stored = await AsyncStorage.getItem(key);
                const rows = stored ? validRows(JSON.parse(stored)) : [];
                if (cancelled || activeKey.current !== key) return;
                stateRef.current = { key, rows, ready: true };
                setState(stateRef.current);
            } catch (error) {
                // Keep the unreadable record; do not overwrite it with an empty cart.
                if (!cancelled && activeKey.current === key) setCartError('Sepet yüklenemedi. Tekrar deneyin.');
            }
        })();
        return () => { cancelled = true; };
    }, [storageKey, reload]);

    const fail = message => {
        Alert.alert('Sepet', message);
        return false;
    };
    const ready = () => stateRef.current.ready && stateRef.current.key === activeKey.current;
    const commit = rows => {
        const key = activeKey.current;
        stateRef.current = { key, rows, ready: true };
        setState(stateRef.current);
        const json = JSON.stringify(rows);
        // Serialize writes so a slow earlier save cannot restore deleted items.
        writes.current = writes.current.then(async () => {
            try {
                await AsyncStorage.setItem(key, json);
                if (mounted.current && activeKey.current === key) setCartError(null);
            } catch (error) {
                if (mounted.current && activeKey.current === key) setCartError('Sepet telefona kaydedilemedi. Uygulamayı kapatmadan tekrar deneyin.');
            }
        });
    };

    const addToCart = product => {
        if (!ready()) return fail('Sepet henüz yüklenmedi. Biraz sonra tekrar deneyin.');
        if (!product || product.id == null) return fail('Ürün bilgisi bulunamadı.');
        const catalogProduct = shop?.products?.find(p => sameId(p.id, product.id));
        if (shop && !shop.productsLoading && !shop.productsError && !catalogProduct) return fail('Ürün artık mağazada bulunmuyor. Mağazayı yenileyin.');
        const current = { ...product, ...(catalogProduct || {}) };
        if (current.targetRegion && current.targetRegion !== 'GLOBAL' && current.targetRegion !== region) return fail('Ürün seçili satış bölgesinde bulunmuyor.');
        if (current.sku) return fail('Bu ürün uygulama içi satın alma akışı gerektiriyor.');
        const selectedColor = option(product.selectedColor);
        const selectedSize = option(product.selectedSize);
        const qrName = option(product.qrName);
        if (current.colors?.length && !current.colors.includes(selectedColor)) return fail('Ürün detayını açıp renk seçin.');
        if (current.sizes?.length && !current.sizes.includes(selectedSize)) return fail('Ürün detayını açıp beden seçin.');
        if (/QR|Kodlu/i.test(current.category || '') && !qrName) return fail('Ürün detayından tasmanın üzerine yazılacak ismi girin.');
        const rows = stateRef.current.rows;
        const existing = rows.find(row => sameId(row.id, product.id));
        if (existing && (option(existing.selectedColor) !== selectedColor || option(existing.selectedSize) !== selectedSize || option(existing.qrName) !== qrName)) return fail('Bu ürün farklı seçeneklerle sepetinizde. Seçenekleri değiştirmek için önce mevcut ürünü kaldırın.');
        const stock = current.stock == null ? NaN : Number(current.stock);
        const nextQuantity = (existing?.quantity || 0) + 1;
        if (!Number.isSafeInteger(stock) || stock < 0) return fail('Ürünün stok bilgisi doğrulanamadı. Mağazayı yenileyin.');
        if (nextQuantity > stock) return fail(stock === 0 ? 'Ürün stokta yok.' : 'Mevcut stok miktarına ulaştınız.');
        const discount = current.discount_price !== undefined ? current.discount_price : current.discountPrice;
        const price = priceNumber(discount ?? current.price);
        if (price == null) return fail('Ürün fiyatı geçersiz.');
        const row = {
            ...current, id: existing?.id ?? product.id,
            price, discountPrice: discount ?? null,
            selectedColor, selectedSize, qrName, quantity: nextQuantity,
        };
        commit(existing ? rows.map(item => sameId(item.id, row.id) ? row : item) : [...rows, row]);
        return true;
    };
    const decreaseQuantity = id => {
        if (!ready()) return false;
        commit(stateRef.current.rows.flatMap(row => !sameId(row.id, id) ? [row] : row.quantity > 1 ? [{ ...row, quantity: row.quantity - 1 }] : []));
        return true;
    };
    const removeFromCart = id => {
        if (!ready()) return false;
        commit(stateRef.current.rows.filter(row => !sameId(row.id, id)));
        return true;
    };
    const clearCart = () => {
        if (!ready()) return false;
        commit([]);
        return true;
    };
    const getTotalPrice = () => (cart.reduce((sum, row) => sum + Math.round(row.price * 100) * row.quantity, 0) / 100).toFixed(2);
    const getCartCount = () => cart.reduce((sum, row) => sum + row.quantity, 0);
    const retryCartStorage = () => {
        if (ready()) commit(stateRef.current.rows);
        else setReload(value => value + 1);
    };
    const createOrderData = addressInfo => {
        if (!user || !ready() || !stateRef.current.rows.length) return null;
        return {
            user_id: user.id,
            user_name: String(addressInfo?.name || '').trim(),
            user_phone: String(addressInfo?.phone || '').trim(),
            user_address: String(addressInfo?.address || '').trim(),
            status: 'Hazırlanıyor',
            items: stateRef.current.rows.map(row => ({
                product_id: row.id, quantity: row.quantity,
                selected_color: option(row.selectedColor),
                selected_size: option(row.selectedSize),
                qr_name: option(row.qrName),
            })),
        };
    };
    return <CartContext.Provider value={{ cart, cartLoading, cartError, retryCartStorage, addToCart, decreaseQuantity, removeFromCart, clearCart, getTotalPrice, getCartCount, createOrderData }}>{children}</CartContext.Provider>;
};