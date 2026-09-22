# litigation-ingest

Compliance-first ingestion framework for Litigation Lightning.

The service is intentionally adapter-based. Public APIs, bulk downloads, RSS feeds, and licensed datasets should ship first. Portal scrapers should stay disabled until source terms, rate limits, and legal review are documented in `source_catalog`.

## Commands

```bash
uv sync
python -m unittest
python -m litigation_ingest.cli run --source fixture
```
