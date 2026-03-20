import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker'; 
import { AIContext } from '../context/AIContext';
import { AuthContext } from '../context/AuthContext';

const VetBotScreen = ({ navigation }) => {
  const { messages, sendMessageToBot, isTyping, clearChat } = useContext(AIContext);
  const { country } = useContext(AuthContext);

  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); 
  const flatListRef = useRef();

  const isTR = country?.code === 'TR';
  const texts = {
      header: isTR ? "Veteriner Asistanı" : "Vet Assistant",
      status: isTR ? "Çevrimiçi" : "Online",
      placeholder: isTR ? "Mesaj yazın..." : "Type a message...",
      typing: isTR ? "yazıyor..." : "typing...",
      photoInfo: isTR ? "📷 Fotoğraf" : "📷 Photo"
  };

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
                      <Ionicons name="paw" size={18} color="white" />
                  </View>
              )}
              
              <View style={[
                  styles.bubble, 
                  isBot ? styles.bubbleBot : styles.bubbleUser,
                  isImage && { padding: 4, backgroundColor: 'transparent', borderWidth: 0 }
              ]}>
                  {isImage ? (
                      <View>
                        <Image source={{ uri: realImageUri }} style={styles.chatImage} />
                      </View>
                  ) : (
                      <Text style={[styles.msgText, isBot ? { color: '#333' } : { color: 'white' }]}>
                          {item.text}
                      </Text>
                  )}
                  <Text style={[styles.timeText, isBot ? { color: '#999' } : { color: 'rgba(255,255,255,0.7)' }]}>
                    {new Date(parseInt(item.id)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
              </View>
          </View>
      );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={28} color="#6200EE" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.headerTitle}>{texts.header}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.statusText}>{texts.status}</Text>
              </View>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.iconBtn}>
              <Ionicons name="trash-bin-outline" size={22} color="#6200EE" />
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
                <Text style={{fontSize:12, color:'#7E57C2', fontStyle:'italic'}}>{texts.typing}</Text>
            </View>
          ) : null}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={10}>
        <View style={styles.footerContainer}>
            
            {/* 🖼️ ÖNİZLEME ALANI */}
            {selectedImage && (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removePreviewBtn} onPress={removeImage}>
                        <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            {/* BUTONLAR VE INPUT SATIRI */}
            <View style={styles.inputRow}>
                <TouchableOpacity onPress={pickImage} style={styles.mediaBtn}>
                    <Ionicons name="add" size={28} color="#6200EE" />
                </TouchableOpacity>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={text}
                        onChangeText={setText}
                        placeholder={texts.placeholder}
                        placeholderTextColor="#999"
                        multiline
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.sendBtn, { backgroundColor: (text.length > 0 || selectedImage) ? '#6200EE' : '#ccc' }]} 
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
  container: { flex: 1, backgroundColor: '#F3E5F5' }, // Yumuşak Menekşe Arkaplan
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', elevation: 2, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:5 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#3700B3' }, // Derin Mor
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 5 },
  statusText: { fontSize: 12, color: '#4CAF50' },
  iconBtn: { padding: 8 },
  
  messageRow: { flexDirection: 'row', marginBottom: 15 },
  rowLeft: { justifyContent: 'flex-start', alignItems: 'flex-end' },
  rowRight: { justifyContent: 'flex-end', alignItems: 'flex-end' },
  
  botAvatar: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#6200EE', justifyContent: 'center', alignItems: 'center', marginRight: 8 }, // Ana Mor
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 18, elevation: 1 },
  bubbleBot: { backgroundColor: 'white', borderBottomLeftRadius: 2, borderWidth:1, borderColor:'rgba(0,0,0,0.05)' },
  bubbleUser: { backgroundColor: '#6200EE', borderBottomRightRadius: 2 }, // Ana Mor
  
  msgText: { fontSize: 15, lineHeight: 22 },
  timeText: { fontSize: 9, textAlign: 'right', marginTop: 4 },
  
  chatImage: { width: 220, height: 160, borderRadius: 12 },
  
  footerContainer: { padding: 10, backgroundColor: '#F3E5F5' },
  
  previewContainer: { 
      flexDirection: 'row', 
      marginBottom: 10, 
      padding: 10, 
      backgroundColor: 'white',
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
  mediaBtn: { width: 48, height: 48, backgroundColor: 'white', borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 8, elevation: 1 },
  inputContainer: { flex: 1, backgroundColor: 'white', borderRadius: 24, paddingHorizontal: 15, paddingVertical: 10, justifyContent:'center', minHeight: 48 },
  input: { fontSize: 16, maxHeight: 100, color: '#333' },
  sendBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginLeft: 8, elevation: 2 },
});

export default VetBotScreen;