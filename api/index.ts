import express, { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

// ---------- environment (server-only; NEVER prefixed VITE_, so never sent to the browser) ----------
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const APP_URL = process.env.APP_URL || '';
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
let _admin: SupabaseClient | null = null, _anon: SupabaseClient | null = null;
const db = () => (_admin ??= createClient(SUPABASE_URL, SERVICE_KEY, opts));
const authClient = () => (_anon ??= createClient(SUPABASE_URL, ANON_KEY, opts));

const BUCKET = 'store-media';
const categoryNames = async () => ((await db().from('categories').select('name')).data || []).map((c: any) => c.name as string);
const GENDERS = ['Men', 'Women', 'Unisex'];
const DEFAULT_SETTINGS = {
  announcementBanner: 'Complimentary white-glove delivery on orders above PKR 25,000.', bannerEnabled: true,
  jazzcashNumber: '', jazzcashTitle: '', easypaisaNumber: '', easypaisaTitle: '',
  socialLinks: { instagram: '', twitter: '', tiktok: '', whatsapp: '' },
  homepageVideo: { enabled: true, videoUrl: '/videos/zhar_fashion_film.mp4', title: 'THE MONOCHROME MANIFESTO', subtitle: 'ÉDITION NOIR 2026 // HAUTE ATELIER', buttonText: 'Enter Atelier' },
  theme: { primaryColor: '#000000', accentColor: '#ffffff', fontStyle: 'Bodoni Moda & Cinzel' },
  currency: 'PKR', currencySymbol: 'PKR '
};

// ---------- small helpers ----------
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
const strArr = (v: unknown, maxItems: number, maxLen: number) => (Array.isArray(v) ? v.filter(x => typeof x === 'string').map((x: string) => x.trim().slice(0, maxLen)).filter(Boolean).slice(0, maxItems) : []);
const safeUrl = (u: string) => /^https:\/\/|^\/(?!\/)/.test(u);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const digits10 = (s: string) => s.replace(/\D/g, '').slice(-10);
const bearer = (req: Request) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

const toProduct = (r: any) => ({
  id: r.id, name: r.name, slug: r.slug, category: r.category, gender: r.gender, description: r.description,
  price: Number(r.price), originalPrice: r.original_price == null ? undefined : Number(r.original_price),
  colors: r.colors || [], isAvailable: r.is_available !== false, isSale: r.is_sale, isFeatured: r.is_featured, isNewArrival: r.is_new_arrival, images: r.images, sizes: r.sizes,
  stock: r.stock, sku: r.sku, details: r.details, materials: r.materials, createdAt: r.created_at
});
const toOrder = (r: any) => ({
  id: r.id, orderNumber: r.order_number, customer: r.customer, items: r.items, subtotal: Number(r.subtotal), shipping: Number(r.shipping),
  total: Number(r.total), paymentMethod: r.payment_method, paymentDetails: r.payment_details, paymentStatus: r.payment_status, status: r.status, statusHistory: r.status_history,
  trackingNumber: r.tracking_number ?? undefined, carrier: r.carrier ?? undefined, createdAt: r.created_at, updatedAt: r.updated_at
});

// Validates product input. `partial` = only validate the keys that were sent (used by edit).
function productFields(b: any, partial: boolean, cats: string[]): { row?: Record<string, unknown>; error?: string } {
  const row: Record<string, unknown> = {}, has = (k: string) => b && b[k] !== undefined;
  if (!partial || has('name')) { const v = str(b?.name, 160); if (!v) return { error: 'Product name is required.' }; row.name = v; }
  if (!partial || has('category')) { if (!cats.includes(b?.category)) return { error: 'Invalid category.' }; row.category = b.category; }
  if (!partial || has('price')) { const v = num(b?.price); if (!(v >= 0)) return { error: 'Price must be a number of 0 or more.' }; row.price = v; }
  if (has('gender')) { if (!GENDERS.includes(b.gender)) return { error: 'Invalid gender.' }; row.gender = b.gender; } else if (!partial) row.gender = 'Unisex';
  if (has('description')) row.description = str(b.description, 4000);
  if (has('originalPrice')) { const v = b.originalPrice === null || b.originalPrice === '' ? null : num(b.originalPrice); if (v !== null && !(v >= 0)) return { error: 'Original price is invalid.' }; row.original_price = v; }
  if (has('isSale')) row.is_sale = Boolean(b.isSale);
  if (has('isFeatured')) row.is_featured = Boolean(b.isFeatured);
  if (has('isNewArrival')) row.is_new_arrival = Boolean(b.isNewArrival);
  if (has('images')) { const im = strArr(b.images, 10, 2000); if (im.some(u => !safeUrl(u))) return { error: 'Image URLs must start with https:// or /.' }; row.images = im; }
  if (has('sizes')) row.sizes = strArr(b.sizes, 20, 40);
  if (has('colors')) row.colors = strArr(b.colors, 20, 30);
  if (has('isAvailable')) row.is_available = Boolean(b.isAvailable);
  if (has('stock')) { const v = num(b.stock); if (!Number.isInteger(v) || v < 0 || v > 100000) return { error: 'Stock must be a whole number of 0 or more.' }; row.stock = v; }
  if (has('sku')) row.sku = str(b.sku, 60);
  if (has('details')) row.details = strArr(b.details, 20, 300);
  if (has('materials')) row.materials = str(b.materials, 300);
  return { row };
}

// ---------- tiny per-instance rate limiter (best-effort; add Vercel Firewall rules for stronger limits) ----------
const hits = new Map<string, { n: number; t: number }>();
const limit = (name: string, max: number, windowMs: number) => (req: Request, res: Response, next: NextFunction) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const key = `${name}:${ip}`, now = Date.now(), h = hits.get(key);
  if (!h || now - h.t > windowMs) hits.set(key, { n: 1, t: now });
  else if (++h.n > max) { res.status(429).json({ error: 'Too many attempts. Please wait a few minutes and try again.' }); return; }
  next();
};

