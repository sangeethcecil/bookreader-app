import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const CartContext = createContext(undefined);
const STORAGE_KEY = 'bookreader_cart';

// Cart is client-side: React state persisted to localStorage on web.
// Cross-device sync (Supabase cart_items table) is a future enhancement.
function loadCart() {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

function saveCart(items) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) { /* storage full or unavailable — cart stays in memory */ }
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  function addToCart(book) {
    setItems((prev) => {
      if (prev.some((b) => b.id === book.id)) return prev; // no duplicates
      return [...prev, book];
    });
  }

  function removeFromCart(bookId) {
    setItems((prev) => prev.filter((b) => b.id !== bookId));
  }

  function clearCart() {
    setItems([]);
  }

  function inCart(bookId) {
    return items.some((b) => b.id === bookId);
  }

  const total = items.reduce((sum, b) => sum + (Number(b.price) || 0), 0);
  const count = items.length;

  const value = { items, addToCart, removeFromCart, clearCart, inCart, total, count };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
