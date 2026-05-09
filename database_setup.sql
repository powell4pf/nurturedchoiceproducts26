-- ============================================================
-- NURTUREDCHOICE PRODUCTS — SUPABASE DATABASE SETUP
-- Run this entire script in: Supabase → SQL Editor → New Query
-- ============================================================


-- ① CUSTOMERS TABLE
create table if not exists customers (
  id          text primary key default 'C' || extract(epoch from now())::bigint::text,
  name        text not null,
  phone       text,
  email       text,
  address     text,
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz
);

-- ② ORDERS TABLE
create table if not exists orders (
  id             text primary key,
  customer_id    text references customers(id),
  items          jsonb not null default '[]',
  subtotal       numeric(12,2) default 0,
  vat            numeric(12,2) default 0,
  total          numeric(12,2) not null,
  notes          text,
  status         text default 'pending',
  payment_status text default 'unpaid',
  amount_paid    numeric(12,2) default 0,
  created_by     uuid references auth.users(id),
  created_at     timestamptz default now(),
  updated_at     timestamptz
);

-- ③ PAYMENTS TABLE
create table if not exists payments (
  id          text primary key,
  order_id    text references orders(id),
  amount      numeric(12,2) not null,
  method      text default 'Cash',
  reference   text,
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- ④ CREDIT NOTES TABLE
create table if not exists credit_notes (
  id          text primary key,
  order_id    text references orders(id),
  amount      numeric(12,2) not null,
  reason      text not null,
  notes       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- ⑤ STOCK TABLE
create table if not exists stock (
  product_id  text primary key,
  qty         integer not null default 50,
  updated_at  timestamptz default now()
);

-- ⑥ Seed default stock (50 units per product)
insert into stock (product_id, qty) values
  ('H100',   50), ('H200',   50), ('H300',   50), ('H500',   50), ('H1KG',   50),
  ('PBS150',  50), ('PBS250',  50), ('PBS400',  50), ('PBS800',  50),
  ('PBC150',  50), ('PBC250',  50), ('PBC400',  50), ('PBC800',  50),
  ('PN50',   50), ('PN100',   50), ('PN200',   50)
on conflict (product_id) do nothing;


-- ============================================================
-- ROW LEVEL SECURITY (RLS) — only logged-in staff can access
-- ============================================================

alter table customers    enable row level security;
alter table orders       enable row level security;
alter table payments     enable row level security;
alter table credit_notes enable row level security;
alter table stock        enable row level security;

-- Allow any authenticated user to read all rows
create policy "Auth users can read customers"    on customers    for select using (auth.role() = 'authenticated');
create policy "Auth users can read orders"       on orders       for select using (auth.role() = 'authenticated');
create policy "Auth users can read payments"     on payments     for select using (auth.role() = 'authenticated');
create policy "Auth users can read credit_notes" on credit_notes for select using (auth.role() = 'authenticated');
create policy "Auth users can read stock"        on stock        for select using (auth.role() = 'authenticated');

-- Allow authenticated users to insert
create policy "Auth users can insert customers"    on customers    for insert with check (auth.role() = 'authenticated');
create policy "Auth users can insert orders"       on orders       for insert with check (auth.role() = 'authenticated');
create policy "Auth users can insert payments"     on payments     for insert with check (auth.role() = 'authenticated');
create policy "Auth users can insert credit_notes" on credit_notes for insert with check (auth.role() = 'authenticated');
create policy "Auth users can upsert stock"        on stock        for insert with check (auth.role() = 'authenticated');

-- Allow authenticated users to update
create policy "Auth users can update customers"    on customers    for update using (auth.role() = 'authenticated');
create policy "Auth users can update orders"       on orders       for update using (auth.role() = 'authenticated');
create policy "Auth users can update stock"        on stock        for update using (auth.role() = 'authenticated');


-- ============================================================
-- DONE! Your database is ready.
-- Next step: Create your staff user accounts (see guide below)
-- ============================================================
