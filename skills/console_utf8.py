"""Force UTF-8 stdout/stderr — Windows consoles default to cp1252 and crash on
emoji / box-drawing characters used throughout the pipeline output.

Call `force_utf8()` once at the top of any script's entry point.
"""

from __future__ import annotations

import sys


def force_utf8() -> None:
    """Reconfigure stdout/stderr to UTF-8 with replacement, where supported."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure:
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except (ValueError, OSError):
                pass
