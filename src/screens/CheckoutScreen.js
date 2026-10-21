import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

// Razorpay key: env var required in production; test-key fallback allowed only in development.
const ENV_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
const RAZORPAY_KEY_ID =
  ENV_KEY ||
  (process.env.NODE_ENV === 'production'
    ? null // production must configure the key — fail loudly, never silently use a test key
    : (console.warn('Using fallback Razorpay TEST key — set EXPO_PUBLIC_RAZORPAY_KEY_ID.'), 'rzp_test_TL8M6EvIJ2kjyJ'));

const SUPABASE_FUNCTIONS = 'https://alkmhitjxxjmmytlrsiw.supabase.co/functions/v1';

export default function CheckoutScreen({ route, navigation }) {
  // Accepts { book } for direct single-book buy, or { items } for cart checkout.
  const { book, items: cartItems } = route.params;
  const items = cartItems ?? (book ? [book] : []);
  const fromCart = !!cartItems;

  const { user, refreshProfile } = useAuth();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(false);

  const total = items.reduce((s, b) => s + (Number(b.price) || 0), 0);
  const single = items.length === 1 ? items[0] : null;

  async function handleBuy() {
    if (!user) { window.alert('Please log in first.'); return; }
    if (!RAZORPAY_KEY_ID) {
      window.alert('Payments are not configured. Set EXPO_PUBLIC_RAZORPAY_KEY_ID before checkout.');
      return;
    }
    if (items.length === 0) { window.alert('Nothing to buy.'); return; }
    setLoading(true);

    try {
      const sessionData = await supabase.auth.getSession();
      const session = sessionData.data.session;
      if (!session) throw new Error('Not logged in');

      // Server computes the total from DB prices — the client sends IDs only.
      const response = await fetch(`${SUPABASE_FUNCTIONS}/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ book_ids: items.map((b) => b.id) }),
      });

      const order = await response.json();
      if (!order.id) throw new Error(order.error || JSON.stringify(order));

      if (Platform.OS === 'web') {
        openRazorpayWeb(order);
      }
    } catch (err) {
      window.alert('Error: ' + err.message);
      setLoading(false);
    }
  }

  function openRazorpayWeb(order) {
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'BookReader',
      description: single ? single.title : `${order.book_ids?.length ?? items.length} books`,
      order_id: order.id,
      prefill: { email: user.email },
      theme: { color: '#2563eb' },
      handler: async function (response) {
        setLoading(true);
        try {
          const sessionData = await supabase.auth.getSession();
          const session = sessionData.data.session;

          // The order already knows its books (pending rows) — no book_id needed here.
          const verifyRes = await fetch(`${SUPABASE_FUNCTIONS}/verify-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const result = await verifyRes.json();

          if (result.success) {
            if (fromCart) clearCart();
            await refreshProfile();
            setTimeout(() => {
              if (single && !fromCart) {
                // Direct single-book buy: open the reader immediately.
                navigation.navigate('Reader', { bookId: single.id, contentType: single.content_type });
              } else {
                const n = result.book_ids?.length ?? items.length;
                window.alert(`Payment successful! ${n} book${n === 1 ? '' : 's'} added to your library.`);
                navigation.navigate('Home');
              }
            }, 1000);
          } else {
            window.alert('Verification failed: ' + JSON.stringify(result));
          }
        } catch (err) {
          window.alert('Handler error: ' + err.message);
        }
        setLoading(false);
      },
      modal: {
        ondismiss: function () { setLoading(false); },
      },
    };

    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const rzp = new window.Razorpay(options);
        rzp.open();
      };
      script.onerror = () => {
        window.alert('Failed to load Razorpay. Check your internet connection.');
        setLoading(false);
      };
      document.body.appendChild(script);
    } else {
      const rzp = new window.Razorpay(options);
      rzp.open();
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollWrap}>
        <View style={styles.card}>
          <Text style={styles.heading}>
            {items.length === 1 ? 'Complete your purchase' : `Checkout — ${items.length} books`}
          </Text>

          {/* Item list */}
          {items.map((b) => (
            <View key={b.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>{b.title}</Text>
                {b.author ? <Text style={styles.itemAuthor} numberOfLines={1}>by {b.author}</Text> : null}
              </View>
              <Text style={styles.itemPrice}>₹{b.price ?? 0}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.priceValue}>₹{total}</Text>
          </View>
          <Text style={styles.accessNote}>✓ Access for 1 year from purchase date</Text>
          <Text style={styles.accessNote}>✓ Read on any device</Text>
          <Text style={styles.accessNote}>✓ Instant access after payment</Text>

          <TouchableOpacity
            style={[styles.buyBtn, loading && styles.buyBtnDisabled]}
            onPress={handleBuy}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buyBtnText}>Buy {items.length > 1 ? `${items.length} books` : ''} for ₹{total}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={styles.backLinkText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollWrap: { justifyContent: 'center', padding: 24, flexGrow: 1 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, maxWidth: 480, width: '100%', alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: '#16213e' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#16213e' },
  itemAuthor: { fontSize: 12, color: '#666', marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#2563eb', marginLeft: 12 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  priceLabel: { fontSize: 16, color: '#666' },
  priceValue: { fontSize: 28, fontWeight: '700', color: '#2563eb' },
  accessNote: { fontSize: 13, color: '#16a34a', marginBottom: 4 },
  buyBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 20 },
  buyBtnDisabled: { backgroundColor: '#93c5fd' },
  buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backLink: { marginTop: 16, alignItems: 'center' },
  backLinkText: { color: '#666' },
});
