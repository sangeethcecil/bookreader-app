import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function LibraryScreen({ navigation }) {
  const { signOut, hasActiveSubscription, profile } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBooks = useCallback(async () => {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, cover_url, content_type, is_free')
      .order('created_at', { ascending: false });

    if (!error) setBooks(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  function openBook(book) {
    const locked = !book.is_free && !hasActiveSubscription();
    if (locked) {
      navigation.navigate('Subscribe');
    } else {
      navigation.navigate('Reader', { bookId: book.id, contentType: book.content_type });
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Library</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {!hasActiveSubscription() && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => navigation.navigate('Subscribe')}
        >
          <Text style={styles.bannerText}>
            Subscribe to unlock the full library →
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadBooks();
            }}
          />
        }
        renderItem={({ item }) => {
          const locked = !item.is_free && !hasActiveSubscription();
          return (
            <TouchableOpacity style={styles.card} onPress={() => openBook(item)}>
              {item.cover_url ? (
                <Image source={{ uri: item.cover_url }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverPlaceholder]} />
              )}
              {locked && (
                <View style={styles.lockBadge}>
                  <Text style={styles.lockText}>🔒</Text>
                </View>
              )}
              <Text style={styles.bookTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {item.author}
              </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  signOut: { color: '#ef4444' },
  banner: {
    backgroundColor: '#2563eb',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  bannerText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  list: { paddingHorizontal: 12 },
  card: { flex: 1, margin: 6, maxWidth: '47%' },
  cover: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#eee' },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  lockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockText: { color: '#fff' },
  bookTitle: { fontWeight: '600', marginTop: 6 },
  bookAuthor: { color: '#666', fontSize: 12 },
});
