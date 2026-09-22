from __future__ import annotations

import re


LEGAL_SUFFIXES = re.compile(r"\b(incorporated|inc|llc|ltd|corp|corporation|company|co)\b\.?", re.IGNORECASE)


def normalize_entity_name(value: str) -> str:
    compact = " ".join(value.strip().split())
    without_suffix = LEGAL_SUFFIXES.sub("", compact)
    without_punctuation = re.sub(r"[^a-zA-Z0-9\s]", " ", without_suffix)
    return " ".join(without_punctuation.split()).casefold()


def alias_confidence(candidate: str, canonical: str) -> float:
    if not candidate or not canonical:
        return 0.0
    if candidate == canonical:
        return 100.0
    if normalize_entity_name(candidate) == normalize_entity_name(canonical):
        return 92.0
    candidate_tokens = set(normalize_entity_name(candidate).split())
    canonical_tokens = set(normalize_entity_name(canonical).split())
    if not candidate_tokens or not canonical_tokens:
        return 0.0
    overlap = len(candidate_tokens & canonical_tokens) / len(candidate_tokens | canonical_tokens)
    return round(overlap * 100, 2)
