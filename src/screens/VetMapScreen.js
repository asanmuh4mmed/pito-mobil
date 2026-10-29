import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text, Alert, Animated, TouchableOpacity } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons'; 

const PURPLE_THEME = '#8B5CF6';

export default function VetMapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [vets, setVets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("İzin Gerekli", "Yakınındaki veterinerleri bulabilmemiz için konum izni vermelisin. 🐾");
      setLoading(false);
      return;
    }

    try {
        let currentLocation = await Location.getCurrentPositionAsync({});
        const lat = currentLocation.coords.latitude;
        const lng = currentLocation.coords.longitude;

        setLocation({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.04, 
          longitudeDelta: 0.04,
        });

        // Konumu aldık, şimdi veterinerleri çekiyoruz
        fetchNearbyVetsOSM(lat, lng);
    } catch (error) {
        Alert.alert("Hata", "Konumunuz alınamadı.");
        setLoading(false);
    }
  };

  const fetchNearbyVetsOSM = async (lat, lng) => {
    try {
      const query = `
        [out:json];
        (
          node["amenity"="veterinary"](around:10000, ${lat}, ${lng});
          way["amenity"="veterinary"](around:10000, ${lat}, ${lng});
          relation["amenity"="veterinary"](around:10000, ${lat}, ${lng});
        );
        out center;
      `;
      
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.elements && data.elements.length > 0) {
        setVets(data.elements);
      } else {
        setVets([]); 
      }
    } catch (error) {
      console.error("OSM'den veterinerler çekilirken hata:", error);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PURPLE_THEME} />
        <Text style={styles.loadingText}>Etrafındaki veterinerler aranıyor... 🐾</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <MapView 
          style={styles.map} 
          initialRegion={location}
          showsUserLocation={true} 
          showsMyLocationButton={false}
        >
          {vets.map((vet, index) => (
            <Marker
              key={index}
              coordinate={{
                latitude: vet.lat || vet.center?.lat,
                longitude: vet.lon || vet.center?.lon,
              }}
              pinColor={PURPLE_THEME}
            >
              <Callout tooltip>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{vet.tags?.name || "Veteriner Kliniği"}</Text>
                  <Text style={styles.calloutAddress}>
                    {vet.tags?.['addr:street'] ? `${vet.tags['addr:street']} ${vet.tags['addr:housenumber'] || ''}` : "Detaylı adres bilgisi yok."}
                  </Text>
                  {vet.tags?.phone && <Text style={styles.calloutPhone}>📞 {vet.tags.phone}</Text>}
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      </Animated.View>

      <Animated.View style={[styles.infoCard, { opacity: fadeAnim }]}>
        <View style={styles.infoIconWrapper}>
          <Ionicons name="medkit" size={24} color={PURPLE_THEME} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>Yakınındaki Klinikler</Text>
          <Text style={styles.infoSubtitle}>
              {vets.length > 0 ? `Çevrende ${vets.length} adet veteriner kliniği bulundu.` : "Çevrende kayıtlı veteriner kliniği bulunamadı."}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  loadingText: { marginTop: 15, fontSize: 16, color: '#6B7280', fontWeight: '500' },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, backgroundColor: PURPLE_THEME, padding: 10, borderRadius: 20, elevation: 5 },
  infoCard: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: '#FFF', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', elevation: 10 },
  infoIconWrapper: { backgroundColor: '#EDE9FE', padding: 12, borderRadius: 15, marginRight: 15 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  infoSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  calloutContainer: { backgroundColor: '#FFF', padding: 10, borderRadius: 10, minWidth: 160, elevation: 5 },
  calloutTitle: { fontWeight: 'bold', fontSize: 14, color: PURPLE_THEME, marginBottom: 4 },
  calloutAddress: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  calloutPhone: { fontSize: 12, fontWeight: '600', color: '#10B981' }
});