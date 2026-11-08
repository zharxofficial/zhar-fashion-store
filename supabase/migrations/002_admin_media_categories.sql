-- Run AFTER schema.sql (Supabase > SQL Editor). Safe to re-run.
-- Adds: categories, product colours/availability, payment status, Storage bucket + admin-only policies, role-change guard.

-- ---------- helper used by policies ----------
create or replace function public.is_admin() returns boolean language sql security definer stable set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;
grant execute on function public.is_admin() to authenticated;

-- ---------- only the owner (SQL editor / service role) can ever change a role ----------
create or replace function public.guard_role_change() returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'Role changes are not allowed from the website';
  end if;
  return new;
end $$;
drop trigger if exists guard_role on public.profiles;
create trigger guard_role before update on public.profiles for each row execute function public.guard_role_change();

-- ---------- categories (owner-editable) ----------
create table if not exists public.categories (
  id text primary key default gen_random_uuid()::text,
  name text not null unique check (char_length(name) between 1 and 60),
  sort int not null default 0, created_at timestamptz not null default now()
);
alter table public.categories enable row level security;     -- no policies: server-only
insert into public.categories(name, sort) values ('T-Shirts',1),('Hoodies',2),('Jackets',3),('Perfumes',4),('Watches',5),('Shoes',6),('Accessories',7)
  on conflict (name) do nothing;
alter table public.products drop constraint if exists products_category_check;   -- categories are now data, not a fixed list

-- ---------- products: colours + availability ----------
alter table public.products add column if not exists colors text[] not null default '{}';
alter table public.products add column if not exists is_available boolean not null default true;

-- ---------- orders: payment verification workflow ----------
alter table public.orders add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid','pending_verification','paid','failed','refunded'));
update public.orders set payment_status = 'pending_verification' where payment_method in ('jazzcash','easypaisa') and payment_status = 'unpaid' and status = 'Pending';

create or replace function public.place_order(p_user uuid, p_customer jsonb, p_items jsonb, p_method text, p_details jsonb)
returns public.orders language plpgsql security definer set search_path = public as $$
declare it jsonb; pr public.products; q int; sub numeric := 0; ship numeric; lines jsonb := '[]'::jsonb; ord public.orders;
begin
  for it in select t.value from jsonb_array_elements(p_items) t(value) order by t.value->>'productId' loop
    q := (it->>'quantity')::int;
    if q is null or q < 1 or q > 10 then raise exception 'BAD_QTY: invalid quantity'; end if;
    select * into pr from public.products where id = it->>'productId' for update;
    if not found or not pr.is_available then raise exception 'NOT_FOUND: a product in your bag is no longer available'; end if;
    if pr.stock < q then raise exception 'STOCK: only % unit(s) of "%" remaining', pr.stock, pr.name; end if;
    update public.products set stock = stock - q where id = pr.id;
    sub := sub + pr.price * q;
    lines := lines || jsonb_build_object('productId', pr.id, 'productName', pr.name, 'productImage', coalesce(pr.images[1], ''),
      'price', pr.price, 'size', coalesce(nullif(left(it->>'size',60), ''), 'Standard'), 'quantity', q);
  end loop;
  ship := case when sub >= 25000 then 0 else 1500 end;
  insert into public.orders(order_number, user_id, customer, items, subtotal, shipping, total, payment_method, payment_details, payment_status, status_history)
  values ('ZHR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)), p_user, p_customer, lines, sub, ship, sub + ship, p_method, p_details,
    case when p_method = 'cod' then 'unpaid' else 'pending_verification' end,
    jsonb_build_array(jsonb_build_object('status','Pending','timestamp',now(),'note','Order received with ' || upper(p_method) || ' payment method.')))
  returning * into ord;
  return ord;
end $$;
revoke all on function public.place_order(uuid,jsonb,jsonb,text,jsonb) from public, anon, authenticated;
grant execute on function public.place_order(uuid,jsonb,jsonb,text,jsonb) to service_role;

-- ---------- Storage: one public-read bucket; only admins may write ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-media', 'store-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm'])
on conflict (id) do update set public = true, file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm'];

drop policy if exists "store-media public read" on storage.objects;
drop policy if exists "store-media admin insert" on storage.objects;
drop policy if exists "store-media admin update" on storage.objects;
drop policy if exists "store-media admin delete" on storage.objects;
create policy "store-media public read"  on storage.objects for select using (bucket_id = 'store-media');
create policy "store-media admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'store-media' and public.is_admin());
create policy "store-media admin update" on storage.objects for update to authenticated using (bucket_id = 'store-media' and public.is_admin());
create policy "store-media admin delete" on storage.objects for delete to authenticated using (bucket_id = 'store-media' and public.is_admin());
