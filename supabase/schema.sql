-- ZHĀR database. Run ONCE in Supabase Dashboard > SQL Editor (paste whole file > Run).
-- Design: the browser never talks to the database directly. All reads/writes go through /api (server,
-- service-role key). RLS is ON for every table with NO policies, so the public anon key can read/write nothing.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  name text not null, slug text unique not null,
  category text not null check (category in ('T-Shirts','Hoodies','Jackets','Perfumes','Watches','Shoes','Accessories')),
  gender text not null default 'Unisex' check (gender in ('Men','Women','Unisex')),
  description text not null default '',
  price numeric not null check (price >= 0), original_price numeric check (original_price >= 0),
  is_sale boolean not null default false, is_featured boolean not null default false, is_new_arrival boolean not null default true,
  images text[] not null default '{}', sizes text[] not null default '{}',
  stock int not null default 0 check (stock >= 0),
  sku text not null default '', details text[] not null default '{}', materials text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key default gen_random_uuid()::text,
  order_number text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  customer jsonb not null, items jsonb not null,
  subtotal numeric not null, shipping numeric not null, total numeric not null,
  payment_method text not null check (payment_method in ('cod','jazzcash','easypaisa')),
  payment_details jsonb not null default '{}',
  status text not null default 'Pending' check (status in ('Pending','Confirmed','Shipped','Delivered','Cancelled')),
  status_history jsonb not null default '[]',
  tracking_number text, carrier text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_email_idx on public.orders((lower(customer->>'email')));
-- one JazzCash/Easypaisa transaction ID can only back ONE order (stops re-use of a single payment)
create unique index if not exists orders_unique_tid on public.orders(payment_method, lower(payment_details->>'transactionId'))
  where payment_method in ('jazzcash','easypaisa');

create table if not exists public.settings (id int primary key check (id = 1), data jsonb not null default '{}');

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders   enable row level security;
alter table public.settings enable row level security;
-- (intentionally no policies: only the server's service-role key can touch these tables)

-- create a profile automatically when someone signs up (role is ALWAYS 'customer' here)
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, phone)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name',''),120), left(coalesce(new.raw_user_meta_data->>'phone',''),40))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Atomic checkout: prices and stock are decided HERE, never trusted from the browser.
create or replace function public.place_order(p_user uuid, p_customer jsonb, p_items jsonb, p_method text, p_details jsonb)
returns public.orders language plpgsql security definer set search_path = public as $$
declare it jsonb; pr public.products; q int; sub numeric := 0; ship numeric; lines jsonb := '[]'::jsonb; ord public.orders;
begin
  for it in select t.value from jsonb_array_elements(p_items) t(value) order by t.value->>'productId' loop
    q := (it->>'quantity')::int;
    if q is null or q < 1 or q > 10 then raise exception 'BAD_QTY: invalid quantity'; end if;
    select * into pr from public.products where id = it->>'productId' for update;
    if not found then raise exception 'NOT_FOUND: a product in your bag is no longer available'; end if;
    if pr.stock < q then raise exception 'STOCK: only % unit(s) of "%" remaining', pr.stock, pr.name; end if;
    update public.products set stock = stock - q where id = pr.id;
    sub := sub + pr.price * q;
    lines := lines || jsonb_build_object('productId', pr.id, 'productName', pr.name, 'productImage', coalesce(pr.images[1], ''),
      'price', pr.price, 'size', coalesce(nullif(left(it->>'size',40), ''), 'Standard'), 'quantity', q);
  end loop;
  ship := case when sub >= 25000 then 0 else 1500 end;
  insert into public.orders(order_number, user_id, customer, items, subtotal, shipping, total, payment_method, payment_details, status_history)
  values ('ZHR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)), p_user, p_customer, lines, sub, ship, sub + ship, p_method, p_details,
    jsonb_build_array(jsonb_build_object('status','Pending','timestamp',now(),'note','Order received with ' || upper(p_method) || ' payment method.')))
  returning * into ord;
  return ord;
end $$;

-- Admin status change; cancelling an order puts its stock back, atomically.
create or replace function public.admin_set_status(p_id text, p_status text, p_note text, p_tracking text, p_carrier text)
returns public.orders language plpgsql security definer set search_path = public as $$
declare o public.orders; it jsonb;
begin
  if p_status not in ('Pending','Confirmed','Shipped','Delivered','Cancelled') then raise exception 'BAD_STATUS: invalid status'; end if;
  select * into o from public.orders where id = p_id for update;
  if not found then raise exception 'NOT_FOUND: order not found'; end if;
  if o.status = 'Cancelled' and p_status <> 'Cancelled' then raise exception 'BAD_STATUS: a cancelled order cannot be re-opened'; end if;
  if p_status = 'Cancelled' and o.status <> 'Cancelled' then
    for it in select t.value from jsonb_array_elements(o.items) t(value) loop
      update public.products set stock = stock + (it->>'quantity')::int where id = it->>'productId';
    end loop;
  end if;
  update public.orders set status = p_status,
    tracking_number = coalesce(p_tracking, tracking_number), carrier = coalesce(p_carrier, carrier),
    status_history = status_history || jsonb_build_array(jsonb_build_object('status', p_status, 'timestamp', now(),
      'note', coalesce(nullif(p_note,''), 'Status updated to ' || p_status || ' by ZHĀR Atelier.'))),
    updated_at = now()
  where id = p_id returning * into o;
  return o;
end $$;

revoke all on function public.place_order(uuid,jsonb,jsonb,text,jsonb) from public, anon, authenticated;
revoke all on function public.admin_set_status(text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.place_order(uuid,jsonb,jsonb,text,jsonb) to service_role;
grant execute on function public.admin_set_status(text,text,text,text,text) to service_role;

-- Store settings start EMPTY for payments: the owner enters real JazzCash/Easypaisa numbers in the admin panel.
insert into public.settings(id, data) values (1, '{}') on conflict do nothing;

-- ============ AFTER you have signed up on the live site with YOUR OWN email: make yourself the owner ============
-- (run this one line yourself in the SQL Editor, with your real email. Never put it in code or chat.)
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR-EMAIL@example.com');
