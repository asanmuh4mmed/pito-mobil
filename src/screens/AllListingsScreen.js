import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Modal, ScrollView, Animated, Dimensions, TextInput, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { ListingContext } from '../context/ListingContext';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { CITY_DATA } from '../constants/cities';

const { width } = Dimensions.get('window');

// --- ÇEVİRİLER ---
const TRANSLATIONS = {
    TR: {
        listingsFound: "İlan Bulundu",
        noLocation: "Konum Yok",
        ageText: "Yaş",
        animalType: "Hayvan Türü",
        location: "Konum",
        selectCity: "İl Seç",
        cityWarning: "Önce şehir seçmelisiniz.",
        selectDistrict: "İlçe Seç",
        ageRange: "Yaş Aralığı",
        min: "Min",
        max: "Max",
        gender: "Cinsiyet",
        apply: "Uygula",
        clearAll: "Tümünü Temizle",
        clear: "Temizle",
        backToCities: "Şehirlere Dön",
        backToFilters: "Filtrelere Dön",
        noResultTitle: "Sonuç Bulunamadı",
        noResultDesc: "Arama kriterlerinizi değiştirerek tekrar deneyebilirsiniz.",
        clearFilters: "Filtreleri Temizle",
        addListing: "İlan Ekle",
        detailedFilter: "Detaylı Filtreleme"
    },
    AU: {
        listingsFound: "Listings Found",
        noLocation: "No Location",
        ageText: "Years Old",
        animalType: "Animal Type",
        location: "Location",
        selectCity: "Select City",
        cityWarning: "Please select a city first.",
        selectDistrict: "Select District",
        ageRange: "Age Range",
        min: "Min",
        max: "Max",
        gender: "Gender",
        apply: "Apply",
        clearAll: "Clear All",
        clear: "Clear",
        backToCities: "Back to Cities",
        backToFilters: "Back to Filters",
        noResultTitle: "No Results Found",
        noResultDesc: "You can try again by modifying your search criteria.",
        clearFilters: "Clear Filters",
        addListing: "Add Listing",
        detailedFilter: "Detailed Filtering"
    }
};

