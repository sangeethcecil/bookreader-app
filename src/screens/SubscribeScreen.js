import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

// Reader-app pattern: no payment UI lives inside the app.
// We link out to the website, where Razorpay handles the actual checkout.
// The app re-checks subscription status on return (via refreshProfile).
const CHECKOUT_URL = 'https://yourwebsite.com/subscribe';

export default function SubscribeScreen() {
  const { refreshProfile } = useAuth();

  function openCheckout() {
    Linking.openURL(CHECKOUT_URL);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unlock the full library</Text>
      <Text style={styles.subtitle}>
        Subscribe on our website to read every book, on any device.
      </Text>

      <TouchableOpacity style={styles.button} onPress={openCheckout}>
        <Text style={styles.buttonText}>Continue to subscribe</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.refreshLink} onPress={refreshProfile}>
        <Text style={styles.refreshText}>
          Already subscribed? Tap to refresh your status
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#2563eb', borderRadius: 8, padding: 14, paddingHorizontal: 24 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  refreshLink: { marginTop: 20 },
  refreshText: { color: '#2563eb' },
});
