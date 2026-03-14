import React, { useEffect } from 'react';
import './src/i18n/i18n'; 

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// CONTEXT IMPORTS
import { AuthProvider } from './src/context/AuthContext';
import { ListingProvider } from './src/context/ListingContext';
import { ChatProvider } from './src/context/ChatContext';
import { ThemeProvider } from './src/context/ThemeContext'; 
import { AIProvider } from './src/context/AIContext';
import { SocialProvider } from './src/context/SocialContext'; 
import { CartProvider } from './src/context/CartContext'; 
import { ShopProvider } from './src/context/ShopContext'; 
import { GameProvider } from './src/context/GameContext'; 

// EKRANLAR
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
import PetsgramScreen from './src/screens/PetsgramScreen';
import ShopScreen from './src/screens/ShopScreen';
import VaccineReportScreen from './src/screens/VaccineReportScreen';
import GameScreen from './src/screens/GameScreen';
import MemoryGameScreen from './src/screens/MemoryGameScreen';
import EndlessRunnerScreen from './src/screens/EndlessRunnerScreen';
import GameListScreen from './src/screens/GameListScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import GameDonateScreen from './src/screens/GameDonateScreen';
import BubbleScreen from './src/screens/BubbleScreen';


// E-TİCARET, BAĞIŞ VE ROZETLER
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import ShopAdminScreen from './src/screens/ShopAdminScreen';
import AddEditProductScreen from './src/screens/AddEditProductScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import ShopAdminOrdersScreen from './src/screens/ShopAdminOrdersScreen';
import AddReviewScreen from './src/screens/AddReviewScreen';
import AllReviewsScreen from './src/screens/AllReviewsScreen';
import DonateScreen from './src/screens/DonateScreen';
import BadgesScreen from './src/screens/BadgesScreen';
// ADMIN EKRANLARI
import AdminPanelScreen from './src/screens/AdminPanelScreen';
import AdminUsersScreen from './src/screens/AdminUsersScreen'; 
import FlappyPetScreen from './src/screens/FlappyPetScreen';
const Stack = createNativeStackNavigator();

export default function App() {

  useEffect(() => {
    // Basit bir kontrol (Opsiyonel)
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
                    {/* Oyun Context'i */}
                    <GameProvider> 
                      <ThemeProvider> 
                        <NavigationContainer>
                          {/* 🌟 GÜNCELLEME: Uygulama artık her zaman Splash ekranından başlayacak! */}
                          <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
                            
                            {/* Ana Ekranlar */}
                            <Stack.Screen name="Splash" component={SplashScreen} />
                            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                            <Stack.Screen name="Home" component={HomeScreen} />
                            <Stack.Screen name="Login" component={LoginScreen} />
                            <Stack.Screen name="Register" component={RegisterScreen} />
                            
                            {/* Profil ve Ayarlar */}
                            <Stack.Screen name="Profile" component={ProfileScreen} />
                            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                            <Stack.Screen name="Settings" component={SettingsScreen} />
                            <Stack.Screen name="UserProfile" component={UserProfileScreen} />
                            <Stack.Screen name="Badges" component={BadgesScreen} />

                            {/* İlanlar */}
                            <Stack.Screen name="AddListing" component={AddListingScreen} />
                            <Stack.Screen name="AllListings" component={AllListingsScreen} />
                            <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
                            <Stack.Screen name="Reviews" component={ReviewsScreen} />

                            {/* Sosyal ve Sohbet */}
                            <Stack.Screen name="ChatList" component={ChatListScreen} />
                            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
                            <Stack.Screen name="Petsgram" component={PetsgramScreen} />

                            {/* Sağlık */}
                            <Stack.Screen name="VetBot" component={VetBotScreen} />
                            <Stack.Screen name="VaccineReport" component={VaccineReportScreen} />

                            {/* Oyunlar */}
                            <Stack.Screen name="GameList" component={GameListScreen} />
                            <Stack.Screen name="Game" component={GameScreen} />
                            <Stack.Screen name="MemoryGame" component={MemoryGameScreen} />
                            <Stack.Screen name="EndlessRunner" component={EndlessRunnerScreen} />
                            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
                            <Stack.Screen name="GameDonate" component={GameDonateScreen} />
                            <Stack.Screen name="FlappyPet" component={FlappyPetScreen} options={{ headerShown: false }} />
                            <Stack.Screen name="BubbleScreen" component={BubbleScreen} options={{ headerShown: false }} />
                            
                            {/* Mağaza ve Bağış */}
                            <Stack.Screen name="Shop" component={ShopScreen} />
                            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
                            <Stack.Screen name="Checkout" component={CheckoutScreen} />
                            <Stack.Screen name="AddReview" component={AddReviewScreen} />
                            <Stack.Screen name="AllReviews" component={AllReviewsScreen} />
                            <Stack.Screen name="Donate" component={DonateScreen} />

                            {/* Admin ve Yönetim */}
                            <Stack.Screen name="ShopAdmin" component={ShopAdminScreen} />
                            <Stack.Screen name="AddEditProduct" component={AddEditProductScreen} />
                            <Stack.Screen name="ShopAdminOrders" component={ShopAdminOrdersScreen} />
                            <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
                            <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />

                          </Stack.Navigator>
                        </NavigationContainer>
                      </ThemeProvider>
                    </GameProvider>
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