-- ============================================================
-- BookReader App — Full Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. PROFILES
-- Mirrors auth.users with app-specific fields. Auto-created on signup via trigger.
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Admins can view all profiles
drop policy if exists "Admins can view all profiles" on profiles;
create policy "Admins can view all profiles"
  on profiles for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Auto-create a profile row whenever a new auth user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- 2. BOOKS
-- content_type: 'epub' (reflowable), 'pdf' (native viewer), or 'scanned' (page images)
create table if not exists books (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  author text,
  description text,
  cover_url text,
  content_type text not null check (content_type in ('epub', 'pdf', 'scanned')),
  file_url text,                    -- URL to the book file in Supabase Storage (epub/pdf)
  price numeric default 0,          -- Price in INR (0 for free)
  currency text default 'INR',
  is_free boolean default false,   -- free books are readable without purchase
  created_at timestamptz default now()
);

alter table books enable row level security;

-- Books metadata is public to browse (locking happens at the content/app level)
drop policy if exists "Anyone can view book listings" on books;
create policy "Anyone can view book listings"
  on books for select
  using (true);

-- Only admins can insert/update/delete books
drop policy if exists "Admins can manage books" on books;
create policy "Admins can manage books"
  on books for all
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );


-- 3. BOOK_PAGES
-- Only used for content_type = 'scanned'. One row per page image.
create table if not exists book_pages (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references books(id) on delete cascade,
  page_number int not null,
  image_url text not null,
  unique (book_id, page_number)
);

alter table book_pages enable row level security;

drop policy if exists "Anyone can view page listings" on book_pages;
create policy "Anyone can view page listings"
  on book_pages for select
  using (true);

drop policy if exists "Admins can manage book pages" on book_pages;
create policy "Admins can manage book pages"
  on book_pages for all
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  )
  with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );


-- 4. PURCHASES
-- Per-book purchases. 1-year access from purchase date.
create table if not exists purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  book_id uuid references books(id) on delete cascade not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  amount numeric,
  currency text default 'INR',
  status text not null default 'pending',  -- 'pending' | 'paid' | 'failed'
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table purchases enable row level security;

-- Users can view their own purchases
drop policy if exists "Users can view own purchases" on purchases;
create policy "Users can view own purchases"
  on purchases for select
  using (auth.uid() = user_id);

-- Users can insert their own purchase records (created right after payment)
drop policy if exists "Users can insert own purchases" on purchases;
create policy "Users can insert own purchases"
  on purchases for insert
  with check (auth.uid() = user_id);

-- Users can update their own purchase records (e.g., status update after verification)
drop policy if exists "Users can update own purchases" on purchases;
create policy "Users can update own purchases"
  on purchases for update
  using (auth.uid() = user_id);

-- Admins can view all purchases
drop policy if exists "Admins can view all purchases" on purchases;
create policy "Admins can view all purchases"
  on purchases for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true)
  );


-- 5. USER_LIBRARY
-- Tracks which books a user has added to their personal library.
create table if not exists user_library (
  user_id uuid references profiles(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  added_at timestamptz default now(),
  primary key (user_id, book_id)
);

alter table user_library enable row level security;

drop policy if exists "Users can view own library" on user_library;
create policy "Users can view own library"
  on user_library for select
  using (auth.uid() = user_id);

drop policy if exists "Users can add to own library" on user_library;
create policy "Users can add to own library"
  on user_library for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove from own library" on user_library;
create policy "Users can remove from own library"
  on user_library for delete
  using (auth.uid() = user_id);


-- 6. SUBSCRIPTIONS
-- One row per user reflecting their current plan, synced from Razorpay via webhook.
create table if not exists subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  razorpay_subscription_id text unique,
  plan text,                         -- 'monthly' | 'yearly'
  status text not null default 'inactive', -- 'active' | 'inactive' | 'cancelled'
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

drop policy if exists "Users can view own subscription" on subscriptions;
create policy "Users can view own subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Inserts/updates to subscriptions should ONLY happen via your backend
-- (using the Supabase service_role key after verifying a Razorpay webhook).
-- Do NOT allow clients to write to this table directly — no insert/update
-- policy is defined for regular users on purpose.


-- 7. READING_PROGRESS
create table if not exists reading_progress (
  user_id uuid references profiles(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  progress_percent numeric default 0,
  last_location text,                -- epub CFI string, or page number for scanned/pdf
  updated_at timestamptz default now(),
  primary key (user_id, book_id)
);

alter table reading_progress enable row level security;

drop policy if exists "Users can view own progress" on reading_progress;
create policy "Users can view own progress"
  on reading_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users can upsert own progress" on reading_progress;
create policy "Users can upsert own progress"
  on reading_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own progress" on reading_progress;
create policy "Users can update own progress"
  on reading_progress for update
  using (auth.uid() = user_id);


-- ============================================================
-- HELPER: is_admin() function for use in RLS policies
-- ============================================================
create or replace function is_admin()
returns boolean as $$
begin
  return exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true);
end;
$$ language plpgsql security definer;
