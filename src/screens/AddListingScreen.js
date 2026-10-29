import React, { useState, useContext, useEffect, useRef, memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, Modal, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/colors';
import { ListingContext } from '../context/ListingContext';
import { AuthContext } from '../context/AuthContext';
import { CITY_DATA } from '../constants/cities';
import { ThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

// --- PITO YENİ RENK PALETİ ---
const PITO_COLORS = {
    primary: '#C5A059', 
    primaryDark: '#B08D4B', 
    navyBg: '#0B131E', 
    navySurface: '#1A2533', 
    navyLight: '#243447',
    cream: '#F5F5DC',
    white: '#FFFFFF',
    grayText: '#A0AAB5',
    error: '#FF4D4D'
};

// ✅ OPTİMİZASYON: Klavye kapanma sorununu kökten çözen, tamamen izole edilmiş Input bileşeni.
// theme objesi yerine sadece primitif renk stringleri alarak gereksiz render'ı durdurur.
const ModernInput = memo(({ icon, placeholder, value, onChangeText, keyboardType = 'default', multiline = false, bgColor, borderColor, textColor, placeholderColor }) => (
    <View style={[styles.inputContainer, { backgroundColor: bgColor, borderColor: borderColor }]}>
        {icon && <Ionicons name={icon} size={20} color={PITO_COLORS.primary} style={styles.inputIcon} />}
        <TextInput
            style={[styles.input, { color: textColor, height: multiline ? 100 : 50 }]}
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
        />
    </View>
));

const AddListingScreen = ({ route, navigation }) => {
  const { category = '' } = route.params || {}; 
  const { addListing } = useContext(ListingContext);
  const { user, country } = useContext(AuthContext);
  const { theme, isDarkMode } = useContext(ThemeContext);

  const activeLang = country?.code || 'TR';

  const submitLock = useRef(false);
  const pickerLock = useRef(false);
  const completed = useRef(false);
  const uploadedImages = useRef(new Map());
  const lifecycle = useRef({ live: true, userId: user?.id, country: activeLang });
  lifecycle.current.userId = user?.id;
  lifecycle.current.country = activeLang;

  useEffect(() => {
      lifecycle.current.live = true;
      return () => { lifecycle.current.live = false; };
  }, []);

  useEffect(() => navigation.addListener('beforeRemove', event => {
      if (submitLock.current) event.preventDefault();
  }), [navigation]);

  // --- ANİMASYON DEĞERLERİ ---
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
            toValue: 0,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
        })
    ]).start();
  }, []);

  const animateButton = () => {
    Animated.sequence([
        Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
        Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const isServiceListing = category.includes('Veteriner') || category.includes('Vet') || category.includes('Kuaför') || category.includes('Groomer');
  const isVet = category.includes('Veteriner') || category.includes('Vet'); 
  const isSitter = category.includes('Bakıcı') || category.includes('Sitter');

  // --- STATE ---
  const [mediaList, setMediaList] = useState([]);
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false); 
  
  const [age, setAge] = useState('');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('Erkek');
  const [petType, setPetType] = useState(null); 

  const [shopName, setShopName] = useState(''); 
  const [ownerName, setOwnerName] = useState(''); 
  const [phone, setPhone] = useState(''); 
  const [address, setAddress] = useState(''); 
  const [price, setPrice] = useState(''); 

  const [sitterName, setSitterName] = useState(user?.user_metadata?.full_name || ''); 
  const [experience, setExperience] = useState(''); 

  const [modalVisible, setModalVisible] = useState(false);
  const [selectionType, setSelectionType] = useState(null); 

  const getLocalizedCategory = (catName) => {
      if (activeLang === 'TR') return catName; 
      if (catName.includes('Eş Arayanlar')) return 'Find Mate';
      if (catName.includes('Sahiplendirme')) return 'Adoption';
      if (catName.includes('Veteriner')) return 'Vet Clinics';
      if (catName.includes('Pet Kuaför')) return 'Pet Grooming';
      if (catName.includes('Bakıcı')) return 'Pet Sitter';
      return catName; 
  };

  const displayCategory = getLocalizedCategory(category);

  // Hayvan tipleri (Gelişmiş Grid ikonları)
  const ANIMAL_TYPES = [
      { label: 'Kedi', icon: 'logo-octocat' }, // Kediye en yakın standart ikon
      { label: 'Köpek', icon: 'paw' },
      { label: 'Kuş', icon: 'leaf' }, 
      { label: 'Balık', icon: 'water' },
      { label: 'Kemirgen', icon: 'egg' },
      { label: 'Diğer', icon: 'apps' }
  ];

  const typeLabels = {
      'Kedi': activeLang === 'AU' ? 'Cat' : 'Kedi',
      'Köpek': activeLang === 'AU' ? 'Dog' : 'Köpek',
      'Kuş': activeLang === 'AU' ? 'Bird' : 'Kuş',
      'Balık': activeLang === 'AU' ? 'Fish' : 'Balık',
      'Kemirgen': activeLang === 'AU' ? 'Rodent' : 'Kemirgen',
      'Diğer': activeLang === 'AU' ? 'Other' : 'Diğer',
  };

  const TEXTS = {
      TR: {
          headerTitle: isServiceListing ? `${displayCategory} Ekle` : `${displayCategory} İlanı`,
          photoLabel: "Kapak Fotoğrafı Ekle",
          photoSubLabel: "(En az 1, en fazla 3 fotoğraf)",
          descLabel: isServiceListing ? "Hizmet Detayları" : "Açıklama & Hikaye",
          typeLabel: "Hayvan Türü", 
          cityLabel: "İl",
          distLabel: "İlçe",
          select: "Seçiniz",
          addBtn: "Ekle", 
          btnPost: "İlanı Yayınla",
          breed: "Tür / Cins",
          age: "Yaş",
          gender: "Cinsiyet",
          male: "Erkek",
          female: "Dişi",
          shopName: isVet ? "Klinik Adı" : "İşletme Adı",
          ownerName: isVet ? "Hekim Adı" : "Yetkili Kişi",
          phone: "Telefon Numarası",
          phonePlace: "0555 ...",
          address: "Açık Adres",
          price: "Ücret (TL)",
          sitterName: "İsim Soyisim", 
          experience: "Deneyim (Yıl)", 
          alertTitle: "Eksik Bilgi",
          alertMsg: "Lütfen fotoğraf, konum ve tüm zorunlu alanları doldurunuz.",
          typeAlert: "Lütfen hayvan türünü seçiniz.", 
          successTitle: "Başarılı",
          successMsg: "İlanınız başarıyla yayınlandı!",
          limitTitle: "Limit",
          limitMsg: "En fazla 3 fotoğraf seçebilirsiniz.",
          cityWarning: "Önce şehir seçmelisiniz.",
          uploading: "Yükleniyor...",
          unnamed: "İsimsiz İlan"
      },
      AU: {
          headerTitle: isServiceListing ? `Add ${displayCategory}` : `${displayCategory} Listing`,
          photoLabel: "Add Cover Photo",
          photoSubLabel: "(Min 1, Max 3 photos)",
          descLabel: "Description & Details",
          typeLabel: "Animal Type", 
          cityLabel: "State",
          distLabel: "Suburb",
          select: "Select",
          addBtn: "Add", 
          btnPost: "Post Listing",
          breed: "Breed",
          age: "Age",
          gender: "Gender",
          male: "Male",
          female: "Female",
          shopName: isVet ? "Clinic Name" : "Business Name",
          ownerName: isVet ? "Vet Name" : "Owner Name",
          phone: "Phone Number",
          phonePlace: "0400 ...",
          address: "Full Address",
          price: "Price (AUD)",
          sitterName: "Full Name", 
          experience: "Experience (Years)", 
          alertTitle: "Missing Info",
          alertMsg: "Please fill in photo, location and all required fields.",
          typeAlert: "Please select an animal type.", 
          successTitle: "Success",
          successMsg: "Listing posted successfully!",
          limitTitle: "Limit",
          limitMsg: "Max 3 photos allowed.",
          cityWarning: "Select state first.",
          uploading: "Uploading...",
          unnamed: "Unnamed Listing"
      }
  };

  const t = TEXTS[activeLang] || TEXTS.TR;

  // Renk hesaplamaları (Memoize edilmiş inputlar için primitif değerler)
  const inputBgColor = isDarkMode ? PITO_COLORS.navySurface : theme.cardBg;
  const inputBorderColor = isDarkMode ? PITO_COLORS.navyLight : theme.border;
  const inputTextColor = theme.text;
  const inputPlaceholderColor = isDarkMode ? PITO_COLORS.grayText : theme.subText;

  const pickMedia = async () => {
      if (submitLock.current || completed.current || pickerLock.current) return;
      if (mediaList.length >= 3) { Alert.alert(t.limitTitle, t.limitMsg); return; }
      pickerLock.current = true;
      const account = user?.id;
      try {
          const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.5,
              base64: true,
          });
          if (!lifecycle.current.live || lifecycle.current.userId !== account) return;
          if (!result.canceled && result.assets?.[0]) {
              const asset = result.assets[0];
              if (!asset.base64) throw new Error('Fotoğraf okunamadı. Lütfen tekrar seçin.');
              setMediaList(previous => previous.length < 3 ? [...previous, asset] : previous);
          }
      } catch {
          if (lifecycle.current.live) Alert.alert(activeLang === 'TR' ? 'Fotoğraf seçilemedi' : 'Photo unavailable', activeLang === 'TR' ? 'Galeri iznini kontrol edip tekrar deneyin.' : 'Check photo access and try again.');
      } finally { pickerLock.current = false; }
  };

  const removeMedia = index => {
      if (submitLock.current || completed.current) return;
      setMediaList(previous => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const uploadImageToSupabase = async (media, ownerId) => {
      const cacheKey = `${ownerId}:${media.uri}`;
      if (uploadedImages.current.has(cacheKey)) return uploadedImages.current.get(cacheKey);
      if (typeof media.base64 !== 'string' || media.base64.length > 11200000) {
          throw new Error('Fotoğraf okunamadı veya çok büyük. Daha küçük bir fotoğraf seçin.');
      }
      const binary = atob(media.base64);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      if (bytes.length < 12 || bytes.length > 8 * 1024 * 1024) throw new Error('Fotoğraf en fazla 8 MB olabilir.');
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const webp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
      if (!jpeg && !png && !webp) throw new Error('JPEG, PNG veya WebP fotoğraf seçin.');
      const ext = png ? 'png' : webp ? 'webp' : 'jpg';
      const contentType = png ? 'image/png' : webp ? 'image/webp' : 'image/jpeg';
      const filename = `${ownerId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      let bucket = 'listings';
      let { error } = await supabase.storage.from(bucket).upload(filename, bytes.buffer, { contentType, upsert: false });
      // Eski kurulumlarda yalnızca listings bucket'ı yoksa mevcut posts yolunu koru.
      if (error && /bucket.*not found/i.test(error.message || '')) {
          bucket = 'posts';
          ({ error } = await supabase.storage.from(bucket).upload(filename, bytes.buffer, { contentType, upsert: false }));
      }
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
      if (!data?.publicUrl) throw new Error('Fotoğraf bağlantısı alınamadı.');
      uploadedImages.current.set(cacheKey, data.publicUrl);
      return data.publicUrl;
  };

  const handleSubmit = async () => {
      if (submitLock.current || completed.current || pickerLock.current) return;
      animateButton();
      if (mediaList.length === 0 || !city || !district || !description.trim()) {
          Alert.alert(t.alertTitle, t.alertMsg);
          return;
      }
      if (!isServiceListing && !isSitter && !petType) {
          Alert.alert(t.alertTitle, t.typeAlert);
          return;
      }
      if (!user?.id) {
          Alert.alert('Pito', activeLang === 'TR' ? 'Giriş yapmalısınız.' : 'Please sign in.');
          return;
      }
      if (!category) {
          Alert.alert('Pito', activeLang === 'TR' ? 'İlan kategorisi bulunamadı. Geri dönüp tekrar seçin.' : 'Go back and select a listing category.');
          return;
      }
      const numericPrice = price.trim() ? Number(price.trim().replace(',', '.')) : 0;
      const ageInput = isSitter ? experience : age;
      const numericAge = ageInput.trim() ? Number(ageInput.trim().replace(',', '.')) : 0;
      if (!Number.isFinite(numericPrice) || numericPrice < 0 || !Number.isFinite(numericAge) || numericAge < 0) {
          Alert.alert(t.alertTitle, activeLang === 'TR' ? 'Yaş, deneyim ve ücret alanlarına geçerli, negatif olmayan sayılar girin.' : 'Enter valid, nonnegative age, experience and price values.');
          return;
      }
      submitLock.current = true;
      setIsLoading(true);
      setModalVisible(false);
      const ownerId = user.id;
      const code = activeLang;
      const stillCurrent = () => lifecycle.current.live && lifecycle.current.userId === ownerId && lifecycle.current.country === code;
      let saved = false;
      try {
          const uploadedUrls = [];
          for (const media of mediaList) {
              if (!stillCurrent()) throw new Error('Oturum değişti. Lütfen tekrar giriş yapın.');
              const url = await uploadImageToSupabase(media, ownerId);
              if (!url) throw new Error('Fotoğraf yüklenemedi.');
              uploadedUrls.push(url);
          }
          if (!stillCurrent()) throw new Error('Oturum değişti. Lütfen tekrar giriş yapın.');
          const finalName = isServiceListing ? shopName : (isSitter ? sitterName : breed);
          const result = await addListing(category, {
              name: finalName.trim() || t.unnamed,
              description: description.trim(), city, district,
              price: numericPrice, phone, address, breed,
              age: numericAge, gender, pet_type: petType,
              images: uploadedUrls,
          });
          if (!result?.success) throw new Error(result?.msg || 'İlan kaydı doğrulanamadı.');
          saved = true;
          completed.current = true;
          if (!stillCurrent()) return;
          submitLock.current = false;
          setIsLoading(false);
          Alert.alert(t.successTitle, t.successMsg, [
              { text: 'OK', onPress: () => { if (stillCurrent()) navigation.navigate('Home'); } },
          ]);
      } catch (error) {
          if (!saved && stillCurrent()) {
              console.log('[Listings] Yayınlama tamamlanamadı', { code: error?.code || 'request' });
              Alert.alert(activeLang === 'TR' ? 'İlan yayınlanamadı' : 'Listing not published', activeLang === 'TR'
                  ? 'Fotoğraflar veya ilan kaydı tamamlanamadı. Bilgilerin bu ekranda duruyor. Bağlantını kontrol et; tekrar denemeden önce profilinde ilanın oluşup oluşmadığını kontrol et.'
                  : 'The photo upload or listing save could not be confirmed. Your form is preserved. Check your connection and profile before retrying.');
          }
      } finally {
          submitLock.current = false;
          if (lifecycle.current.live) setIsLoading(false);
      }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.background }]}>
      
      <View style={styles.header}>
        <TouchableOpacity disabled={isLoading} onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg }]} accessibilityRole="button" accessibilityLabel={activeLang === 'TR' ? 'Geri' : 'Back'}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.brandRow}><Text style={[styles.brandText, { color: theme.text }]}>Pito</Text><Ionicons name="paw" size={20} color={PITO_COLORS.primary} /></View>
        <View style={styles.headerBadge}><Ionicons name="create-outline" size={19} color={PITO_COLORS.primary} /></View>
      </View>

      <KeyboardAvoidingView pointerEvents={isLoading ? "none" : "auto"} behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                
                <View style={styles.introBlock}>
                    <View style={styles.categoryPill}><Ionicons name="paw-outline" size={13} color={PITO_COLORS.primary} /><Text style={styles.categoryPillText}>{displayCategory}</Text></View>
                    <Text style={[styles.pageTitle, { color: theme.text }]}>{t.headerTitle}</Text>
                    <Text style={[styles.pageSubtitle, { color: theme.subText }]}>{activeLang === 'TR' ? 'Fotoğrafları ve bilgileri ekleyerek ilanını hazırla.' : 'Prepare your listing with photos and details.'}</Text>
                </View>

                {/* Medya Yükleme Alanı */}
                <View style={[styles.sectionContainer, {backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, borderWidth: 1}]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="images-outline" size={20} color={PITO_COLORS.primary} />
                        <View style={{ flex: 1, marginLeft: 9 }}><Text style={[styles.label, { color: theme.text }]}>{t.photoLabel}</Text><Text style={[styles.subLabel, { color: theme.subText }]}>{t.photoSubLabel}</Text></View>
                        <View style={styles.photoCount}><Text style={styles.photoCountText}>{mediaList.length}/3</Text></View>
                    </View>
                    
                    <View style={styles.mediaRow}>
                        <TouchableOpacity style={[styles.addMediaBtn, { borderColor: PITO_COLORS.primary, backgroundColor: isDarkMode ? 'rgba(197, 160, 89, 0.1)' : 'rgba(197, 160, 89, 0.05)' }]} onPress={pickMedia}>
                            <Ionicons name="add" size={32} color={PITO_COLORS.primary} />
                            <Text style={[styles.addMediaText, {color: PITO_COLORS.primary}]}>{t.addBtn}</Text>
                        </TouchableOpacity>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems: 'center'}}>
                            {mediaList.map((item, index) => (
                                <View key={index} style={styles.mediaItem}>
                                    <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                                    {index === 0 && <View style={styles.coverTag}><Text style={styles.coverTagText}>{activeLang === 'TR' ? 'Kapak' : 'Cover'}</Text></View>}
                                    <TouchableOpacity style={styles.removeMedia} onPress={() => removeMedia(index)} accessibilityRole="button" accessibilityLabel={activeLang === 'TR' ? 'Fotoğrafı kaldır' : 'Remove photo'}>
                                        <Ionicons name="close-circle" size={22} color={PITO_COLORS.error} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                {/* YENİ HAYVAN TÜRÜ SEÇİMİ (GRID SİSTEMİ) */}
                {!isServiceListing && !isSitter && (
                    <View style={[styles.sectionContainer, {backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, paddingVertical: 15, borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, borderWidth: 1}]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="paw-outline" size={20} color={PITO_COLORS.primary} />
                            <Text style={[styles.label, { color: theme.text, marginLeft: 8 }]}>{t.typeLabel}</Text>
                        </View>
                        
                        <View style={styles.typeGridContainer}>
                            {ANIMAL_TYPES.map((type, index) => (
                                <TouchableOpacity 
                                    key={index} 
                                    style={[
                                        styles.typeGridItem, 
                                        { backgroundColor: isDarkMode ? PITO_COLORS.navyLight : theme.background, borderColor: isDarkMode ? 'transparent' : theme.border },
                                        petType === type.label && { backgroundColor: PITO_COLORS.primary, borderColor: PITO_COLORS.primary }
                                    ]}
                                    onPress={() => setPetType(type.label)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name={type.icon} size={22} color={petType === type.label ? PITO_COLORS.navyBg : PITO_COLORS.primary} style={{marginBottom: 4}} />
                                    <Text style={[
                                        styles.typeGridText, 
                                        { color: petType === type.label ? PITO_COLORS.navyBg : theme.text }
                                    ]}>
                                        {typeLabels[type.label]}
                                    </Text>
                                    {petType === type.label && <Ionicons name="checkmark-circle" size={14} color={PITO_COLORS.navyBg} style={styles.typeCheckIcon} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.formHeading}><View style={styles.headingIcon}><Ionicons name="document-text-outline" size={18} color={PITO_COLORS.primary} /></View><Text style={[styles.formHeadingText, { color: theme.text }]}>{activeLang === 'TR' ? 'İlan bilgileri' : 'Listing details'}</Text></View>
                {/* Form Alanları */}
                <View style={[styles.sectionContainer, {backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, paddingBottom: 10, borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, borderWidth: 1}]}>
                    
                    {isServiceListing ? (
                        <>
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.shopName}</Text>
                            <ModernInput bgColor={inputBgColor} borderColor={inputBorderColor} textColor={inputTextColor} placeholderColor={inputPlaceholderColor} icon="business-outline" placeholder={t.shopName} value={shopName} onChangeText={setShopName} />
                            
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.ownerName}</Text>
                            <ModernInput bgColor={inputBgColor} borderColor={inputBorderColor} textColor={inputTextColor} placeholderColor={inputPlaceholderColor} icon="person-outline" placeholder={t.ownerName} value={ownerName} onChangeText={setOwnerName} />
                            
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.phone}</Text>
                            <ModernInput bgColor={inputBgColor} borderColor={inputBorderColor} textColor={inputTextColor} placeholderColor={inputPlaceholderColor} icon="call-outline" placeholder={t.phonePlace} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                            
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.address}</Text>
                            <ModernInput bgColor={inputBgColor} borderColor={inputBorderColor} textColor={inputTextColor} placeholderColor={inputPlaceholderColor} icon="location-outline" placeholder={t.address} value={address} onChangeText={setAddress} />
                        </>
                    ) : isSitter ? (
                        <>
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.sitterName}</Text>
                            <ModernInput bgColor={inputBgColor} borderColor={inputBorderColor} textColor={inputTextColor} placeholderColor={inputPlaceholderColor} icon="person-outline" placeholder={t.sitterName} value={sitterName} onChangeText={setSitterName} />
                            
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.experience}</Text>
                            <ModernInput bgColor={inputBgColor} borderColor={inputBorderColor} textColor={inputTextColor} placeholderColor={inputPlaceholderColor} icon="time-outline" placeholder="Örn: 3" keyboardType="numeric" value={experience} onChangeText={setExperience} />

                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.price}</Text>
                            <ModernInput bgColor={inputBgColor} borderColor={inputBorderColor} textColor={inputTextColor} placeholderColor={inputPlaceholderColor} icon="wallet-outline" placeholder="0" keyboardType="numeric" value={price} onChangeText={setPrice} />
                            
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.phone}</Text>
                            <ModernInput bgColor={inputBgColor} borderColor={inputBorderColor} textColor={inputTextColor} placeholderColor={inputPlaceholderColor} icon="call-outline" placeholder={t.phonePlace} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                        </>
                    ) : (
                        <>
                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.breed}</Text>
                                    <ModernInput bgColor={inputBgColor} borderColor={inputBorderColor} textColor={inputTextColor} placeholderColor={inputPlaceholderColor} icon="paw-outline" placeholder={t.breed} value={breed} onChangeText={setBreed} />
                                </View>
                                <View style={{ flex: 0.6 }}>
                                    <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.age}</Text>
                                    <ModernInput bgColor={inputBgColor} borderColor={inputBorderColor} textColor={inputTextColor} placeholderColor={inputPlaceholderColor} icon="calendar-outline" placeholder="0" keyboardType="numeric" value={age} onChangeText={setAge} />
                                </View>
                            </View>

                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.gender}</Text>
                            <View style={styles.genderContainer}>
                                <TouchableOpacity style={[styles.genderBtn, gender === 'Erkek' && { backgroundColor: 'rgba(91, 75, 196, 0.1)', borderColor: '#5B4BC4' }, { borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border }]} onPress={() => setGender('Erkek')} activeOpacity={0.8}>
                                    <Ionicons name="male" size={20} color={gender === 'Erkek' ? '#5B4BC4' : theme.subText} />
                                    <Text style={[styles.genderText, { color: gender === 'Erkek' ? '#5B4BC4' : theme.subText }]}>{t.male}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.genderBtn, gender === 'Dişi' && { backgroundColor: 'rgba(253, 121, 168, 0.1)', borderColor: '#FD79A8' }, { borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border }]} onPress={() => setGender('Dişi')} activeOpacity={0.8}>
                                    <Ionicons name="female" size={20} color={gender === 'Dişi' ? '#FD79A8' : theme.subText} />
                                    <Text style={[styles.genderText, { color: gender === 'Dişi' ? '#FD79A8' : theme.subText }]}>{t.female}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    <View style={[styles.formDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.locationHeading}><Ionicons name="location-outline" size={17} color={PITO_COLORS.primary} /><Text style={[styles.locationHeadingText, { color: theme.text }]}>{activeLang === 'TR' ? 'Konum ve açıklama' : 'Location and description'}</Text></View>
                    {/* Şehir ve İlçe Seçimi */}
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.cityLabel}</Text>
                            <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.background, borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border }]} onPress={() => { setSelectionType('city'); setModalVisible(true); }} activeOpacity={0.8}>
                                <Text style={{ color: city ? theme.text : theme.subText, flex: 1 }}>{city || t.select}</Text>
                                <Ionicons name="chevron-down" size={18} color={PITO_COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.distLabel}</Text>
                            <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.background, borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border }]} onPress={() => { 
                                if (!city) Alert.alert("Warning", t.cityWarning); 
                                else { setSelectionType('district'); setModalVisible(true); }
                            }} activeOpacity={0.8}>
                                <Text style={{ color: district ? theme.text : theme.subText, flex: 1 }}>{district || t.select}</Text>
                                <Ionicons name="chevron-down" size={18} color={PITO_COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.descLabel}</Text>
                    <ModernInput bgColor={inputBgColor} borderColor={inputBorderColor} textColor={inputTextColor} placeholderColor={inputPlaceholderColor} icon="document-text-outline" placeholder="..." value={description} onChangeText={setDescription} multiline={true} />

                </View>

                {/* Yayınla Butonu */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isLoading} activeOpacity={0.8}>
                        {isLoading ? (
                            <ActivityIndicator color={PITO_COLORS.navyBg} />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={24} color={PITO_COLORS.navyBg} style={{marginRight: 8}} />
                                <Text style={styles.submitBtnText}>{t.btnPost}</Text><Ionicons name="arrow-forward" size={18} color={PITO_COLORS.navyBg} style={{ marginLeft: 10 }} />
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>

            </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Seçim Modalı */}
      <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.cardBg }]}>
                <View style={styles.sheetHandle} />
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>{selectionType === 'city' ? t.cityLabel : t.distLabel}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                        <Ionicons name="close" size={24} color={PITO_COLORS.primary} />
                    </TouchableOpacity>
                </View>
                <FlatList 
                    data={
                        selectionType === 'city' 
                        ? Object.keys(CITY_DATA[activeLang] || {}).sort((a, b) => a.localeCompare(b, 'tr')) 
                        : (CITY_DATA[activeLang]?.[city] || []).sort((a, b) => a.localeCompare(b, 'tr'))
                    }
                    keyExtractor={(item) => item}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={15}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={[styles.modalItem, { borderBottomColor: isDarkMode ? PITO_COLORS.navyLight : theme.border }]} onPress={() => {
                            if (selectionType === 'city') { setCity(item); setDistrict(''); } else { setDistrict(item); }
                            setModalVisible(false);
                        }}>
                            <Text style={[styles.modalItemText, { color: theme.text }]}>{item}</Text>
                            <Ionicons name="chevron-forward" size={18} color={PITO_COLORS.primary} />
                        </TouchableOpacity>
                    )}
                />
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  backButton: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brandText: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  headerBadge: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(197,160,89,0.1)', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 38 },
  introBlock: { paddingTop: 14, paddingBottom: 25 },
  categoryPill: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(197,160,89,0.1)', borderRadius: 10, marginBottom: 13 },
  categoryPillText: { color: PITO_COLORS.primary, fontSize: 10, fontWeight: '700' },
  pageTitle: { fontSize: 29, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8 },
  pageSubtitle: { fontSize: 12, lineHeight: 19, marginTop: 9 },
  sectionContainer: { borderRadius: 22, padding: 16, marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 17 },
  label: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  subLabel: { fontSize: 10, lineHeight: 15, marginTop: 4 },
  photoCount: { backgroundColor: 'rgba(197,160,89,0.13)', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, marginLeft: 4 },
  photoCountText: { color: PITO_COLORS.primary, fontSize: 11, fontWeight: '700' },
  fieldLabel: { fontSize: 12, marginBottom: 8, fontWeight: '600', marginLeft: 2 },
  mediaRow: { flexDirection: 'row', alignItems: 'center' },
  addMediaBtn: { width: 82, height: 94, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  addMediaText: { fontSize: 11, fontWeight: '600', marginTop: 5 },
  mediaItem: { position: 'relative', marginRight: 12, paddingTop: 7, paddingRight: 7, paddingBottom: 7 },
  mediaImage: { width: 82, height: 94, borderRadius: 15 },
  removeMedia: { position: 'absolute', top: 0, right: 0, backgroundColor: PITO_COLORS.navyBg, borderRadius: 13, padding: 3 },
  coverTag: { position: 'absolute', bottom: 13, left: 6, backgroundColor: 'rgba(11,19,30,0.82)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  coverTagText: { color: PITO_COLORS.cream, fontSize: 8, fontWeight: '700' },
  typeGridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  typeGridItem: { width: '31%', minHeight: 79, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 10, position: 'relative', paddingVertical: 10 },
  typeGridText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  typeCheckIcon: { position: 'absolute', top: 5, right: 5 },
  formHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13, marginTop: 5 },
  headingIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(197,160,89,0.12)', alignItems: 'center', justifyContent: 'center' },
  formHeadingText: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 13, borderWidth: 1, paddingHorizontal: 11, marginBottom: 18 },
  inputIcon: { marginRight: 7 },
  input: { flex: 1, minWidth: 0, fontSize: 13, paddingVertical: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  selectorBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 51, paddingHorizontal: 11, paddingVertical: 14, borderRadius: 13, borderWidth: 1, marginBottom: 18 },
  genderContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  genderBtn: { flex: 0.48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 13, borderWidth: 1, backgroundColor: 'transparent' },
  genderText: { marginLeft: 7, fontWeight: '600', fontSize: 13 },
  formDivider: { height: 1, opacity: 0.65, marginTop: 2, marginBottom: 20 },
  locationHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 17 },
  locationHeadingText: { fontSize: 14, fontWeight: '700' },
  submitBtn: { flexDirection: 'row', backgroundColor: PITO_COLORS.primary, minHeight: 56, paddingHorizontal: 15, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  submitBtnText: { color: PITO_COLORS.navyBg, fontSize: 15, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(5,10,18,0.7)', justifyContent: 'flex-end' },
  modalContent: { height: '72%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 32 },
  sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 3, backgroundColor: PITO_COLORS.grayText, opacity: 0.4, marginBottom: 22 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  closeModalBtn: { width: 36, height: 36, backgroundColor: 'rgba(197,160,89,0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalItem: { paddingVertical: 18, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 14, fontWeight: '500' }
});

export default AddListingScreen;