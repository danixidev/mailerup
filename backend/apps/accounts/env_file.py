"""Read and write keys in the project ``.env`` file at runtime.

Used to persist SMTP credentials to ``.env`` (instead of the database) when an
admin saves them from the web UI. Values are also pushed into ``os.environ`` so
the change takes effect in the current process without a restart; other server
processes pick up the change because the senders read the ``.env`` file fresh.

The ``.env`` lives at ``BASE_DIR/.env`` — the same path Django reads on startup
(see ``settings/base.py``) — and is gitignored, so it survives ``update.sh``.
"""
import os
import re
from pathlib import Path

from django.conf import settings

ENV_PATH = Path(settings.BASE_DIR) / ".env"

_KEY_RE = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=")


def _strip_quotes(value):
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        return value[1:-1]
    return value


def read_env_file():
    """Parse the ``.env`` file into a dict (quotes stripped). Missing file → {}."""
    data = {}
    if not ENV_PATH.exists():
        return data
    for raw in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export "):]
        if "=" not in line:
            continue
        key, val = line.split("=", 1)
        data[key.strip()] = _strip_quotes(val)
    return data


def _to_str(value):
    if isinstance(value, bool):
        return "True" if value else "False"
    return "" if value is None else str(value)


def update_env(mapping):
    """Insert/replace the given keys in ``.env`` and in ``os.environ``.

    String values are single-quoted in the file so spaces and special chars
    (``#``, ``=`` …) in SMTP passwords survive round-trips. Other lines and
    comments in the file are left untouched.
    """
    lines = []
    if ENV_PATH.exists():
        lines = ENV_PATH.read_text(encoding="utf-8").splitlines()

    positions = {}
    for i, line in enumerate(lines):
        m = _KEY_RE.match(line)
        if m:
            positions[m.group(1)] = i

    for key, value in mapping.items():
        raw = _to_str(value)
        os.environ[key] = raw
        file_line = f"{key}='{raw}'"
        if key in positions:
            lines[positions[key]] = file_line
        else:
            lines.append(file_line)

    content = "\n".join(lines).rstrip("\n") + "\n"
    ENV_PATH.write_text(content, encoding="utf-8")