const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };

// Supabase auth user from the Bearer token (verified by Supabase, not decoded locally)
async function userFrom(req: Request) {
  const token = bearer(req); if (!token) return null;
  const { data, error } = await db().auth.getUser(token);
  return error || !data.user ? null : data.user;
}
async function profileOf(id: string) {
  const { data } = await db().from('profiles').select('role, full_name, phone, created_at').eq('id', id).single();
  return data;
}
const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  (async () => {
    const u = await userFrom(req);
    if (!u) { res.status(401).json({ error: 'Please sign in as the owner.' }); return; }
    const p = await profileOf(u.id);
    if (p?.role !== 'admin') { res.status(403).json({ error: 'Owner access only.' }); return; }
    next();
  })().catch(next);
};

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));
app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use((_req, res, next) => {
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    console.error('Missing env: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY');
    res.status(500).json({ error: 'Store is not configured yet.' }); return;
  }
  next();
});

// ===================== PUBLIC =====================
app.get('/api/products', wrap(async (req, res) => {
  const { category, gender, search, sale, featured, newArrival, sort } = req.query;
  let q = db().from('products').select('*');
  if (typeof category === 'string' && category !== 'All') q = q.ilike('category', category.replace(/[%,()]/g, ''));
  if (typeof gender === 'string' && gender !== 'All') q = q.in('gender', [gender, 'Unisex']);
  if (sale === 'true') q = q.eq('is_sale', true);
  if (featured === 'true') q = q.eq('is_featured', true);
  if (newArrival === 'true') q = q.eq('is_new_arrival', true);
  if (typeof search === 'string' && search.trim()) {
    const s = search.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').trim().slice(0, 60);
    if (s) q = q.or(`name.ilike.%${s}%,description.ilike.%${s}%,category.ilike.%${s}%,sku.ilike.%${s}%`);
  }
  q = sort === 'price-asc' ? q.order('price', { ascending: true }) : sort === 'price-desc' ? q.order('price', { ascending: false })
    : sort === 'name-asc' ? q.order('name', { ascending: true }) : q.order('created_at', { ascending: false });
  const { data, error } = await q; if (error) throw error;
  res.json({ products: (data || []).map(toProduct), count: data?.length || 0 });
}));

app.get('/api/products/:id', wrap(async (req, res) => {
  const { data } = await db().from('products').select('*').or(`id.eq.${req.params.id.replace(/[^\w-]/g, '')},slug.eq.${req.params.id.replace(/[^\w-]/g, '')}`).limit(1);
  if (!data?.length) { res.status(404).json({ error: 'Product not found.' }); return; }
  res.json(toProduct(data[0]));
}));

const getSettings = async () => {
  const { data } = await db().from('settings').select('data').eq('id', 1).single();
  const d: any = data?.data || {};
  return { ...DEFAULT_SETTINGS, ...d, socialLinks: { ...DEFAULT_SETTINGS.socialLinks, ...(d.socialLinks || {}) },
    homepageVideo: { ...DEFAULT_SETTINGS.homepageVideo, ...(d.homepageVideo || {}) }, theme: { ...DEFAULT_SETTINGS.theme, ...(d.theme || {}) } };
};
app.get('/api/settings', wrap(async (_req, res) => { res.json(await getSettings()); }));

