import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import { COLORS } from '../constants/colors';

const { width, height } = Dimensions.get('window');

const AllReviewsScreen = ({ navigation, route }) => {
    const { reviews, productName } = route.params;
    const { theme } = useContext(ThemeContext);
    const { country } = useContext(AuthContext);

    // --- FOTOĞRAF BÜYÜTME STATE ---
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const title = country?.code === 'AU' ? 'All Reviews' : 'Tüm Değerlendirmeler';

    const handleImagePress = (imgUri) => {
        setSelectedImage(imgUri);
        setModalVisible(true);
    };

    const renderReview = ({ item }) => (
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
            <View style={styles.headerRow}>
                <Text style={[styles.user, { color: theme.text }]}>{item.user}</Text>
                <Text style={styles.date}>{item.date}</Text>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: 5 }}>
                {[...Array(5)].map((_, i) => (
                    <Ionicons key={i} name={i < item.rating ? "star" : "star-outline"} size={14} color="#FFD700" />
                ))}
            </View>
            <Text style={[styles.comment, { color: theme.subText }]}>{item.comment}</Text>
            
            {/* Varsa Fotoğraflar */}
            {item.images && item.images.length > 0 && (
                <View style={{ flexDirection: 'row', marginTop: 10, flexWrap: 'wrap' }}>
                    {item.images.map((img, idx) => (
                        <TouchableOpacity key={idx} onPress={() => handleImagePress(img)}>
                            <Image source={{ uri: img }} style={styles.reviewImg} />
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <View style={{marginLeft: 15}}>
                    <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                    <Text style={{color: theme.subText, fontSize: 12}}>{productName}</Text>
                </View>
            </View>

            {/* Liste */}
            <FlatList
                data={reviews}
                renderItem={renderReview}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={{ padding: 20 }}
                ListEmptyComponent={
                    <Text style={{textAlign:'center', marginTop:20, color: theme.subText}}>Henüz yorum yok.</Text>
                }
            />

            {/* 📸 FOTOĞRAF MODALI (FULL EKRAN) */}
            <Modal visible={modalVisible} transparent={true} animationType="fade">
                <View style={styles.modalContainer}>
                    {/* Kapat Butonu */}
                    <TouchableOpacity 
                        style={styles.closeBtn} 
                        onPress={() => setModalVisible(false)}
                    >
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>

                    {/* Büyük Resim */}
                    {selectedImage && (
                        <Image 
                            source={{ uri: selectedImage }} 
                            style={styles.fullImage} 
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    title: { fontSize: 18, fontWeight: 'bold' },
    card: { padding: 15, borderRadius: 12, marginBottom: 15 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    user: { fontWeight: 'bold' },
    date: { fontSize: 12, color: '#999' },
    comment: { fontSize: 14, lineHeight: 20 },
    reviewImg: { width: 70, height: 70, borderRadius: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
    
    // Modal Stilleri
    modalContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
    fullImage: { width: width, height: height * 0.8 },
    closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 }
});

export default AllReviewsScreen;