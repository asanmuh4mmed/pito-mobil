import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView, Modal, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

// --- PITO YENİ RENK PALETİ ---
const PITO_COLORS = {
    primary: '#C5A059', // Altın / Bronz
    primaryDark: '#B08D4B', 
    navyBg: '#0B131E', // Derin Lacivert
    navySurface: '#1A2533', // Kart ve Kutu Arka Planları
    navyLight: '#243447',
    cream: '#F5F5DC',
    white: '#FFFFFF',
    grayText: '#A0AAB5',
    error: '#FF4757',
    success: '#00B894'
};

const TRANSLATIONS = {
    TR: {
        settings: "Ayarlar",
        guest: "Misafir",
        general: "Genel",
        darkMode: "Karanlık Mod",
        notifications: "Bildirimler",
        language: "Dil Seçimi",
        account: "Hesap",
        editProfile: "Profili Düzenle",
        changePassword: "Şifre Değiştir",
        deleteAccount: "Hesabı Sil",
        cancel: "Vazgeç",
        save: "Kaydet",
        newPass: "Yeni Şifre",
        phNewPass: "En az 6 karakter",
        confirmDelete: "Hesabınızı kalıcı olarak silmek istediğinize emin misiniz?",
        success: "Başarılı",
        error: "Hata",
        fillAll: "Lütfen yeni şifrenizi giriniz.",
        tr: "Türkçe",
        en: "English"
    },
    EN: {
        settings: "Settings",
        guest: "Guest",
        general: "General",
        darkMode: "Dark Mode",
        notifications: "Notifications",
        language: "Language",
        account: "Account",
        editProfile: "Edit Profile",
        changePassword: "Change Password",
        deleteAccount: "Delete Account",
        cancel: "Cancel",
        save: "Save",
        newPass: "New Password",
        phNewPass: "At least 6 characters",
        confirmDelete: "Are you sure you want to permanently delete your account?",
        success: "Success",
        error: "Error",
        fillAll: "Please enter your new password.",
        tr: "Türkçe",
        en: "English"
    }
};