// ---------- checkout: server decides prices & stock (database function, atomic) ----------
app.post('/api/orders', limit('order', 20, 10 * 60_000), wrap(async (req, res) => {
  const b = req.body || {}, c = b.customer || {};
  const customer = { fullName: str(c.fullName, 120), email: str(c.email, 200).toLowerCase(), phone: str(c.phone, 40), address: str(c.address, 400),
    city: str(c.city, 80), postalCode: str(c.postalCode, 20), country: str(c.country, 80) || 'Pakistan', notes: str(c.notes, 500) };
  if (!customer.fullName || !EMAIL.test(customer.email) || digits10(customer.phone).length < 10 || !customer.address || !customer.city) {
    res.status(400).json({ error: 'Please provide your full name, a valid email, phone number, address and city.' }); return;
  }
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 20) { res.status(400).json({ error: 'Your bag must contain between 1 and 20 items.' }); return; }
  const items = b.items.map((i: any) => ({ productId: str(i?.productId, 80), size: str(i?.size, 40), quantity: Math.floor(Number(i?.quantity)) }));
  if (items.some((i: any) => !i.productId || !(i.quantity >= 1 && i.quantity <= 10))) { res.status(400).json({ error: 'Invalid item or quantity.' }); return; }

  const method = b.paymentMethod; const pd = b.paymentDetails || {};
  if (method === 'card') { res.status(400).json({ error: 'Card payments are not available yet. Please choose Cash on Delivery, JazzCash or Easypaisa.' }); return; }
  if (!['cod', 'jazzcash', 'easypaisa'].includes(method)) { res.status(400).json({ error: 'Please choose a payment method.' }); return; }
  const details: Record<string, string> = {};
  if (method !== 'cod') {
    const s = await getSettings();
    if (!(method === 'jazzcash' ? s.jazzcashNumber : s.easypaisaNumber)) { res.status(400).json({ error: 'This payment method is not available right now.' }); return; }
    details.transactionId = str(pd.transactionId, 60); details.senderNumber = str(pd.senderNumber, 40);
    if (details.transactionId.length < 6) { res.status(400).json({ error: 'Please enter the transaction ID shown in your payment receipt.' }); return; }
  }
  if (str(pd.notes, 500)) details.notes = str(pd.notes, 500);

  const u = await userFrom(req);   // optional: link the order to the signed-in customer; guests may still order
  const { data, error } = await db().rpc('place_order', { p_user: u?.id ?? null, p_customer: customer, p_items: items, p_method: method, p_details: details });
  if (error) {
    if (error.code === '23505') { res.status(400).json({ error: 'This transaction ID has already been used for another order.' }); return; }
    const m = /^(STOCK|NOT_FOUND|BAD_QTY): (.*)$/.exec(error.message || '');
    if (m) { res.status(400).json({ error: m[2] }); return; }
    throw error;
  }
  res.status(201).json({ success: true, order: toOrder(data), message: 'Your order has been received by ZHĀR Atelier.' });
}));

// ---------- tracking: needs order number AND the e-mail or phone used at checkout ----------
app.post('/api/orders/track', limit('track', 15, 10 * 60_000), wrap(async (req, res) => {
  const num_ = str(req.body?.orderNumber, 40).toUpperCase(), contact = str(req.body?.emailOrPhone, 200).toLowerCase();
  if (!num_ || !contact) { res.status(400).json({ error: 'Please enter both your Order Number and Email or Phone number.' }); return; }
  const { data } = await db().from('orders').select('*').eq('order_number', num_).limit(1);
  const o: any = data?.[0];
  const ok = o && (String(o.customer?.email || '').toLowerCase() === contact || (digits10(contact).length >= 10 && digits10(String(o.customer?.phone || '')) === digits10(contact)));
  if (!ok) { res.status(404).json({ error: 'No matching order found for this Order Number and contact record.' }); return; }
  res.json(toOrder(o));
}));

// ---------- signed-in customer's own orders ----------
app.get('/api/orders/mine', wrap(async (req, res) => {
  const u = await userFrom(req); if (!u) { res.status(401).json({ error: 'Please sign in.' }); return; }
  const byUser = await db().from('orders').select('*').eq('user_id', u.id);
  const byEmail = u.email_confirmed_at && u.email ? await db().from('orders').select('*').filter('customer->>email', 'eq', u.email.toLowerCase()) : { data: [] as any[] };
  const map = new Map<string, any>(); [...(byUser.data || []), ...(byEmail.data || [])].forEach(o => map.set(o.id, o));
  res.json([...map.values()].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).map(toOrder));
}));

