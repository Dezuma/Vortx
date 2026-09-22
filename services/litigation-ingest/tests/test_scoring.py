from datetime import date
import unittest

from litigation_ingest.adapters.fixture import FixtureAdapter
from litigation_ingest.normalization import alias_confidence, normalize_entity_name
from litigation_ingest.scoring import score_entity, score_entity_events

class LitigationIngestTests(unittest.TestCase):
    def test_fixture_adapter_returns_events(self):
        events = FixtureAdapter().run()
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0].event_type, "mechanics_lien")

    def test_normalize_entity_name_removes_suffix(self):
        self.assertEqual(normalize_entity_name("Neon Systems, Inc."), "neon systems")
        self.assertGreater(alias_confidence("Neon Systems Inc", "Neon Systems"), 80)

    def test_score_entity_weights_recent_high_severity_event(self):
        events = FixtureAdapter().run()
        neon_events = [event for event in events if event.entity_name == "Neon Systems Inc."]
        score = score_entity("Neon Systems Inc.", neon_events, today=date(2026, 5, 8))
        self.assertGreaterEqual(score.score, 60)
        self.assertEqual(score.trend, "up")
        self.assertTrue(score.reasons)

    def test_score_entity_events_returns_dict(self):
        events = FixtureAdapter().run()
        score = score_entity_events(events, today=date(2026, 5, 8))
        self.assertIn("score", score)
        self.assertIn("model_version", score)

if __name__ == "__main__":
    unittest.main()
