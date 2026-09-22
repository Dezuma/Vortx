-- Public-company ticker symbol for SEC-listed entities.
-- Tracked companies are stored in public.entities (product domain: "companies").
ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS ticker text;

CREATE INDEX IF NOT EXISTS idx_companies_ticker ON public.entities (ticker) WHERE ticker IS NOT NULL;