// ===================== CUSTOMER / OWNER AUTH (Supabase Auth) =====================
const userView = async (u: { id: string; email?: string | null; created_at?: string }) => {
  const p = await profileOf(u.id);
  return { id: u.id, email: u.email || '', fullName: p?.full_name || (u.email || '').split('@')[0], phone: p?.phone || undefined, role: p?.role === 'admin' ? 'admin' : 'customer', createdAt: p?.created_at || u.created_at || '' };
};

app.post('/api/auth/signup', limit('signup', 10, 10 * 60_000), wrap(async (req, res) => {
  const email = str(req.body?.email, 200).toLowerCase(), password = typeof req.body?.password === 'string' ? req.body.password : '';
  const fullName = str(req.body?.fullName, 120), phone = str(req.body?.phone, 40);
  if (!EMAIL.test(email) || !fullName) { res.status(400).json({ error: 'Please enter your name and a valid email.' }); return; }
  if (password.length < 8 || password.length > 72) { res.status(400).json({ error: 'Password must be 8 to 72 characters.' }); return; }
  const { data, error } = await authClient().auth.signUp({ email, password, options: { data: { full_name: fullName, phone }, emailRedirectTo: APP_URL || undefined } });
  if (error) { res.status(400).json({ error: error.message }); return; }
  if (!data.session || !data.user) { res.status(200).json({ needsConfirmation: true, message: 'Please check your email and confirm your address, then log in.' }); return; }
  res.status(201).json({ user: await userView(data.user), token: data.session.access_token, message: 'Welcome to the ZHĀR Atelier Society.' });
}));

app.post('/api/auth/login', limit('login', 15, 10 * 60_000), wrap(async (req, res) => {
  const email = str(req.body?.email, 200).toLowerCase(), password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) { res.status(400).json({ error: 'Please provide email and password.' }); return; }
  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) { res.status(401).json({ error: 'Invalid email or password.' }); return; }
  const user = await userView(data.user);
  res.json({ user, token: data.session.access_token, isAdmin: user.role === 'admin' });
}));

app.post('/api/auth/reset-password', limit('reset', 5, 10 * 60_000), wrap(async (req, res) => {
  const email = str(req.body?.email, 200).toLowerCase();
  if (!EMAIL.test(email)) { res.status(400).json({ error: 'Please provide a valid account email address.' }); return; }
  await authClient().auth.resetPasswordForEmail(email, { redirectTo: APP_URL || undefined });   // same reply whether or not the account exists
  res.json({ success: true, message: 'If an account exists for that email, a recovery link has been sent.' });
}));

// ===================== OWNER-ONLY ADMIN API =====================
app.use('/api/admin', adminOnly);

app.get('/api/admin/verify', (_req, res) => { res.json({ valid: true }); });

app.get('/api/admin/stats', wrap(async (_req, res) => {
  const [o, p] = await Promise.all([db().from('orders').select('total,status'), db().from('products').select('stock')]);
  const orders = o.data || [], prods = p.data || [];
  res.json({
    totalRevenue: orders.reduce((s, x) => s + (x.status !== 'Cancelled' ? Number(x.total) : 0), 0), totalOrders: orders.length,
    pendingOrders: orders.filter(x => x.status === 'Pending').length, confirmedOrders: orders.filter(x => x.status === 'Confirmed').length,
    lowStockCount: prods.filter(x => x.stock <= 5).length, totalProducts: prods.length
  });
}));

