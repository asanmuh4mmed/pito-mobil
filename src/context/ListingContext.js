import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from './AuthContext';
import { playSound } from '../utils/SoundManager';

export const ListingContext = createContext();
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const remoteImage = value => typeof value === 'string' && /^https:\/\//i.test(value);
const format = item => ({
    ...item,
    ownerId: item.owner_id,
    ownerName: item.users?.fullname || 'Kullanıcı',
    ownerAvatar: item.users?.avatar || null,
    img: item.images?.[0] || item.img || 'https://via.placeholder.com/150',
    subtitle: item.breed || item.city || 'Detay Yok',
    likeCount: Array.isArray(item.likes) ? item.likes.length : (item.likeCount || 0),
});

export const ListingProvider = ({ children }) => {
    const { user, country } = useContext(AuthContext);
    const countryCode = country?.code || 'TR';
    const [urgentList, setUrgentList] = useState([]);
    const [mateList, setMateList] = useState([]);
    const [vetList, setVetList] = useState([]);
    const [sitterList, setSitterList] = useState([]);
    const [reviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const runtime = useRef({ live: true, request: 0, country: countryCode, userId: user?.id, rows: [] });
    runtime.current.country = countryCode;
    runtime.current.userId = user?.id;
    const locks = useRef(new Set());

    const publish = useCallback(rows => {
        runtime.current.rows = rows;
        const sorted = rows.map(format).sort((a, b) =>
            Number(Boolean(a.is_found)) - Number(Boolean(b.is_found)) || b.likeCount - a.likeCount);
        setUrgentList(sorted.filter(item => ['Sahiplendirme', 'Adopt', 'Adoption', 'Looking for Home'].includes(item.category)));
        setMateList(sorted.filter(item => ['Eş Arayanlar', 'Find Mate', 'Looking for Mate'].includes(item.category)));
        setVetList(sorted.filter(item => ['Veteriner Klinikleri', 'Vet Clinics', 'Veterinary Clinics'].includes(item.category)));
        setSitterList(sorted.filter(item => ['Bakıcı', 'Pet Sitter', 'Find Pet Sitter'].includes(item.category)));
    }, []);

    const fetchListings = useCallback(async () => {
        const state = runtime.current;
        if (!state.live) return { success: false, stale: true };
        const code = state.country;
        const request = ++state.request;
        setLoading(true);
        setError(null);
        try {
            const { data, error: queryError } = await supabase.from('listings')
                .select('*, users:pito_public_profiles ( fullname, avatar, id ), likes ( id )')
                .eq('country_code', code);
            if (queryError) throw queryError;
            if (!Array.isArray(data)) throw new Error('İlan listesi alınamadı.');
            if (!state.live || request !== state.request || code !== state.country) return { success: false, stale: true };
            publish(data);
            return { success: true };
        } catch (cause) {
            if (state.live && request === state.request && code === state.country) {
                setError('İlanlar yenilenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
            }
            console.log('[Listings] Liste alınamadı', { code: cause?.code || 'network' });
            return { success: false, msg: 'İlanlar yenilenemedi.' };
        } finally {
            if (state.live && request === state.request && code === state.country) setLoading(false);
        }
    }, [publish]);

    useEffect(() => {
        runtime.current.live = true;
        return () => { runtime.current.live = false; runtime.current.request++; };
    }, []);

    useEffect(() => {
        runtime.current.request++;
        publish([]);
        fetchListings();
        const channel = supabase.channel(`public:listings:${countryCode}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => { fetchListings(); })
            .subscribe();
        return () => { runtime.current.request++; supabase.removeChannel(channel); };
    }, [countryCode, fetchListings, publish]);

    const prepare = (input, inserting = false) => {
        const result = {};
        for (const field of ['name', 'description', 'city', 'district', 'phone', 'address', 'breed', 'gender', 'pet_type']) {
            if (own(input, field)) {
                if (input[field] !== null && typeof input[field] !== 'string') throw new Error('İlan bilgilerini kontrol edin.');
                result[field] = input[field] === null ? null : input[field].trim();
            }
        }
        if (own(input, 'title')) {
            if (typeof input.title !== 'string') throw new Error('İlan başlığını kontrol edin.');
            result.name = input.title.trim();
        }
        if (own(result, 'name') && !result.name) throw new Error('İlan adı boş olamaz.');
        if (own(result, 'description') && !result.description) throw new Error('Açıklama boş olamaz.');
        for (const field of ['price', 'age']) {
            if (own(input, field)) {
                const raw = input[field];
                const number = raw === '' || raw == null ? 0 : Number(String(raw).replace(',', '.'));
                if (!Number.isFinite(number) || number < 0) throw new Error('Yaş ve ücret geçerli, negatif olmayan sayılar olmalı.');
                result[field] = number;
            }
        }
        if (own(input, 'is_found') || own(input, 'isFound')) {
            const found = own(input, 'isFound') ? input.isFound : input.is_found;
            if (typeof found !== 'boolean') throw new Error('İlan durumu geçersiz.');
            result.is_found = found;
        }
        if (own(input, 'images') || own(input, 'media')) {
            const images = own(input, 'images') ? input.images : input.media?.map(item => item.uri);
            if (!Array.isArray(images) || images.length < 1 || images.length > 3 || !images.every(remoteImage)) {
                throw new Error('Önce 1–3 fotoğrafın yüklenmesi gerekiyor.');
            }
            result.images = images;
            result.img = images[0];
        } else if (own(input, 'img')) {
            if (!remoteImage(input.img)) throw new Error('Fotoğraf bağlantısı geçersiz.');
            result.img = input.img;
        } else if (inserting) throw new Error('En az bir fotoğraf yükleyin.');
        return result;
    };

    const mutate = async (kind, listingId, input, category) => {
        const userId = user?.id;
        if (!userId || runtime.current.userId !== userId) return { success: false, msg: 'Giriş yapmalısınız.' };
        const lock = `${userId}:${kind === 'add' ? 'add' : listingId}`;
        if (locks.current.has(lock)) return { success: false, msg: 'Bu işlem zaten devam ediyor.' };
        locks.current.add(lock);
        const code = countryCode;
        let confirmed = false;
        try {
            let query;
            if (kind === 'add') {
                if (typeof category !== 'string' || !category.trim()) throw new Error('İlan kategorisi seçin.');
                const values = prepare(input || {}, true);
                if (!values.name || !values.description || !values.city || !values.district) throw new Error('Zorunlu ilan bilgilerini doldurun.');
                query = supabase.from('listings').insert({ ...values, owner_id: userId, category, is_found: false, country_code: code });
            } else {
                if (!listingId) throw new Error('İlan bulunamadı.');
                if (kind === 'delete') query = supabase.from('listings').delete();
                else {
                    const values = prepare(input || {});
                    if (!Object.keys(values).length) throw new Error('Güncellenecek alan bulunamadı.');
                    query = supabase.from('listings').update(values);
                }
                query = query.eq('id', listingId).eq('owner_id', userId);
            }
            const { data, error: mutationError } = await query.select('*').single();
            if (mutationError) throw mutationError;
            if (!data?.id || data.owner_id !== userId) throw new Error('İşlem doğrulanamadı.');
            confirmed = true;
            const state = runtime.current;
            if (state.live && state.userId === userId && state.country === code) {
                state.request++;
                const previous = state.rows.find(row => row.id === data.id);
                const remaining = state.rows.filter(row => row.id !== data.id);
                publish(kind === 'delete' || data.country_code !== code ? remaining : [...remaining, { ...previous, ...data }]);
                if (kind === 'add') {
                    try { Promise.resolve(playSound('post')).catch(() => {}); } catch {}
                }
                const refreshed = await fetchListings();
                return { success: true, data, refreshed: refreshed.success };
            }
            return { success: true, data, refreshed: false };
        } catch (cause) {
            // Başarılı veritabanı işlemini sonraki ekran/yenileme hatası başarısız yapmaz.
            if (confirmed) return { success: true, refreshed: false };
            console.log('[Listings] İşlem tamamlanamadı', { kind, code: cause?.code || 'request' });
            return { success: false, msg: cause?.code ? 'İşlem doğrulanamadı. İlanın size ait olduğunu ve bağlantınızı kontrol edin.' : (cause?.message || 'İşlem tamamlanamadı.') };
        } finally { locks.current.delete(lock); }
    };

    const addListing = (category, data) => mutate('add', null, data, category);
    const deleteListing = listingId => mutate('delete', listingId);
    const updateListing = (listingId, updates) => mutate('update', listingId, updates);
    const addReview = async () => ({ success: false, msg: 'Puanlama özelliği kullanımda değil.' });

    return <ListingContext.Provider value={{
        urgentList, mateList, vetList, sitterList, reviews, loading, error,
        addListing, deleteListing, updateListing, addReview, fetchListings,
    }}>{children}</ListingContext.Provider>;
};
