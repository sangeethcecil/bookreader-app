import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import LibraryScreen from '../screens/LibraryScreen';
import ReaderScreen from '../screens/ReaderScreen';
import SubscribeScreen from '../screens/SubscribeScreen';
import AdminScreen from '../screens/AdminScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { session, loading, profile } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : profile?.is_admin ? (
          // Admin users go straight to admin portal
          <>
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen
              name="Reader"
              component={ReaderScreen}
              options={{ headerShown: true, title: '' }}
            />
          </>
        ) : (
          // Regular users go to library
          <>
            <Stack.Screen name="Library" component={LibraryScreen} />
            <Stack.Screen
              name="Reader"
              component={ReaderScreen}
              options={{ headerShown: true, title: '' }}
            />
            <Stack.Screen
              name="Subscribe"
              component={SubscribeScreen}
              options={{ headerShown: true, title: 'Subscribe' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
