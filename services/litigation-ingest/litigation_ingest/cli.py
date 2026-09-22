"""CLI for fixture-backed ingest runs."""

from __future__ import annotations

import argparse
import json
import sys

from litigation_ingest.adapters.fixture import FixtureAdapter
from litigation_ingest.scoring import score_entity
from litigation_ingest.sops_env import load_project_env


def main(argv: list[str] | None = None) -> int:
    load_project_env()
    parser = argparse.ArgumentParser(prog="litigation-ingest")
    sub = parser.add_subparsers(dest="command")
    run = sub.add_parser("run", help="Run an adapter and print friction scores")
    run.add_argument("--source", default="fixture", choices=["fixture"])
    args = parser.parse_args(argv)

    if args.command != "run":
        parser.print_help()
        return 2

    adapter = FixtureAdapter()
    events = list(adapter.parse(adapter.fetch()))
    by_entity: dict[str, list] = {}
    for event in events:
        by_entity.setdefault(event.entity_name, []).append(event)
    for name, group in by_entity.items():
        print(json.dumps(score_entity(name, group).__dict__, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
