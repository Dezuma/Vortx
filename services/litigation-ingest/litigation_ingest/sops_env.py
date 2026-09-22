"""Load SOPS-encrypted dotenv files into os.environ without printing values."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

_AGE_KEY_DEFAULT = Path.home() / "Documents" / "Sensitive" / "age" / "keys.txt"


def parse_dotenv(text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key.startswith("export "):
            key = key[7:].strip()
        if not key or not key.replace("_", "").isalnum():
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[key] = value
    return values


def age_key_file() -> Path:
    override = (os.environ.get("SOPS_AGE_KEY_FILE") or "").strip()
    return Path(override) if override else _AGE_KEY_DEFAULT


def decrypt_sops_dotenv(path: Path, *, key_file: Path | None = None) -> dict[str, str]:
    if not shutil.which("sops"):
        raise FileNotFoundError("sops is not installed")
    key = key_file or age_key_file()
    if not key.is_file():
        raise FileNotFoundError("age key file is missing")
    env = os.environ.copy()
    env["SOPS_AGE_KEY_FILE"] = str(key)
    completed = subprocess.run(
        ["sops", "--decrypt", "--input-type", "dotenv", "--output-type", "dotenv", str(path)],
        check=False,
        capture_output=True,
        text=True,
        env=env,
        timeout=30,
    )
    if completed.returncode != 0:
        raise RuntimeError("sops decrypt failed")
    return parse_dotenv(completed.stdout)


def apply_env(values: dict[str, str], *, overwrite: bool = False) -> list[str]:
    loaded: list[str] = []
    for key, value in values.items():
        if not overwrite and key in os.environ:
            continue
        os.environ[key] = value
        loaded.append(key)
    return loaded


def load_project_env(root: Path | None = None) -> list[str]:
    base = Path(root) if root is not None else Path(__file__).resolve().parents[1]
    loaded: list[str] = []
    for path in (base / "env.sops.env", base / ".env"):
        if not path.is_file():
            continue
        if path.name.endswith(".sops.env"):
            loaded.extend(apply_env(decrypt_sops_dotenv(path)))
        else:
            loaded.extend(apply_env(parse_dotenv(path.read_text(encoding="utf-8"))))
        if loaded:
            return loaded
    return loaded
