from __future__ import annotations

from collections import Counter
from datetime import date

from litigation_ingest.models import ALLEGATION_DISCLAIMER, FrictionScore, LegalEvent


TYPE_WEIGHTS = {
    "bankruptcy_adversary": 38,
    "notice_of_intent": 34,
    "mechanics_lien": 28,
    "judgment": 30,
    "civil_docket": 22,
    "ucc": 18,
    "regulatory_notice": 24,
    "warn_notice": 16,
}


def _recency_boost(filing_date: date, today: date) -> int:
    age = max(0, (today - filing_date).days)
    if age <= 7:
        return 18
    if age <= 30:
        return 12
    if age <= 90:
        return 6
    return 0


def score_entity(entity_name: str, events: list[LegalEvent], today: date | None = None) -> FrictionScore:
    today = today or date.today()
    if not events:
        return FrictionScore(entity_name=entity_name, score=0, confidence=0, trend="flat")

    raw_score = 0
    confidence_values = []
    category_counter: Counter[str] = Counter()
    reasons: list[dict[str, int | str]] = []

    for event in events:
        base = TYPE_WEIGHTS.get(event.event_type, 12)
        amount_boost = 12 if event.amount and event.amount >= 100_000 else 0
        recency = _recency_boost(event.filing_date, today)
        contribution = min(70, base + amount_boost + recency + int(event.severity * 0.15))
        raw_score += contribution
        confidence_values.append(event.confidence)
        category_counter[event.event_type] += contribution
        reasons.append({"label": event.title, "weight": contribution})

    velocity_bonus = min(20, max(0, len(events) - 1) * 8)
    score = min(100, raw_score + velocity_bonus)
    confidence = round(sum(confidence_values) / len(confidence_values))
    trend = "up" if score >= 60 else "flat"
    category_scores = {k: min(100, v) for k, v in category_counter.items()}

    return FrictionScore(
        entity_name=entity_name,
        score=score,
        confidence=confidence,
        trend=trend,
        reasons=reasons[:3],
        category_scores=category_scores,
    )


def score_entity_events(events: list[LegalEvent], today: date | None = None) -> dict:
    if not events:
        return {
            "score": 0,
            "confidence": 0,
            "trend": "flat",
            "reasons": [],
            "category_scores": {},
            "allegation_disclaimer": ALLEGATION_DISCLAIMER,
            "model_version": "friction-v1",
        }

    entity_name = events[0].entity_name
    score = score_entity(entity_name, events, today).__dict__
    score["allegation_disclaimer"] = ALLEGATION_DISCLAIMER
    return score
