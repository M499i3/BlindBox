#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fail if frontend source contains mojibake placeholders like ???? in string literals."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"

# Literal ???? in quotes usually means a corrupted Chinese edit on Windows.
MOJIBAKE = re.compile(r"""['"`][^'"`]*\?{4,}[^'"`]*['"`]""")

EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".css"}


def main() -> int:
    failures: list[str] = []
    for path in sorted(FRONTEND.rglob("*")):
        if path.suffix not in EXTENSIONS or not path.is_file():
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            failures.append(f"{path.relative_to(ROOT)}: not valid UTF-8 ({exc})")
            continue
        for line_no, line in enumerate(text.splitlines(), 1):
            if "????" in line or MOJIBAKE.search(line):
                failures.append(f"{path.relative_to(ROOT)}:{line_no}: {line.strip()[:120]}")

    if failures:
        print("UTF-8 / mojibake check failed:\n", file=sys.stderr)
        for item in failures:
            print(f"  - {item}", file=sys.stderr)
        print(
            "\nTip: edit Chinese UI copy with UTF-8 (see .cursor/rules/frontend-utf8.mdc).",
            file=sys.stderr,
        )
        return 1

    print("UTF-8 check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
