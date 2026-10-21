import React from 'react';
import { StatusBar } from 'expo-status-bar';
// v3.0 — cart + multi-book checkout
import { AuthProvider } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </CartProvider>
    </AuthProvider>
  );
}
