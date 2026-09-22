from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from hashlib import sha256
import json
from typing import Any


ALLEGATION_DISCLAIMER = "This record is an allegation or administrative filing, not a judgment."


@dataclass(frozen=True)
class SourceConfig:
    id: str
    name: str
    jurisdiction: str
    record_type: str
    access_method: str
    terms_status: str
    enabled: bool
    source_url: str
    adapter_kind: str = "manual"
    rate_limit_per_hour: int = 60
    auth_env_var: str | None = None
    terms_reviewed_at: datetime | None = None
    disabled_reason: str | None = None
    config: dict[str, Any] = field(default_factory=dict)

    def ensure_collectable(self, env: dict[str, str] | None = None) -> None:
        if not self.enabled:
            raise ValueError(f"source_disabled:{self.id}")
        if self.terms_status == "blocked":
            raise ValueError(f"source_blocked:{self.id}")
        if self.access_method == "approved_portal" and self.terms_status != "approved":
            raise ValueError(f"portal_source_not_approved:{self.id}")
        if self.auth_env_var and env is not None and not env.get(self.auth_env_var):
            raise ValueError(f"source_missing_auth:{self.id}:{self.auth_env_var}")
        if self.disabled_reason:
            raise ValueError(f"source_disabled_reason:{self.id}:{self.disabled_reason}")


@dataclass(frozen=True)
class RawRecord:
    source_slug: str
    source_record_id: str
    fetched_url: str
    retrieved_at: datetime
    payload: dict[str, Any]

    @property
    def payload_hash(self) -> str:
        stable_payload = json.dumps(self.payload, sort_keys=True, separators=(",", ":"))
        return sha256(f"{self.source_slug}:{self.source_record_id}:{stable_payload}".encode("utf-8")).hexdigest()

    @property
    def source_id(self) -> str:
        return self.source_slug

    @property
    def source_timestamp(self) -> datetime:
        return self.retrieved_at


@dataclass(frozen=True)
class Entity:
    canonical_name: str
    entity_type: str = "company"
    ticker: str | None = None
    jurisdiction: str | None = None
    aliases: tuple[str, ...] = ()


@dataclass(frozen=True)
class LegalEvent:
    entity_name: str
    source_slug: str
    source_record_id: str
    event_type: str
    title: str
    summary: str
    jurisdiction: str
    filing_date: date
    amount: float | None = None
    severity: int = 50
    confidence: float = 80.0
    evidence_url: str | None = None
    allegation_disclaimer: str = ALLEGATION_DISCLAIMER


@dataclass(frozen=True)
class NormalizedEvent:
    entity_name: str
    event_type: str
    title: str
    summary: str
    jurisdiction: str
    filing_date: date
    amount: float | None
    severity: int
    confidence: int
    source_url: str
    document_id: str
    aliases: tuple[str, ...] = field(default_factory=tuple)
    allegation_disclaimer: str = ALLEGATION_DISCLAIMER


@dataclass(frozen=True)
class FrictionScore:
    entity_name: str
    score: int
    confidence: int
    trend: str
    reasons: list[dict[str, Any]] = field(default_factory=list)
    category_scores: dict[str, int] = field(default_factory=dict)
    model_version: str = "friction-v1"
    computed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
