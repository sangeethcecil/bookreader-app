import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ReaderScreen from '../screens/ReaderScreen';
import SubscribeScreen from '../screens/SubscribeScreen';
import AdminScreen from '../screens/AdminScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import CartScreen from '../screens/CartScreen';

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

  const isAdmin = !!profile?.is_admin;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={!session ? 'Login' : isAdmin ? 'Admin' : 'Home'}
      >
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            {/*
              The storefront is registered for EVERYONE, admins included.
              Previously admins only had Admin + Reader in the navigator, so
              navigate('Home') was unhandled and the Storefront button did
              nothing. Admins now start on Admin but can switch freely.
            */}
            {/* Listed FIRST for admins: React Navigation picks the first
                registered screen when the signed-in branch mounts, so an admin
                still lands on the portal rather than the storefront. */}
            {isAdmin ? <Stack.Screen name="Admin" component={AdminScreen} /> : null}

            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            {/* headerShown false: the reader has its own "Back" button, and the
                native header's back arrow duplicated it. */}
            <Stack.Screen
              name="Reader"
              component={ReaderScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Subscribe"
              component={SubscribeScreen}
              options={{ headerShown: true, title: 'Subscribe' }}
            />
            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{ headerShown: true, title: 'Purchase Book' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
