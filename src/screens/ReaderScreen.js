import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

export default function ReaderScreen({ route, navigation }) {
  const { bookId, contentType } = route.params;
  const [book, setBook] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBook();
  }, [bookId]);

  async function loadBook() {
    const { data: bookData, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setBook(bookData);

    if (contentType === 'scanned') {
      const { data: pageData } = await supabase
        .from('book_pages')
        .select('page_number, image_url')
        .eq('book_id', bookId)
        .order('page_number', { ascending: true });
      setPages(pageData ?? []);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading book...</Text>
      </View>
    );
  }

  if (error || !book) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load this book.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (contentType === 'epub') {
    if (Platform.OS === 'web') {
      return (
        <View style={styles.readerContainer}>
          <iframe
            srcDoc={buildEpubViewerHtml(book.file_url)}
            style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
            title={book.title}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </View>
      );
    }
  }

  // Scanned page images
  return (
    <ScrollView contentContainerStyle={styles.pagesContainer}>
      <Text style={styles.title}>{book.title}</Text>
      {pages.map((p) => (
        <Image
          key={p.page_number}
          source={{ uri: p.image_url }}
          style={[styles.pageImage, { width: width - 24 }]}
          resizeMode="contain"
        />
      ))}
      {pages.length === 0 && <Text>No pages found for this book yet.</Text>}
    </ScrollView>
  );
}

function buildEpubViewerHtml(epubUrl) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Book Reader</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #fff; font-family: Georgia, serif; }
    #container { display: flex; flex-direction: column; height: 100vh; }
    #toolbar { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: #f8f8f8; border-bottom: 1px solid #ddd; flex-shrink: 0; }
    #toolbar button { padding: 6px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    #toolbar button:hover { background: #1d4ed8; }
    #toolbar span { font-size: 13px; color: #666; }
    #viewer { flex: 1; overflow: hidden; position: relative; }
    #loading { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; color: #666; }
    #error { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; color: #ef4444; padding: 20px; }
  </style>
</head>
<body>
  <div id="container">
    <div id="toolbar">
      <button onclick="prevPage()">← Prev</button>
      <span id="pageInfo">Loading...</span>
      <button onclick="nextPage()">Next →</button>
    </div>
    <div id="viewer">
      <div id="loading">Loading book, please wait...</div>
    </div>
  </div>

  <script>
    // Load JSZip first, then epub.js
    function loadScript(src, cb) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = cb;
      s.onerror = function() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('viewer').innerHTML = '<div id="error">Failed to load reader library. Check your internet connection.</div>';
      };
      document.head.appendChild(s);
    }

    var book, rendition;

    function initReader() {
      try {
        book = ePub("${epubUrl}", {
          openAs: 'epub',
          requestCredentials: false,
          requestHeaders: {}
        });

        rendition = book.renderTo("viewer", {
          width: "100%",
          height: "100%",
          spread: "none",
          flow: "paginated"
        });

        rendition.display().then(function() {
          document.getElementById('loading').style.display = 'none';
          updatePageInfo();
        }).catch(function(err) {
          console.error('Display error:', err);
          // Try flowing layout as fallback
          rendition = book.renderTo("viewer", {
            width: "100%",
            height: "100%",
            flow: "scrolled-doc"
          });
          rendition.display().then(function() {
            document.getElementById('loading').style.display = 'none';
            updatePageInfo();
          }).catch(function(err2) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('viewer').innerHTML = '<div id="error">Could not render this book format.<br/>Error: ' + err2.message + '</div>';
          });
        });

        book.ready.then(function() {
          return book.locations.generate(1024);
        }).then(function() {
          updatePageInfo();
        }).catch(function(e) {
          console.warn('Location generation failed (non-fatal):', e);
        });

        rendition.on('relocated', function(location) {
          updatePageInfo(location);
        });

      } catch(e) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('viewer').innerHTML = '<div id="error">Error loading book: ' + e.message + '</div>';
      }
    }

    function updatePageInfo(location) {
      var info = document.getElementById('pageInfo');
      if (location && location.start) {
        var pct = Math.round(location.start.percentage * 100);
        info.textContent = pct + '% complete';
      } else {
        info.textContent = 'Reading...';
      }
    }

    function prevPage() {
      if (rendition) rendition.prev();
    }

    function nextPage() {
      if (rendition) rendition.next();
    }

    // Keyboard navigation
    document.addEventListener('keyup', function(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevPage();
    });

    // Load libraries then init
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js', function() {
      loadScript('https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js', function() {
        initReader();
      });
    });
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#666', fontSize: 15 },
  errorText: { fontSize: 16, color: '#ef4444', marginBottom: 16 },
  backButton: { backgroundColor: '#2563eb', borderRadius: 8, padding: 12, paddingHorizontal: 24 },
  backButtonText: { color: '#fff', fontWeight: '600' },
  readerContainer: { flex: 1 },
  pagesContainer: { alignItems: 'center', padding: 12, paddingTop: 50 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  pageImage: { aspectRatio: 0.7, marginBottom: 12, backgroundColor: '#eee' },
});