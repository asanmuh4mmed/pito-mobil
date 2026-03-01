import React, { createContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Telefonun kendi ayarını varsayılan olarak al (Karanlık mı Aydınlık mı?)
  const deviceTheme = useColorScheme(); 
  const [isDarkMode, setIsDarkMode] = useState(deviceTheme === 'dark');

  // Renk Paleti
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
        setIsDarkMode(storedTheme === 'dark');
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