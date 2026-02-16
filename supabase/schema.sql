create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  delivery_method text not null check (delivery_method in ('pickup', 'courier')),
  payment_method text not null check (payment_method in ('cash', 'gcash')),
  pickup_location text,
  address_line text,
  city text,
  notes text,
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  currency text not null default 'PHP',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  shirt_color text check (shirt_color in ('Black', 'White')),
  shirt_size text check (shirt_size in ('XS', 'S', 'M', 'L', 'XL', 'XXL')),
  item_type text check (item_type in ('Necklace', 'Bracelet')),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(10, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists delivery_method text,
  add column if not exists payment_method text,
  add column if not exists pickup_location text;

alter table public.orders
  alter column address_line drop not null,
  alter column city drop not null;

do $$
begin
  alter table public.orders
    add constraint orders_delivery_method_check
      check (delivery_method in ('pickup', 'courier'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.orders
    add constraint orders_payment_method_check
      check (payment_method in ('cash', 'gcash'));
exception
  when duplicate_object then null;
end $$;

alter table public.order_items
  add column if not exists shirt_color text,
  add column if not exists shirt_size text,
  add column if not exists item_type text;

alter table public.order_items
  alter column shirt_color drop not null,
  alter column shirt_size drop not null;

do $$
begin
  alter table public.order_items
    add constraint order_items_shirt_color_check
      check (shirt_color in ('Black', 'White'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.order_items
    add constraint order_items_shirt_size_check
      check (shirt_size in ('XS', 'S', 'M', 'L', 'XL', 'XXL'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.order_items
    add constraint order_items_item_type_check
      check (item_type in ('Necklace', 'Bracelet'));
exception
  when duplicate_object then null;
end $$;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin users can see own row" on public.admin_users;
create policy "admin users can see own row"
  on public.admin_users
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "allow anon insert orders" on public.orders;
create policy "allow anon insert orders"
  on public.orders
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "allow anon insert order_items" on public.order_items;
create policy "allow anon insert order_items"
  on public.order_items
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "allow service read orders" on public.orders;
drop policy if exists "allow admin read orders" on public.orders;
create policy "allow admin read orders"
  on public.orders
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users a
      where a.user_id = auth.uid()
    )
  );

drop policy if exists "allow service read order_items" on public.order_items;
drop policy if exists "allow admin read order_items" on public.order_items;
create policy "allow admin read order_items"
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users a
      where a.user_id = auth.uid()
    )
  );

-- After creating an auth user for admin, run:
-- insert into public.admin_users (user_id)
-- values ('YOUR_AUTH_USER_UUID');
