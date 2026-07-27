# BookReader App (Web-first, mobile-ready)

A book subscription reading app built with **Expo + React Native Web**, so the
same code runs on web today and ports to iOS/Android later with minimal changes.

## Stack
- **Frontend:** Expo (React Native + react-native-web)
- **Backend:** Supabase (Postgres + Auth + Storage)
- **Payments:** Razorpay, via your website only (not inside the mobile app —
  see "Why no in-app purchase" below)

## Project structure
```
App.js                      Entry point
src/
  contexts/AuthContext.js   Login state + subscription status (the "entitlement gate")
  lib/supabase.js           Supabase client setup
  navigation/RootNavigator.js  Switches between login and app screens
  screens/
    LoginScreen.js          Email/password login + signup
    LibraryScreen.js        Book grid, shows lock icon on paid books if not subscribed
    ReaderScreen.js         Renders EPUB (epub.js) or scanned page images
    SubscribeScreen.js      Links out to your website checkout
supabase/
  schema.sql                Run this in Supabase SQL editor to set up your DB
```

## Setup steps

### 1. Install dependencies
You need Node.js installed locally, then:
```bash
npm install
```

### 2. Create your Supabase project
1. Go to supabase.com and create a free account + new project.
2. In the SQL Editor, paste and run the contents of `supabase/schema.sql`.
3. Go to Settings > API and copy your Project URL and anon public key.

### 3. Set environment variables
```bash
cp .env.example .env
```
Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`.

### 4. Add some books to test with
In Supabase Table Editor, add a row to `books` manually to start, e.g.:
- title: "Sample Book"
- content_type: "epub"
- file_url: (upload an .epub to Supabase Storage, make the bucket public for now, paste the URL here)
- is_free: true

### 5. Run it
```bash
npm run web
```
This opens the app in your browser. Sign up a test user, and you should see
the library screen.

## Why no in-app purchase (the "reader app" pattern)
Apple requires apps to use Apple's In-App Purchase system for digital
subscriptions purchased *inside* the app — except for "reader apps" (books,
magazines, audio, video), which are allowed to let users sign in to an
account created on an external website, without using IAP at all.

So in this app: `SubscribeScreen.js` never shows a payment form. It only
links out to your website, where Razorpay handles the actual transaction.
Your backend listens for Razorpay webhooks and updates the `subscriptions`
table in Supabase. The app just reads that table to decide whether to show
locked or unlocked content. This avoids needing any special Apple entitlement
for the web-only launch, and keeps you compliant when you do wrap this for iOS later.

## What's stubbed out / what to build next
- **Razorpay webhook handler**: a small backend endpoint (Node/Express or a
  Supabase Edge Function) that receives Razorpay's subscription events and
  writes to the `subscriptions` table using the Supabase **service_role**
  key (never expose that key in the app).
- **Signed URLs for paid content**: right now `file_url` / `image_url` are
  treated as public. Before real paid launch, switch the Storage bucket to
  private and generate short-lived signed URLs server-side so paid book
  files can't be freely shared.
- **Admin upload flow**: currently you add books via the Supabase dashboard
  manually. Worth building a simple admin screen once you have more than a
  handful of books.
