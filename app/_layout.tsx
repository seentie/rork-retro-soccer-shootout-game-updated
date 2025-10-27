import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="settings" 
        options={{ 
          title: 'Settings',
          presentation: 'modal',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#1a5f3f',
          },
          headerTintColor: '#fff',
        }} 
      />
      <Stack.Screen 
        name="privacy" 
        options={{ 
          title: 'Privacy Policy',
          presentation: 'modal',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#1a5f3f',
          },
          headerTintColor: '#fff',
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RootLayoutNav />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}