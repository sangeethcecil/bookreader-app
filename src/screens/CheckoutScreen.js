import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const RAZORPAY_KEY_ID = 'rzp_test_TL8M6EvIJ2kjyJ';

export default function CheckoutScreen({ route, navigation }) {
  const { book } = route.params;
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
async function handleBuy() {
    if (!user) { window.alert('Please log in first.'); return; }
    setLoading(true);

    try {
      const sessionData = await supabase.auth.getSession();
      const session = sessionData.data.session;
      if (!session) throw new Error('Not logged in');

      const response = await fetch(
        'https://alkmhitjxxjmmytlrsiw.supabase.co/functions/v1/create-order',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            book_id: book.id,
            amount: book.price,
            currency: book.currency ?? 'INR',
          }),
        }
      );

     const order = await response.json();
if (!order.id) throw new Error(JSON.stringify(order));

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
      description: book.title,
      order_id: order.id,
      prefill: { email: user.email },
      theme: { color: '#2563eb' },
      handler: async function (response) {
  setLoading(true);
  try {
    const sessionData = await supabase.auth.getSession();
    const session = sessionData.data.session;
    
    const verifyRes = await fetch(
      'https://alkmhitjxxjmmytlrsiw.supabase.co/functions/v1/verify-payment',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          book_id: book.id,
          amount: book.price,
        }),
      }
    );

    const result = await verifyRes.json();
    
    if (result.success) {
      await refreshProfile();
      // Small delay to let profile refresh complete
      setTimeout(() => {
        navigation.navigate('Reader', { bookId: book.id, contentType: book.content_type });
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
      // Load Razorpay script dynamically
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

  const priceDisplay = book.price
    ? `₹${book.price}`
    : 'Free';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.bookTitle}>{book.title}</Text>
        {book.author ? <Text style={styles.bookAuthor}>by {book.author}</Text> : null}
        {book.description ? <Text style={styles.bookDesc}>{book.description}</Text> : null}

        <View style={styles.divider} />

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>{priceDisplay}</Text>
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
            : <Text style={styles.buyBtnText}>Buy for {priceDisplay}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>← Back to library</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, maxWidth: 420, width: '100%', alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  bookTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  bookAuthor: { fontSize: 14, color: '#666', marginBottom: 8 },
  bookDesc: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 8 },
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