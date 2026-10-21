import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, RefreshControl, Platform, TextInput, ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { CATEGORY_FILTERS } from '../lib/categories';

export default function HomeScreen({ navigation }) {
  const { signOut, hasActiveSubscription, hasPurchasedBook, purchases, profile } = useAuth();
  const { addToCart, inCart, count: cartCount } = useCart();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'library'

  const loadBooks = useCallback(async () => {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, author, description, cover_url, content_type, file_url, is_free, price, currency, category')
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

  // Filter for the current tab
  const filteredBooks = books.filter(b => {
    // Search filter
    const matchesSearch = b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.author && b.author.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    // Category filter (applies to Home and My Library alike)
    if (category !== 'All' && (b.category || '') !== category) return false;
    // Tab filter
    if (activeTab === 'library') {
      return b.is_free || hasPurchasedBook(b.id) || hasActiveSubscription();
    }
    return true; // home tab: show all
  });

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cecil Publisher</Text>
        <View style={styles.headerRight}>
          {profile?.is_admin ? (
            <TouchableOpacity onPress={() => navigation.navigate('Admin')}>
              <Text style={styles.adminLink}>⚙ Admin</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
            <View style={styles.cartWrap}>
              <Text style={styles.cartIcon}>🛒</Text>
              {cartCount > 0 ? (
                <View style={styles.cartBadge}><Text style={styles.cartBadgeTxt}>{cartCount}</Text></View>
              ) : null}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut}>
            <Text style={styles.signOut}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'home' && styles.tabActive]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'library' && styles.tabActive]}
          onPress={() => setActiveTab('library')}
        >
          <Text style={[styles.tabText, activeTab === 'library' && styles.tabTextActive]}>My Library</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Search books or author..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearButtonMode="while-editing"
      />

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
      >
        {CATEGORY_FILTERS.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, category === cat && styles.chipOn]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.chipTxt, category === cat && styles.chipTxtOn]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Book grid */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        numColumns={6}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadBooks(); }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {searchQuery
              ? `No books found for "${searchQuery}"`
              : activeTab === 'library'
                ? 'Your library is empty. Tap a book on the Home tab to start reading.'
                : 'No books yet.'}
          </Text>
        }
        renderItem={({ item }) => {
          const purchase = purchases?.find(p => p.book_id === item.id);
          const expiry = purchase
            ? new Date(purchase.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : '';
          const canRead = item.is_free || hasActiveSubscription() || hasPurchasedBook(item.id);

          const owned = hasPurchasedBook(item.id);
          const inCartAlready = inCart(item.id);
          return (
            <View style={styles.card}>
              {/* Cover + details are the tap target for opening the book */}
              <TouchableOpacity activeOpacity={0.85} onPress={() => openBook(item)}>
                {item.cover_url ? (
                  <Image source={{ uri: item.cover_url }} style={styles.cover} resizeMode="cover" />
                ) : (
                  <View style={[styles.cover, styles.coverPlaceholder]}>
                    <Text style={styles.coverPlaceholderText}>📖</Text>
                  </View>
                )}

                {item.is_free ? (
                  <View style={[styles.badge, styles.freeBadge]}>
                    <Text style={styles.badgeText}>FREE</Text>
                  </View>
                ) : owned ? (
                  <View style={[styles.badge, styles.ownedBadge]}>
                    <Text style={styles.badgeText}>OWNED</Text>
                  </View>
                ) : null}

                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                {!!item.author && (
                  <Text style={styles.bookAuthor} numberOfLines={1}>{item.author}</Text>
                )}

                <View style={styles.metaRow}>
                  <Text style={styles.metaType}>{(item.content_type || 'epub').toUpperCase()}</Text>
                  {item.is_free
                    ? <Text style={styles.metaFree}>Free</Text>
                    : <Text style={styles.priceText}>₹{item.price ?? 0}</Text>}
                </View>
                {owned && <Text style={styles.expiryText}>Valid till {expiry}</Text>}
              </TouchableOpacity>

              {/* One tidy pill per card: same height, left aligned, sized to
                  its label — never a button running the width of the card. */}
              {!item.is_free && !owned ? (
                inCartAlready ? (
                  <View style={[styles.ctaBase, styles.inCartPill]}>
                    <Text style={styles.inCartPillTxt} numberOfLines={1}>✓ Added</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.ctaBase, styles.addCartPill]}
                    onPress={() => addToCart(item)}
                    accessibilityLabel={`Add ${item.title} to cart`}
                  >
                    <Text style={styles.addCartPillTxt} numberOfLines={1}>+ Add</Text>
                  </TouchableOpacity>
                )
              ) : (
                <TouchableOpacity
                  style={[styles.ctaBase, styles.readPill]}
                  onPress={() => openBook(item)}
                >
                  <Text style={styles.readPillTxt} numberOfLines={1}>Read →</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, marginBottom: 8,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#16213e' },
  signOut: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  adminLink: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
  cartWrap: { position: 'relative' },
  cartIcon: { fontSize: 20 },
  cartBadge: { position: 'absolute', top: -6, right: -10, backgroundColor: '#ef4444', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cartBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row', marginHorizontal: 12, marginBottom: 8,
    backgroundColor: '#e2e8f0', borderRadius: 10, padding: 4,
  },
  tab: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8,
  },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#16213e' },
  searchInput: {
    marginHorizontal: 12, marginBottom: 8, padding: 10,
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, fontSize: 15,
    backgroundColor: '#fff',
  },
  list: { paddingHorizontal: 12, paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15, paddingHorizontal: 20 },
  // Six across: ~15.4% each — 70% of the previous four-across card
  card: { width: '15.4%', marginBottom: 14 },
  // Fixed aspect ratio so every cover is the same shape, in Home and in Library
  cover: { width: '100%', aspectRatio: 0.68, borderRadius: 5, backgroundColor: '#e5e7eb' },
  coverPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  coverPlaceholderText: { fontSize: 16 },
  badge: { position: 'absolute', top: 3, left: 3, borderRadius: 3, paddingHorizontal: 3, paddingVertical: 1 },
  freeBadge: { backgroundColor: 'rgba(22, 163, 74, 0.92)' },
  ownedBadge: { backgroundColor: 'rgba(37, 99, 235, 0.92)' },
  badgeText: { fontSize: 7, color: '#fff', fontWeight: '800', letterSpacing: 0.2 },
  bookTitle: { fontWeight: '700', marginTop: 4, fontSize: 9.5, color: '#16213e', lineHeight: 12 },
  bookAuthor: { color: '#6b7280', fontSize: 8.5, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  metaType: { color: '#9ca3af', fontSize: 7.5, fontWeight: '700', letterSpacing: 0.2 },
  priceText: { color: '#16213e', fontSize: 9.5, fontWeight: '800' },
  metaFree: { color: '#16a34a', fontSize: 8.5, fontWeight: '700' },
  expiryText: { color: '#16a34a', fontSize: 7.5, marginTop: 2 },
  // Category filter chips
  chipScroll: { flexGrow: 0, marginBottom: 8 },
  chipRow: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: '#16213e', borderColor: '#16213e' },
  chipTxt: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  chipTxtOn: { color: '#fff' },
  // CTAs: one tidy pill per card, always the same height and left aligned.
  // Sized to its label so it never runs the width of the card.
  ctaBase: { marginTop: 5, alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, minHeight: 18, justifyContent: 'center' },
  addCartPill: { backgroundColor: '#f59e0b' },
  addCartPillTxt: { color: '#1a202c', fontSize: 8.5, fontWeight: '800' },
  inCartPill: { backgroundColor: '#e5e7eb' },
  inCartPillTxt: { color: '#4b5563', fontSize: 8.5, fontWeight: '700' },
  readPill: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#2563eb' },
  readPillTxt: { color: '#2563eb', fontSize: 8.5, fontWeight: '700' },
});
