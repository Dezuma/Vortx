# Vortx

**Vortx** is a vibe-seo workspace project: automated news-to-probability surfaces and prediction-market-style trading (macro, tech, geopolitics—not crypto-only).

## Stack (production-shaped)

See **[STACK.md](./STACK.md)** — **Cloudflare Pages** for the **Vite + Tailwind** app, **Supabase** for data/realtime/RLS, **TanStack Query** on the client. The same doc explains **website + funnel + systems** so traffic turns into leads reliably.

| Path | Purpose |
|------|---------|
| [STACK.md](./STACK.md) | Cloudflare deploy, Supabase/Stripe envs, bot checks, SPA fallback, brand/funnel/systems framing. |
| [GROWTH.md](./GROWTH.md) | Utility-first distribution (oracle bot, overlays, incentives, paper leagues). |
| [`frontend/`](./frontend/) | Web app (`npm run dev`). |
| [`frontend/functions/`](./frontend/functions/) | Cloudflare Pages Functions for health and bot dry-run checks. |
| [`supabase/schema.sql`](./supabase/schema.sql) | Starter SQL (apply in Supabase). |
| [`supabase/seed.sql`](./supabase/seed.sql) | Rerunnable initial market seed data. |

### Deploy on Cloudflare Pages

1. In the [Cloudflare dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select this repository and set **Root directory** to **`frontend`**.
3. Build command: **`npm run build`**. Build output directory: **`dist`**.
4. Under **Settings → Environment variables**, add Supabase, Stripe Payment Link, and bot variables (see `frontend/.env.example`).

SPA fallback is handled by `wrangler.jsonc` via `assets.not_found_handling = "single-page-application"`.

### Deploy with Wrangler

If Cloudflare is using **Deploy command: `npx wrangler deploy`**, keep the repo root as the working directory. `wrangler.jsonc` runs `cd frontend && npm ci && npm run build`, deploys `frontend/dist` as assets, and runs `worker/index.js` for `/api/*` routes. Do not set the asset/output directory to raw `frontend/`, or Cloudflare will upload source files instead of the built app.

**Realtime:** In Supabase → **Database → Replication**, add `public.markets` so the app’s `postgres_changes` subscription can invalidate TanStack Query when odds update.

**Seed data:** Run `supabase/seed.sql` after the schema. It uses `on conflict (slug) do update`, so rerunning it will not fail with duplicate slug errors.

**Worker writes:** Set `SUPABASE_SERVICE_ROLE_KEY` as a Cloudflare secret so `/api/waitlist` can upsert leads and checkout can optionally write `checkout_sessions`. Keep it server-only.

**Auth:** In Supabase → **Authentication → Providers**, enable **Email**. Add your deployed URL under **Authentication → URL Configuration → Site URL** so email confirmations return to Vortx.

**Payments:** Stripe Checkout Sessions are created by `frontend/functions/api/stripe-checkout.js`. Add `STRIPE_SECRET_KEY` plus the Price IDs below to Cloudflare Pages. Do not put `STRIPE_SECRET_KEY` in `VITE_*` variables or source code.

```bash
STRIPE_PRODUCT_ID=prod_TzZv53ND7BGNVx
STRIPE_NEBULA_PRICE_ID=price_1T2dlORsNB149jDMOFi1srU3
STRIPE_SUPERNOVA_PRICE_ID=price_1T2do0RsNB149jDMqCTT0toh
STRIPE_GALACTIC_PRICE_ID=price_1T2dnERsNB149jDMP1oVyzRT
STRIPE_CUSTOM_PRICE_ID=price_1T5tBXRsNB149jDMLBCEMKYb
STRIPE_CUSTOM_MODE=payment
STRIPE_SECRET_KEY=<your Stripe secret key from dashboard>
```

**Bots:** After deploy, visit `/api/oracle-bot?event=Fed%20cuts%20before%20Oct%201&probability=42&market=fed-cut-q3&dryRun=1`. Set `BOT_ADMIN_TOKEN` in Cloudflare Pages to require `Authorization: Bearer <token>` for the endpoint. Live posting intentionally returns `501` until you add an X/Farcaster adapter.

### Local development

```bash
cd frontend
cp .env.example .env.local   # add Supabase URL + publishable key
npm install
npm run dev
```

### Git hooks (block IDE attribution on commits)

After cloning this repo, run once from the repo root:

```bash
./scripts/setup-git-hooks.sh
```

That sets `core.hooksPath` to `.githooks`. The **`commit-msg` hook strips IDE attribution trailers** if anything injects them, then finishes the commit. Do **not** rely on attribution trailers—plain `-m` messages only.

### Workspace pointer

The parent [README](../README.md) lists other clones and tools in **vibe-seo**. Optional **`workers/`** (bots) and **`extension/`** (news overlays) can live alongside `frontend/` as you add them.
