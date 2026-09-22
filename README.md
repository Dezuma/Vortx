# Vortx Litigation Lightning

Vortx is a B2B legal-friction intelligence platform. The product aggregates public or licensed records, normalizes them into entity timelines, computes a transparent Friction Score, and sells early warning workflows to professional subscribers.

This is not a consumer wagering product. It is a Predictive Friction DaaS product for public-record discovery, watchlists, source transparency, and alerts.

## Product Surfaces

| Surface | Purpose |
|------|---------|
| Litigation Lightning Feed | Subscriber dashboard for high-friction entities and recent legal-record events. |
| Entity Timeline | Evidence-linked view of filings, liens, notices, aliases, and score history. |
| Watchlists | Subscriber-owned monitoring for companies, LLCs, tickers, and registered agents. |
| Source Transparency | Public/source registry showing access method, record type, cadence, and review status. |
| Stripe Checkout | Preserved subscription endpoint for paid tiers. |

## Repo Map

| Path | Purpose |
|------|---------|
| [`frontend/`](./frontend/) | React/Vite/Tailwind B2B dashboard. |
| [`worker/index.js`](./worker/index.js) | Cloudflare Worker entrypoint for assets and APIs. |
| [`frontend/functions/api/`](./frontend/functions/api/) | Worker-compatible API handlers. |
| [`frontend/functions/lib/`](./frontend/functions/lib/) | Shared Worker env and Supabase REST helpers. |
| [`supabase/schema.sql`](./supabase/schema.sql) | Database schema, RLS, and indexes. |
| [`supabase/seed.sql`](./supabase/seed.sql) | Fixture data for the first dashboard and ingest tests. |
| [`services/litigation-ingest/`](./services/litigation-ingest/) | Python ingestion, normalization, and scoring service. |
| [`.dev.vars.example`](./.dev.vars.example) | Local Worker env template. Real `.dev.vars` stays gitignored. |
| [`frontend/.env.example`](./frontend/.env.example) | Browser/server env template for Vite and Worker deploys. |

## Commands

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run build
```

Ingest service:

```bash
cd services/litigation-ingest
python -m unittest
python -m litigation_ingest.cli run --source fixture
```

Deploy from the project root:

```bash
cd /home/dbz/vibe-seo/vortx
npm install
./vortx deploy
```

## Environment Names

- `PUBLIC_SITE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_PRODUCT_ID`
- `STRIPE_NEBULA_PRICE_ID`
- `STRIPE_SUPERNOVA_PRICE_ID`
- `STRIPE_GALACTIC_PRICE_ID`
- `STRIPE_CUSTOM_PRICE_ID`
- `STRIPE_CUSTOM_MODE`
- `STRIPE_SECRET_KEY`

Never commit real secrets.

## Legal Posture

Vortx aggregates public or licensed records and facilitates discovery. Filings, liens, notices, and proceedings are allegations or administrative artifacts, not judgments. Vortx does not provide legal, financial, credit, collection, trading, or investment advice.
