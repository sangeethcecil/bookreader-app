import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, TextInput, Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const TABS = ['Books', 'Users', 'Add Book'];

const EMPTY_FORM = {
  title: '', author: '', description: '',
  content_type: 'epub', is_free: false, file_url: '', cover_url: '',
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
      setForm((f) => ({ ...f, [fieldName]: urlData.publicUrl }));
      setUploading(false);
      window.alert('File uploaded successfully!');
    };
    input.click();
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
        <TouchableOpacity onPress={signOut}><Text style={styles.signOut}>Sign out</Text></TouchableOpacity>
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
        <FlatList
          data={books}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.bookRow}>
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle}>{item.title}</Text>
                <Text style={styles.bookMeta}>
                  {item.author} · {item.content_type.toUpperCase()} · {item.is_free ? 'Free' : 'Paid'}
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

          <Text style={styles.formLabel}>Book File (EPUB, PDF, etc.)</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => uploadFile('file_url')} disabled={uploading}>
            <Text style={styles.uploadBtnText}>
              {uploading ? 'Uploading...' : form.file_url ? '✓ File uploaded — tap to replace' : 'Upload book file'}
            </Text>
          </TouchableOpacity>
          {form.file_url ? <Text style={styles.uploadedUrl} numberOfLines={1}>{form.file_url}</Text> : null}

          <Text style={styles.formLabel}>Cover Image</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={() => uploadFile('cover_url')} disabled={uploading}>
            <Text style={styles.uploadBtnText}>
              {uploading ? 'Uploading...' : form.cover_url ? '✓ Cover uploaded — tap to replace' : 'Upload cover image'}
            </Text>
          </TouchableOpacity>
          {form.cover_url ? <Text style={styles.uploadedUrl} numberOfLines={1}>{form.cover_url}</Text> : null}

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
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { backgroundColor: '#93c5fd' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});