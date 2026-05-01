# Vortx stack — Cloudflare Pages + Supabase

Aligned for a **news-driven, odds-updating UI**: static/edge delivery on **Cloudflare Pages**, Postgres + realtime + auth in **Supabase**, and predictable async state with **TanStack Query**.

## Brand site + funnel + systems

A **personal branding site** earns **trust** and **visibility**. It should not be expected to carry the whole business alone. Pair it with:

| Layer | Job |
|--------|-----|
| **Website** | Credibility, story, proof, and clear “who this is for.” |
| **Funnel** | One primary path: capture attention → single next action (waitlist, checkout, newsletter, book a call, try the widget). |
| **Systems** | Email sequences, CRM, reminders, billing, and follow-up so interest becomes **conversion** on a schedule—not only when you remember to reply. |

**Leads come from systems**, not from raw traffic. The app and growth tactics (oracle bot, embeds) should all **terminate** in a funnel step and a system that owns the next touch.

---

## Hosting: Cloudflare Pages

**Cloudflare Pages / Workers** fits this repo: connect the Git repo or run Wrangler, build the Vite app, serve `frontend/dist` as assets, and run `worker/index.js` for `/api/*`. Supabase stays the source of truth for data and RLS.

**SPA routing:** `wrangler.jsonc` sets `assets.not_found_handling = "single-page-application"`, so direct visits to client routes resolve without a `_redirects` file.

---

## Stack table

| Layer | Choice | Role |
|--------|--------|------|
| Frontend | React + **Vite** + **Tailwind** | Fast builds, styling at scale. |
| Hosting | **Cloudflare Workers + assets** | Global static + SPA fallback; Worker handles API routes and thin edge logic. |
| Backend / data | **Supabase** | Postgres, **Realtime** for moving odds, **Auth**, **RLS**. Supabase **Edge Functions** for oracle/scraper jobs. |
| Async / cache | **TanStack Query** | Feeds, odds, invalidation when Supabase realtime updates. |
| Payments | **Stripe Payment Links** | Fastest safe checkout path; no Stripe secret key in repo or browser. |

---

## Why not GitHub Pages as primary?

GitHub Pages is ideal for **static** repos. For **auth**, **RLS-backed writes**, **realtime**, and **env-managed deploys**, **Cloudflare Pages + Supabase** matches the product better.

---

## Environment variables

Set in **Cloudflare Pages** → your project → **Settings → Environment variables** (and mirror in `frontend/.env.local` for dev):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY` if you use that name)
- `STRIPE_PRODUCT_ID`
- `STRIPE_NEBULA_PRICE_ID`
- `STRIPE_SUPERNOVA_PRICE_ID`
- `STRIPE_GALACTIC_PRICE_ID`
- `STRIPE_CUSTOM_PRICE_ID`
- `STRIPE_CUSTOM_MODE`
- `STRIPE_SECRET_KEY` (server-only; never prefix with `VITE_`)
- `BOT_ADMIN_TOKEN` (Cloudflare Function secret, not `VITE_*`)
- `PUBLIC_SITE_URL` (optional, used by bot post links)

Never commit real keys. Rotate if credentials are ever exposed.

Use Stripe **Checkout Sessions** through the Cloudflare Pages Function for this iteration. If you later need metered billing, webhooks, coupons, or customer portal flows, add webhook verification and a customer portal endpoint.

---

## Monorepo deploy

In **Cloudflare Pages**, set **Root directory** (build configuration) to **`frontend`**, build command **`npm run build`**, output directory **`dist`**.

Deploy from the repo root with **`npx wrangler deploy`**. The checked-in `wrangler.jsonc` builds `frontend/` first, deploys **`frontend/dist`** only, and serves SPA routes through Cloudflare’s asset fallback.
