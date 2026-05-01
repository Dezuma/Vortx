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

**Cloudflare Pages** fits this repo: connect the Git repo, run **`npm run build`**, publish **`dist`**, set **`VITE_*`** env vars in the Pages project (never in git). Pages Functions in `frontend/functions/` handle bot dry-run checks and health checks—while Supabase stays the source of truth for data and RLS.

**SPA routing:** `frontend/public/_redirects` is copied into `dist` by Vite so client-side routes resolve on Pages.

---

## Stack table

| Layer | Choice | Role |
|--------|--------|------|
| Frontend | React + **Vite** + **Tailwind** | Fast builds, styling at scale. |
| Hosting | **Cloudflare Pages** | Global static + SPA fallback; Pages Functions for bot checks and thin edge logic. |
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
- `VITE_STRIPE_NEBULA_PAYMENT_LINK_URL`
- `VITE_STRIPE_SUPERNOVA_PAYMENT_LINK_URL`
- `VITE_STRIPE_GALACTIC_PAYMENT_LINK_URL`
- `VITE_STRIPE_CUSTOM_PAYMENT_LINK_URL`
- `BOT_ADMIN_TOKEN` (Cloudflare Function secret, not `VITE_*`)
- `PUBLIC_SITE_URL` (optional, used by bot post links)

Never commit real keys. Rotate if credentials are ever exposed.

Use Stripe **Payment Links** for this iteration. If you later need metered billing, webhooks, coupons, or customer portal flows, add a Cloudflare Worker/Pages Function backed by `STRIPE_SECRET_KEY`.

---

## Monorepo deploy

In **Cloudflare Pages**, set **Root directory** (build configuration) to **`frontend`**, build command **`npm run build`**, output directory **`dist`**.

If you deploy with **Wrangler** instead of the Pages build UI, run from the repo root with **`npx wrangler deploy`**. The checked-in `wrangler.jsonc` builds `frontend/` first and deploys **`frontend/dist`** only.