const AllListingsScreen = ({ navigation, route }) => {
  const { title, data } = route.params;
  const { reviews } = useContext(ListingContext);
  const { country } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  // Dil Seçimi
  const activeCountryCode = country?.code || 'TR';
  const activeLang = country?.code === 'AU' ? 'AU' : 'TR';
  const t = TRANSLATIONS[activeLang];

  // --- FİLTRELEME STATE'LERİ ---
  const [displayedData, setDisplayedData] = useState([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  
  // Seçili Filtreler
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  
  const [selectionMode, setSelectionMode] = useState(null); // null | 'city' | 'district'

  // Hayvan Türleri Listesi (Arka planda daima Türkçe çalışır ki filtreleme bozulmasın)
  const ANIMAL_TYPES = ['Kedi', 'Köpek', 'Kuş', 'Balık', 'Kemirgen', 'Diğer'];

  // Ekranda Görünen Tür İsimleri (Çeviri)
  const typeLabels = {
      'Kedi': activeLang === 'AU' ? 'Cat' : 'Kedi',
      'Köpek': activeLang === 'AU' ? 'Dog' : 'Köpek',
      'Kuş': activeLang === 'AU' ? 'Bird' : 'Kuş',
      'Balık': activeLang === 'AU' ? 'Fish' : 'Balık',
      'Kemirgen': activeLang === 'AU' ? 'Rodent' : 'Kemirgen',
      'Diğer': activeLang === 'AU' ? 'Other' : 'Diğer',
  };

  // Ekranda Görünen Cinsiyet İsimleri (Çeviri)
  const genderLabels = {
      'Erkek': activeLang === 'AU' ? 'Male' : 'Erkek',
      'Dişi': activeLang === 'AU' ? 'Female' : 'Dişi',
  };

  // --- VERİ İŞLEME VE FİLTRELEME ---
  useEffect(() => {
    let result = data.filter(item => {
        if (item.countryCode) return item.countryCode === activeCountryCode;
        return activeCountryCode === 'TR';
    });

    if (selectedCity) result = result.filter(item => item.city === selectedCity);
    if (selectedDistrict) result = result.filter(item => item.district === selectedDistrict);
    if (selectedGender) result = result.filter(item => item.gender === selectedGender);
    if (selectedType) {
        result = result.filter(item => 
            (item.breed && item.breed.toLowerCase().includes(selectedType.toLowerCase())) ||
            (item.name && item.name.toLowerCase().includes(selectedType.toLowerCase())) ||
            (item.category && item.category.toLowerCase().includes(selectedType.toLowerCase()))
        );
    }
    if (minAge !== '') result = result.filter(item => item.age >= parseInt(minAge));
    if (maxAge !== '') result = result.filter(item => item.age <= parseInt(maxAge));

    setDisplayedData(result);
  }, [data, country, selectedCity, selectedDistrict, selectedGender, selectedType, minAge, maxAge]);

  // Filtreleri Temizle
  const clearFilters = () => {
      setSelectedCity(null);
      setSelectedDistrict(null);
      setSelectedGender(null);
      setSelectedType(null);
      setMinAge('');
      setMaxAge('');
      setSelectionMode(null);
      setFilterModalVisible(false);
  };

  const activeFilterCount = [selectedCity, selectedDistrict, selectedGender, selectedType, minAge, maxAge].filter(Boolean).length;

  // --- KART BİLEŞENİ ---
  const ListingCard = ({ item, index }) => {
    const isService = item.category.includes('Veteriner') || item.category.includes('Vet') || item.category.includes('Bakıcı') || item.category.includes('Sitter');
    const itemReviews = reviews ? reviews.filter(r => r.listingId === item.id) : [];
    const avgRating = itemReviews.length > 0 
        ? (itemReviews.reduce((sum, r) => sum + r.rating, 0) / itemReviews.length).toFixed(1) 
        : null;

    const translateY = useRef(new Animated.Value(50)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 500, delay: index * 100, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, friction: 6, tension: 50, delay: index * 100, useNativeDriver: true })
        ]).start();
    }, []);

    return (
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.cardBg }]} 
            onPress={() => navigation.navigate('ListingDetail', { item })}
            activeOpacity={0.9}
          >
            <View style={styles.imageWrapper}>
                <Image source={{ uri: item.img }} style={styles.image} resizeMode="cover" />
                <View style={styles.badgesContainer}>
                    {isService && avgRating && (
                        <View style={styles.ratingBadge}>
                            <Ionicons name="star" size={10} color="white" />
                            <Text style={styles.ratingText}>{avgRating}</Text>
                        </View>
                    )}
                    {item.gender && (
                        <View style={[styles.genderBadge, { backgroundColor: item.gender === 'Dişi' || item.gender === 'Female' ? '#FF6B6B' : '#2196F3' }]}>
                            <Ionicons name={item.gender === 'Dişi' || item.gender === 'Female' ? "female" : "male"} size={12} color="white" />
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.info}>
                <View>
                    <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.breed, { color: theme.subText }]} numberOfLines={1}>
                        {item.breed || item.subtitle} {item.age ? ` • ${item.age} ${t.ageText}` : ''}
                    </Text>
                </View>
                <View style={styles.cardFooter}>
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color={theme.subText} />
                        <Text style={[styles.locationText, { color: theme.subText }]} numberOfLines={1}>
                            {item.city ? `${item.city}, ${item.district}` : t.noLocation}
                        </Text>
                    </View>
                    {item.price > 0 && (
                        <Text style={styles.priceText}>{item.price} {activeCountryCode === 'AU' ? 'AUD' : 'TL'}</Text>
                    )}
                </View>
            </View>
          </TouchableOpacity>
      </Animated.View>
    );
  };

  // --- ANA FİLTRE İÇERİĞİ (KOMPONENT) ---
  const FilterMainContent = () => (
      <ScrollView showsVerticalScrollIndicator={false}>
          {/* Hayvan Türü */}
          <Text style={[styles.filterLabel, {color: theme.text}]}>{t.animalType}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
              {ANIMAL_TYPES.map((type) => (
                  <TouchableOpacity 
                      key={type}
                      style={[styles.typeBtn, selectedType === type && styles.typeBtnActive, {borderColor: theme.border}]}
                      onPress={() => setSelectedType(selectedType === type ? null : type)}
                  >
                      <Text style={[styles.typeBtnText, selectedType === type && {color: 'white'}]}>{typeLabels[type]}</Text>
                  </TouchableOpacity>
              ))}
          </ScrollView>

          {/* Konum Seçimi */}
          <Text style={[styles.filterLabel, {color: theme.text}]}>{t.location}</Text>
          <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:20}}>
              <TouchableOpacity style={[styles.selector, {borderColor: theme.border}]} onPress={() => setSelectionMode('city')}>
                  <Text style={{color: selectedCity ? theme.text : theme.subText}}>{selectedCity || t.selectCity}</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.subText} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.selector, {borderColor: theme.border}]} onPress={() => { 
                  if(!selectedCity) alert(t.cityWarning); 
                  else setSelectionMode('district');
              }}>
                  <Text style={{color: selectedDistrict ? theme.text : theme.subText}}>{selectedDistrict || t.selectDistrict}</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.subText} />
              </TouchableOpacity>
          </View>

          {/* Yaş Aralığı */}
          <Text style={[styles.filterLabel, {color: theme.text}]}>{t.ageRange}</Text>
          <View style={{flexDirection:'row', alignItems:'center', marginBottom:20}}>
              <TextInput 
                  style={[styles.ageInput, {borderColor: theme.border, color: theme.text}]} 
                  placeholder={t.min} placeholderTextColor={theme.subText} keyboardType="numeric"
                  value={minAge} onChangeText={setMinAge}
              />
              <Text style={{marginHorizontal:10, color:theme.subText}}>-</Text>
              <TextInput 
                  style={[styles.ageInput, {borderColor: theme.border, color: theme.text}]} 
                  placeholder={t.max} placeholderTextColor={theme.subText} keyboardType="numeric"
                  value={maxAge} onChangeText={setMaxAge}
              />
          </View>

          {/* Cinsiyet */}
          <Text style={[styles.filterLabel, {color: theme.text}]}>{t.gender}</Text>
          <View style={{flexDirection:'row', marginBottom:30}}>
              {['Erkek', 'Dişi'].map((g) => (
                  <TouchableOpacity 
                      key={g} 
                      style={[styles.genderBtn, selectedGender === g && styles.genderBtnActive, {borderColor: theme.border}]}
                      onPress={() => setSelectedGender(selectedGender === g ? null : g)}
                  >
                      <Ionicons name={g === 'Erkek' ? 'male' : 'female'} size={18} color={selectedGender === g ? 'white' : theme.subText} />
                      <Text style={[styles.genderText, selectedGender === g && {color:'white'}]}>{genderLabels[g]}</Text>
                  </TouchableOpacity>
              ))}
          </View>

          <TouchableOpacity style={styles.applyBtn} onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.applyBtnText}>{t.apply} ({activeFilterCount})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Text style={{color: theme.subText}}>{t.clearAll}</Text>
          </TouchableOpacity>
      </ScrollView>
  );

  // --- LİSTE GÖRÜNÜMÜ (Şehir/İlçe Seçimi İçin) ---
  const SelectionListContent = () => {
      const dataList = selectionMode === 'city' 
          ? Object.keys(CITY_DATA[activeLang] || {}).sort() 
          : (CITY_DATA[activeLang]?.[selectedCity]?.sort() || []);

      return (
          <View style={{flex: 1}}>
              <TouchableOpacity onPress={() => setSelectionMode(null)} style={{flexDirection:'row', alignItems:'center', marginBottom:15, paddingVertical:5}}>
                  <Ionicons name="arrow-back" size={24} color={theme.text} />
                  <Text style={{marginLeft:10, fontSize:16, fontWeight:'bold', color: theme.text}}>
                      {selectionMode === 'city' ? t.backToCities : t.backToFilters}
                  </Text>
              </TouchableOpacity>
              
              <FlatList 
                  data={dataList}
                  keyExtractor={(item) => item}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                      <TouchableOpacity style={[styles.selectionItem, {borderBottomColor: theme.border}]} onPress={() => {
                          if (selectionMode === 'city') { setSelectedCity(item); setSelectedDistrict(null); } else { setSelectedDistrict(item); }
                          setSelectionMode(null); 
                      }}>
                          <Text style={[styles.selectionText, {color: theme.text}]}>{item}</Text>
                          <Ionicons name="checkmark" size={20} color={COLORS.primary} style={{opacity: (selectedCity === item || selectedDistrict === item) ? 1 : 0}} />
                      </TouchableOpacity>
                  )}
              />
          </View>
      );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8F9FA' }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <View style={{alignItems:'center'}}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{title}</Text>
            <Text style={{fontSize:11, color: theme.subText, fontWeight:'500'}}>{displayedData.length} {t.listingsFound}</Text>
        </View>

        <TouchableOpacity onPress={() => setFilterModalVisible(true)} style={[styles.iconBtn, activeFilterCount > 0 && {backgroundColor: COLORS.primary + '15'}]}>
            <Ionicons name="options" size={24} color={activeFilterCount > 0 ? COLORS.primary : theme.text} />
            {activeFilterCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{activeFilterCount}</Text></View>}
        </TouchableOpacity>
      </View>

      {/* AKTİF FİLTRE ÇUBUĞU */}
      {activeFilterCount > 0 && (
          <View style={styles.filterBarContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:15, paddingVertical:10}}>
                {selectedType && (
                    <TouchableOpacity style={styles.chip} onPress={() => setSelectedType(null)}>
                        <Text style={styles.chipText}>{typeLabels[selectedType]}</Text>
                        <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                )}
                {selectedCity && (
                    <TouchableOpacity style={styles.chip} onPress={() => setSelectedCity(null)}>
                        <Text style={styles.chipText}>{selectedCity}</Text>
                        <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                )}
                {selectedDistrict && (
                    <TouchableOpacity style={styles.chip} onPress={() => setSelectedDistrict(null)}>
                        <Text style={styles.chipText}>{selectedDistrict}</Text>
                        <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                )}
                {selectedGender && (
                    <TouchableOpacity style={styles.chip} onPress={() => setSelectedGender(null)}>
                        <Text style={styles.chipText}>{genderLabels[selectedGender]}</Text>
                        <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={clearFilters} style={styles.clearTextBtn}>
                    <Text style={{color: COLORS.primary, fontSize:12, fontWeight:'bold'}}>{t.clear}</Text>
                </TouchableOpacity>
            </ScrollView>
          </View>
      )}

      {/* LİSTE */}
      <FlatList
        data={displayedData}
        renderItem={({ item, index }) => <ListingCard item={item} index={index} />}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }} 
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            <View style={{alignItems:'center', marginTop:80}}>
                <View style={{width: 100, height: 100, borderRadius: 50, backgroundColor: '#E3F2FD', justifyContent:'center', alignItems:'center', marginBottom:20}}>
                    <Ionicons name="search" size={50} color={COLORS.primary} />
                </View>
                <Text style={{color: theme.text, fontSize:18, fontWeight:'bold'}}>{t.noResultTitle}</Text>
                <Text style={{textAlign:'center', marginTop:10, color: theme.subText, fontSize:14, paddingHorizontal: 40}}>
                    {t.noResultDesc}
                </Text>
                <TouchableOpacity onPress={clearFilters} style={styles.resetFiltersBtn}>
                    <Text style={{color: 'white', fontWeight:'bold'}}>{t.clearFilters}</Text>
                </TouchableOpacity>
            </View>
        }
      />

      {/* İLAN EKLE (YÜZEN BUTON - FAB) */}
      <TouchableOpacity 
          style={[styles.fabButton, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('AddListing', { category: title })} 
          activeOpacity={0.8}
      >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.fabText}>{t.addListing}</Text>
      </TouchableOpacity>

      {/* TEK MODAL (İÇERİK DEĞİŞTİRMELİ) */}
      <Modal visible={filterModalVisible} animationType="slide" transparent={true} onRequestClose={() => {
          if (selectionMode) setSelectionMode(null); 
          else setFilterModalVisible(false);
      }}>
          <View style={styles.modalOverlay}>
              <View style={[styles.filterContent, { backgroundColor: theme.cardBg }]}>
                  
                  {/* Başlık */}
                  {!selectionMode && (
                      <View style={styles.modalHeader}>
                          <Text style={[styles.modalTitle, {color: theme.text}]}>{t.detailedFilter}</Text>
                          <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={styles.closeBtn}>
                              <Ionicons name="close" size={24} color={theme.text} />
                          </TouchableOpacity>
                      </View>
                  )}

                  {/* İÇERİK */}
                  {selectionMode ? <SelectionListContent /> : <FilterMainContent />}

              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, elevation: 2, shadowColor:'#000', shadowOpacity:0.05, shadowOffset:{width:0,height:2} },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  iconBtn: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.03)' },
  badge: { position: 'absolute', top: 5, right: 5, backgroundColor: COLORS.primary, width: 8, height: 8, borderRadius: 4 },
  
  filterBarContainer: { height: 50 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, elevation: 2 },
  chipText: { color: 'white', fontSize: 12, marginRight: 5, fontWeight: '600' },
  clearTextBtn: { padding: 5, justifyContent:'center' },

  card: { flexDirection: 'row', borderRadius: 18, marginBottom: 15, padding: 12, elevation: 3, shadowColor: '#000', shadowOffset: {width:0, height:3}, shadowOpacity: 0.08, shadowRadius: 6 },
  imageWrapper: { width: 100, height: 100, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  image: { width: '100%', height: '100%' },
  
  badgesContainer: { position: 'absolute', top: 5, left: 5, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ratingText: { color: 'white', fontSize: 10, fontWeight: 'bold', marginLeft: 3 },
  genderBadge: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  info: { flex: 1, marginLeft: 15, justifyContent: 'space-between', paddingVertical: 2 },
  name: { fontSize: 17, fontWeight: 'bold' },
  breed: { fontSize: 13, marginTop: 4 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  locationRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  locationText: { fontSize: 12, marginLeft: 4, flex: 1 },
  priceText: { fontWeight: 'bold', color: COLORS.primary, fontSize: 15 },

  resetFiltersBtn: { marginTop: 20, backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  filterContent: { height: '70%', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeBtn: { padding: 5, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 20 },
  
  filterLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  typeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 10, backgroundColor: 'transparent' },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeBtnText: { fontWeight: '500', fontSize: 14, color: '#555' },

  selector: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, padding: 14, borderRadius: 12, marginRight: 10 },
  ageInput: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, textAlign: 'center', fontSize: 16 },

  genderBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, padding: 14, borderRadius: 12, marginRight: 10 },
  genderBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  genderText: { fontWeight: '600', marginLeft: 5, color: '#888' },
  
  applyBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowOffset: {width:0, height:4} },
  applyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  clearBtn: { alignItems: 'center', marginTop: 15, padding: 10 },

  selectionItem: { paddingVertical: 15, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectionText: { fontSize: 16 },

  fabButton: {
      position: 'absolute',
      bottom: 30,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderRadius: 30,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      zIndex: 10
  },
  fabText: {
      color: 'white',
      fontWeight: 'bold',
      fontSize: 16,
      marginLeft: 8
  }
});

export default AllListingsScreen;