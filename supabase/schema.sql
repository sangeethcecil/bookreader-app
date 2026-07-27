-- ============================================================
-- BookReader App — Supabase schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. PROFILES
-- Mirrors auth.users with app-specific fields. Auto-created on signup via trigger below.
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up
create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- 2. BOOKS
-- content_type: 'epub' (reflowable) or 'scanned' (page images)
create table books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text,
  description text,
  cover_url text,
  content_type text not null check (content_type in ('epub', 'scanned')),
  file_url text,        -- for epub: URL to the .epub file in Supabase Storage
  is_free boolean default false,  -- free books are readable without a subscription
  created_at timestamptz default now()
);

alter table books enable row level security;

-- Books metadata is public to browse (locking happens at the content level in the app)
create policy "Anyone can view book listings"
  on books for select
  using (true);


-- 3. BOOK_PAGES
-- Only used for content_type = 'scanned'. One row per page image.
create table book_pages (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references books(id) on delete cascade,
  page_number int not null,
  image_url text not null,
  unique (book_id, page_number)
);

alter table book_pages enable row level security;

create policy "Anyone can view page listings"
  on book_pages for select
  using (true);

-- NOTE: "Anyone can view" here only exposes the URL/metadata row.
-- Actual access control for paid books should be enforced by serving
-- page images via short-lived SIGNED URLs from Storage (see notes below),
-- not by making the storage bucket public.


-- 4. SUBSCRIPTIONS
-- One row per user reflecting their current plan, synced from Razorpay via webhook.
create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  razorpay_subscription_id text unique,
  plan text,                         -- e.g. 'monthly', 'yearly'
  status text not null default 'inactive', -- 'active' | 'inactive' | 'cancelled' | 'past_due'
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "Users can view own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Inserts/updates to subscriptions should ONLY happen via your backend
-- (using the Supabase service_role key after verifying a Razorpay webhook).
-- Do NOT allow clients to write to this table directly — no insert/update
-- policy is defined for regular users on purpose.


-- 5. READING_PROGRESS (optional, nice-to-have)
create table reading_progress (
  user_id uuid references profiles(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  progress_percent numeric default 0,
  last_location text, -- epub CFI string, or page number for scanned books
  updated_at timestamptz default now(),
  primary key (user_id, book_id)
);

alter table reading_progress enable row level security;

create policy "Users can view own progress"
  on reading_progress for select
  using (auth.uid() = user_id);

create policy "Users can upsert own progress"
  on reading_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on reading_progress for update
  using (auth.uid() = user_id);
