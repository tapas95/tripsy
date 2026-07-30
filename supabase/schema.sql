-- =========================================================
-- Tripsy — Database Schema
-- Run this once in Supabase SQL Editor (Database > SQL Editor > New query)
-- =========================================================

-- ---------------------------------------------------------
-- 1. PROFILES
-- Supabase Auth already creates a row in auth.users when someone
-- signs up. We don't touch that table directly — instead we keep
-- a "profiles" table with the app-specific fields (name, avatar,
-- default currency), linked 1-to-1 with auth.users.
-- ---------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  default_currency text not null default 'USD',
  created_at timestamptz not null default now()
);

-- Automatically create a profile row whenever someone signs up.
-- This trigger runs on Supabase's side, not in your app code.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'New User'), new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ---------------------------------------------------------
-- 2. TRIPS
-- ---------------------------------------------------------

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  currency text not null default 'USD',
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------
-- 3. TRIP MEMBERS
-- Who belongs to which trip, and their role.
-- ---------------------------------------------------------

create table public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);


-- ---------------------------------------------------------
-- 4. EXPENSES
-- ---------------------------------------------------------

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null default 'other',
  date date not null default current_date,
  note text,
  paid_by_user_id uuid not null references public.profiles(id),
  receipt_url text,
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------
-- 5. EXPENSE SPLITS
-- One row per person who owes a portion of an expense.
-- ---------------------------------------------------------

create table public.expense_splits (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  share_amount numeric(12, 2) not null check (share_amount >= 0),
  primary key (expense_id, user_id)
);


-- ---------------------------------------------------------
-- 6. SETTLEMENTS
-- ---------------------------------------------------------

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id),
  to_user_id uuid not null references public.profiles(id),
  amount numeric(12, 2) not null check (amount > 0),
  settled_at timestamptz not null default now()
);


-- =========================================================
-- ROW LEVEL SECURITY (RLS)
-- Without this, anyone with your publishable key could read
-- or write ANY row in ANY table. RLS makes every query check
-- "is this person actually allowed to see/touch this row?"
-- =========================================================

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

-- Helper function: "is the current logged-in user a member of this trip?"
-- We use a function (security definer) instead of writing this check
-- inline everywhere, because trip_members referencing itself in its
-- own policy would cause infinite recursion.
create function public.is_trip_member(check_trip_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = check_trip_id
    and user_id = auth.uid()
  );
$$ language sql security definer stable;


-- --- profiles policies ---
-- Anyone logged in can see basic profile info (needed to show member names).
create policy "profiles are viewable by any logged in user"
  on public.profiles for select
  using (auth.uid() is not null);

-- You can only edit your own profile.
create policy "users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- --- trips policies ---
create policy "members can view their trips"
  on public.trips for select
  using (public.is_trip_member(id));

create policy "any logged in user can create a trip"
  on public.trips for insert
  with check (auth.uid() = created_by);

create policy "trip owner can update trip"
  on public.trips for update
  using (auth.uid() = created_by);

create policy "trip owner can delete trip"
  on public.trips for delete
  using (auth.uid() = created_by);


-- --- trip_members policies ---
create policy "members can view other members of their trips"
  on public.trip_members for select
  using (public.is_trip_member(trip_id));

-- Lets a user add themselves to a trip (joining via invite code).
create policy "users can join a trip"
  on public.trip_members for insert
  with check (auth.uid() = user_id);

create policy "users can leave a trip"
  on public.trip_members for delete
  using (auth.uid() = user_id);


-- --- expenses policies ---
create policy "members can view trip expenses"
  on public.expenses for select
  using (public.is_trip_member(trip_id));

create policy "members can add expenses"
  on public.expenses for insert
  with check (public.is_trip_member(trip_id));

create policy "members can update expenses"
  on public.expenses for update
  using (public.is_trip_member(trip_id));

create policy "members can delete expenses"
  on public.expenses for delete
  using (public.is_trip_member(trip_id));


-- --- expense_splits policies ---
create policy "members can view splits"
  on public.expense_splits for select
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
      and public.is_trip_member(expenses.trip_id)
    )
  );

create policy "members can manage splits"
  on public.expense_splits for insert
  with check (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
      and public.is_trip_member(expenses.trip_id)
    )
  );

create policy "members can update splits"
  on public.expense_splits for update
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
      and public.is_trip_member(expenses.trip_id)
    )
  );

create policy "members can delete splits"
  on public.expense_splits for delete
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_splits.expense_id
      and public.is_trip_member(expenses.trip_id)
    )
  );


-- --- settlements policies ---
create policy "members can view settlements"
  on public.settlements for select
  using (public.is_trip_member(trip_id));

create policy "members can record settlements"
  on public.settlements for insert
  with check (public.is_trip_member(trip_id));