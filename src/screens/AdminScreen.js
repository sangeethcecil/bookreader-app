import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, TextInput, Platform, Image,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CATEGORIES, CATEGORY_FILTERS, DEFAULT_CATEGORY } from '../lib/categories';

const TABS = ['Books', 'Users', 'Add Book'];

const EMPTY_FORM = {
  title: '', author: '', description: '',
  content_type: 'epub', is_free: false, file_url: '', cover_url: '',
  status: 'published', price: 0, currency: 'INR', preview_pages: 10,
  category: DEFAULT_CATEGORY,
};

export default function AdminScreen({ navigation }) {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('Books');
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ books: 0, users: 0, subscribers: 0 });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [urlCheck, setUrlCheck] = useState(null);
  const [bookFilter, setBookFilter] = useState('All');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [booksRes, usersRes, subsRes] = await Promise.all([
      supabase.from('books').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').eq('status', 'active'),
    ]);
    setBooks(booksRes.data ?? []);
    setUsers(usersRes.data ?? []);
    setStats({
      books: booksRes.data?.length ?? 0,
      users: usersRes.data?.length ?? 0,
      subscribers: subsRes.data?.length ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function startEdit(book) {
    setForm({
      title: book.title ?? '',
      author: book.author ?? '',
      description: book.description ?? '',
      content_type: book.content_type ?? 'epub',
      is_free: book.is_free ?? false,
      file_url: book.file_url ?? '',
      cover_url: book.cover_url ?? '',
      status: book.status ?? 'published',
      price: book.price ?? 0,
      currency: book.currency ?? 'INR',
      preview_pages: book.preview_pages ?? 10,
      category: book.category ?? DEFAULT_CATEGORY,
    });
    setEditingId(book.id);
    setActiveTab('Add Book');
  }

  function cancelEdit() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function deleteBook(bookId, title) {
    const confirmed = window.confirm(`Are you sure you want to delete "${title}"?`);
    if (!confirmed) return;
    const { data, error } = await supabase.from('books').delete().eq('id', bookId).select();
    if (error) window.alert('Delete Error: ' + error.message);
    else if (!data || data.length === 0) window.alert('Not deleted - no permission.');
    else { window.alert('Book deleted!'); loadData(); }
  }

  async function toggleAdminStatus(userId, currentStatus, email) {
    const confirmed = window.confirm(
      `${currentStatus ? 'Remove admin from' : 'Make admin'}: ${email}?`
    );
    if (!confirmed) return;
    const { error } = await supabase
      .from('profiles').update({ is_admin: !currentStatus }).eq('id', userId);
    if (error) window.alert('Error: ' + error.message);
    else loadData();
  }

  // Guess the content type from the file name or URL so a pasted PDF
  // isn't opened as an EPUB (a very common cause of "the URL doesn't work").
  function detectType(nameOrUrl) {
    const u = (nameOrUrl || '').split('?')[0].toLowerCase();
    if (u.endsWith('.pdf')) return 'pdf';
    if (u.endsWith('.epub')) return 'epub';
    if (u.endsWith('.zip')) return 'scanned';
    return null;
  }

  function onFileUrlChange(t) {
    const detected = detectType(t);
    setForm((f) => ({ ...f, file_url: t, ...(detected ? { content_type: detected } : {}) }));
    setUrlCheck(null);
  }

  async function testFileUrl() {
    const url = (form.file_url || '').trim();
    if (!url) { setUrlCheck(null); return; }
    setUrlCheck({ state: 'checking' });
    try {
      const res = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
      if (res.ok || res.status === 206) setUrlCheck({ state: 'ok' });
      else setUrlCheck({ state: 'bad', msg: 'HTTP ' + res.status });
    } catch (e) {
      setUrlCheck({ state: 'bad', msg: 'blocked or unreachable (CORS or wrong link)' });
    }
  }

  async function uploadFile(fieldName) {
    if (Platform.OS !== 'web') { window.alert('Upload only supported on web'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fieldName === 'cover_url' ? 'image/*' : '.epub,.pdf,.zip,image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const bucket = fieldName === 'cover_url' ? 'covers' : 'books';
      const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
      if (error) { window.alert('Upload Error: ' + error.message); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      const detected = detectType(file.name);
      setForm((f) => ({
        ...f,
        [fieldName]: urlData.publicUrl,
        ...(fieldName === 'file_url' && detected ? { content_type: detected } : {}),
      }));
      setUrlCheck(null);
      setUploading(false);
      window.alert('File uploaded successfully!');
    };
    input.click();
  }

  // Open the reader with the UNSAVED form so the book can be checked first.
  function openPreview() {
    if (!form.file_url) { window.alert('Add a book file first — upload one or paste a URL.'); return; }
    navigation.navigate('Reader', {
      bookId: null,
      contentType: form.content_type,
      preview: {
        id: 'preview',
        title: form.title || 'Untitled preview',
        author: form.author || '',
        description: form.description || '',
        content_type: form.content_type,
        file_url: form.file_url,
        cover_url: form.cover_url || null,
        is_free: form.is_free,
        price: form.price,
      },
    });
  }

  async function saveBook() {
    if (!form.title || !form.content_type) {
      window.alert('Title and content type are required.');
      return;
    }
    setSaving(true);
    let error;
    if (editingId) {
      ({ error } = await supabase.from('books').update(form).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('books').insert([form]));
    }
    setSaving(false);
    if (error) {
      window.alert('Error: ' + error.message);
    } else {
      window.alert(editingId ? 'Book updated!' : 'Book added!');
      setForm(EMPTY_FORM);
      setEditingId(null);
      loadData();
      setActiveTab('Books');
    }
  }

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Portal</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Text style={styles.storeLink}>🛍 Storefront</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut}><Text style={styles.signOut}>Sign out</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        {[['Books', stats.books], ['Users', stats.users], ['Subscribers', stats.subscribers]].map(([label, num]) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statNum}>{num}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => { setActiveTab(tab); if (tab !== 'Add Book') cancelEdit(); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'Add Book' && editingId ? 'Edit Book' : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Books Tab */}
      {activeTab === 'Books' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {CATEGORY_FILTERS.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, bookFilter === cat && styles.chipOn]}
              onPress={() => setBookFilter(cat)}
            >
              <Text style={[styles.chipTxt, bookFilter === cat && styles.chipTxtOn]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {activeTab === 'Books' && (
        <FlatList
          data={bookFilter === 'All' ? books : books.filter((b) => (b.category || '') === bookFilter)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.bookRow}>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle}>{item.title}</Text>
                <Text style={styles.bookMeta}>
                  {item.author} · {item.content_type.toUpperCase()} · {item.category || 'Uncategorised'} · {item.is_free ? 'Free' : `₹${item.price ?? 0}`} · {(item.status ?? 'draft').toUpperCase()}
                </Text>
                <Text style={item.file_url ? styles.bookUrl : styles.noFile}>
                  {item.file_url ? '✓ File uploaded' : '⚠ No file'}
                </Text>
              </View>
              <View style={styles.actionBtns}>
                <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(item)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteBook(item.id, item.title)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No books yet. Add one from the "Add Book" tab.</Text>}
        />
      )}

      {/* Users Tab */}
      {activeTab === 'Users' && (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.userRow}>
              <View style={styles.userInfo}>
                <Text style={styles.userEmail}>{item.email}</Text>
                <Text style={styles.userMeta}>
                  {item.is_admin ? '👑 Admin' : '👤 User'} · {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.adminBtn, item.is_admin && styles.adminBtnActive]}
                onPress={() => toggleAdminStatus(item.id, item.is_admin, item.email)}
              >
                <Text style={styles.adminBtnText}>{item.is_admin ? 'Remove Admin' : 'Make Admin'}</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No users yet.</Text>}
        />
      )}

      {/* Add/Edit Book Tab */}
      {activeTab === 'Add Book' && (
        <ScrollView contentContainerStyle={styles.form}>
          {editingId && (
            <View style={styles.editBanner}>
              <Text style={styles.editBannerText}>✏️ Editing book</Text>
              <TouchableOpacity onPress={cancelEdit}>
                <Text style={styles.cancelEdit}>Cancel edit</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.formLabel}>Title *</Text>
          <TextInput style={styles.input} value={form.title}
            onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="Book title" />

          <Text style={styles.formLabel}>Author</Text>
          <TextInput style={styles.input} value={form.author}
            onChangeText={(v) => setForm((f) => ({ ...f, author: v }))} placeholder="Author name" />

          <Text style={styles.formLabel}>Description</Text>
          <TextInput style={[styles.input, styles.textArea]} value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Short description" multiline numberOfLines={3} />

          <Text style={styles.formLabel}>Content Type *</Text>
          <View style={styles.toggleRow}>
            {[['epub', 'EPUB'], ['pdf', 'PDF'], ['scanned', 'Scanned Pages']].map(([type, label]) => (
              <TouchableOpacity key={type}
                style={[styles.toggleBtn, form.content_type === type && styles.toggleBtnActive]}
                onPress={() => setForm((f) => ({ ...f, content_type: type }))}>
                <Text style={[styles.toggleBtnText, form.content_type === type && styles.toggleBtnTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>Category</Text>
          <View style={styles.chipWrap}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, form.category === cat && styles.chipOn]}
                onPress={() => setForm((f) => ({ ...f, category: cat }))}
              >
                <Text style={[styles.chipTxt, form.category === cat && styles.chipTxtOn]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            value={form.category}
            onChangeText={(v) => setForm((f) => ({ ...f, category: v }))}
            placeholder="Or type a custom category"
          />

          <Text style={styles.formLabel}>Access</Text>
          <View style={styles.toggleRow}>
            {[[false, 'Paid (Subscribers only)'], [true, 'Free']].map(([isFree, label]) => (
              <TouchableOpacity key={String(isFree)}
                style={[styles.toggleBtn, form.is_free === isFree && styles.toggleBtnActive]}
                onPress={() => setForm((f) => ({ ...f, is_free: isFree }))}>
                <Text style={[styles.toggleBtnText, form.is_free === isFree && styles.toggleBtnTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>Publishing status</Text>
          <View style={styles.toggleRow}>
            {[['published', 'Published (visible)'], ['draft', 'Draft (hidden)']].map(([st, label]) => (
              <TouchableOpacity key={st}
                style={[styles.toggleBtn, form.status === st && styles.toggleBtnActive]}
                onPress={() => setForm((f) => ({ ...f, status: st }))}>
                <Text style={[styles.toggleBtnText, form.status === st && styles.toggleBtnTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!form.is_free && (
            <>
              <Text style={styles.formLabel}>Price (₹)</Text>
              <TextInput style={styles.input} keyboardType="numeric"
                value={String(form.price ?? '')}
                onChangeText={(t) => setForm((f) => ({ ...f, price: Number(t.replace(/[^0-9.]/g, '')) || 0 }))}
                placeholder="0" />

              <Text style={styles.formLabel}>Preview pages (paid books)</Text>
              <TextInput style={styles.input} keyboardType="numeric"
                value={String(form.preview_pages ?? '')}
                onChangeText={(t) => setForm((f) => ({ ...f, preview_pages: Number(t.replace(/[^0-9]/g, '')) || 0 }))}
                placeholder="10" />
            </>
          )}

          <Text style={styles.formLabel}>Book File (EPUB, PDF, etc.)</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => uploadFile('file_url')} disabled={uploading}>
            <Text style={styles.uploadBtnText}>
              {uploading ? 'Uploading...' : form.file_url ? '✓ File set — upload a different one' : 'Upload book file'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.orHint}>— or paste a direct file URL —</Text>
          <View style={styles.urlRow}>
            <TextInput
              style={[styles.input, styles.urlInput]}
              value={form.file_url}
              onChangeText={onFileUrlChange}
              placeholder="https://example.com/book.pdf"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.testBtn} onPress={testFileUrl}>
              <Text style={styles.testBtnText}>Test</Text>
            </TouchableOpacity>
          </View>
          {urlCheck ? (
            <Text style={urlCheck.state === 'ok' ? styles.checkOk : styles.checkBad}>
              {urlCheck.state === 'checking' ? 'Checking…'
                : urlCheck.state === 'ok' ? '✓ URL reachable'
                : '✗ ' + (urlCheck.msg || 'not reachable') + ' — the reader will not be able to load this'}
            </Text>
          ) : null}

          <Text style={styles.formLabel}>Cover Image</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => uploadFile('cover_url')} disabled={uploading}>
            <Text style={styles.uploadBtnText}>
              {uploading ? 'Uploading...' : form.cover_url ? '✓ Cover set — upload a different one' : 'Upload cover image'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.orHint}>— or paste an image URL —</Text>
          <TextInput
            style={styles.input}
            value={form.cover_url}
            onChangeText={(t) => setForm((f) => ({ ...f, cover_url: t }))}
            placeholder="https://example.com/cover.jpg"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {form.cover_url ? (
            <Image source={{ uri: form.cover_url }} style={styles.coverPreview} resizeMode="cover" />
          ) : null}

          <TouchableOpacity style={styles.previewBtn} onPress={openPreview}>
            <Text style={styles.previewBtnText}>👁 Preview in reader (before saving)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveBook} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> :
              <Text style={styles.saveBtnText}>{editingId ? 'Update Book' : 'Save Book'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  signOut: { color: '#ef4444' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  storeLink: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  previewBtn: { borderWidth: 2, borderColor: '#2563eb', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 18 },
  previewBtnText: { color: '#2563eb', fontWeight: '700', fontSize: 15 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: '#f0f4ff', borderRadius: 8, padding: 12, alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '700', color: '#2563eb' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#2563eb' },
  tabText: { color: '#666', fontWeight: '500' },
  activeTabText: { color: '#2563eb', fontWeight: '700' },
  list: { padding: 16 },
  bookRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  bookInfo: { flex: 1 },
  bookTitle: { fontWeight: '600', fontSize: 15 },
  bookMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  bookUrl: { color: '#16a34a', fontSize: 11, marginTop: 2 },
  noFile: { color: '#f59e0b', fontSize: 11, marginTop: 2 },
  actionBtns: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#e0f2fe', borderRadius: 6, padding: 8 },
  editBtnText: { color: '#0369a1', fontWeight: '600', fontSize: 13 },
  deleteBtn: { backgroundColor: '#fee2e2', borderRadius: 6, padding: 8 },
  deleteBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 13 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  userInfo: { flex: 1 },
  userEmail: { fontWeight: '500', fontSize: 14 },
  userMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  adminBtn: { backgroundColor: '#f0f4ff', borderRadius: 6, padding: 8 },
  adminBtnActive: { backgroundColor: '#fef3c7' },
  adminBtnText: { color: '#2563eb', fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  form: { padding: 16, paddingBottom: 40 },
  editBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef3c7', padding: 10, borderRadius: 8, marginBottom: 8 },
  editBannerText: { fontWeight: '600', color: '#92400e' },
  cancelEdit: { color: '#ef4444', fontWeight: '600' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chipScroll: { flexGrow: 0, marginBottom: 8 },
  chipRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: '#16213e', borderColor: '#16213e' },
  chipTxt: { fontSize: 12, fontWeight: '600', color: '#4b5563' },
  chipTxtOn: { color: '#fff' },
  formLabel: { fontWeight: '600', marginBottom: 6, marginTop: 14, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  toggleBtn: { flex: 1, minWidth: 80, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  toggleBtnText: { color: '#666', fontWeight: '500', textAlign: 'center' },
  toggleBtnTextActive: { color: '#fff' },
  uploadBtn: { borderWidth: 2, borderColor: '#2563eb', borderStyle: 'dashed', borderRadius: 8, padding: 14, alignItems: 'center' },
  uploadBtnText: { color: '#2563eb', fontWeight: '600' },
  uploadedUrl: { color: '#16a34a', fontSize: 11, marginTop: 4 },
  orHint: { fontSize: 12, color: '#888', marginTop: 8, marginBottom: 4, fontStyle: 'italic' },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urlInput: { flex: 1 },
  testBtn: { borderWidth: 1, borderColor: '#2563eb', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14 },
  testBtnText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  checkOk: { color: '#16a34a', fontSize: 12, marginTop: 6 },
  checkBad: { color: '#dc2626', fontSize: 12, marginTop: 6 },
  coverPreview: { width: 110, height: 155, borderRadius: 6, marginTop: 10, backgroundColor: '#eee', borderWidth: 1, borderColor: '#ddd' },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { backgroundColor: '#93c5fd' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});