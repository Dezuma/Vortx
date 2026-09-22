from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterable
import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from litigation_ingest.models import LegalEvent, RawRecord, SourceConfig


class SourceAdapter(ABC):
    source_slug: str = "unknown"

    def __init__(self, source: SourceConfig | None = None, env: dict[str, str] | None = None) -> None:
        self.source = source
        self.env = env or {}
        if source is not None:
            self.source_slug = source.id

    def ensure_collectable(self) -> None:
        if self.source is not None:
            self.source.ensure_collectable(self.env)

    @abstractmethod
    def fetch(self) -> Iterable[RawRecord]:
        """Fetch raw records from the source without mutating downstream state."""

    @abstractmethod
    def parse(self, records: Iterable[RawRecord]) -> Iterable[LegalEvent]:
        """Parse raw records into normalized legal events."""

    def run(self) -> list[LegalEvent]:
        self.ensure_collectable()
        return list(self.parse(self.fetch()))

    def request_json(self, url: str, headers: dict[str, str] | None = None, params: dict[str, str] | None = None) -> dict:
        full_url = f"{url}?{urlencode(params)}" if params else url
        request = Request(full_url, headers={"user-agent": "VortxmktIngest/0.1", **(headers or {})})
        with urlopen(request, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))
