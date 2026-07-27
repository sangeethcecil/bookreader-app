import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// On web, localStorage works fine and is what Supabase expects by default.
// On native (iOS/Android later), AsyncStorage is required for session persistence.
const storage = Platform.OS === 'web' ? undefined : AsyncStorage;

const supabaseUrl = 'https://alkmhitjxxjmmytlrsiw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsa21oaXRqeHhqbW15dGxyc2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwODMxNTEsImV4cCI6MjEwMDY1OTE1MX0.Q5ZNeL4T1BT8yvkWfJ3cDPT5scw40joAhSlKuc7YIcY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars are missing. Copy .env.example to .env and fill in your project values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
