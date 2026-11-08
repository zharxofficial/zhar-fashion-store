import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Cloudflare Worker: serves /api/* (static site files are served by Workers Assets). No Express, no Node-only code.
interface Fetcher { fetch(request: Request): Promise<Response> }
export interface Env { SUPABASE_URL: string; SUPABASE_ANON_KEY: string; SUPABASE_SERVICE_ROLE_KEY: string; APP_URL?: string; ASSETS: Fetcher }

let ENV: Env;                       // set at the start of every request
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const db = (): SupabaseClient => createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, opts);   // server-only secret
const authClient = (): SupabaseClient => createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, opts);
const BUCKET = 'store-media';

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const fail = (status: number, message: string): never => { throw new HttpError(status, message); };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

const DEFAULT_SETTINGS = {
  announcementBanner: 'Complimentary white-glove delivery on orders above PKR 25,000.', bannerEnabled: true,
  jazzcashNumber: '', jazzcashTitle: '', easypaisaNumber: '', easypaisaTitle: '',
  socialLinks: { instagram: '', twitter: '', tiktok: '', whatsapp: '' },
  homepageVideo: { enabled: true, videoUrl: '/videos/zhar_fashion_film.mp4', title: 'THE MONOCHROME MANIFESTO', subtitle: 'ÉDITION NOIR 2026 // HAUTE ATELIER', buttonText: 'Enter Atelier' },
  theme: { primaryColor: '#000000', accentColor: '#ffffff', fontStyle: 'Bodoni Moda & Cinzel' },
  currency: 'PKR', currencySymbol: 'PKR '
};

// ---------- helpers ----------
const categoryNames = async () => ((await db().from('categories').select('name')).data || []).map((c: any) => c.name as string);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
const strArr = (v: unknown, maxItems: number, maxLen: number) => (Array.isArray(v) ? v.filter(x => typeof x === 'string').map((x: string) => x.trim().slice(0, maxLen)).filter(Boolean).slice(0, maxItems) : []);
const safeUrl = (u: string) => /^https:\/\/|^\/(?!\/)/.test(u);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const digits10 = (s: string) => s.replace(/\D/g, '').slice(-10);
const bearer = (req: Request) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();

const toProduct = (r: any) => ({
  id: r.id, name: r.name, slug: r.slug, category: r.category, gender: r.gender, description: r.description,
  price: Number(r.price), originalPrice: r.original_price == null ? undefined : Number(r.original_price),
  colors: r.colors || [], isAvailable: r.is_available !== false, isSale: r.is_sale, isFeatured: r.is_featured, isNewArrival: r.is_new_arrival,
  images: r.images, sizes: r.sizes, stock: r.stock, sku: r.sku, details: r.details, materials: r.materials, createdAt: r.created_at
});
const toOrder = (r: any) => ({
  id: r.id, orderNumber: r.order_number, customer: r.customer, items: r.items, subtotal: Number(r.subtotal), shipping: Number(r.shipping),
  total: Number(r.total), paymentMethod: r.payment_method, paymentDetails: r.payment_details, paymentStatus: r.payment_status, status: r.status, statusHistory: r.status_history,
  trackingNumber: r.tracking_number ?? undefined, carrier: r.carrier ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at
});

// Validates product input. `partial` = only validate keys that were sent (edit).
function productFields(b: any, partial: boolean, cats: string[]): Record<string, unknown> {
  const row: Record<string, unknown> = {}, has = (k: string) => b && b[k] !== undefined;
  if (!partial || has('name')) { const v = str(b?.name, 160); if (!v) fail(400, 'Product name is required.'); row.name = v; }
  if (!partial || has('category')) { if (!cats.includes(b?.category)) fail(400, 'Invalid category.'); row.category = b.category; }
  if (!partial || has('price')) { const v = num(b?.price); if (!(v >= 0)) fail(400, 'Price must be a number of 0 or more.'); row.price = v; }
  if (has('gender')) { if (!['Men', 'Women', 'Unisex'].includes(b.gender)) fail(400, 'Invalid gender.'); row.gender = b.gender; } else if (!partial) row.gender = 'Unisex';
  if (has('description')) row.description = str(b.description, 4000);
  if (has('originalPrice')) { const v = b.originalPrice === null || b.originalPrice === '' ? null : num(b.originalPrice); if (v !== null && !(v >= 0)) fail(400, 'Original price is invalid.'); row.original_price = v; }
  if (has('isSale')) row.is_sale = Boolean(b.isSale);
  if (has('isFeatured')) row.is_featured = Boolean(b.isFeatured);
  if (has('isNewArrival')) row.is_new_arrival = Boolean(b.isNewArrival);
  if (has('images')) { const im = strArr(b.images, 10, 2000); if (im.some(u => !safeUrl(u))) fail(400, 'Image URLs must start with https:// or /.'); row.images = im; }
  if (has('sizes')) row.sizes = strArr(b.sizes, 20, 40);
  if (has('colors')) row.colors = strArr(b.colors, 20, 30);
  if (has('isAvailable')) row.is_available = Boolean(b.isAvailable);
  if (has('stock')) { const v = num(b.stock); if (!Number.isInteger(v) || v < 0 || v > 100000) fail(400, 'Stock must be a whole number of 0 or more.'); row.stock = v; }
  if (has('sku')) row.sku = str(b.sku, 60);
  if (has('details')) row.details = strArr(b.details, 20, 300);
  if (has('materials')) row.materials = str(b.materials, 300);
  return row;
}

// Best-effort per-isolate rate limit. For stronger protection add a Cloudflare WAF Rate Limiting rule on /api/auth/* and /api/orders/*.
const hits = new Map<string, { n: number; t: number }>();
function rateLimit(req: Request, name: string, max: number, windowMs: number) {
  const ip = req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const key = `${name}:${ip}`, now = Date.now(), h = hits.get(key);
  if (hits.size > 5000) hits.clear();
  if (!h || now - h.t > windowMs) hits.set(key, { n: 1, t: now });
  else if (++h.n > max) fail(429, 'Too many attempts. Please wait a few minutes and try again.');
}

async function userFrom(req: Request) {
  const token = bearer(req); if (!token) return null;
  const { data, error } = await db().auth.getUser(token);     // verified by Supabase, not decoded locally
  return error || !data.user ? null : data.user;
}
async function profileOf(id: string) {
  const { data } = await db().from('profiles').select('role, full_name, phone, created_at').eq('id', id).single();
  return data;
}
const userView = async (u: { id: string; email?: string | null; created_at?: string }) => {
  const p = await profileOf(u.id);
  return { id: u.id, email: u.email || '', fullName: p?.full_name || (u.email || '').split('@')[0], phone: p?.phone || undefined, role: p?.role === 'admin' ? 'admin' : 'customer', createdAt: p?.created_at || u.created_at || '' };
};
async function requireAdmin(req: Request) {
  const u = await userFrom(req); if (!u) fail(401, 'Please sign in as the owner.');
  if ((await profileOf(u!.id))?.role !== 'admin') fail(403, 'Owner access only.');
}

const getSettings = async () => {
  const { data } = await db().from('settings').select('data').eq('id', 1).single();
  const d: any = data?.data || {};
  return { ...DEFAULT_SETTINGS, ...d, socialLinks: { ...DEFAULT_SETTINGS.socialLinks, ...(d.socialLinks || {}) },
    homepageVideo: { ...DEFAULT_SETTINGS.homepageVideo, ...(d.homepageVideo || {}) }, theme: { ...DEFAULT_SETTINGS.theme, ...(d.theme || {}) } };
};
const cleanSettings = (b: any) => {
  const o: Record<string, any> = {};
  for (const k of ['announcementBanner', 'jazzcashNumber', 'jazzcashTitle', 'easypaisaNumber', 'easypaisaTitle', 'currency', 'currencySymbol']) if (typeof b?.[k] === 'string') o[k] = str(b[k], 300);
  if (b?.bannerEnabled !== undefined) o.bannerEnabled = Boolean(b.bannerEnabled);
  for (const k of ['jazzcashInstructions', 'easypaisaInstructions']) if (typeof b?.[k] === 'string') o[k] = str(b[k], 600);
  const img = (v: unknown) => { const u = str(v, 2000); return u === '' || safeUrl(u) ? u : ''; };
  if (b?.homepageBanner && typeof b.homepageBanner === 'object') o.homepageBanner = { imageUrl: img(b.homepageBanner.imageUrl), title: str(b.homepageBanner.title, 120), subtitle: str(b.homepageBanner.subtitle, 240), linkText: str(b.homepageBanner.linkText, 40) };
  if (b?.promo && typeof b.promo === 'object') o.promo = { imageUrl: img(b.promo.imageUrl), title: str(b.promo.title, 120), text: str(b.promo.text, 600) };
  if (b?.contact && typeof b.contact === 'object') o.contact = { email: str(b.contact.email, 200), phone: str(b.contact.phone, 40), address: str(b.contact.address, 300) };
  if (b?.socialLinks && typeof b.socialLinks === 'object') {
    o.socialLinks = {};
    for (const k of ['instagram', 'twitter', 'tiktok', 'whatsapp']) if (typeof b.socialLinks[k] === 'string') { const v = str(b.socialLinks[k], 200); if (k === 'whatsapp' || v === '' || /^https:\/\//.test(v)) o.socialLinks[k] = v; }
  }
  if (b?.theme && typeof b.theme === 'object') {
    o.theme = {}; const hex = /^#[0-9a-fA-F]{6}$/;
    if (hex.test(b.theme.primaryColor)) o.theme.primaryColor = b.theme.primaryColor;
    if (hex.test(b.theme.accentColor)) o.theme.accentColor = b.theme.accentColor;
    if (typeof b.theme.fontStyle === 'string') o.theme.fontStyle = str(b.theme.fontStyle, 80);
  }
  return o;
};
const saveSettings = async (patch: Record<string, any>) => {
  const cur: any = (await db().from('settings').select('data').eq('id', 1).single()).data?.data || {};
  const next = { ...cur, ...patch };
  for (const k of ['socialLinks', 'theme', 'homepageVideo', 'homepageBanner', 'promo', 'contact']) if (patch[k]) next[k] = { ...(cur[k] || {}), ...patch[k] };
  const { error } = await db().from('settings').upsert({ id: 1, data: next }); if (error) throw error;
};

const MIME: Record<string, { ext: string; max: number }> = {
  'image/jpeg': { ext: 'jpg', max: 8e6 }, 'image/png': { ext: 'png', max: 8e6 }, 'image/webp': { ext: 'webp', max: 8e6 }, 'image/avif': { ext: 'avif', max: 8e6 },
  'video/mp4': { ext: 'mp4', max: 50e6 }, 'video/webm': { ext: 'webm', max: 50e6 }
};

// ---------- routes ----------
interface Ctx { req: Request; url: URL; p: Record<string, string>; body: any }
type Handler = (c: Ctx) => Promise<Response>;
const routes: { method: string; re: RegExp; keys: string[]; h: Handler }[] = [];
const route = (method: string, path: string, h: Handler) => {
  const keys: string[] = []; const re = new RegExp('^' + path.replace(/:(\w+)/g, (_m, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, h });
};

// ===== public =====
route('GET', '/api/products', async ({ url }) => {
  const g = (k: string) => url.searchParams.get(k) || '';
  const category = g('category'), gender = g('gender'), search = g('search'), sort = g('sort');
  let q = db().from('products').select('*');
  if (category && category !== 'All') q = q.ilike('category', category.replace(/[%,()]/g, ''));
  if (gender && gender !== 'All') q = q.in('gender', [gender, 'Unisex']);
  if (g('sale') === 'true') q = q.eq('is_sale', true);
  if (g('featured') === 'true') q = q.eq('is_featured', true);
  if (g('newArrival') === 'true') q = q.eq('is_new_arrival', true);
  if (search.trim()) {
    const s = search.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').trim().slice(0, 60);
    if (s) q = q.or(`name.ilike.%${s}%,description.ilike.%${s}%,category.ilike.%${s}%,sku.ilike.%${s}%`);
  }
  q = sort === 'price-asc' ? q.order('price', { ascending: true }) : sort === 'price-desc' ? q.order('price', { ascending: false })
    : sort === 'name-asc' ? q.order('name', { ascending: true }) : q.order('created_at', { ascending: false });
  const { data, error } = await q; if (error) throw error;
  return json({ products: (data || []).map(toProduct), count: data?.length || 0 });
});
route('GET', '/api/products/:id', async ({ p }) => {
  const id = p.id.replace(/[^\w-]/g, '');
  const { data } = await db().from('products').select('*').or(`id.eq.${id},slug.eq.${id}`).limit(1);
  if (!data?.length) fail(404, 'Product not found.');
  return json(toProduct(data![0]));
});
route('GET', '/api/settings', async () => json(await getSettings()));
route('GET', '/api/categories', async () => {
  const { data, error } = await db().from('categories').select('id,name,sort').order('sort'); if (error) throw error;
  return json(data || []);
});

// Checkout: the database function decides prices and stock atomically; the browser's numbers are never trusted.
route('POST', '/api/orders', async ({ req, body: b }) => {
  rateLimit(req, 'order', 20, 10 * 60_000);
  const c = b.customer || {};
  const customer = { fullName: str(c.fullName, 120), email: str(c.email, 200).toLowerCase(), phone: str(c.phone, 40), address: str(c.address, 400),
    city: str(c.city, 80), postalCode: str(c.postalCode, 20), country: str(c.country, 80) || 'Pakistan', notes: str(c.notes, 500) };
  if (!customer.fullName || !EMAIL.test(customer.email) || digits10(customer.phone).length < 10 || !customer.address || !customer.city)
    fail(400, 'Please provide your full name, a valid email, phone number, address and city.');
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 20) fail(400, 'Your bag must contain between 1 and 20 items.');
  const items = b.items.map((i: any) => ({ productId: str(i?.productId, 80), size: str(i?.size, 60), quantity: Math.floor(Number(i?.quantity)) }));
  if (items.some((i: any) => !i.productId || !(i.quantity >= 1 && i.quantity <= 10))) fail(400, 'Invalid item or quantity.');

  const method = b.paymentMethod, pd = b.paymentDetails || {};
  if (method === 'card') fail(400, 'Card payments are not available yet. Please choose Cash on Delivery, JazzCash or Easypaisa.');
  if (!['cod', 'jazzcash', 'easypaisa'].includes(method)) fail(400, 'Please choose a payment method.');
  const details: Record<string, string> = {};
  if (method !== 'cod') {
    const s = await getSettings();
    if (!(method === 'jazzcash' ? s.jazzcashNumber : s.easypaisaNumber)) fail(400, 'This payment method is not available right now.');
    details.transactionId = str(pd.transactionId, 60); details.senderNumber = str(pd.senderNumber, 40);
    if (details.transactionId.length < 6) fail(400, 'Please enter the transaction ID shown in your payment receipt.');
  }
  if (str(pd.notes, 500)) details.notes = str(pd.notes, 500);

  const u = await userFrom(req);   // optional: link to the signed-in customer; guests may still order
  const { data, error } = await db().rpc('place_order', { p_user: u?.id ?? null, p_customer: customer, p_items: items, p_method: method, p_details: details });
  if (error) {
    if (error.code === '23505') fail(400, 'This transaction ID has already been used for another order.');
    const m = /^(STOCK|NOT_FOUND|BAD_QTY): (.*)$/.exec(error.message || ''); if (m) fail(400, m[2]);
    throw error;
  }
  return json({ success: true, order: toOrder(data), message: 'Your order has been received by ZHĀR Atelier.' }, 201);
});

// Tracking needs the order number AND the e-mail or phone used at checkout.
route('POST', '/api/orders/track', async ({ req, body }) => {
  rateLimit(req, 'track', 15, 10 * 60_000);
  const on = str(body?.orderNumber, 40).toUpperCase(), contact = str(body?.emailOrPhone, 200).toLowerCase();
  if (!on || !contact) fail(400, 'Please enter both your Order Number and Email or Phone number.');
  const { data } = await db().from('orders').select('*').eq('order_number', on).limit(1);
  const o: any = data?.[0];
  const ok = o && (String(o.customer?.email || '').toLowerCase() === contact || (digits10(contact).length >= 10 && digits10(String(o.customer?.phone || '')) === digits10(contact)));
  if (!ok) fail(404, 'No matching order found for this Order Number and contact record.');
  return json(toOrder(o));
});
route('GET', '/api/orders/mine', async ({ req }) => {
  const u = await userFrom(req); if (!u) fail(401, 'Please sign in.');
  const byUser = await db().from('orders').select('*').eq('user_id', u!.id);
  const byEmail = u!.email_confirmed_at && u!.email ? await db().from('orders').select('*').filter('customer->>email', 'eq', u!.email.toLowerCase()) : { data: [] as any[] };
  const map = new Map<string, any>(); [...(byUser.data || []), ...(byEmail.data || [])].forEach(o => map.set(o.id, o));
  return json([...map.values()].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).map(toOrder));
});

// ===== customer accounts (Supabase Auth) =====
route('POST', '/api/auth/signup', async ({ req, body }) => {
  rateLimit(req, 'signup', 10, 10 * 60_000);
  const email = str(body?.email, 200).toLowerCase(), password = typeof body?.password === 'string' ? body.password : '';
  const fullName = str(body?.fullName, 120), phone = str(body?.phone, 40);
  if (!EMAIL.test(email) || !fullName) fail(400, 'Please enter your name and a valid email.');
  if (password.length < 8 || password.length > 72) fail(400, 'Password must be 8 to 72 characters.');
  const { data, error } = await authClient().auth.signUp({ email, password, options: { data: { full_name: fullName, phone }, emailRedirectTo: ENV.APP_URL || undefined } });
  if (error) fail(400, error.message);
  if (!data.session || !data.user) return json({ needsConfirmation: true, message: 'Please check your email and confirm your address, then log in.' });
  return json({ user: await userView(data.user), token: data.session.access_token, message: 'Welcome to the ZHĀR Atelier Society.' }, 201);
});
route('POST', '/api/auth/login', async ({ req, body }) => {
  rateLimit(req, 'login', 15, 10 * 60_000);
  const email = str(body?.email, 200).toLowerCase(), password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password) fail(400, 'Please provide email and password.');
  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) fail(401, 'Invalid email or password.');
  const user = await userView(data!.user);
  return json({ user, token: data!.session!.access_token, isAdmin: user.role === 'admin' });
});
route('POST', '/api/auth/reset-password', async ({ req, body }) => {
  rateLimit(req, 'reset', 5, 10 * 60_000);
  const email = str(body?.email, 200).toLowerCase();
  if (!EMAIL.test(email)) fail(400, 'Please provide a valid account email address.');
  await authClient().auth.resetPasswordForEmail(email, { redirectTo: ENV.APP_URL || undefined });   // same reply whether or not the account exists
  return json({ success: true, message: 'If an account exists for that email, a recovery link has been sent.' });
});
route('POST', '/api/auth/logout', async ({ req }) => { const t = bearer(req); if (t) await db().auth.admin.signOut(t).catch(() => null); return json({ success: true }); });
route('GET', '/api/account', async ({ req }) => { const u = await userFrom(req); if (!u) fail(401, 'Please sign in.'); return json(await userView(u!)); });
route('PUT', '/api/account', async ({ req, body }) => {
  const u = await userFrom(req); if (!u) fail(401, 'Please sign in.');
  const fullName = str(body?.fullName, 120); if (!fullName) fail(400, 'Please enter your name.');
  const { error } = await db().from('profiles').update({ full_name: fullName, phone: str(body?.phone, 40) }).eq('id', u!.id); if (error) throw error;
  return json({ user: await userView(u!) });
});

// ===== owner-only (every /api/admin/* request is checked in the dispatcher BEFORE routing) =====
route('GET', '/api/admin/verify', async () => json({ valid: true }));
route('GET', '/api/admin/stats', async () => {
  const [o, p] = await Promise.all([db().from('orders').select('total,status'), db().from('products').select('stock')]);
  const orders = o.data || [], prods = p.data || [];
  return json({
    totalRevenue: orders.reduce((s, x) => s + (x.status !== 'Cancelled' ? Number(x.total) : 0), 0), totalOrders: orders.length,
    pendingOrders: orders.filter(x => x.status === 'Pending').length, confirmedOrders: orders.filter(x => x.status === 'Confirmed').length,
    lowStockCount: prods.filter(x => x.stock <= 5).length, totalProducts: prods.length
  });
});
route('POST', '/api/admin/products', async ({ body }) => {
  const row = productFields(body, false, await categoryNames());
  const base = String(row.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product';
  const ins = { sizes: ['S', 'M', 'L', 'XL'], stock: 10, is_new_arrival: true, images: [], ...row, slug: `${base}-${Math.random().toString(36).slice(2, 6)}`, sku: row.sku || 'ZHR-' + Math.floor(100 + Math.random() * 900) };
  const { data, error } = await db().from('products').insert(ins).select().single(); if (error) throw error;
  return json({ success: true, product: toProduct(data) }, 201);
});
route('PUT', '/api/admin/products/:id', async ({ p, body }) => {
  const row = productFields(body, true, await categoryNames());
  if (!Object.keys(row).length) fail(400, 'Nothing to update.');
  const { data, error } = await db().from('products').update(row).eq('id', p.id).select().single();
  if (error || !data) fail(404, 'Product not found.');
  return json({ success: true, product: toProduct(data) });
});
route('DELETE', '/api/admin/products/:id', async ({ p }) => {
  const { data } = await db().from('products').delete().eq('id', p.id).select().single();
  if (!data) fail(404, 'Product not found.');
  return json({ success: true, product: toProduct(data) });
});
route('GET', '/api/admin/orders', async () => {
  const { data, error } = await db().from('orders').select('*').order('created_at', { ascending: false }); if (error) throw error;
  return json((data || []).map(toOrder));
});
route('PUT', '/api/admin/orders/:id/status', async ({ p, body }) => {
  const { status, note, trackingNumber, carrier } = body || {};
  const { data, error } = await db().rpc('admin_set_status', { p_id: p.id, p_status: String(status), p_note: str(note, 500) || null,
    p_tracking: typeof trackingNumber === 'string' ? trackingNumber.trim().slice(0, 80) : null, p_carrier: typeof carrier === 'string' ? carrier.trim().slice(0, 80) : null });
  if (error) { const m = /^(BAD_STATUS|NOT_FOUND): (.*)$/.exec(error.message || ''); if (m) fail(m[1] === 'NOT_FOUND' ? 404 : 400, m[2]); throw error; }
  return json({ success: true, order: toOrder(data) });
});
route('PUT', '/api/admin/orders/:id/payment', async ({ p, body }) => {
  const ps = String(body?.paymentStatus);
  if (!['unpaid', 'pending_verification', 'paid', 'failed', 'refunded'].includes(ps)) fail(400, 'Invalid payment status.');
  const { data: o } = await db().from('orders').select('status_history').eq('id', p.id).single(); if (!o) fail(404, 'Order not found.');
  const hist = [...(o!.status_history || []), { status: 'Payment', timestamp: new Date().toISOString(), note: str(body?.note, 300) || `Payment marked ${ps.replace('_', ' ')} by ZHĀR Atelier.` }];
  const { data, error } = await db().from('orders').update({ payment_status: ps, status_history: hist, updated_at: new Date().toISOString() }).eq('id', p.id).select().single(); if (error) throw error;
  return json({ success: true, order: toOrder(data) });
});
route('PUT', '/api/admin/settings', async ({ body }) => { await saveSettings(cleanSettings(body)); return json({ success: true, settings: await getSettings() }); });
route('PUT', '/api/admin/video', async ({ body }) => {
  const { enabled, videoUrl, title, subtitle, buttonText } = body || {}, v: Record<string, any> = {};
  if (enabled !== undefined) v.enabled = Boolean(enabled);
  if (typeof videoUrl === 'string' && videoUrl.trim()) { if (!safeUrl(videoUrl.trim())) fail(400, 'Video URL must start with https:// or /.'); v.videoUrl = videoUrl.trim().slice(0, 2000); }
  if (typeof title === 'string') v.title = str(title, 120);
  if (typeof subtitle === 'string') v.subtitle = str(subtitle, 160);
  if (typeof buttonText === 'string') v.buttonText = str(buttonText, 40);
  await saveSettings({ homepageVideo: v });
  return json({ success: true, homepageVideo: (await getSettings()).homepageVideo });
});

// Upload step 1: validate type/size, return a one-time signed upload token. Filenames are generated here, never user-supplied.
route('POST', '/api/admin/upload-url', async ({ body }) => {
  const t = MIME[String(body?.contentType)], size = Number(body?.size);
  if (!t) fail(400, 'Allowed files: JPG, PNG, WebP, AVIF images and MP4/WebM video.');
  if (!(size > 0 && size <= t.max)) fail(400, `File too large (max ${t.max / 1e6} MB for this type).`);
  const folder = ['products', 'banners', 'video', 'promo', 'logo'].includes(body?.folder) ? body.folder : 'misc';
  const path = `${folder}/${crypto.randomUUID()}.${t.ext}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path); if (error || !data) throw error || new Error('upload url failed');
  return json({ bucket: BUCKET, path, token: data.token, publicUrl: db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl, supabaseUrl: ENV.SUPABASE_URL, anonKey: ENV.SUPABASE_ANON_KEY });
});
route('DELETE', '/api/admin/media', async ({ body }) => {
  const prefix = `${ENV.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`, url = str(body?.url, 2000);
  if (!url.startsWith(prefix) || url.includes('..')) fail(400, 'Only store media can be deleted here.');
  const { error } = await db().storage.from(BUCKET).remove([decodeURIComponent(url.slice(prefix.length))]); if (error) throw error;
  return json({ success: true });
});

route('POST', '/api/admin/categories', async ({ body }) => {
  const name = str(body?.name, 60); if (!name) fail(400, 'Category name is required.');
  const { data: last } = await db().from('categories').select('sort').order('sort', { ascending: false }).limit(1);
  const { data, error } = await db().from('categories').insert({ name, sort: (last?.[0]?.sort || 0) + 1 }).select().single();
  if (error) fail(error.code === '23505' ? 409 : 500, error.code === '23505' ? 'That category already exists.' : 'Could not save category.');
  return json(data, 201);
});
route('PUT', '/api/admin/categories/:id', async ({ p, body }) => {
  const name = str(body?.name, 60); if (!name) fail(400, 'Category name is required.');
  const { data: old } = await db().from('categories').select('name').eq('id', p.id).single(); if (!old) fail(404, 'Category not found.');
  const { error } = await db().from('categories').update({ name }).eq('id', p.id);
  if (error) fail(error.code === '23505' ? 409 : 500, 'Could not rename category (name may already exist).');
  await db().from('products').update({ category: name }).eq('category', old!.name);
  return json({ success: true });
});
route('DELETE', '/api/admin/categories/:id', async ({ p }) => {
  const { data: c } = await db().from('categories').select('name').eq('id', p.id).single(); if (!c) fail(404, 'Category not found.');
  const { count } = await db().from('products').select('id', { count: 'exact', head: true }).eq('category', c!.name);
  if (count) fail(400, `${count} product(s) still use this category. Move or delete them first.`);
  await db().from('categories').delete().eq('id', p.id); return json({ success: true });
});

// ---------- dispatcher ----------
async function readBody(req: Request): Promise<any> {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const text = await req.text();
  if (text.length > 200_000) fail(413, 'Request too large.');
  if (!text) return {};
  try { return JSON.parse(text); } catch { return fail(400, 'Invalid JSON.'); }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    ENV = env;
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    try {
      if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Missing env: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
        return json({ error: 'Store is not configured yet.' }, 500);
      }
      const path = url.pathname.replace(/\/+$/, '') || '/';
      if (path.startsWith('/api/admin/') || path === '/api/admin') await requireAdmin(req);   // server-side permission check for ALL admin routes
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(path); if (!m) continue;
        const p: Record<string, string> = {}; r.keys.forEach((k, i) => (p[k] = decodeURIComponent(m[i + 1])));
        return await r.h({ req, url, p, body: await readBody(req) });
      }
      return json({ error: 'Not found.' }, 404);
    } catch (e: any) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error('[api error]', e?.message || e);          // details stay in server logs only
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  }
};
