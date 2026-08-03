import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, RefreshControl, Platform, TextInput,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function LibraryScreen({ navigation }) {
  const { signOut, hasActiveSubscription, hasPurchasedBook, purchases } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadBooks = useCallback(async () => {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, cover_url, content_type, is_free, price, currency')
      .order('created_at', { ascending: false });
    if (!error) setBooks(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  function openBook(book) {
    if (book.is_free || hasActiveSubscription() || hasPurchasedBook(book.id)) {
      navigation.navigate('Reader', { bookId: book.id, contentType: book.content_type });
    } else {
      navigation.navigate('Checkout', { book });
    }
  }

  const filteredBooks = books.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Search books or author..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearButtonMode="while-editing"
      />

      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadBooks(); }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {searchQuery ? `No books found for "${searchQuery}"` : 'No books yet.'}
          </Text>
        }
        renderItem={({ item }) => {
          const purchase = purchases?.find(p => p.book_id === item.id);
          const expiry = purchase
            ? new Date(purchase.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '';

          return (
            <TouchableOpacity style={styles.card} onPress={() => openBook(item)}>
              {item.cover_url ? (
                <Image source={{ uri: item.cover_url }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Text style={styles.coverPlaceholderText}>📖</Text>
                </View>
              )}

              {/* Free badge */}
              {item.is_free && (
                <View style={[styles.badge, styles.freeBadge]}>
                  {Platform.OS === 'web' ? (
                    <div title="Free - Open access" style={{ cursor: 'default' }}>
                      <Text style={styles.badgeText}>Free</Text>
                    </div>
                  ) : <Text style={styles.badgeText}>Free</Text>}
                </View>
              )}

              {/* Locked badge */}
              {!item.is_free && !hasActiveSubscription() && !hasPurchasedBook(item.id) && (
                <View style={[styles.badge, styles.lockedBadge]}>
                  {Platform.OS === 'web' ? (
                    <div title={`Purchase for ₹${item.price ?? 0}`} style={{ cursor: 'default' }}>
                      <Text style={styles.badgeText}>🔒</Text>
                    </div>
                  ) : <Text style={styles.badgeText}>🔒</Text>}
                </View>
              )}

              {/* Purchased badge */}
              {!item.is_free && hasPurchasedBook(item.id) && (
                <View style={[styles.badge, styles.purchasedBadge]}>
                  {Platform.OS === 'web' ? (
                    <div title={`Purchased · Valid till ${expiry}`} style={{ cursor: 'default' }}>
                      <Text style={styles.badgeText}>🔓</Text>
                    </div>
                  ) : <Text style={styles.badgeText}>🔓</Text>}
                </View>
              )}

              <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
              {!item.is_free && !hasPurchasedBook(item.id) && (
                <Text style={styles.priceText}>₹{item.price ?? 0}</Text>
              )}
              {hasPurchasedBook(item.id) && (
                <Text style={styles.expiryText}>Valid till {expiry}</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, marginBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  signOut: { color: '#ef4444' },
  searchInput: {
    marginHorizontal: 12, marginBottom: 8, padding: 10,
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, fontSize: 15,
    backgroundColor: '#f8f8f8',
  },
  list: { paddingHorizontal: 12 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  card: { flex: 1, margin: 6, maxWidth: '47%', position: 'relative' },
  cover: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#eee' },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  coverPlaceholderText: { fontSize: 40 },
  badge: {
    position: 'absolute', top: 8, right: 8,
    borderRadius: 12, width: 30, height: 30,
    justifyContent: 'center', alignItems: 'center',
  },
  freeBadge: { backgroundColor: 'rgba(22, 163, 74, 0.85)', width: 'auto', paddingHorizontal: 6, borderRadius: 6 },
  lockedBadge: { backgroundColor: 'rgba(0,0,0,0.6)' },
  purchasedBadge: { backgroundColor: 'rgba(165, 200, 178, 0.85)' },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  bookTitle: { fontWeight: '600', marginTop: 6, fontSize: 13 },
  bookAuthor: { color: '#666', fontSize: 11, marginTop: 2 },
  priceText: { color: '#2563eb', fontSize: 12, fontWeight: '600', marginTop: 2 },
  expiryText: { color: '#16a34a', fontSize: 10, marginTop: 2 },
});