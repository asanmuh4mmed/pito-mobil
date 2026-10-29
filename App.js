import React, { useEffect, useContext, useState } from 'react';
import './src/i18n/i18n'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { StatusBar } from 'react-native'; 
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ListingProvider } from './src/context/ListingContext';
import { ChatProvider } from './src/context/ChatContext';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext'; 
import { AIProvider } from './src/context/AIContext';
import { SocialProvider } from './src/context/SocialContext'; 
import { CartProvider } from './src/context/CartContext'; 
import { ShopProvider } from './src/context/ShopContext'; 

import SplashVideoScreen from './src/screens/SplashVideoScreen'; 
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import AddListingScreen from './src/screens/AddListingScreen';
import AllListingsScreen from './src/screens/AllListingsScreen';
import ListingDetailScreen from './src/screens/ListingDetailScreen';
import ReviewsScreen from './src/screens/ReviewsScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatDetailScreen from './src/screens/ChatDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import VetBotScreen from './src/screens/VetBotScreen';
import ShopScreen from './src/screens/ShopScreen';
import VaccineReportScreen from './src/screens/VaccineReportScreen';
import PetIdentifierScreen from './src/screens/PetIdentifierScreen';
import VetMapScreen from './src/screens/VetMapScreen';
import AboutPito from './src/components/AboutPito';
import CommunityFeed from './src/screens/CommunityFeed';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import ShopAdminScreen from './src/screens/ShopAdminScreen';
import AddEditProductScreen from './src/screens/AddEditProductScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import ShopAdminOrdersScreen from './src/screens/ShopAdminOrdersScreen';
import AddReviewScreen from './src/screens/AddReviewScreen';
import AllReviewsScreen from './src/screens/AllReviewsScreen';
import AdminPanelScreen from './src/screens/AdminPanelScreen';
import AdminUsersScreen from './src/screens/AdminUsersScreen'; 

const Stack = createNativeStackNavigator();

// STATUS BAR YÖNETİCİ BİLEŞENİ (Çakışmayı önlemek için eklendi)
const GlobalStatusBar = () => {
  const { theme, isDarkMode } = useContext(ThemeContext);
  return (
    <StatusBar 
      barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
      backgroundColor={isDarkMode ? '#0B131E' : '#F8F9FA'} // Pito renklerine uyumlu
      translucent={false}
    />
  );
};

const AppNavigator = () => {
  const { user, isLoading } = useContext(AuthContext);
  const [isFirstLaunch, setIsFirstLaunch] = useState(null); 
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem('hasSeenVideoSplash');
        if (hasSeen === 'true') {
          setIsFirstLaunch(false); 
        } else {
          setIsFirstLaunch(true);
        }
      } catch (e) {
        console.log(e);
        setIsFirstLaunch(false); 
      } finally {
        setIsChecking(false);
      }
    };
    checkFirstLaunch();
  }, []);

  if (isLoading || isChecking) return null;

  const initialRoute = isFirstLaunch ? "SplashVideo" : (user ? "Home" : "Splash");

  return (
    <NavigationContainer>
      <GlobalStatusBar /> 
      <Stack.Navigator 
        initialRouteName={initialRoute} 
        screenOptions={{ 
          headerShown: false,
        }}
      >
        <Stack.Screen name="SplashVideo" component={SplashVideoScreen} />
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="AddListing" component={AddListingScreen} />
        <Stack.Screen name="AllListings" component={AllListingsScreen} />
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
        <Stack.Screen name="Reviews" component={ReviewsScreen} />
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
        <Stack.Screen name="VetBot" component={VetBotScreen} />
        <Stack.Screen name="VaccineReport" component={VaccineReportScreen} />
        <Stack.Screen name="CommunityFeed" component={CommunityFeed} options={{ headerShown: false }} />
        <Stack.Screen name="VetMapScreen" component={VetMapScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Shop" component={ShopScreen} />
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="AboutPito" component={AboutPito} options={{ title: 'Hakkımızda', headerShown: true }} />
        <Stack.Screen name="AddReview" component={AddReviewScreen} />
        <Stack.Screen name="AllReviews" component={AllReviewsScreen} />
        <Stack.Screen name="ShopAdmin" component={ShopAdminScreen} />
        <Stack.Screen name="AddEditProduct" component={AddEditProductScreen} />
        <Stack.Screen name="ShopAdminOrders" component={ShopAdminOrdersScreen} />
        <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
        <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
        <Stack.Screen name="PetIdentifier" component={PetIdentifierScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  useEffect(() => {
    if (!AuthProvider) console.error("🛑 HATA: AuthProvider YÜKLENEMEDİ!");
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ListingProvider>
          <ChatProvider>
            <AIProvider>
              <SocialProvider>
                <ShopProvider>
                  <CartProvider>
                    <ThemeProvider>
                      <AppNavigator />
                    </ThemeProvider>
                  </CartProvider>
                </ShopProvider>
              </SocialProvider>
            </AIProvider>
          </ChatProvider>
        </ListingProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}