import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Alert, Platform,
} from 'react-native';
import { useCart } from '../contexts/CartContext';

export default function CartScreen({ navigation }) {
  const { items, removeFromCart, total, count } = useCart();

  function confirmRemove(book) {
    removeFromCart(book.id);
  }

  function proceedToCheckout() {
    navigation.navigate('Checkout', { items });
  }

  if (count === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={{ width: 50 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyHint}>
            Browse books on the Home tab and tap "Add to Cart" on any locked book.
          </Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.browseBtnTxt}>Browse books</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart ({count})</Text>
        <View style={{ width: 50 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.cover_url ? (
              <Image source={{ uri: item.cover_url }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Text style={{ fontSize: 22 }}>📖</Text>
              </View>
            )}
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.rowAuthor} numberOfLines={1}>{item.author}</Text>
              <Text style={styles.rowPrice}>₹{item.price ?? 0}</Text>
            </View>
            <TouchableOpacity style={styles.removeBtn} onPress={() => confirmRemove(item)}>
              <Text style={styles.removeTxt}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total ({count} {count === 1 ? 'book' : 'books'})</Text>
          <Text style={styles.totalValue}>₹{total}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={proceedToCheckout}>
          <Text style={styles.checkoutBtnTxt}>Proceed to Checkout · ₹{total}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#16213e' },
  backTxt: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#16213e', marginBottom: 6 },
  emptyHint: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 },
  browseBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  browseBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
  list: { paddingHorizontal: 12, paddingBottom: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, padding: 10, marginBottom: 8,
  },
  thumb: { width: 52, height: 72, borderRadius: 6, backgroundColor: '#eee' },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  rowInfo: { flex: 1, marginLeft: 12 },
  rowTitle: { fontWeight: '600', fontSize: 15, color: '#16213e' },
  rowAuthor: { color: '#666', fontSize: 12, marginTop: 2 },
  rowPrice: { color: '#2563eb', fontWeight: '700', fontSize: 14, marginTop: 4 },
  removeBtn: { padding: 10 },
  removeTxt: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  footer: {
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb',
    padding: 16, paddingBottom: 24,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontSize: 15, color: '#666' },
  totalValue: { fontSize: 22, fontWeight: '800', color: '#16213e' },
  checkoutBtn: { backgroundColor: '#16a34a', borderRadius: 10, padding: 16, alignItems: 'center' },
  checkoutBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
