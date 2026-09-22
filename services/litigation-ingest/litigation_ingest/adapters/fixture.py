from __future__ import annotations

from collections.abc import Iterable
from datetime import date, datetime, timezone

from litigation_ingest.adapters.base import SourceAdapter
from litigation_ingest.models import LegalEvent, RawRecord


class FixtureAdapter(SourceAdapter):
    source_slug = "fixture"

    def fetch(self) -> Iterable[RawRecord]:
        retrieved_at = datetime.now(timezone.utc)
        rows = [
            {
                "id": "fixture-neon-lien",
                "entity": "Neon Systems Inc.",
                "event_type": "mechanics_lien",
                "title": "Mechanics lien references Neon Systems",
                "summary": "Fixture lien record for scoring and normalization tests.",
                "jurisdiction": "DE",
                "filing_date": "2026-05-01",
                "amount": 125000.0,
                "severity": 82,
                "confidence": 86,
                "source_url": "https://example.invalid/fixture-neon-lien",
            },
            {
                "id": "fixture-blue-harbor-warn",
                "entity": "Blue Harbor Construction LLC",
                "event_type": "warn_notice",
                "title": "WARN notice references Blue Harbor",
                "summary": "Fixture WARN notice for scoring and normalization tests.",
                "jurisdiction": "IL",
                "filing_date": "2026-04-25",
                "amount": None,
                "severity": 66,
                "confidence": 82,
                "source_url": "https://example.invalid/fixture-blue-harbor-warn",
            },
        ]
        for row in rows:
            yield RawRecord(
                source_slug=self.source_slug,
                source_record_id=str(row["id"]),
                fetched_url=str(row["source_url"]),
                retrieved_at=retrieved_at,
                payload=row,
            )

    def parse(self, records: Iterable[RawRecord]) -> Iterable[LegalEvent]:
        for record in records:
            payload = record.payload
            yield LegalEvent(
                entity_name=str(payload["entity"]),
                source_slug=record.source_slug,
                source_record_id=record.source_record_id,
                event_type=str(payload["event_type"]),
                title=str(payload["title"]),
                summary=str(payload["summary"]),
                jurisdiction=str(payload["jurisdiction"]),
                filing_date=date.fromisoformat(str(payload["filing_date"])),
                amount=payload.get("amount"),
                severity=int(payload["severity"]),
                confidence=float(payload["confidence"]),
                evidence_url=str(payload["source_url"]),
            )
