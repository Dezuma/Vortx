# Vortx

**Vortx** is a vibe-seo workspace project: automated news-to-probability surfaces and prediction-market-style trading (macro, tech, geopolitics—not crypto-only).

## Stack (production-shaped)

See **[STACK.md](./STACK.md)** — **Cloudflare Pages** for the **Vite + Tailwind** app, **Supabase** for data/realtime/RLS, **TanStack Query** on the client. The same doc explains **website + funnel + systems** so traffic turns into leads reliably.

| Path | Purpose |
|------|---------|
| [STACK.md](./STACK.md) | Cloudflare Pages deploy, Supabase envs, SPA `_redirects`, brand/funnel/systems framing. |
| [GROWTH.md](./GROWTH.md) | Utility-first distribution (oracle bot, overlays, incentives, paper leagues). |
| [`frontend/`](./frontend/) | Web app (`npm run dev`). |
| [`supabase/schema.sql`](./supabase/schema.sql) | Starter SQL (apply in Supabase). |

### Deploy on Cloudflare Pages

1. In the [Cloudflare dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Select this repository and set **Root directory** to **`vortx/frontend`**.
3. Build command: **`npm run build`**. Build output directory: **`dist`**.
4. Under **Settings → Environment variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (see `frontend/.env.example`).

`frontend/public/_redirects` is emitted into `dist` so SPA routes work on Pages.

**Realtime:** In Supabase → **Database → Replication**, add `public.markets` so the app’s `postgres_changes` subscription can invalidate TanStack Query when odds update.

### Local development

```bash
cd vortx/frontend
cp .env.example .env.local   # add Supabase URL + publishable key
npm install
npm run dev
```

### Git hooks (block Cursor attribution on commits)

After cloning this repo, run once from the repo root:

```bash
./scripts/setup-git-hooks.sh
```

That sets `core.hooksPath` to `.githooks`. The `commit-msg` hook rejects messages or trailers such as `Made-with: Cursor`. Do **not** use `git commit --trailer "Made-with: Cursor"` (or similar).

### Workspace pointer

The parent [README](../README.md) lists other clones and tools in **vibe-seo**. Optional **`workers/`** (bots) and **`extension/`** (news overlays) can live alongside `frontend/` as you add them.
