# ZHĀR Luxury Fashion – Supabase + Cloudflare Workers

Your AI Studio design is kept. The backend is a Cloudflare Worker (`worker/index.ts`, no Express) using Supabase for the database,
login and file storage. The built website (`dist/`) is served by Cloudflare Workers Assets from the same Worker project.

## Features
Owner-only admin: products (add/edit/delete, device photo upload, sizes, colours, stock, availability, sale price, new/featured), categories,
intro video (upload/replace/delete, stored in Supabase Storage, fallback to the bundled film), homepage banner + promo + contact details,
orders (status, tracking, payment verification), theme colours/fonts, social links, JazzCash/Easypaisa numbers + instructions.
Customers: register, login/logout, password-reset email, profile, own order history, order tracking (order number + email/phone).
Checkout: prices and stock computed in the database; Cash on Delivery, manual JazzCash, manual Easypaisa. Card payments are NOT enabled.

## Security design
* The browser never talks to the database directly. RLS is ON with no policies, so the public key can read/write nothing.
* Every `/api/admin/*` request is checked on the server (valid Supabase login AND `role = 'admin'`) before routing. A database trigger blocks role changes from the website; only you, in the Supabase SQL Editor, can make an admin.
* Uploads: server validates type/size and issues a one-time signed upload link to the admin only; filenames are generated. Storage policies are admin-only too.
* No passwords or keys in code. Secrets live only in Cloudflare (Secrets) / your local `.dev.vars`.

## 1. Supabase (free)
1. supabase.com > New project.
2. SQL Editor: run, in this order, `supabase/schema.sql`, `supabase/migrations/002_admin_media_categories.sql`, `supabase/seed.sql`.
3. Project Settings > API: note **Project URL**, **anon public key**, **service_role key** (SECRET: only ever type it into Cloudflare/your `.dev.vars`).

## 2. Cloudflare (your existing project `zhar-fashion-store`)
1. Put these project files in your GitHub repo (replace the old files). **Delete any old `wrangler.toml`/`wrangler.json`** so only `wrangler.jsonc` remains. Keep Build command `npm run build` and Deploy command `npx wrangler deploy`.
2. Cloudflare dashboard > Workers & Pages > zhar-fashion-store > Settings > **Variables and Secrets** (runtime, not "Build" variables). Add all four as type **Secret**:
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL` (your live `https://....workers.dev` or custom domain address).
3. Push to GitHub (or Retry deployment). Open the live address.
4. Supabase > Authentication > URL Configuration: set Site URL to the same live address.

## 3. Become the owner
On the live site: Login > Create account with YOUR email, confirm the email. In Supabase SQL Editor run (your real email):
`update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR-EMAIL@example.com');`
Then open the Admin from the site and sign in with that email and password. Enter your real JazzCash/Easypaisa numbers in Admin > Settings.

## 4. Custom domain later
Cloudflare > the Worker > Settings > Domains & Routes > Add custom domain. Then update `APP_URL` and the Supabase Site URL.

## Local test (optional)
`npm install`, copy `.dev.vars.example` to `.dev.vars`, fill it, `npm run dev` (builds, then runs the Worker locally on http://localhost:8787).

## Payments
* **COD**: works. **JazzCash / Easypaisa**: manual transfer. The customer enters the transaction ID; one ID can be used for only one order. Verify it in your JazzCash/Easypaisa app, then mark payment "paid" in the admin.
* **Visa/Mastercard**: disabled until you have a gateway merchant account (hosted checkout + signed webhook). Never store card numbers.

## Known limitations
* Not yet tested against a real Supabase project or real Cloudflare deployment (see the testing notes in the chat).
* Removing a gallery photo does not delete the file from Storage. No "set new password" screen after the reset email.
* Admin session lasts as long as the Supabase access token (1 hour by default).
* Rate limiting is per-isolate best effort; add a Cloudflare WAF Rate Limiting rule on `/api/auth/*` and `/api/orders*` for strong protection.
