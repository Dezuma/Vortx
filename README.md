# Vortx

**Vortx** is a vibe-seo workspace project: automated news-to-probability surfaces and prediction-market-style trading (macro, tech, geopolitics—not crypto-only).

## Stack (production-shaped)

See **[STACK.md](./STACK.md)** — **Cloudflare Pages** for the **Vite + Tailwind** app, **Supabase** for data/realtime/RLS, **TanStack Query** on the client. The same doc explains **website + funnel + systems** so traffic turns into leads reliably.

| Path | Purpose |
|------|---------|
| [STACK.md](./STACK.md) | Cloudflare Pages deploy, Supabase/Stripe envs, bot checks, SPA `_redirects`, brand/funnel/systems framing. |
| [GROWTH.md](./GROWTH.md) | Utility-first distribution (oracle bot, overlays, incentives, paper leagues). |
| [`frontend/`](./frontend/) | Web app (`npm run dev`). |
| [`frontend/functions/`](./frontend/functions/) | Cloudflare Pages Functions for health and bot dry-run checks. |
| [`supabase/schema.sql`](./supabase/schema.sql) | Starter SQL (apply in Supabase). |

### Deploy on Cloudflare Pages

1. In the [Cloudflare dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select this repository and set **Root directory** to **`vortx/frontend`**.
3. Build command: **`npm run build`**. Build output directory: **`dist`**.
4. Under **Settings → Environment variables**, add Supabase, Stripe Payment Link, and bot variables (see `frontend/.env.example`).

`frontend/public/_redirects` is emitted into `dist` so SPA routes work on Pages.

**Realtime:** In Supabase → **Database → Replication**, add `public.markets` so the app’s `postgres_changes` subscription can invalidate TanStack Query when odds update.

**Payments:** In Stripe, create Payment Links for the Nebula, Supernova, Galactic, and customer-choice prices. Add the resulting `https://buy.stripe.com/...` URLs as `VITE_STRIPE_*_PAYMENT_LINK_URL` values in Cloudflare Pages. The app never needs `STRIPE_SECRET_KEY` for this first checkout iteration.

**Bots:** After deploy, visit `/api/oracle-bot?event=Fed%20cuts%20before%20Oct%201&probability=42&market=fed-cut-q3&dryRun=1`. Set `BOT_ADMIN_TOKEN` in Cloudflare Pages to require `Authorization: Bearer <token>` for the endpoint. Live posting intentionally returns `501` until you add an X/Farcaster adapter.

### Local development

```bash
cd vortx/frontend
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
