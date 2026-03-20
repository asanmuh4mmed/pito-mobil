import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, Modal, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

const TRANSLATIONS = {
    TR: {
        settings: "Ayarlar",
        guest: "Misafir",
        general: "Genel",
        darkMode: "Karanlık Mod",
        notifications: "Bildirimler",
        language: "Dil / Bölge",
        account: "Hesap",
        editProfile: "Profili Düzenle",
        changePassword: "Şifre Değiştir",
        deleteAccount: "Hesabı Sil",
        cancel: "Vazgeç",
        save: "Kaydet",
        newPass: "Yeni Şifre",
        phNewPass: "En az 6 karakter",
        confirmDelete: "Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? İsim ve iletişim bilgileriniz saklanacak, diğer tüm veriler silinecektir.",
        success: "Başarılı",
        error: "Hata",
        fillAll: "Lütfen yeni şifrenizi giriniz.",
        tr: "Türkçe (TR)",
        en: "English (AU)"
    },
    AU: {
        settings: "Settings",
        guest: "Guest",
        general: "General",
        darkMode: "Dark Mode",
        notifications: "Notifications",
        language: "Language / Region",
        account: "Account",
        editProfile: "Edit Profile",
        changePassword: "Change Password",
        deleteAccount: "Delete Account",
        cancel: "Cancel",
        save: "Save",
        newPass: "New Password",
        phNewPass: "At least 6 characters",
        confirmDelete: "Are you sure you want to permanently delete your account? Name and contact info will be archived, all else deleted.",
        success: "Success",
        error: "Error",
        fillAll: "Please enter your new password.",
        tr: "Turkish (TR)",
        en: "English (AU)"
    }
};

