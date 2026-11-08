# ZHĀR Luxury Fashion – Supabase + Vercel edition

Your AI Studio design is unchanged. The JSON-file server (`server.ts`) was replaced by a secure API (`api/index.ts`)
backed by Supabase, so orders, products and settings now persist and the app can run on Vercel.

## What changed
| Area | Before | Now |
|---|---|---|
| Database | `data/database.json` (wiped on Vercel) | Supabase Postgres (`supabase/schema.sql`) |
| Admin login | hardcoded passwords `zhar2026` / `admin123` + fixed token in code | real owner account (Supabase Auth) + `role='admin'` check on every admin route |
| Customer login | any e-mail + any password was accepted | Supabase Auth (hashed passwords, e-mail confirmation) |
| Orders | prices from client-visible product list; stock race conditions | prices + stock decided inside one database transaction |
| Order history | public `/api/orders/customer/:email` (leaked anyone's orders) | `/api/orders/mine` needs the customer's own login |
| Card payments | form collected raw card number + CVV, no gateway | removed (no fake payments). COD, JazzCash, Easypaisa are live |
| Payment numbers | placeholder numbers shown to customers | empty until the owner enters real ones in Admin > Settings |
| Crash bug | 5 modals called hooks after an early return (React crash) | fixed with wrappers |
| Images | `/src/assets/...` (breaks in production build) | `public/images/...` |

## 1. Supabase (your account – free)
1. supabase.com > New project (save the database password in your own password manager).
2. SQL Editor, run these three files in this order: `supabase/schema.sql`, then `supabase/migrations/002_admin_media_categories.sql` (categories, colours, payment status, the `store-media` Storage bucket + admin-only policies), then `supabase/seed.sql` (8 starter products).
3. Authentication > URL Configuration: set Site URL to your live address once you have it.
4. Project Settings > API: you need **Project URL**, **anon key**, **service_role key**.
   The service_role key is a SECRET. Type it only into Vercel / your own `.env.local`. Never paste it in chat or code.

## 2. Make yourself the owner
Open the live site > Login > Create account with YOUR email. Confirm the email. Then in the SQL Editor run (your real email):
`update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR-EMAIL@example.com');`
Then open `/admin` and sign in with that email + password. Nobody else can become admin from the website.

## 3. Test locally (optional)
`npm install` · copy `.env.example` to `.env.local` and fill it · `npm run dev` · `npm run build`

## 4. Deploy to Vercel without GitHub
1. `npx vercel login` (opens your browser; you log in yourself).
2. In the project folder: `npx vercel` (accept the defaults to create/link the project).
3. Add the four variables from `.env.example`: `npx vercel env add SUPABASE_URL production` (repeat for `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`) – paste each value into the terminal prompt.
4. `npx vercel --prod` > it prints your live URL. Put that URL in Supabase Site URL and in `APP_URL`, then redeploy.
Note: Vercel's free Hobby plan is for personal / non-commercial use. A shop that takes orders is commercial, so check Vercel's current
terms (a paid plan, or Netlify / Cloudflare Pages, may be required).

## 5. Custom domain later
Vercel > Project > Domains > add your domain and follow the DNS steps. Then update Supabase Site URL and `APP_URL`.

## Payments
* **Cash on Delivery** – works.
* **JazzCash / Easypaisa** – manual transfer: enter your real numbers in Admin > Settings. The customer sends the money and enters the
  transaction ID; one ID can only be used once. Verify the payment in your JazzCash/Easypaisa app before marking the order Confirmed.
  There is no automatic confirmation (that needs a merchant API account).
* **Visa / Mastercard** – disabled until you have a gateway merchant account with a hosted checkout and webhook.

## Admin features (owner-only, enforced on the server and in the database)
Products (add/edit/delete, photo upload from device, sizes, colours, stock, availability, sale price, new/featured) · Categories (add/rename/delete) ·
Intro video (upload, replace, delete; stored in Supabase Storage; falls back to the bundled film) · Homepage banner, promo block and contact details ·
Orders (status, tracking, **payment verification workflow**) · Theme colours/fonts, social links, JazzCash/Easypaisa numbers and instructions.
Uploads: images JPG/PNG/WebP/AVIF up to 8 MB, video MP4/WebM up to 50 MB (Supabase free-plan limit). The server issues one-time signed upload URLs only to the admin and generates safe filenames.
Customers: register, log in/out (server-side session revoke), profile edit, order history (own orders only), order tracking (order number + email/phone).

## Known gaps
* Removing a photo from a product's gallery does not delete the file from Storage (orphan files stay until removed in the Supabase dashboard).
* Card payments are not implemented (no gateway credentials). When you have a gateway merchant account, add its hosted-checkout redirect and a signed webhook in `api/`; never store card numbers.
* Customers cannot change their password inside the site yet (reset email works, but there is no new-password screen).
* Password-reset emails work, but the site has no "set new password" screen yet.
* Admin sessions last as long as the Supabase access token (default 1 hour); sign in again after that.
* Rate limiting is basic per server instance; add Vercel Firewall rules for stronger protection.
