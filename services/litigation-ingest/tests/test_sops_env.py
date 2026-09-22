from __future__ import annotations

import os
import unittest

from litigation_ingest.sops_env import apply_env, parse_dotenv


class SopsEnvTests(unittest.TestCase):
    def test_parse_dotenv_should_return_keys_for_happy_path(self):
        parsed = parse_dotenv("FOO=one\nBAR=two\n")
        self.assertEqual(parsed, {"FOO": "one", "BAR": "two"})

    def test_parse_dotenv_should_skip_comments_and_blank_lines(self):
        parsed = parse_dotenv("# secret\n\nexport BAZ='quoted'\n")
        self.assertEqual(parsed, {"BAZ": "quoted"})
        self.assertNotIn("secret", parsed)

    def test_apply_env_should_not_overwrite_existing(self):
        os.environ["KEEP_ME"] = "original"
        loaded = apply_env({"KEEP_ME": "new", "FRESH": "added"})
        self.assertEqual(os.environ["KEEP_ME"], "original")
        self.assertEqual(os.environ["FRESH"], "added")
        self.assertEqual(loaded, ["FRESH"])
        os.environ.pop("FRESH", None)

    def test_parse_dotenv_should_return_empty_on_invalid_input(self):
        self.assertEqual(parse_dotenv(""), {})
        self.assertEqual(parse_dotenv("not a pair\n"), {})
