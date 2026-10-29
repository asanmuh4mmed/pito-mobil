import React, {
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  TextInput,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ListingContext } from '../context/ListingContext';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { CITY_DATA } from '../constants/cities';

const { width } = Dimensions.get('window');

const PITO_COLORS = {
  primary: '#C5A059',
  primaryDark: '#B08D4B',
  navyBg: '#0B131E',
  navySurface: '#1A2533',
  navyLight: '#243447',
  cream: '#F5F5DC',
  white: '#FFFFFF',
  grayText: '#A0AAB5',
};

const TRANSLATIONS = {
  TR: {
    listingsFound: 'İlan Bulundu',
    noLocation: 'Konum Yok',
    ageText: 'Yaş',
    animalType: 'Hayvan Türü',
    location: 'Konum',
    selectCity: 'İl Seç',
    cityWarning: 'Önce şehir seçmelisiniz.',
    selectDistrict: 'İlçe Seç',
    ageRange: 'Yaş Aralığı',
    min: 'Min',
    max: 'Max',
    gender: 'Cinsiyet',
    apply: 'Uygula',
    clearAll: 'Tümünü Temizle',
    clear: 'Temizle',
    backToCities: 'Şehirlere Dön',
    backToFilters: 'Filtrelere Dön',
    noResultTitle: 'Sonuç Bulunamadı',
    noResultDesc:
      'Arama kriterlerinizi değiştirerek tekrar deneyebilirsiniz.',
    clearFilters: 'Filtreleri Temizle',
    addListing: 'İlan Ekle',
    detailedFilter: 'Detaylı Filtreleme',
    foundMate: 'EŞ BULUNDU',
    foundHome: 'YUVA BULUNDU',
  },
  EN: {
    listingsFound: 'Listings Found',
    noLocation: 'No Location',
    ageText: 'Years Old',
    animalType: 'Animal Type',
    location: 'Location',
    selectCity: 'Select City',
    cityWarning: 'Please select a city first.',
    selectDistrict: 'Select District',
    ageRange: 'Age Range',
    min: 'Min',
    max: 'Max',
    gender: 'Gender',
    apply: 'Apply',
    clearAll: 'Clear All',
    clear: 'Clear',
    backToCities: 'Back to Cities',
    backToFilters: 'Back to Filters',
    noResultTitle: 'No Results Found',
    noResultDesc:
      'You can try again by modifying your search criteria.',
    clearFilters: 'Clear Filters',
    addListing: 'Add Listing',
    detailedFilter: 'Detailed Filtering',
    foundMate: 'MATE FOUND',
    foundHome: 'HOME FOUND',
  },
};