const SettingsScreen = ({ navigation }) => {
  const { logout, user, changePassword, deleteUserAccount, updateNotificationPreference } = useContext(AuthContext); 
  const { isDarkMode, toggleTheme, theme: appTheme } = useContext(ThemeContext);
  const theme = isDarkMode ? appTheme : { ...appTheme, background: '#F8F5EF', cardBg: '#FFFFFF', text: '#142239', subText: '#727989', border: '#EAE4D8' };
  
  // Arayüz dili için state (Default TR)
  const [language, setLanguage] = useState('TR');
  const t = TRANSLATIONS[language];

  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
      if (user?.notification_settings?.enabled !== undefined) {
          setIsNotificationsEnabled(user.notification_settings.enabled);
      }
  }, [user]);

  const toggleNotifications = (value) => {
      setIsNotificationsEnabled(value);
      updateNotificationPreference(value); 
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
      container: { flex: 1, backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.background },
      header: { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : theme.background, borderBottomColor: isDarkMode ? PITO_COLORS.navyLight : '#EAEAEF' },
      headerTitle: { color: theme.text },
      settingItem: { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg },
      text: { color: theme.text },
      subText: { color: theme.subText },
      icon: PITO_COLORS.primary
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* HEADER */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, {backgroundColor: isDarkMode ? PITO_COLORS.navySurface : '#EEEAE2'}]}>
            <Ionicons name="arrow-back" size={24} color={dynamicStyles.icon} />
        </TouchableOpacity>
        <View style={styles.brandRow}><Ionicons name="paw" size={20} color={PITO_COLORS.primary} /><Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Pito</Text></View> 
        <View style={styles.headerSymbol}><Ionicons name="options-outline" size={21} color={PITO_COLORS.primary} /></View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}><Text style={[styles.pageTitle, { color: theme.text }]}>{t.settings}</Text><Text style={[styles.pageSubtitle, { color: theme.subText }]}>{language === 'TR' ? 'Pito deneyimini kendine göre düzenle.' : 'Make your Pito experience your own.'}</Text></View>
        
        {/* PROFİL KARTI */}
        <View style={[styles.profileSection, dynamicStyles.settingItem, {borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, borderWidth: 1}]}>
            <View style={[styles.avatarBox, {backgroundColor: PITO_COLORS.primary}]}>
                {user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarText}>{user?.fullname?.charAt(0).toUpperCase() || "U"}</Text>
                )}
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.profileName, { color: theme.text }]} numberOfLines={2}>{user?.fullname || t.guest}</Text>
                <Text style={[styles.profileEmail, dynamicStyles.subText]} numberOfLines={1}>{user?.email || ''}</Text>
            </View>
            <Ionicons name="person-circle-outline" size={21} color={PITO_COLORS.primary} />
        </View>

        <Text style={[styles.sectionHeader, {color: PITO_COLORS.grayText}]}>{t.general}</Text>
        
        <View style={[styles.settingItem, dynamicStyles.settingItem, {borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, borderWidth: 1}]}>
            <View style={styles.settingLeft}>
                <View style={styles.rowIcon}><Ionicons name="moon-outline" size={20} color={dynamicStyles.icon} /></View>
                <Text style={[styles.settingText, dynamicStyles.text]}>{t.darkMode}</Text>
            </View>
            <Switch 
              onValueChange={toggleTheme} 
              value={isDarkMode} 
              trackColor={{ false: isDarkMode ? '#3B4654' : '#DCD8CF', true: PITO_COLORS.primary }}
              thumbColor="#FFFFFF"
            />
        </View>

        <View style={[styles.settingItem, dynamicStyles.settingItem, {borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, borderWidth: 1}]}>
            <View style={styles.settingLeft}>
                <View style={styles.rowIcon}><Ionicons name="notifications-outline" size={20} color={dynamicStyles.icon} /></View>
                <Text style={[styles.settingText, dynamicStyles.text]}>{t.notifications}</Text>
            </View>
            <Switch 
              onValueChange={toggleNotifications} 
              value={isNotificationsEnabled} 
              trackColor={{ false: isDarkMode ? '#3B4654' : '#DCD8CF', true: PITO_COLORS.primary }}
              thumbColor="#FFFFFF"
            />
        </View>

        <TouchableOpacity style={[styles.settingItem, dynamicStyles.settingItem, {borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, borderWidth: 1}]} onPress={() => setLanguageModalVisible(true)} activeOpacity={0.8}>
            <View style={styles.settingLeft}>
                <View style={styles.rowIcon}><Ionicons name="globe-outline" size={20} color={dynamicStyles.icon} /></View>
                <Text style={[styles.settingText, dynamicStyles.text]}>{t.language}</Text>
            </View>
            <View style={styles.languageValue}><Text style={[dynamicStyles.subText, { fontSize: 11 }]}>{language === 'TR' ? 'Türkçe' : 'English'}</Text><Ionicons name="chevron-forward" size={16} color={theme.subText} /></View>
        </TouchableOpacity>

        <Text style={[styles.sectionHeader, {color: PITO_COLORS.grayText}]}>{t.account}</Text>

        <TouchableOpacity style={[styles.settingItem, dynamicStyles.settingItem, {borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, borderWidth: 1}]} onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.8}>
            <View style={styles.settingLeft}>
                <View style={styles.rowIcon}><Ionicons name="person-outline" size={20} color={dynamicStyles.icon} /></View>
                <Text style={[styles.settingText, dynamicStyles.text]}>{t.editProfile}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={dynamicStyles.subText.color} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, dynamicStyles.settingItem, {borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, borderWidth: 1}]} onPress={() => setPasswordModalVisible(true)} activeOpacity={0.8}>
            <View style={styles.settingLeft}>
                <View style={styles.rowIcon}><Ionicons name="lock-closed-outline" size={20} color={dynamicStyles.icon} /></View>
                <Text style={[styles.settingText, dynamicStyles.text]}>{t.changePassword}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={dynamicStyles.subText.color} />
        </TouchableOpacity>

        <View style={styles.dangerSection}><Text style={[styles.dangerCaption, { color: theme.subText }]}>{language === 'TR' ? 'Hesap yönetimi' : 'Account management'}</Text>
        <TouchableOpacity style={[styles.deleteButton, {backgroundColor: 'rgba(255,71,87,0.07)'}]} onPress={handleDeleteAccount} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={22} color={PITO_COLORS.error} />
            <Text style={[styles.deleteText, {color: PITO_COLORS.error}]}>{t.deleteAccount}</Text><Ionicons name="chevron-forward" size={17} color={PITO_COLORS.error} />
        </TouchableOpacity></View>

      </ScrollView>

      {/* Dil Modal */}
      <Modal visible={languageModalVisible} transparent={true} animationType="slide" onRequestClose={() => setLanguageModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, dynamicStyles.settingItem]}>
                <View style={styles.sheetHandle} /><View style={styles.modalTitleRow}><View style={styles.rowIcon}><Ionicons name="globe-outline" size={22} color={PITO_COLORS.primary} /></View><Text style={[styles.modalTitle, dynamicStyles.text]}>{t.language}</Text><TouchableOpacity onPress={() => setLanguageModalVisible(false)} style={styles.closeIcon} accessibilityLabel={t.cancel}><Ionicons name="close" size={22} color={theme.text} /></TouchableOpacity></View>
                <TouchableOpacity style={[styles.modalItem, { borderBottomWidth: 1, borderBottomColor: isDarkMode ? PITO_COLORS.navyLight : '#E0E0E0' }]} onPress={() => { setLanguage('TR'); setLanguageModalVisible(false); }}>
                    <View style={styles.languageOption}><Text style={styles.languageCode}>TR</Text><Text style={[styles.modalText, dynamicStyles.text, language === 'TR' && {color: PITO_COLORS.primary, fontWeight: 'bold'}]}>Türkçe</Text></View>
                    {language === 'TR' && <Ionicons name="checkmark" size={24} color={PITO_COLORS.primary} />}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalItem]} onPress={() => { setLanguage('EN'); setLanguageModalVisible(false); }}>
                    <View style={styles.languageOption}><Text style={styles.languageCode}>EN</Text><Text style={[styles.modalText, dynamicStyles.text, language === 'EN' && {color: PITO_COLORS.primary, fontWeight: 'bold'}]}>English</Text></View>
                    {language === 'EN' && <Ionicons name="checkmark" size={24} color={PITO_COLORS.primary} />}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.closeModalBtn, {backgroundColor: PITO_COLORS.primary}]} onPress={() => setLanguageModalVisible(false)}>
                    <Text style={{color: PITO_COLORS.navyBg, fontWeight:'bold'}}>{t.cancel}</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* Şifre Modal */}
      <Modal visible={passwordModalVisible} transparent={true} animationType="slide" onRequestClose={() => setPasswordModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={[styles.modalContent, dynamicStyles.settingItem]}>
                <View style={styles.sheetHandle} /><View style={styles.modalTitleRow}><View style={styles.rowIcon}><Ionicons name="lock-closed-outline" size={21} color={PITO_COLORS.primary} /></View><Text style={[styles.modalTitle, dynamicStyles.text]}>{t.changePassword}</Text></View>
                <Text style={[styles.passwordHint, { color: theme.subText }]}>{t.phNewPass}</Text>
                <View style={styles.passwordField}>
                <TextInput 
                    style={[styles.input, dynamicStyles.text, { borderColor: isDarkMode ? PITO_COLORS.navyLight : theme.border, backgroundColor: isDarkMode ? PITO_COLORS.navyBg : '#F9F9F9' }]}
                    secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} value={newPassword} onChangeText={setNewPassword}
                    placeholder={t.phNewPass} placeholderTextColor={PITO_COLORS.grayText}
                />
                <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(value => !value)} accessibilityRole="button" accessibilityLabel={language === 'TR' ? (showPassword ? 'Şifreyi gizle' : 'Şifreyi göster') : (showPassword ? 'Hide password' : 'Show password')}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={theme.subText} /></TouchableOpacity></View>
                <View style={{ flexDirection: 'row', marginTop: 20 }}>
                    <TouchableOpacity style={[styles.modalBtn, { backgroundColor: isDarkMode ? PITO_COLORS.navyLight : '#E0E0E0', flex: 1, marginRight: 10 }]} onPress={() => setPasswordModalVisible(false)}>
                        <Text style={{color: theme.text, fontWeight:'bold'}}>{t.cancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, { backgroundColor: PITO_COLORS.primary, flex: 1 }]} onPress={handleChangePasswordSubmit}>
                        <Text style={{color: PITO_COLORS.navyBg, fontWeight:'bold'}}>{t.save}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 23, fontWeight: '800', letterSpacing: -0.7 },
  backBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSymbol: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(197,160,89,0.09)', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  intro: { paddingTop: 17, paddingBottom: 24 },
  pageTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 },
  pageSubtitle: { fontSize: 12, lineHeight: 19, marginTop: 8 },
  profileSection: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 22, marginBottom: 26, gap: 12 },
  avatarBox: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontSize: 23, fontWeight: '700', color: PITO_COLORS.navyBg },
  avatarImage: { width: '100%', height: '100%' },
  profileName: { fontSize: 16, fontWeight: '700', lineHeight: 21 },
  profileEmail: { fontSize: 11, lineHeight: 17, marginTop: 4 },
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, marginLeft: 3, marginTop: 8 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 13, borderRadius: 18, marginBottom: 10, gap: 8, minHeight: 70 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 11 },
  rowIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: 'rgba(197,160,89,0.1)', alignItems: 'center', justifyContent: 'center' },
  settingText: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  languageValue: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dangerSection: { marginTop: 19 },
  dangerCaption: { fontSize: 11, marginBottom: 10, marginLeft: 3 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 17, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,71,87,0.12)' },
  deleteText: { flex: 1, fontSize: 13, fontWeight: '600', marginLeft: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(5,10,18,0.58)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 11, paddingBottom: 35 },
  sheetHandle: { width: 36, height: 4, borderRadius: 3, backgroundColor: '#AFA897', opacity: 0.4, alignSelf: 'center', marginBottom: 22 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  modalTitle: { flex: 1, fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  closeIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 17 },
  languageOption: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  languageCode: { color: PITO_COLORS.primaryDark, fontSize: 11, fontWeight: '800', backgroundColor: 'rgba(197,160,89,0.1)', borderRadius: 9, padding: 10 },
  modalText: { fontSize: 15, fontWeight: '600' },
  closeModalBtn: { marginTop: 18, paddingVertical: 15, borderRadius: 15, alignItems: 'center' },
  passwordHint: { fontSize: 12, marginBottom: 12 },
  passwordField: { position: 'relative' },
  input: { minHeight: 55, borderWidth: 1, borderRadius: 15, paddingLeft: 15, paddingRight: 55, paddingVertical: 15, fontSize: 15 },
  eyeButton: { position: 'absolute', right: 5, top: 5, bottom: 5, width: 44, alignItems: 'center', justifyContent: 'center' },
  modalBtn: { paddingVertical: 16, borderRadius: 15, alignItems: 'center' }
});

export default SettingsScreen;