app.post('/api/admin/products', wrap(async (req, res) => {
  const { row, error } = productFields(req.body, false, await categoryNames()); if (error) { res.status(400).json({ error }); return; }
  const base = String(row!.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product';
  const ins = { sizes: ['S', 'M', 'L', 'XL'], stock: 10, is_new_arrival: true, images: [], ...row, slug: `${base}-${Math.random().toString(36).slice(2, 6)}`, sku: row!.sku || 'ZHR-' + Math.floor(100 + Math.random() * 900) };
  const { data, error: e } = await db().from('products').insert(ins).select().single(); if (e) throw e;
  res.status(201).json({ success: true, product: toProduct(data) });
}));

app.put('/api/admin/products/:id', wrap(async (req, res) => {
  const { row, error } = productFields(req.body, true, await categoryNames()); if (error) { res.status(400).json({ error }); return; }
  if (!Object.keys(row!).length) { res.status(400).json({ error: 'Nothing to update.' }); return; }
  const { data, error: e } = await db().from('products').update(row!).eq('id', req.params.id).select().single();
  if (e || !data) { res.status(404).json({ error: 'Product not found.' }); return; }
  res.json({ success: true, product: toProduct(data) });
}));

app.delete('/api/admin/products/:id', wrap(async (req, res) => {
  const { data } = await db().from('products').delete().eq('id', req.params.id).select().single();
  if (!data) { res.status(404).json({ error: 'Product not found.' }); return; }
  res.json({ success: true, product: toProduct(data) });
}));

app.get('/api/admin/orders', wrap(async (_req, res) => {
  const { data, error } = await db().from('orders').select('*').order('created_at', { ascending: false }); if (error) throw error;
  res.json((data || []).map(toOrder));
}));

app.put('/api/admin/orders/:id/status', wrap(async (req, res) => {
  const { status, note, trackingNumber, carrier } = req.body || {};
  const { data, error } = await db().rpc('admin_set_status', { p_id: req.params.id, p_status: String(status), p_note: str(note, 500) || null,
    p_tracking: typeof trackingNumber === 'string' ? trackingNumber.trim().slice(0, 80) : null, p_carrier: typeof carrier === 'string' ? carrier.trim().slice(0, 80) : null });
  if (error) { const m = /^(BAD_STATUS|NOT_FOUND): (.*)$/.exec(error.message || ''); if (m) { res.status(m[1] === 'NOT_FOUND' ? 404 : 400).json({ error: m[2] }); return; } throw error; }
  res.json({ success: true, order: toOrder(data) });
}));

// Settings: whitelist + validate, then merge into the single settings row
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
app.put('/api/admin/settings', wrap(async (req, res) => { await saveSettings(cleanSettings(req.body)); res.json({ success: true, settings: await getSettings() }); }));

app.put('/api/admin/video', wrap(async (req, res) => {
  const { enabled, videoUrl, title, subtitle, buttonText } = req.body || {}, v: Record<string, any> = {};
  if (enabled !== undefined) v.enabled = Boolean(enabled);
  if (typeof videoUrl === 'string' && videoUrl.trim()) { if (!safeUrl(videoUrl.trim())) { res.status(400).json({ error: 'Video URL must start with https:// or /.' }); return; } v.videoUrl = videoUrl.trim().slice(0, 2000); }
  if (typeof title === 'string') v.title = str(title, 120);
  if (typeof subtitle === 'string') v.subtitle = str(subtitle, 160);
  if (typeof buttonText === 'string') v.buttonText = str(buttonText, 40);
  await saveSettings({ homepageVideo: v });
  res.json({ success: true, homepageVideo: (await getSettings()).homepageVideo });
}));


// ===================== EXTRA PUBLIC / ACCOUNT ROUTES =====================
// Public by design: the anon key can read nothing (RLS has no policies); it only lets the admin's browser use a signed upload URL.
app.get('/api/categories', wrap(async (_req, res) => {
  const { data, error } = await db().from('categories').select('id,name,sort').order('sort'); if (error) throw error;
  res.json(data || []);
}));

app.get('/api/account', wrap(async (req, res) => {
  const u = await userFrom(req); if (!u) { res.status(401).json({ error: 'Please sign in.' }); return; }
  res.json(await userView(u));
}));
app.put('/api/account', wrap(async (req, res) => {
  const u = await userFrom(req); if (!u) { res.status(401).json({ error: 'Please sign in.' }); return; }
  const fullName = str(req.body?.fullName, 120); if (!fullName) { res.status(400).json({ error: 'Please enter your name.' }); return; }
  const { error } = await db().from('profiles').update({ full_name: fullName, phone: str(req.body?.phone, 40) }).eq('id', u.id); if (error) throw error;
  res.json({ user: await userView(u) });
}));
app.post('/api/auth/logout', wrap(async (req, res) => { const t = bearer(req); if (t) await db().auth.admin.signOut(t).catch(() => null); res.json({ success: true }); }));

// ===================== ADMIN: MEDIA, CATEGORIES, PAYMENT VERIFICATION =====================
const MIME: Record<string, { ext: string; max: number }> = {
  'image/jpeg': { ext: 'jpg', max: 8e6 }, 'image/png': { ext: 'png', max: 8e6 }, 'image/webp': { ext: 'webp', max: 8e6 }, 'image/avif': { ext: 'avif', max: 8e6 },
  'video/mp4': { ext: 'mp4', max: 50e6 }, 'video/webm': { ext: 'webm', max: 50e6 }
};
// Step 1 of an upload: server (admin-checked) validates type/size and returns a one-time signed upload token. Filenames are generated, never user-supplied.
app.post('/api/admin/upload-url', wrap(async (req, res) => {
  const t = MIME[String(req.body?.contentType)], size = Number(req.body?.size);
  if (!t) { res.status(400).json({ error: 'Allowed files: JPG, PNG, WebP, AVIF images and MP4/WebM video.' }); return; }
  if (!(size > 0 && size <= t.max)) { res.status(400).json({ error: `File too large (max ${t.max / 1e6} MB for this type).` }); return; }
  const folder = ['products', 'banners', 'video', 'promo', 'logo'].includes(req.body?.folder) ? req.body.folder : 'misc';
  const path = `${folder}/${randomUUID()}.${t.ext}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path); if (error || !data) throw error || new Error('upload url failed');
  res.json({ bucket: BUCKET, path, token: data.token, publicUrl: db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl, supabaseUrl: SUPABASE_URL, anonKey: ANON_KEY });
}));
app.delete('/api/admin/media', wrap(async (req, res) => {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`, url = str(req.body?.url, 2000);
  if (!url.startsWith(prefix) || url.includes('..')) { res.status(400).json({ error: 'Only store media can be deleted here.' }); return; }
  const { error } = await db().storage.from(BUCKET).remove([decodeURIComponent(url.slice(prefix.length))]); if (error) throw error;
  res.json({ success: true });
}));

app.post('/api/admin/categories', wrap(async (req, res) => {
  const name = str(req.body?.name, 60); if (!name) { res.status(400).json({ error: 'Category name is required.' }); return; }
  const { data: last } = await db().from('categories').select('sort').order('sort', { ascending: false }).limit(1);
  const { data, error } = await db().from('categories').insert({ name, sort: (last?.[0]?.sort || 0) + 1 }).select().single();
  if (error) { res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'That category already exists.' : 'Could not save category.' }); return; }
  res.status(201).json(data);
}));
app.put('/api/admin/categories/:id', wrap(async (req, res) => {
  const name = str(req.body?.name, 60); if (!name) { res.status(400).json({ error: 'Category name is required.' }); return; }
  const { data: old } = await db().from('categories').select('name').eq('id', req.params.id).single(); if (!old) { res.status(404).json({ error: 'Category not found.' }); return; }
  const { error } = await db().from('categories').update({ name }).eq('id', req.params.id);
  if (error) { res.status(error.code === '23505' ? 409 : 500).json({ error: 'Could not rename category (name may already exist).' }); return; }
  await db().from('products').update({ category: name }).eq('category', old.name);
  res.json({ success: true });
}));
app.delete('/api/admin/categories/:id', wrap(async (req, res) => {
  const { data: c } = await db().from('categories').select('name').eq('id', req.params.id).single(); if (!c) { res.status(404).json({ error: 'Category not found.' }); return; }
  const { count } = await db().from('products').select('id', { count: 'exact', head: true }).eq('category', c.name);
  if (count) { res.status(400).json({ error: `${count} product(s) still use this category. Move or delete them first.` }); return; }
  await db().from('categories').delete().eq('id', req.params.id); res.json({ success: true });
}));

app.put('/api/admin/orders/:id/payment', wrap(async (req, res) => {
  const ps = String(req.body?.paymentStatus);
  if (!['unpaid', 'pending_verification', 'paid', 'failed', 'refunded'].includes(ps)) { res.status(400).json({ error: 'Invalid payment status.' }); return; }
  const { data: o } = await db().from('orders').select('status_history').eq('id', req.params.id).single(); if (!o) { res.status(404).json({ error: 'Order not found.' }); return; }
  const hist = [...(o.status_history || []), { status: 'Payment', timestamp: new Date().toISOString(), note: str(req.body?.note, 300) || `Payment marked ${ps.replace('_', ' ')} by ZHĀR Atelier.` }];
  const { data, error } = await db().from('orders').update({ payment_status: ps, status_history: hist, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single(); if (error) throw error;
  res.json({ success: true, order: toOrder(data) });
}));

app.use('/api', (_req, res) => { res.status(404).json({ error: 'Not found.' }); });

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[api error]', err?.message || err);          // details stay in server logs only
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

export default app;