const ListingCard = memo(
  ({ item, index, navigation, reviews, theme, isDarkMode, t }) => {
    const isService =
      item.category?.includes('Veteriner') ||
      item.category?.includes('Vet') ||
      item.category?.includes('Bakıcı') ||
      item.category?.includes('Sitter');

    const itemReviews = reviews
      ? reviews.filter((r) => r.listingId === item.id)
      : [];

    const avgRating =
      itemReviews.length > 0
        ? (
            itemReviews.reduce((sum, r) => sum + r.rating, 0) /
            itemReviews.length
          ).toFixed(1)
        : null;

    const translateY = useRef(new Animated.Value(25)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const delay = Math.min(index * 40, 250);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    const isFemale =
      item.gender === 'Dişi' || item.gender === 'Female';

    return (
      <Animated.View
        style={{
          width: (width - 52) / 2,
          opacity,
          transform: [{ translateY }],
        }}
      >
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: isDarkMode
                ? PITO_COLORS.navySurface
                : theme.cardBg,
              opacity: item.is_found ? 0.7 : 1,
              borderColor: isDarkMode
                ? PITO_COLORS.navyLight
                : theme.border,
              borderWidth: 1,
            },
          ]}
          onPress={() =>
            navigation.navigate('ListingDetail', { item })
          }
          activeOpacity={0.85}
        >
          <View style={styles.imageWrapper}>
            {item.img ? (
              <Image
                source={{ uri: item.img }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Ionicons
                  name="paw-outline"
                  size={38}
                  color={PITO_COLORS.primary}
                />
              </View>
            )}

            {item.is_found && (
              <View style={styles.homeFoundBadge}>
                <Text style={styles.homeFoundText}>
                  {item.category?.includes('Eş') ||
                  item.category?.includes('Mate')
                    ? t.foundMate
                    : t.foundHome}
                </Text>
              </View>
            )}

            <View style={styles.badgesContainer}>
              {isService && avgRating && (
                <View style={styles.ratingBadge}>
                  <Ionicons
                    name="star"
                    size={10}
                    color={PITO_COLORS.primary}
                  />
                  <Text style={styles.ratingText}>{avgRating}</Text>
                </View>
              )}

              {item.gender && (
                <View
                  style={[
                    styles.genderBadge,
                    {
                      backgroundColor: isFemale
                        ? '#FD79A8'
                        : PITO_COLORS.navyLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={isFemale ? 'female' : 'male'}
                    size={12}
                    color="white"
                  />
                </View>
              )}
            </View>
          </View>

          <View style={styles.info}>
            <View>
              <Text
                style={[styles.name, { color: theme.text }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              <Text
                style={[styles.breed, { color: theme.subText }]}
                numberOfLines={1}
              >
                {item.breed || item.subtitle}
                {item.age ? ` • ${item.age} ${t.ageText}` : ''}
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.locationRow}>
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={PITO_COLORS.primary}
                />
                <Text
                  style={[
                    styles.locationText,
                    { color: theme.subText },
                  ]}
                  numberOfLines={1}
                >
                  {[item.city, item.district]
                    .filter(Boolean)
                    .join(', ') || t.noLocation}
                </Text>
              </View>

              {item.price > 0 && (
                <Text style={styles.priceText}>
                  {item.price} TL
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
);

const AllListingsScreen = ({ navigation, route }) => {
  const { title, data } = route.params;
  const { reviews } = useContext(ListingContext);
  const { user } = useContext(AuthContext);
  const { theme, isDarkMode } = useContext(ThemeContext);

  const [language, setLanguage] = useState('TR');
  const t = TRANSLATIONS[language];

  const isVetCategory =
    title?.toLowerCase().includes('veteriner') ||
    title?.toLowerCase().includes('vet');

  const isUserVet =
    user?.account_type?.toLowerCase() === 'veteriner' ||
    user?.account_type?.toLowerCase() === 'vet';

  const showAddListingBtn = isVetCategory ? isUserVet : true;

  const [displayedData, setDisplayedData] = useState([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [selectionMode, setSelectionMode] = useState(null);

  const ANIMAL_TYPES = [
    'Kedi',
    'Köpek',
    'Kuş',
    'Balık',
    'Kemirgen',
    'Diğer',
  ];

  const typeLabels = {
    Kedi: language === 'EN' ? 'Cat' : 'Kedi',
    Köpek: language === 'EN' ? 'Dog' : 'Köpek',
    Kuş: language === 'EN' ? 'Bird' : 'Kuş',
    Balık: language === 'EN' ? 'Fish' : 'Balık',
    Kemirgen: language === 'EN' ? 'Rodent' : 'Kemirgen',
    Diğer: language === 'EN' ? 'Other' : 'Diğer',
  };

  const genderLabels = {
    Erkek: language === 'EN' ? 'Male' : 'Erkek',
    Dişi: language === 'EN' ? 'Female' : 'Dişi',
  };

  useEffect(() => {
    let result = [...data];

    if (selectedCity) {
      result = result.filter((item) => item.city === selectedCity);
    }

    if (selectedDistrict) {
      result = result.filter(
        (item) => item.district === selectedDistrict
      );
    }

    if (selectedGender) {
      result = result.filter(
        (item) => item.gender === selectedGender
      );
    }

    if (selectedType) {
      result = result.filter(
        (item) =>
          (item.pet_type && item.pet_type === selectedType) ||
          (item.breed &&
            item.breed
              .toLowerCase()
              .includes(selectedType.toLowerCase()))
      );
    }

    if (minAge !== '') {
      result = result.filter(
        (item) => item.age >= parseInt(minAge)
      );
    }

    if (maxAge !== '') {
      result = result.filter(
        (item) => item.age <= parseInt(maxAge)
      );
    }

    setDisplayedData(result);
  }, [
    data,
    selectedCity,
    selectedDistrict,
    selectedGender,
    selectedType,
    minAge,
    maxAge,
  ]);

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

  const activeFilterCount = [
    selectedCity,
    selectedDistrict,
    selectedGender,
    selectedType,
    minAge,
    maxAge,
  ].filter(Boolean).length;

  const renderItem = useCallback(
    ({ item, index }) => (
      <ListingCard
        item={item}
        index={index}
        navigation={navigation}
        reviews={reviews}
        theme={theme}
        isDarkMode={isDarkMode}
        t={t}
      />
    ),
    [navigation, reviews, theme, isDarkMode, t]
  );

  const keyExtractor = useCallback(
    (item) => item.id.toString(),
    []
  );

  const FilterMainContent = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={[styles.filterLabel, { color: theme.text }]}>
        {t.animalType}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 20 }}
      >
        {ANIMAL_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeBtn,
              selectedType === type && styles.typeBtnActive,
              {
                borderColor: isDarkMode
                  ? PITO_COLORS.navyLight
                  : theme.border,
              },
            ]}
            onPress={() =>
              setSelectedType(selectedType === type ? null : type)
            }
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.typeBtnText,
                { color: theme.text },
                selectedType === type && {
                  color: PITO_COLORS.navyBg,
                  fontWeight: 'bold',
                },
              ]}
            >
              {typeLabels[type]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.filterLabel, { color: theme.text }]}>
        {t.location}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <TouchableOpacity
          style={[
            styles.selector,
            {
              borderColor: isDarkMode
                ? PITO_COLORS.navyLight
                : theme.border,
              backgroundColor: isDarkMode
                ? PITO_COLORS.navySurface
                : 'transparent',
            },
          ]}
          onPress={() => setSelectionMode('city')}
          activeOpacity={0.8}
        >
          <Text
            style={{
              color: selectedCity ? theme.text : theme.subText,
              flexShrink: 1,
            }}
          >
            {selectedCity || t.selectCity}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={PITO_COLORS.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selector,
            {
              borderColor: isDarkMode
                ? PITO_COLORS.navyLight
                : theme.border,
              backgroundColor: isDarkMode
                ? PITO_COLORS.navySurface
                : 'transparent',
            },
          ]}
          onPress={() => {
            if (!selectedCity) alert(t.cityWarning);
            else setSelectionMode('district');
          }}
          activeOpacity={0.8}
        >
          <Text
            style={{
              color: selectedDistrict ? theme.text : theme.subText,
              flexShrink: 1,
            }}
          >
            {selectedDistrict || t.selectDistrict}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={PITO_COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      <Text style={[styles.filterLabel, { color: theme.text }]}>
        {t.ageRange}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <TextInput
          style={[
            styles.ageInput,
            {
              borderColor: isDarkMode
                ? PITO_COLORS.navyLight
                : theme.border,
              color: theme.text,
              backgroundColor: isDarkMode
                ? PITO_COLORS.navySurface
                : 'transparent',
            },
          ]}
          placeholder={t.min}
          placeholderTextColor={theme.subText}
          keyboardType="numeric"
          value={minAge}
          onChangeText={setMinAge}
        />

        <Text
          style={{
            marginHorizontal: 10,
            color: theme.subText,
          }}
        >
          -
        </Text>

        <TextInput
          style={[
            styles.ageInput,
            {
              borderColor: isDarkMode
                ? PITO_COLORS.navyLight
                : theme.border,
              color: theme.text,
              backgroundColor: isDarkMode
                ? PITO_COLORS.navySurface
                : 'transparent',
            },
          ]}
          placeholder={t.max}
          placeholderTextColor={theme.subText}
          keyboardType="numeric"
          value={maxAge}
          onChangeText={setMaxAge}
        />
      </View>

      <Text style={[styles.filterLabel, { color: theme.text }]}>
        {t.gender}
      </Text>

      <View style={{ flexDirection: 'row', marginBottom: 30 }}>
        {['Erkek', 'Dişi'].map((g) => (
          <TouchableOpacity
            key={g}
            style={[
              styles.genderBtn,
              selectedGender === g && styles.genderBtnActive,
              {
                borderColor: isDarkMode
                  ? PITO_COLORS.navyLight
                  : theme.border,
                backgroundColor:
                  selectedGender === g
                    ? PITO_COLORS.primary
                    : isDarkMode
                      ? PITO_COLORS.navySurface
                      : 'transparent',
              },
            ]}
            onPress={() =>
              setSelectedGender(selectedGender === g ? null : g)
            }
            activeOpacity={0.8}
          >
            <Ionicons
              name={g === 'Erkek' ? 'male' : 'female'}
              size={18}
              color={
                selectedGender === g
                  ? PITO_COLORS.navyBg
                  : PITO_COLORS.primary
              }
            />
            <Text
              style={[
                styles.genderText,
                { color: theme.text },
                selectedGender === g && {
                  color: PITO_COLORS.navyBg,
                  fontWeight: 'bold',
                },
              ]}
            >
              {genderLabels[g]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.applyBtn}
        onPress={() => setFilterModalVisible(false)}
        activeOpacity={0.8}
      >
        <Text style={styles.applyBtnText}>
          {t.apply} ({activeFilterCount})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.clearBtn}
        onPress={clearFilters}
        activeOpacity={0.8}
      >
        <Text style={{ color: PITO_COLORS.primary }}>
          {t.clearAll}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const SelectionListContent = () => {
    const dataList =
      selectionMode === 'city'
        ? Object.keys(CITY_DATA.TR || {}).sort()
        : CITY_DATA.TR?.[selectedCity]?.sort() || [];

    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          onPress={() => setSelectionMode(null)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 15,
            paddingVertical: 5,
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={PITO_COLORS.primary}
          />
          <Text
            style={{
              marginLeft: 10,
              fontSize: 16,
              fontWeight: 'bold',
              color: theme.text,
            }}
          >
            {selectionMode === 'city'
              ? t.backToCities
              : t.backToFilters}
          </Text>
        </TouchableOpacity>

        <FlatList
          data={dataList}
          keyExtractor={(item) => item}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={5}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.selectionItem,
                {
                  borderBottomColor: isDarkMode
                    ? PITO_COLORS.navyLight
                    : theme.border,
                },
              ]}
              onPress={() => {
                if (selectionMode === 'city') {
                  setSelectedCity(item);
                  setSelectedDistrict(null);
                } else {
                  setSelectedDistrict(item);
                }
                setSelectionMode(null);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.selectionText,
                  { color: theme.text },
                ]}
              >
                {item}
              </Text>
              <Ionicons
                name="checkmark"
                size={20}
                color={PITO_COLORS.primary}
                style={{
                  opacity:
                    selectedCity === item ||
                    selectedDistrict === item
                      ? 1
                      : 0,
                }}
              />
            </TouchableOpacity>
          )}
        />
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode
            ? PITO_COLORS.navyBg
            : '#F4F5F7',
        },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.iconBtn,
            {
              backgroundColor: isDarkMode
                ? PITO_COLORS.navySurface
                : theme.cardBg,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={language === 'TR' ? 'Geri' : 'Back'}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={theme.text}
          />
        </TouchableOpacity>

        <View style={styles.brandRow}>
          <Text style={[styles.brandText, { color: theme.text }]}>
            Pito
          </Text>
          <Ionicons
            name="paw"
            size={20}
            color={PITO_COLORS.primary}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() =>
              setLanguage((lang) => (lang === 'TR' ? 'EN' : 'TR'))
            }
            style={[
              styles.iconBtn,
              {
                backgroundColor: isDarkMode
                  ? PITO_COLORS.navySurface
                  : theme.cardBg,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              language === 'TR' ? 'Dili değiştir' : 'Change language'
            }
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {language}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            style={[
              styles.iconBtn,
              {
                backgroundColor:
                  activeFilterCount > 0
                    ? PITO_COLORS.primary
                    : isDarkMode
                      ? PITO_COLORS.navySurface
                      : theme.cardBg,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={t.detailedFilter}
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={
                activeFilterCount > 0
                  ? PITO_COLORS.navyBg
                  : PITO_COLORS.primary
              }
            />
            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.introBlock}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {title}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.resultCount}>
            <Ionicons
              name="paw-outline"
              size={14}
              color={PITO_COLORS.primary}
            />
            <Text
              style={[styles.resultText, { color: theme.subText }]}
            >
              {displayedData.length} {t.listingsFound}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setFilterModalVisible(true)}
            style={styles.filterShortcut}
            accessibilityRole="button"
          >
            <Text style={styles.filterShortcutText}>
              {language === 'TR' ? 'Filtrele' : 'Filter'}
            </Text>
            <Ionicons
              name="chevron-down"
              size={13}
              color={PITO_COLORS.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {activeFilterCount > 0 && (
        <View style={styles.filterBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 15,
              paddingVertical: 10,
            }}
          >
            {selectedType && (
              <TouchableOpacity
                style={styles.chip}
                onPress={() => setSelectedType(null)}
              >
                <Text style={styles.chipText}>
                  {typeLabels[selectedType]}
                </Text>
                <Ionicons
                  name="close"
                  size={14}
                  color={PITO_COLORS.navyBg}
                />
              </TouchableOpacity>
            )}

            {selectedCity && (
              <TouchableOpacity
                style={styles.chip}
                onPress={() => setSelectedCity(null)}
              >
                <Text style={styles.chipText}>{selectedCity}</Text>
                <Ionicons
                  name="close"
                  size={14}
                  color={PITO_COLORS.navyBg}
                />
              </TouchableOpacity>
            )}

            {selectedDistrict && (
              <TouchableOpacity
                style={styles.chip}
                onPress={() => setSelectedDistrict(null)}
              >
                <Text style={styles.chipText}>
                  {selectedDistrict}
                </Text>
                <Ionicons
                  name="close"
                  size={14}
                  color={PITO_COLORS.navyBg}
                />
              </TouchableOpacity>
            )}

            {selectedGender && (
              <TouchableOpacity
                style={styles.chip}
                onPress={() => setSelectedGender(null)}
              >
                <Text style={styles.chipText}>
                  {genderLabels[selectedGender]}
                </Text>
                <Ionicons
                  name="close"
                  size={14}
                  color={PITO_COLORS.navyBg}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={clearFilters}
              style={styles.clearTextBtn}
            >
              <Text
                style={{
                  color: PITO_COLORS.primary,
                  fontSize: 12,
                  fontWeight: 'bold',
                }}
              >
                {t.clear}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <FlatList
        data={displayedData}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 120,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={11}
        removeClippedSubviews={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="search"
                size={50}
                color={PITO_COLORS.primary}
              />
            </View>

            <Text
              style={{
                color: theme.text,
                fontSize: 18,
                fontWeight: 'bold',
              }}
            >
              {t.noResultTitle}
            </Text>

            <Text
              style={{
                textAlign: 'center',
                marginTop: 10,
                color: theme.subText,
                fontSize: 14,
                paddingHorizontal: 40,
              }}
            >
              {t.noResultDesc}
            </Text>

            <TouchableOpacity
              onPress={clearFilters}
              style={styles.resetFiltersBtn}
            >
              <Text
                style={{
                  color: PITO_COLORS.navyBg,
                  fontWeight: 'bold',
                }}
              >
                {t.clearFilters}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {showAddListingBtn && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() =>
            navigation.navigate('AddListing', { category: title })
          }
          activeOpacity={0.9}
        >
          <Ionicons
            name="add"
            size={24}
            color={PITO_COLORS.navyBg}
          />
          <Text style={styles.fabText}>{t.addListing}</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (selectionMode) setSelectionMode(null);
          else setFilterModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.filterContent,
              {
                backgroundColor: isDarkMode
                  ? PITO_COLORS.navyBg
                  : theme.cardBg,
              },
            ]}
          >
            <View style={styles.sheetHandle} />

            {!selectionMode && (
              <View style={styles.modalHeader}>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.text, flex: 1 },
                  ]}
                >
                  {t.detailedFilter}
                </Text>

                <TouchableOpacity
                  onPress={() => setFilterModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={PITO_COLORS.primary}
                  />
                </TouchableOpacity>
              </View>
            )}

            {selectionMode ? (
              <SelectionListContent />
            ) : (
              <FilterMainContent />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 40,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },
  introBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  resultCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultText: {
    fontSize: 12,
  },
  filterShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 40,
    paddingLeft: 12,
  },
  filterShortcutText: {
    color: PITO_COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  filterBarContainer: {
    minHeight: 48,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PITO_COLORS.primary,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 7,
  },
  chipText: {
    color: PITO_COLORS.navyBg,
    fontSize: 12,
    marginRight: 5,
    fontWeight: 'bold',
  },
  clearTextBtn: {
    padding: 5,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 0.94,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PITO_COLORS.navyLight,
  },
  info: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    minHeight: 106,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  breed: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  cardFooter: {
    marginTop: 12,
    gap: 7,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
    fontSize: 10,
    marginLeft: 3,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: PITO_COLORS.primary,
  },
  badgesContainer: {
    position: 'absolute',
    bottom: 9,
    left: 9,
    flexDirection: 'row',
    gap: 5,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11,19,30,0.85)',
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  ratingText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  genderBadge: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  homeFoundBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    right: 9,
    backgroundColor: PITO_COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: 'center',
  },
  homeFoundText: {
    color: PITO_COLORS.navyBg,
    fontSize: 8,
    fontWeight: '800',
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${PITO_COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  resetFiltersBtn: {
    marginTop: 20,
    backgroundColor: PITO_COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11,19,30,0.7)',
    justifyContent: 'flex-end',
  },
  filterContent: {
    height: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 32,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: PITO_COLORS.grayText,
    opacity: 0.45,
    marginBottom: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: 'rgba(197,160,89,0.1)',
    borderRadius: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  typeBtn: {
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 13,
    borderWidth: 1,
    marginRight: 8,
  },
  typeBtnActive: {
    backgroundColor: PITO_COLORS.primary,
    borderColor: PITO_COLORS.primary,
  },
  typeBtnText: {
    fontWeight: '600',
    fontSize: 13,
  },
  selector: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    padding: 14,
    borderRadius: 16,
    marginRight: 10,
  },
  ageInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    textAlign: 'center',
    fontSize: 15,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    padding: 14,
    borderRadius: 16,
    marginRight: 10,
  },
  genderBtnActive: {
    backgroundColor: PITO_COLORS.primary,
    borderColor: PITO_COLORS.primary,
  },
  genderText: {
    fontWeight: '600',
    marginLeft: 6,
  },
  applyBtn: {
    backgroundColor: PITO_COLORS.primary,
    padding: 17,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  applyBtnText: {
    color: PITO_COLORS.navyBg,
    fontWeight: 'bold',
    fontSize: 16,
  },
  clearBtn: {
    alignItems: 'center',
    marginTop: 15,
    padding: 10,
  },
  selectionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PITO_COLORS.primary,
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 19,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  fabText: {
    color: PITO_COLORS.navyBg,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 7,
  },
});

export default AllListingsScreen;