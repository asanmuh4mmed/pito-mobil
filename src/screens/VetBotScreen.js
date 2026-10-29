import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { AIContext } from '../context/AIContext';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';

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
    error: '#FF4757',
    success: '#00B894'
};

const TRANSLATIONS = {
    TR: {
        header: "Veteriner Asistanı",
        status: "Çevrimiçi",
        placeholder: "Mesaj yazın...",
        typing: "yazıyor...",
        photoInfo: "📷 Fotoğraf"
    },
    AU: {
        header: "Vet Assistant",
        status: "Online",
        placeholder: "Type a message...",
        typing: "typing...",
        photoInfo: "📷 Photo"
    }
};

const VetBotScreen = ({ navigation }) => {
  const { messages, sendMessageToBot, isTyping, clearChat } = useContext(AIContext);
  const { country } = useContext(AuthContext);
  const { theme, isDarkMode } = useContext(ThemeContext);

  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); 
  const flatListRef = useRef();

  const activeLang = country?.code === 'TR' ? 'TR' : 'AU';
  const texts = TRANSLATIONS[activeLang];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("İzin Gerekli", "Galeriye erişim izni vermen gerekiyor.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
      setSelectedImage(null);
  };

  const handleSend = () => {
      if (text.trim().length === 0 && !selectedImage) return;

      if (selectedImage) {
          sendMessageToBot(`IMAGE_CODE::${selectedImage}`);
      }

      if (text.trim().length > 0) {
          setTimeout(() => {
              sendMessageToBot(text);
          }, 100); 
      }

      setText('');
      setSelectedImage(null);
  };

  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages, isTyping, selectedImage]); 

  const renderItem = ({ item }) => {
      const isBot = item.sender === 'bot';
      const isImage = item.text.startsWith('IMAGE_CODE::');
      const realImageUri = isImage ? item.text.split('::')[1] : null;

      return (
          <View style={[styles.messageRow, isBot ? styles.rowLeft : styles.rowRight]}>
              {isBot && (
                  <View style={styles.botAvatar}>
                      <Ionicons name="paw" size={18} color={PITO_COLORS.navyBg} />
                  </View>
              )}
              
              <View style={[
                  styles.bubble, 
                  isBot ? { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : '#FFFFFF', borderColor: isDarkMode ? PITO_COLORS.navyLight : '#EBEBEB', borderWidth: 1 } : { backgroundColor: PITO_COLORS.primary },
                  isImage && { padding: 4, backgroundColor: 'transparent', borderWidth: 0 }
              ]}>
                  {isImage ? (
                      <Image source={{ uri: realImageUri }} style={styles.chatImage} />
                  ) : (
                      <Text style={[styles.msgText, isBot ? { color: theme.text } : { color: PITO_COLORS.navyBg }]}>
                          {item.text}
                      </Text>
                  )}
                  <Text style={[styles.timeText, { color: isBot ? theme.subText : 'rgba(11, 19, 30, 0.6)' }]}>
                    {new Date(parseInt(item.id)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
              </View>
          </View>
      );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : '#F4F5F9' }]} edges={['top', 'right', 'left']}>
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'android' ? 25 : 0} 
      >
          {/* PREMIUM HEADER */}
          <View style={[styles.header, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : theme.cardBg, borderBottomColor: isDarkMode ? PITO_COLORS.navyLight : '#EBEBEB' }]}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, {backgroundColor: isDarkMode ? PITO_COLORS.navyLight : '#F0F0F0'}]}>
                  <Ionicons name="chevron-back" size={24} color={PITO_COLORS.primary} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="medkit" size={18} color={PITO_COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.headerTitle, { color: theme.text }]}>{texts.header}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.statusText}>{texts.status}</Text>
                  </View>
              </View>
              <TouchableOpacity onPress={clearChat} style={[styles.iconBtn, {backgroundColor: isDarkMode ? PITO_COLORS.navyLight : '#F0F0F0'}]}>
                  <Ionicons name="trash-bin-outline" size={20} color={PITO_COLORS.primary} />
              </TouchableOpacity>
          </View>

          <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled" 
              keyboardDismissMode="on-drag"
              ListFooterComponent={isTyping ? (
                <View style={{flexDirection:'row', alignItems:'center', marginLeft:10, marginBottom:10}}>
                    <View style={[styles.botAvatar, {width:20, height:20, marginRight:5}]}><Ionicons name="paw" size={12} color={PITO_COLORS.navyBg}/></View>
                    <Text style={{fontSize:12, color: PITO_COLORS.primary, fontStyle:'italic'}}>{texts.typing}</Text>
                </View>
              ) : null}
          />

          <View style={[styles.footerContainer, { backgroundColor: isDarkMode ? PITO_COLORS.navyBg : '#F4F5F9' }]}>
              
              {selectedImage && (
                  <View style={[styles.previewContainer, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : 'white' }]}>
                      <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                      <TouchableOpacity style={styles.removePreviewBtn} onPress={removeImage}>
                          <Ionicons name="close" size={16} color="white" />
                      </TouchableOpacity>
                  </View>
              )}

              <View style={styles.inputRow}>
                  <TouchableOpacity onPress={pickImage} style={[styles.mediaBtn, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : 'white' }]}>
                      <Ionicons name="add" size={28} color={PITO_COLORS.primary} />
                  </TouchableOpacity>

                  <View style={[styles.inputContainer, { backgroundColor: isDarkMode ? PITO_COLORS.navySurface : 'white', borderColor: isDarkMode ? PITO_COLORS.navyLight : '#EBEBEB' }]}>
                      <TextInput
                          style={[styles.input, { color: theme.text }]}
                          value={text}
                          onChangeText={setText}
                          placeholder={texts.placeholder}
                          placeholderTextColor={PITO_COLORS.grayText}
                          multiline
                      />
                  </View>

                  <TouchableOpacity 
                      style={[styles.sendBtn, { backgroundColor: (text.length > 0 || selectedImage) ? PITO_COLORS.primary : (isDarkMode ? PITO_COLORS.navyLight : '#ccc') }]} 
                      onPress={handleSend}
                      disabled={(text.length === 0 && !selectedImage) || isTyping}
                  >
                      <Ionicons name="send" size={20} color={PITO_COLORS.navyBg} style={{marginLeft:2}} />
                  </TouchableOpacity>
              </View>
          </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }, 
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, elevation: 2, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:5 },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PITO_COLORS.success, marginRight: 5 },
  statusText: { fontSize: 12, color: PITO_COLORS.success },
  iconBtn: { padding: 8, borderRadius: 12 },
  
  messageRow: { flexDirection: 'row', marginBottom: 15 },
  rowLeft: { justifyContent: 'flex-start', alignItems: 'flex-end' },
  rowRight: { justifyContent: 'flex-end', alignItems: 'flex-end' },
  
  botAvatar: { width: 32, height: 32, borderRadius: 12, backgroundColor: PITO_COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 8 }, 
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 18, elevation: 1 },
  bubbleBot: { borderBottomLeftRadius: 2 },
  bubbleUser: { borderBottomRightRadius: 2 }, 
  
  msgText: { fontSize: 15, lineHeight: 22 },
  timeText: { fontSize: 9, textAlign: 'right', marginTop: 4 },
  
  chatImage: { width: 220, height: 160, borderRadius: 12 },
  
  footerContainer: { padding: 10, paddingBottom: Platform.OS === 'ios' ? 25 : 10 },
  
  previewContainer: { 
      flexDirection: 'row', 
      marginBottom: 10, 
      padding: 10, 
      borderRadius: 15, 
      alignSelf: 'flex-start',
      elevation: 2,
      shadowColor:'#000', shadowOpacity:0.1, shadowRadius:3
  },
  previewImage: { width: 60, height: 60, borderRadius: 10 },
  removePreviewBtn: { 
      position: 'absolute', 
      top: -5, 
      right: -5, 
      backgroundColor: PITO_COLORS.error, 
      borderRadius: 12, 
      width: 24, height: 24, 
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: 'white'
  },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  mediaBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 8, elevation: 1 },
  inputContainer: { flex: 1, borderRadius: 24, paddingHorizontal: 15, paddingVertical: 10, justifyContent:'center', minHeight: 48, borderWidth: 1 },
  input: { fontSize: 16, maxHeight: 100 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginLeft: 8, elevation: 2 },
});

export default VetBotScreen;