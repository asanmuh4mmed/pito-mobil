import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, Modal, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/colors';
import { ListingContext } from '../context/ListingContext';
import { AuthContext } from '../context/AuthContext';
import { CITY_DATA } from '../constants/cities';
import { ThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

// ✅ DÜZELTME: ModernInput ana fonksiyonun DIŞINA alındı. 
// theme prop olarak dışarıdan alınıyor, böylece her harf yazışta klavye kapanmayacak.
const ModernInput = ({ icon, placeholder, value, onChangeText, keyboardType = 'default', multiline = false, theme }) => (
    <View style={[styles.inputContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        {icon && <Ionicons name={icon} size={20} color="#6C5CE7" style={styles.inputIcon} />}
        <TextInput
            style={[styles.input, { color: theme.text, height: multiline ? 100 : 50 }]}
            placeholder={placeholder}
            placeholderTextColor={theme.subText}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
        />
    </View>
);

const AddListingScreen = ({ route, navigation }) => {
  const { category } = route.params; 
  const { fetchListings } = useContext(ListingContext);
  const { user, country } = useContext(AuthContext);
  const { theme, isDarkMode } = useContext(ThemeContext);

  const activeLang = country?.code || 'TR';

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
  
  // Hayvan Bilgileri
  const [petName, setPetName] = useState('');
  const [age, setAge] = useState('');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('Erkek');
  const [petType, setPetType] = useState(null); 

  // İşletme Bilgileri
  const [shopName, setShopName] = useState(''); 
  const [ownerName, setOwnerName] = useState(''); 
  const [phone, setPhone] = useState(''); 
  const [address, setAddress] = useState(''); 
  const [price, setPrice] = useState(''); 

  // Bakıcı Bilgileri (YENİ)
  const [sitterName, setSitterName] = useState(user?.user_metadata?.full_name || ''); 
  const [experience, setExperience] = useState(''); 

  // Modal State
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

  const ANIMAL_TYPES = [
      { label: 'Kedi', icon: 'paw' },
      { label: 'Köpek', icon: 'paw' },
      { label: 'Kuş', icon: 'airplane' }, 
      { label: 'Balık', icon: 'water' },
      { label: 'Kemirgen', icon: 'leaf' },
      { label: 'Diğer', icon: 'ellipsis-horizontal' }
  ];

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
          btnPost: "İlanı Yayınla",
          petName: "Pet İsmi",
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
          sitterName: "İsim Soyisim", // 🆕 YENİ
          experience: "Deneyim (Yıl)", // 🆕 YENİ
          alertTitle: "Eksik Bilgi",
          alertMsg: "Lütfen fotoğraf, konum ve tüm zorunlu alanları doldurunuz.",
          typeAlert: "Lütfen hayvan türünü seçiniz.", 
          successTitle: "Başarılı",
          successMsg: "İlanınız başarıyla yayınlandı!",
          limitTitle: "Limit",
          limitMsg: "En fazla 3 fotoğraf seçebilirsiniz.",
          cityWarning: "Önce şehir seçmelisiniz.",
          uploading: "Yükleniyor..."
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
          btnPost: "Post Listing",
          petName: "Pet Name",
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
          sitterName: "Full Name", // 🆕 YENİ
          experience: "Experience (Years)", // 🆕 YENİ
          alertTitle: "Missing Info",
          alertMsg: "Please fill in photo, location and all required fields.",
          typeAlert: "Please select an animal type.", 
          successTitle: "Success",
          successMsg: "Listing posted successfully!",
          limitTitle: "Limit",
          limitMsg: "Max 3 photos allowed.",
          cityWarning: "Select state first.",
          uploading: "Uploading..."
      }
  };

  const t = TEXTS[activeLang];

  const pickMedia = async () => {
    if (mediaList.length >= 3) { Alert.alert(t.limitTitle, t.limitMsg); return; }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true 
    });
    if (!result.canceled) {
      setMediaList([...mediaList, result.assets[0]]);
    }
  };

  const removeMedia = (index) => {
      const newList = [...mediaList];
      newList.splice(index, 1);
      setMediaList(newList);
  };

  const decode = (base64) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const uploadImageToSupabase = async (base64) => {
      try {
          const filename = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const arrayBuffer = decode(base64);

          const { error } = await supabase.storage
              .from('listings') 
              .upload(filename, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

          if (error) {
             const { error: err2 } = await supabase.storage.from('posts').upload(filename, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
             if(err2) throw err2;
             const { data } = supabase.storage.from('posts').getPublicUrl(filename);
             return data.publicUrl;
          }

          const { data } = supabase.storage.from('listings').getPublicUrl(filename);
          return data.publicUrl;
      } catch (error) {
          console.log("Resim yükleme hatası:", error);
          return null;
      }
  };

  // --- KAYDETME ---
  const handleSubmit = async () => {
      animateButton();
      
      // Validasyonlar
      if (mediaList.length === 0 || !city || !district || !description) {
          Alert.alert(t.alertTitle, t.alertMsg);
          return;
      }

      // 🆕 Hayvan Türü Kontrolü (Hizmet ilanı VEYA Bakıcı ilanı değilse sorulacak)
      if (!isServiceListing && !isSitter && !petType) {
          Alert.alert(t.alertTitle, t.typeAlert);
          return;
      }

      if (!user) {
          Alert.alert("Hata", "Giriş yapmalısınız.");
          return;
      }

      setIsLoading(true);

      try {
          // 1. Resimleri Yükle
          const uploadedUrls = [];
          for (const media of mediaList) {
              if (media.base64) {
                  const publicUrl = await uploadImageToSupabase(media.base64);
                  if (publicUrl) uploadedUrls.push(publicUrl);
              }
          }

          // İlan İsmi Belirleme (Bakıcıysa sitterName, Değilse petName veya shopName)
          const finalName = isServiceListing ? shopName : (isSitter ? sitterName : petName);
          
          const numericPrice = price && price.trim() !== '' ? parseFloat(price) : 0;
          
          // Bakıcı ise deneyimi, hayvan ise yaşı alır. Veritabanında hata vermemesi için age kolonunda tutulur.
          const numericAge = isSitter 
              ? (experience && experience.trim() !== '' ? parseFloat(experience) : 0)
              : (age && age.trim() !== '' ? parseFloat(age) : 0);

          // 3. DOĞRUDAN SUPABASE INSERT
          const { error } = await supabase
              .from('listings')
              .insert({
                  owner_id: user.id, 
                  name: finalName || 'İsimsiz İlan', 
                  category: category,
                  description: description,
                  city: city,
                  district: district,
                  price: numericPrice, 
                  phone: phone,
                  address: address,
                  breed: breed,
                  age: numericAge, 
                  gender: gender,
                  pet_type: petType, 
                  img: uploadedUrls.length > 0 ? uploadedUrls[0] : null, 
                  images: uploadedUrls, 
                  is_found: false,
                  created_at: new Date()
              });

          if (error) throw error;

          if (fetchListings) await fetchListings();
          
          setIsLoading(false);
          
          Alert.alert(t.successTitle, t.successMsg, [
              { text: "OK", onPress: () => navigation.navigate('Home') }
          ]);

      } catch (error) {
          setIsLoading(false);
          console.log("İlan yükleme hatası:", error);
          Alert.alert("Hata", "İlan yüklenirken bir sorun oluştu: " + (error.message || JSON.stringify(error)));
      }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F8F9FA' }]}>
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, {backgroundColor: isDarkMode ? '#333' : '#F0F0F0'}]}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t.headerTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                
                {/* Medya Yükleme Alanı */}
                <View style={[styles.sectionContainer, {backgroundColor: theme.cardBg, shadowColor: isDarkMode ? '#000' : '#6C5CE7'}]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="images-outline" size={20} color="#6C5CE7" />
                        <Text style={[styles.label, { color: theme.text, marginLeft: 8 }]}>{t.photoLabel} <Text style={styles.subLabel}>{t.photoSubLabel}</Text></Text>
                    </View>
                    
                    <View style={styles.mediaRow}>
                        <TouchableOpacity style={[styles.addMediaBtn, { borderColor: '#6C5CE7', backgroundColor: isDarkMode ? 'rgba(108, 92, 231, 0.1)' : 'rgba(108, 92, 231, 0.05)' }]} onPress={pickMedia}>
                            <Ionicons name="add" size={32} color="#6C5CE7" />
                            <Text style={[styles.addMediaText, {color: '#6C5CE7'}]}>Ekle</Text>
                        </TouchableOpacity>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems: 'center'}}>
                            {mediaList.map((item, index) => (
                                <View key={index} style={styles.mediaItem}>
                                    <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                                    <TouchableOpacity style={styles.removeMedia} onPress={() => removeMedia(index)}>
                                        <Ionicons name="close-circle" size={22} color="#FF4D4D" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                {/* 🆕 HAYVAN TÜRÜ SEÇİMİ (Hizmet VEYA Bakıcı ilanı DEĞİLSE sorulacak) */}
                {!isServiceListing && !isSitter && (
                    <View style={[styles.sectionContainer, {backgroundColor: theme.cardBg, paddingVertical: 15, shadowColor: isDarkMode ? '#000' : '#6C5CE7'}]}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="paw-outline" size={20} color="#6C5CE7" />
                            <Text style={[styles.label, { color: theme.text, marginLeft: 8 }]}>{t.typeLabel}</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {ANIMAL_TYPES.map((type, index) => (
                                <TouchableOpacity 
                                    key={index} 
                                    style={[
                                        styles.typeChip, 
                                        petType === type.label && { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
                                        { borderColor: theme.border }
                                    ]}
                                    onPress={() => setPetType(type.label)}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name={type.icon} size={16} color={petType === type.label ? 'white' : theme.subText} style={{marginRight: 5}} />
                                    <Text style={[
                                        styles.typeChipText, 
                                        { color: petType === type.label ? 'white' : theme.subText }
                                    ]}>
                                        {type.label}
                                    </Text>
                                    {petType === type.label && <Ionicons name="checkmark-circle" size={16} color="white" style={{marginLeft: 5}} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Form Alanları */}
                <View style={[styles.sectionContainer, {backgroundColor: theme.cardBg, paddingBottom: 10, shadowColor: isDarkMode ? '#000' : '#6C5CE7'}]}>
                    
                    {isServiceListing ? (
                        <>
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.shopName}</Text>
                            <ModernInput theme={theme} icon="business-outline" placeholder={t.shopName} value={shopName} onChangeText={setShopName} />
                            
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.ownerName}</Text>
                            <ModernInput theme={theme} icon="person-outline" placeholder={t.ownerName} value={ownerName} onChangeText={setOwnerName} />
                            
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.phone}</Text>
                            <ModernInput theme={theme} icon="call-outline" placeholder={t.phonePlace} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                            
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.address}</Text>
                            <ModernInput theme={theme} icon="location-outline" placeholder={t.address} value={address} onChangeText={setAddress} />
                        </>
                    ) : isSitter ? (
                        <>
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.sitterName}</Text>
                            <ModernInput theme={theme} icon="person-outline" placeholder={t.sitterName} value={sitterName} onChangeText={setSitterName} />
                            
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.experience}</Text>
                            <ModernInput theme={theme} icon="time-outline" placeholder="Örn: 3" keyboardType="numeric" value={experience} onChangeText={setExperience} />

                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.price}</Text>
                            <ModernInput theme={theme} icon="wallet-outline" placeholder="0" keyboardType="numeric" value={price} onChangeText={setPrice} />
                            
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.phone}</Text>
                            <ModernInput theme={theme} icon="call-outline" placeholder={t.phonePlace} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                        </>
                    ) : (
                        <>
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.petName}</Text>
                            <ModernInput theme={theme} icon="paw-outline" placeholder={t.petName} value={petName} onChangeText={setPetName} />
                            
                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.breed}</Text>
                                    <ModernInput theme={theme} icon="dna-outline" placeholder={t.breed} value={breed} onChangeText={setBreed} />
                                </View>
                                <View style={{ flex: 0.6 }}>
                                    <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.age}</Text>
                                    <ModernInput theme={theme} icon="calendar-outline" placeholder="0" keyboardType="numeric" value={age} onChangeText={setAge} />
                                </View>
                            </View>

                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.gender}</Text>
                            <View style={styles.genderContainer}>
                                <TouchableOpacity style={[styles.genderBtn, gender === 'Erkek' && { backgroundColor: 'rgba(91, 75, 196, 0.1)', borderColor: '#5B4BC4' }, { borderColor: theme.border }]} onPress={() => setGender('Erkek')} activeOpacity={0.8}>
                                    <Ionicons name="male" size={20} color={gender === 'Erkek' ? '#5B4BC4' : theme.subText} />
                                    <Text style={[styles.genderText, { color: gender === 'Erkek' ? '#5B4BC4' : theme.subText }]}>{t.male}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.genderBtn, gender === 'Dişi' && { backgroundColor: 'rgba(253, 121, 168, 0.1)', borderColor: '#FD79A8' }, { borderColor: theme.border }]} onPress={() => setGender('Dişi')} activeOpacity={0.8}>
                                    <Ionicons name="female" size={20} color={gender === 'Dişi' ? '#FD79A8' : theme.subText} />
                                    <Text style={[styles.genderText, { color: gender === 'Dişi' ? '#FD79A8' : theme.subText }]}>{t.female}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {/* Şehir ve İlçe Seçimi */}
                    <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.cityLabel}</Text>
                            <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => { setSelectionType('city'); setModalVisible(true); }} activeOpacity={0.8}>
                                <Text style={{ color: city ? theme.text : theme.subText, flex: 1 }}>{city || t.select}</Text>
                                <Ionicons name="chevron-down" size={18} color={theme.subText} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.distLabel}</Text>
                            <TouchableOpacity style={[styles.selectorBtn, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => { 
                                if (!city) Alert.alert("Warning", t.cityWarning); 
                                else { setSelectionType('district'); setModalVisible(true); }
                            }} activeOpacity={0.8}>
                                <Text style={{ color: district ? theme.text : theme.subText, flex: 1 }}>{district || t.select}</Text>
                                <Ionicons name="chevron-down" size={18} color={theme.subText} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={[styles.fieldLabel, {color: theme.subText}]}>{t.descLabel}</Text>
                    <ModernInput theme={theme} icon="document-text-outline" placeholder="..." value={description} onChangeText={setDescription} multiline={true} />

                </View>

                {/* Yayınla Butonu */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={isLoading} activeOpacity={0.8}>
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={24} color="white" style={{marginRight: 8}} />
                                <Text style={styles.submitBtnText}>{t.btnPost}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>

            </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Seçim Modalı */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>{selectionType === 'city' ? t.cityLabel : t.distLabel}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalBtn}>
                        <Ionicons name="close" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>
                <FlatList 
                    data={
                        selectionType === 'city' 
                        ? Object.keys(CITY_DATA[activeLang] || {}).sort() 
                        : (CITY_DATA[activeLang]?.[city]?.sort() || [])
                    }
                    keyExtractor={(item) => item}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={[styles.modalItem, { borderBottomColor: theme.border }]} onPress={() => {
                            if (selectionType === 'city') { setCity(item); setDistrict(''); } else { setDistrict(item); }
                            setModalVisible(false);
                        }}>
                            <Text style={[styles.modalItemText, { color: theme.text }]}>{item}</Text>
                            <Ionicons name="chevron-forward" size={18} color={theme.subText} />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, zIndex: 10 },
  headerTitle: { fontSize: 19, fontWeight: '800' },
  backButton: { padding: 8, borderRadius: 14 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  // Section Styles
  sectionContainer: { borderRadius: 24, padding: 20, marginBottom: 20, shadowOffset:{width:0, height:4}, shadowOpacity:0.05, shadowRadius:8, elevation: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  label: { fontSize: 16, fontWeight: '800' },
  subLabel: { fontSize: 11, fontWeight: '500', color: '#999' },
  fieldLabel: { fontSize: 13, marginBottom: 6, fontWeight: '700', marginLeft: 4, letterSpacing: 0.5 },

  // Media Styles
  mediaRow: { flexDirection: 'row', alignItems: 'center' },
  addMediaBtn: { width: 80, height: 80, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  addMediaText: { fontSize: 12, fontWeight: 'bold', marginTop: 4 },
  mediaItem: { position: 'relative', marginRight: 12 },
  mediaImage: { width: 80, height: 80, borderRadius: 18 },
  removeMedia: { position: 'absolute', top: -8, right: -8, backgroundColor: 'white', borderRadius: 12, padding: 1 },

  // Type Chip Styles
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 25, borderWidth: 1, marginRight: 10, backgroundColor: 'transparent' },
  typeChipText: { fontSize: 14, fontWeight: '600' },

  // Input Styles
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingHorizontal: 15, marginBottom: 18 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, paddingVertical: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  
  // Selectors
  selectorBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 16, borderRadius: 16, borderWidth: 1, marginBottom: 18 },
  
  // Gender Styles
  genderContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  genderBtn: { flex: 0.48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, borderWidth: 1, backgroundColor: 'transparent' },
  genderText: { marginLeft: 8, fontWeight: 'bold', fontSize: 15 },

  // Submit Button
  submitBtn: { flexDirection: 'row', backgroundColor: '#6C5CE7', paddingVertical: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#6C5CE7', shadowOffset: {width:0, height:5}, shadowOpacity:0.3, shadowRadius: 10, elevation: 6 },
  submitBtnText: { color: 'white', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '65%', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, shadowColor: '#000', shadowOffset: {width: 0, height: -5}, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeModalBtn: { padding: 6, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 20 },
  modalItem: { paddingVertical: 18, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 16, fontWeight: '600' }
});

export default AddListingScreen;