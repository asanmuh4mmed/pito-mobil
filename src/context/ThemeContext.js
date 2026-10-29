import React, { createContext, useState, useEffect } from 'react';
// useColorScheme'e artık ihtiyacımız yok, sildik.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // 1. DİKKAT: Başlangıç değerini doğrudan 'true' (Karanlık Mod) yapıyoruz.
  // Bu sayede uygulama ekrana gelir gelmez beyaz patlaması yapmaz, siyah başlar.
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Senin belirlediğin Renk Paleti (Aynen korundu)
  const theme = {
    background: isDarkMode ? '#121212' : '#F8F9FA',
    cardBg: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#333333',
    subText: isDarkMode ? '#AAAAAA' : '#666666',
    icon: isDarkMode ? '#FFFFFF' : '#333333',
    border: isDarkMode ? '#333333' : '#EEEEEE',
    primary: '#FF6B6B', // Ana renk değişmez
  };

  // Uygulama açılınca kayıtlı temayı yükle
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem('theme');
      
      if (storedTheme !== null) {
        // Eğer kullanıcı daha önceden ayarlardan değiştirip kaydettiyse, onun tercihini uygula
        setIsDarkMode(storedTheme === 'dark');
      } else {
        // 2. İLK GİRİŞ: Hafızada kayıt yoksa (uygulamayı ilk yükleyişiyse)
        // Karanlık modu varsayılan yap ve hafızaya kaydet.
        setIsDarkMode(true);
        await AsyncStorage.setItem('theme', 'dark');
      }
    } catch (e) {
      console.log("Tema yükleme hatası", e);
    }
  };

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};