const SettingsScreen = ({ navigation }) => {
  const { logout, user, changePassword, country, updateCountry, deleteUserAccount, updateNotificationPreference } = useContext(AuthContext); 
  const { isDarkMode, toggleTheme, theme } = useContext(ThemeContext);
  
  const activeLang = country?.code || 'TR';
  const t = TRANSLATIONS[activeLang];

  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  
  useEffect(() => {
      if (user?.notification_settings?.enabled !== undefined) {
          setIsNotificationsEnabled(user.notification_settings.enabled);
      }
  }, [user]);

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  const [newPassword, setNewPassword] = useState('');

  const toggleNotifications = (value) => {
      setIsNotificationsEnabled(value);
      updateNotificationPreference(value); 
  };

  const handleLanguageChange = (langCode) => {
    if (langCode === 'TR') {
        updateCountry({ name: 'Türkiye', code: 'TR', flag: '🇹🇷' });
    } else {
        updateCountry({ name: 'Australia', code: 'AU', flag: '🇦🇺' });
    }
    setLanguageModalVisible(false);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t.deleteAccount,
      t.confirmDelete,
      [
        { text: t.cancel, style: "cancel" },
        { 
          text: t.deleteAccount, 
          style: "destructive", 
          onPress: async () => {
            const result = await deleteUserAccount();
            if (result.success) {
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            } else {
                Alert.alert(t.error, result.message);
            }
          } 
        }
      ]
    );
  };

  const handleChangePasswordSubmit = async () => {
      if (!newPassword || newPassword.length < 6) {
          Alert.alert(t.error, t.phNewPass);
          return;
      }

      const result = await changePassword(newPassword);

      if (result.success) {
          Alert.alert(t.success, result.message);
          setPasswordModalVisible(false);
          setNewPassword('');
      } else {
          Alert.alert(t.error, result.message);
      }
  };

  const dynamicStyles = {
      container: { flex: 1, backgroundColor: isDarkMode ? theme.background : '#F3E5F5' },
      header: { backgroundColor: isDarkMode ? theme.cardBg : 'white', borderBottomColor: isDarkMode ? theme.border : '#E0E0E0' },
      headerTitle: { color: isDarkMode ? theme.text : '#3700B3' },
      settingItem: { backgroundColor: isDarkMode ? theme.cardBg : 'white' },
      text: { color: isDarkMode ? theme.text : '#333' },
      subText: { color: isDarkMode ? theme.subText : '#7E57C2' },
      icon: isDarkMode ? theme.icon : '#6200EE'
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={dynamicStyles.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>{t.settings}</Text> 
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={[styles.profileSection, dynamicStyles.settingItem]}>
            <View style={styles.avatarBox}>
                {user?.avatar ? (
                    <Image 
                        source={{ uri: `${user.avatar}?t=${new Date().getTime()}` }} 
                        style={styles.avatarImage} 
                    />
                ) : (
                    <Text style={styles.avatarText}>{user?.fullname?.charAt(0).toUpperCase() || "U"}</Text>
                )}
            </View>
            <View>
                <Text style={[styles.profileName, { color: isDarkMode ? theme.text : '#3700B3' }]}>{user?.fullname || t.guest}</Text>
                <Text style={[styles.profileEmail, dynamicStyles.subText]}>{user?.email || ""}</Text>
            </View>
        </View>

        <Text style={styles.sectionHeader}>{t.general}</Text>
        
        <View style={[styles.settingItem, dynamicStyles.settingItem]}>
            <View style={styles.settingLeft}>
                <Ionicons name="moon-outline" size={22} color={dynamicStyles.icon} />
                <Text style={[styles.settingText, dynamicStyles.text]}>{t.darkMode}</Text>
            </View>
            <Switch 
                trackColor={{ false: "#767577", true: "#6200EE" }}
                thumbColor={"#f4f3f4"}
                onValueChange={toggleTheme}
                value={isDarkMode}
            />
        </View>

        <View style={[styles.settingItem, dynamicStyles.settingItem]}>
            <View style={styles.settingLeft}>
                <Ionicons name="notifications-outline" size={22} color={dynamicStyles.icon} />
                <Text style={[styles.settingText, dynamicStyles.text]}>{t.notifications}</Text>
            </View>
            <Switch 
                trackColor={{ false: "#767577", true: "#6200EE" }}
                thumbColor={"#f4f3f4"}
                onValueChange={toggleNotifications}
                value={isNotificationsEnabled}
            />
        </View>

        <TouchableOpacity 
            style={[styles.settingItem, dynamicStyles.settingItem]} 
            onPress={() => setLanguageModalVisible(true)}
        >
            <View style={styles.settingLeft}>
                <Ionicons name="globe-outline" size={22} color={dynamicStyles.icon} />
                <Text style={[styles.settingText, dynamicStyles.text]}>{t.language}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[dynamicStyles.subText, { marginRight: 5 }]}>
                    {activeLang === 'TR' ? 'Türkçe' : 'English'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={dynamicStyles.subText.color} />
            </View>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>{t.account}</Text>

        <TouchableOpacity style={[styles.settingItem, dynamicStyles.settingItem]} onPress={() => navigation.navigate('EditProfile')}>
            <View style={styles.settingLeft}>
                <Ionicons name="person-outline" size={22} color={dynamicStyles.icon} />
                <Text style={[styles.settingText, dynamicStyles.text]}>{t.editProfile}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={dynamicStyles.subText.color} />
        </TouchableOpacity>

        <TouchableOpacity 
            style={[styles.settingItem, dynamicStyles.settingItem]} 
            onPress={() => setPasswordModalVisible(true)}
        >
            <View style={styles.settingLeft}>
                <Ionicons name="lock-closed-outline" size={22} color={dynamicStyles.icon} />
                <Text style={[styles.settingText, dynamicStyles.text]}>{t.changePassword}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={dynamicStyles.subText.color} />
        </TouchableOpacity>

        <View style={{ marginTop: 30 }}>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                <Ionicons name="trash-outline" size={22} color="#FF4D4D" />
                <Text style={styles.deleteText}>{t.deleteAccount}</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>

      <Modal visible={languageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setLanguageModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, dynamicStyles.settingItem]}>
                <Text style={[styles.modalTitle, dynamicStyles.text]}>{t.language}</Text>
                
                <TouchableOpacity style={[styles.modalItem, { borderBottomColor: isDarkMode ? theme.border : '#E0E0E0' }]} onPress={() => handleLanguageChange('TR')}>
                    <Text style={[styles.modalText, dynamicStyles.text]}>{t.tr}</Text>
                    {activeLang === 'TR' && <Ionicons name="checkmark" size={24} color="#6200EE" />}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalItem, { borderBottomColor: isDarkMode ? theme.border : '#E0E0E0', borderBottomWidth: 0 }]} onPress={() => handleLanguageChange('AU')}>
                    <Text style={[styles.modalText, dynamicStyles.text]}>{t.en}</Text>
                    {activeLang === 'AU' && <Ionicons name="checkmark" size={24} color="#6200EE" />}
                </TouchableOpacity>

                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setLanguageModalVisible(false)}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{t.cancel}</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      <Modal visible={passwordModalVisible} transparent={true} animationType="slide" onRequestClose={() => setPasswordModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, dynamicStyles.settingItem]}>
                <Text style={[styles.modalTitle, dynamicStyles.text]}>{t.changePassword}</Text>
                
                <Text style={[styles.label, dynamicStyles.subText]}>{t.newPass}</Text>
                <TextInput 
                    style={[styles.input, dynamicStyles.text, { borderColor: isDarkMode ? theme.border : '#E0E0E0' }]}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t.phNewPass}
                    placeholderTextColor={dynamicStyles.subText.color}
                />

                <View style={{ flexDirection: 'row', marginTop: 20 }}>
                    <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#FF4D4D', flex: 1, marginRight: 10 }]} onPress={() => setPasswordModalVisible(false)}>
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{t.cancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#6200EE', flex: 1 }]} onPress={handleChangePasswordSubmit}>
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{t.save}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  profileSection: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 25, elevation: 2 },
  avatarBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6200EE', justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden' },
  avatarText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  avatarImage: { width: '100%', height: '100%' }, 
  profileName: { fontSize: 16, fontWeight: 'bold' },
  profileEmail: { fontSize: 12 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', color: '#999', marginBottom: 10, marginLeft: 5, marginTop: 10 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, marginBottom: 10 },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  settingText: { fontSize: 16, marginLeft: 15 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE5E5', padding: 15, borderRadius: 12 },
  deleteText: { color: '#FF4D4D', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderRadius: 20, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  modalText: { fontSize: 16 },
  closeModalBtn: { marginTop: 20, backgroundColor: '#6200EE', padding: 12, borderRadius: 10, alignItems: 'center' },
  
  label: { fontSize: 14, marginBottom: 5, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 16 },
  modalBtn: { padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }
});

export default SettingsScreen;