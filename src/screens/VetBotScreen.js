import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { COLORS } from '../constants/colors';
import { ThemeContext } from '../context/ThemeContext';
import { AIContext } from '../context/AIContext';
import { AuthContext } from '../context/AuthContext';

const VetBotScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { messages, sendMessageToBot, isTyping, clearChat } = useContext(AIContext);
  const { country } = useContext(AuthContext);

  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); // 📸 Yeni: Seçilen resim durumu
  const flatListRef = useRef();

  const isTR = country?.code === 'TR';
  const texts = {
      header: isTR ? "Veteriner Asistanı" : "Vet Assistant",
      status: isTR ? "Çevrimiçi" : "Online",
      placeholder: isTR ? "Mesaj yazın..." : "Type a message...",
      typing: isTR ? "yazıyor..." : "typing...",
      photoInfo: isTR ? "📷 Fotoğraf" : "📷 Photo"
  };

  // --- FOTOĞRAF SEÇME ---
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
      // Resmi hemen gönderme, state'e kaydet (Önizleme için)
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
      setSelectedImage(null);
  };

  const handleSend = () => {
      if (text.trim().length === 0 && !selectedImage) return;

      // 1. Önce Resim Varsa Gönder
      if (selectedImage) {
          sendMessageToBot(`IMAGE_CODE::${selectedImage}`);
      }

      // 2. Sonra Metin Varsa Gönder
      // (Küçük bir gecikme ekliyoruz ki sıralama karışmasın)
      if (text.trim().length > 0) {
          setTimeout(() => {
              sendMessageToBot(text);
          }, 100); 
      }

      // Temizlik
      setText('');
      setSelectedImage(null);
  };

  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
  }, [messages, isTyping, selectedImage]); // Resim seçince de kaydır

  const renderItem = ({ item }) => {
      const isBot = item.sender === 'bot';
      const isImage = item.text.startsWith('IMAGE_CODE::');
      const realImageUri = isImage ? item.text.split('::')[1] : null;

      return (
          <View style={[styles.messageRow, isBot ? styles.rowLeft : styles.rowRight]}>
              {isBot && (
                  <View style={styles.botAvatar}>
                      <Ionicons name="paw" size={18} color="white" />
                  </View>
              )}
              
              <View style={[
                  styles.bubble, 
                  isBot ? [styles.bubbleBot, { backgroundColor: theme.cardBg }] : styles.bubbleUser,
                  isImage && { padding: 4, backgroundColor: 'transparent' }
              ]}>
                  {isImage ? (
                      <View>
                        <Image source={{ uri: realImageUri }} style={styles.chatImage} />
                        {/* Resim Altı Bilgi */}
                        {/* <Text style={styles.imageCaption}>{texts.photoInfo}</Text> */} 
                      </View>
                  ) : (
                      <Text style={[styles.msgText, isBot ? { color: theme.text } : { color: 'white' }]}>
                          {item.text}
                      </Text>
                  )}
                  <Text style={[styles.timeText, isBot ? { color: theme.subText } : { color: 'rgba(255,255,255,0.7)' }]}>
                    {new Date(parseInt(item.id)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
              </View>
          </View>
      );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>{texts.header}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.statusText}>{texts.status}</Text>
              </View>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.iconBtn}>
              <Ionicons name="trash-bin-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
      </View>

      {/* SOHBET LİSTESİ */}
      <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
          ListFooterComponent={isTyping ? (
            <View style={{flexDirection:'row', alignItems:'center', marginLeft:10, marginBottom:10}}>
                <View style={[styles.botAvatar, {width:20, height:20, marginRight:5}]}><Ionicons name="paw" size={12} color="white"/></View>
                <Text style={{fontSize:12, color:theme.subText, fontStyle:'italic'}}>{texts.typing}</Text>
            </View>
          ) : null}
      />

      {/* MODERN INPUT ALANI (Kapsayıcı) */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={10}>
        <View style={[styles.footerContainer, { backgroundColor: theme.background }]}>
            
            {/* 🖼️ ÖNİZLEME ALANI (Sadece resim seçilirse görünür) */}
            {selectedImage && (
                <View style={[styles.previewContainer, { backgroundColor: theme.cardBg }]}>
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removePreviewBtn} onPress={removeImage}>
                        <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            {/* BUTONLAR VE INPUT SATIRI */}
            <View style={styles.inputRow}>
                <TouchableOpacity onPress={pickImage} style={[styles.mediaBtn, {backgroundColor: theme.cardBg}]}>
                    <Ionicons name="add" size={28} color={COLORS.primary} />
                </TouchableOpacity>

                <View style={[styles.inputContainer, { backgroundColor: theme.cardBg }]}>
                    <TextInput
                        style={[styles.input, { color: theme.text }]}
                        value={text}
                        onChangeText={setText}
                        placeholder={texts.placeholder}
                        placeholderTextColor={theme.subText}
                        multiline
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.sendBtn, { backgroundColor: (text.length > 0 || selectedImage) ? COLORS.primary : theme.border }]} 
                    onPress={handleSend}
                    disabled={(text.length === 0 && !selectedImage) || isTyping}
                >
                    <Ionicons name="send" size={20} color="white" style={{marginLeft:2}} />
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
  headerTitle: { fontSize: 17, fontWeight: '700' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 5 },
  statusText: { fontSize: 12, color: '#4CAF50' },
  iconBtn: { padding: 8 },
  
  messageRow: { flexDirection: 'row', marginBottom: 15 },
  rowLeft: { justifyContent: 'flex-start', alignItems: 'flex-end' },
  rowRight: { justifyContent: 'flex-end', alignItems: 'flex-end' },
  
  botAvatar: { width: 32, height: 32, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 18, elevation: 1 },
  bubbleBot: { borderBottomLeftRadius: 2, borderWidth:1, borderColor:'rgba(0,0,0,0.05)' },
  bubbleUser: { backgroundColor: COLORS.primary, borderBottomRightRadius: 2 },
  
  msgText: { fontSize: 15, lineHeight: 22 },
  timeText: { fontSize: 9, textAlign: 'right', marginTop: 4 },
  
  chatImage: { width: 220, height: 160, borderRadius: 12 },
  
  // --- FOOTER & INPUT STYLES ---
  footerContainer: { padding: 10 },
  
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
      backgroundColor: '#FF3B30', 
      borderRadius: 12, 
      width: 24, height: 24, 
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: 'white'
  },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  mediaBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 8, elevation: 1 },
  inputContainer: { flex: 1, borderRadius: 24, paddingHorizontal: 15, paddingVertical: 10, justifyContent:'center', minHeight: 48 },
  input: { fontSize: 16, maxHeight: 100 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginLeft: 8, elevation: 2 },
});

export default VetBotScreen;