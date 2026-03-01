import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { supabase } from '../lib/supabase'; // ✅ Supabase eklendi

const TRANSLATIONS = {
    TR: {
        headerTitle: "Yorumları",
        noReviews: "Henüz yorum yapılmamış. İlk yorumu sen yap!",
        inputTitle: "Puanla & Yorumla",
        phComment: "Deneyimlerinizi paylaşın...",
        btnSend: "Gönder",
        errLoginTitle: "Giriş Yap",
        errLoginMsg: "Yorum yapmak için giriş yapmalısınız.",
        errRateTitle: "Puan Ver",
        errRateMsg: "Lütfen en az 1 yıldız seçin.",
        errCommentTitle: "Yorum Yaz",
        errCommentMsg: "Lütfen bir yorum yazın.",
        successTitle: "Teşekkürler",
        successMsg: "Yorumunuz eklendi."
    },
    AU: {
        headerTitle: "Reviews",
        noReviews: "No reviews yet. Be the first to review!",
        inputTitle: "Rate & Comment",
        phComment: "Share your experience...",
        btnSend: "Submit",
        errLoginTitle: "Login Required",
        errLoginMsg: "You must login to post a review.",
        errRateTitle: "Rate Listing",
        errRateMsg: "Please select at least 1 star.",
        errCommentTitle: "Write Comment",
        errCommentMsg: "Please write a comment.",
        successTitle: "Thank You",
        successMsg: "Your review has been added."
    }
};

const ReviewsScreen = ({ navigation, route }) => {
  const { listingId, listingName, productId, productName } = route.params; // İlan veya Ürün ID
  
  const { user, country } = useContext(AuthContext); 
  const { theme } = useContext(ThemeContext);

  const activeLang = country?.code || 'TR';
  const t = TRANSLATIONS[activeLang];

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const targetId = listingId || productId;
  const targetName = listingName || productName;
  const idColumn = listingId ? 'listing_id' : 'product_id';

  // ✅ YORUMLARI ÇEK
  useEffect(() => {
      fetchReviews();
  }, [targetId]);

  const fetchReviews = async () => {
      try {
          setLoading(true);
          const { data, error } = await supabase
              .from('reviews')
              .select(`
                  *,
                  users ( fullname, avatar )
              `)
              .eq(idColumn, targetId)
              .order('created_at', { ascending: false });

          if (error) throw error;
          setReviews(data || []);
      } catch (e) {
          console.log("Yorum çekme hatası:", e);
      } finally {
          setLoading(false);
      }
  };

  // ✅ YORUM EKLE
  const handleSubmit = async () => {
    if (!user) {
        Alert.alert(t.errLoginTitle, t.errLoginMsg);
        return;
    }
    if (rating === 0) {
        Alert.alert(t.errRateTitle, t.errRateMsg);
        return;
    }
    if (!comment.trim()) {
        Alert.alert(t.errCommentTitle, t.errCommentMsg);
        return;
    }

    setSubmitting(true);
    try {
        const { error } = await supabase
            .from('reviews')
            .insert([{
                [idColumn]: targetId, // listing_id veya product_id
                user_id: user.id,
                rating: rating,
                comment: comment
            }]);

        if (error) throw error;

        Alert.alert(t.successTitle, t.successMsg);
        setComment('');
        setRating(0);
        fetchReviews(); // Listeyi yenile

    } catch (e) {
        console.log("Yorum ekleme hatası:", e);
        Alert.alert("Hata", "Yorum eklenirken bir sorun oluştu.");
    } finally {
        setSubmitting(false);
    }
  };

  const renderReview = ({ item }) => (
    <View style={[styles.reviewCard, { backgroundColor: theme.cardBg }]}>
        <View style={styles.reviewHeader}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
                <View style={styles.avatarBox}>
                    {item.users?.avatar ? (
                        <Image source={{ uri: item.users.avatar }} style={{width:30, height:30, borderRadius:15}} />
                    ) : (
                        <Text style={styles.avatarText}>{item.users?.fullname?.charAt(0).toUpperCase() || "?"}</Text>
                    )}
                </View>
                <Text style={[styles.reviewerName, { color: theme.text }]}>{item.users?.fullname || "Kullanıcı"}</Text>
            </View>
            <View style={{flexDirection:'row'}}>
                {[1, 2, 3, 4, 5].map(star => (
                    <Ionicons key={star} name={star <= item.rating ? "star" : "star-outline"} size={14} color="#FFD700" />
                ))}
            </View>
        </View>
        <Text style={[styles.comment, { color: theme.text }]}>{item.comment}</Text>
        <Text style={[styles.date, { color: theme.subText }]}>
            {new Date(item.created_at).toLocaleDateString(activeLang === 'TR' ? 'tr-TR' : 'en-AU')}
        </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {targetName} {t.headerTitle}
        </Text>
        <View style={{width:24}}/>
      </View>

      {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 50}} />
      ) : (
          <FlatList
            data={reviews}
            renderItem={renderReview}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
            ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.subText }]}>{t.noReviews}</Text>}
          />
      )}

      {/* Yorum Yapma Alanı */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={[styles.inputContainer, { backgroundColor: theme.cardBg, borderTopColor: theme.border }]}>
            <Text style={[styles.inputTitle, { color: theme.text }]}>{t.inputTitle}</Text>
            
            {/* Yıldızlar */}
            <View style={styles.starContainer}>
                {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Ionicons name={star <= rating ? "star" : "star-outline"} size={32} color="#FFD700" style={{marginHorizontal:5}} />
                    </TouchableOpacity>
                ))}
            </View>

            <TextInput 
                style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]} 
                placeholder={t.phComment}
                placeholderTextColor={theme.subText}
                value={comment}
                onChangeText={setComment}
                multiline
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>{t.btnSend}</Text>}
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, elevation: 2 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', maxWidth:'80%' },
  
  reviewCard: { padding: 15, borderRadius: 15, marginBottom: 15, elevation: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  avatarBox: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: 'white', fontWeight: 'bold' },
  reviewerName: { fontWeight: 'bold' },
  comment: { marginBottom: 5 },
  date: { fontSize: 10, textAlign: 'right' },
  emptyText: { textAlign: 'center', marginTop: 50 },

  inputContainer: { padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30, elevation: 10, borderTopWidth: 1 },
  inputTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  starContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 15 },
  input: { padding: 15, borderRadius: 15, height: 80, textAlignVertical: 'top', marginBottom: 15, borderWidth: 1 },
  submitBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 15, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});

export default ReviewsScreen;