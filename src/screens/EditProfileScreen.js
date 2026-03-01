import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { COLORS } from '../constants/colors';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const TRANSLATIONS = {
    TR: {
        headerTitle: "Profili Düzenle",
        changePhoto: "Profil Fotoğrafını Değiştir",
        labelName: "Ad Soyad",
        labelUsername: "Kullanıcı Adı",
        labelBio: "Hakkımda (Bio)",
        labelEmail: "E-posta (Değiştirilemez)",
        phUsername: "Kullanıcı adınız",
        phBio: "Kendinizden bahsedin...",
        errTitle: "Hata",
        errEmpty: "İsim ve Kullanıcı Adı boş olamaz.",
        errPerm: "İzin Gerekli",
        errPermMsg: "Fotoğraf değiştirmek için galeri izni vermelisiniz.",
        successTitle: "Başarılı",
        successMsg: "Profiliniz güncellendi.",
        save: "Kaydet"
    },
    AU: {
        headerTitle: "Edit Profile",
        changePhoto: "Change Profile Photo",
        labelName: "Full Name",
        labelUsername: "Username",
        labelBio: "About Me (Bio)",
        labelEmail: "Email (Cannot be changed)",
        phUsername: "Your username",
        phBio: "Tell us about yourself...",
        errTitle: "Error",
        errEmpty: "Name and Username cannot be empty.",
        errPerm: "Permission Required",
        errPermMsg: "You must grant gallery permission to change photo.",
        successTitle: "Success",
        successMsg: "Profile updated successfully.",
        save: "Save"
    }
};

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser, country } = useContext(AuthContext); 
  const { theme } = useContext(ThemeContext);

  const activeLang = country?.code || 'TR';
  const t = TRANSLATIONS[activeLang];

  // Form State
  const [fullname, setFullname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [image, setImage] = useState(null); 
  const [loading, setLoading] = useState(false);

  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (user) {
        setFullname(user.fullname || '');
        setUsername(user.username || '');
        setEmail(user.email || '');
        setBio(user.bio || '');
        // Cache sorununu önlemek için timestamp ekliyoruz, yoksa eski resim görünebilir
        setImage(user.avatar ? `${user.avatar}?t=${new Date().getTime()}` : null); 
    }
  }, [user]);

  const pickImage = async () => {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t.errPerm, t.errPermMsg);
            return;
        }
        
        // Düzeltme: MediaTypeOptions.Images kullanıldı
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images, 
            allowsEditing: true,
            aspect: [1, 1], 
            quality: 0.5,   
        });
        
        if (!result.canceled) {
            setImage(result.assets[0].uri); 
        }
    } catch (error) {
        console.log("Galeri Hatası:", error);
    }
  };

  const handleSavePress = async () => {
      Keyboard.dismiss();
      
      if(!fullname || fullname.trim() === '' || !username || username.trim() === '') {
          Alert.alert(t.errTitle, t.errEmpty);
          return;
      }

      setLoading(true);
      
      try {
          const updateData = { 
              fullname: fullname.trim(), 
              username: username.trim(), 
              bio: bio ? bio.trim() : null,
          };

          // Eğer seçilen resim file:// ile başlıyorsa yeni seçilmiş demektir, gönder.
          // Eğer http ile başlıyorsa zaten sunucuda var, tekrar gönderme.
          if (image && image !== user.avatar && image.startsWith('file://')) {
              updateData.avatar = image;
          }

          console.log("Profil güncelleniyor...", updateData);

          const result = await updateUser(updateData);
          
          setLoading(false);

          if (result.success) {
            Alert.alert(t.successTitle, t.successMsg);
            navigation.goBack();
          } else {
            Alert.alert(t.errTitle, result.error || "Güncelleme yapılamadı.");
          }

      } catch (error) {
          setLoading(false);
          console.log("Profil ekranı hatası:", error);
          Alert.alert(t.errTitle, "Beklenmedik bir hata oluştu.");
      }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{padding:5}}>
              <Ionicons name="close" size={28} color={theme.icon} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t.headerTitle}</Text>
          <TouchableOpacity onPress={handleSavePress} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.primary} /> : <Ionicons name="checkmark" size={28} color={COLORS.primary} />}
          </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
              
              {/* Avatar Kısmı */}
              <View style={styles.avatarSection}>
                  <TouchableOpacity onPress={pickImage} style={styles.avatarTouchable} activeOpacity={0.8}>
                      <View style={styles.avatarContainer}>
                          {image ? (
                              <Image source={{ uri: image }} style={styles.avatarImage} />
                          ) : (
                              <Text style={styles.avatarText}>{user?.fullname?.charAt(0).toUpperCase() || "U"}</Text>
                          )}
                          <View style={styles.cameraIcon}>
                              <Ionicons name="camera" size={16} color="white" />
                          </View>
                      </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={pickImage} style={{padding: 10}}>
                    <Text style={[styles.changePhotoText, { color: COLORS.primary }]}>{t.changePhoto}</Text>
                  </TouchableOpacity>
              </View>

              {/* Form Alanları */}
              <View style={styles.form}>
                  <Text style={[styles.label, { color: theme.subText }]}>{t.labelName}</Text>
                  <TextInput 
                      style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.cardBg }]}
                      value={fullname}
                      onChangeText={setFullname}
                  />

                  <Text style={[styles.label, { color: theme.subText }]}>{t.labelUsername}</Text>
                  <TextInput 
                      style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.cardBg }]}
                      value={username}
                      onChangeText={setUsername}
                      placeholder={t.phUsername}
                      placeholderTextColor={theme.subText}
                      autoCapitalize="none"
                  />

                  <Text style={[styles.label, { color: theme.subText }]}>{t.labelBio}</Text>
                  <TextInput 
                      style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.cardBg, height: 80, textAlignVertical: 'top' }]}
                      value={bio}
                      onChangeText={setBio}
                      multiline
                      placeholder={t.phBio}
                      placeholderTextColor={theme.subText}
                  />

                  <Text style={[styles.label, { color: theme.subText }]}>{t.labelEmail}</Text>
                  <TextInput 
                      style={[styles.input, { 
                          color: theme.subText, 
                          borderColor: theme.border, 
                          backgroundColor: theme.background, 
                          opacity: 0.7 
                      }]}
                      value={email}
                      editable={false} 
                      selectTextOnFocus={false}
                  />
                  
                  <View style={{ height: 100 }} />
              </View>

          </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarTouchable: { alignItems: 'center', justifyContent: 'center', padding: 5 }, 
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 5, position: 'relative' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 50 },
  avatarText: { fontSize: 40, color: 'white', fontWeight: 'bold' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.dark, padding: 6, borderRadius: 15, borderWidth: 2, borderColor: 'white' },
  changePhotoText: { fontWeight: '600', marginTop: 5 },

  form: { marginTop: 10 },
  label: { fontSize: 14, marginBottom: 8, marginLeft: 5 },
  input: { borderWidth: 1, borderRadius: 15, padding: 12, fontSize: 16, marginBottom: 20 },
});

export default EditProfileScreen;