"""手動系列標題規則：款式名稱含關鍵字即歸入指定系列（不需「系列」二字）。"""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]
_DEFAULT_RULES_PATH = _REPO_ROOT / "frontend" / "data" / "series-title-rules.json"


@dataclass(frozen=True)
class SeriesTitleRule:
    series_name: str
    title_contains: str


def _rules_path() -> Path:
    return _DEFAULT_RULES_PATH


@lru_cache(maxsize=1)
def load_series_title_rules(path: str | None = None) -> tuple[SeriesTitleRule, ...]:
    file_path = Path(path) if path else _rules_path()
    if not file_path.is_file():
        return ()
    data = json.loads(file_path.read_text(encoding="utf-8"))
    raw_rules = data.get("rules") if isinstance(data, dict) else data
    if not isinstance(raw_rules, list):
        return ()
    rules: list[SeriesTitleRule] = []
    for item in raw_rules:
        if not isinstance(item, dict):
            continue
        name = str(item.get("seriesName") or item.get("series_name") or "").strip()
        needle = str(item.get("titleContains") or item.get("title_contains") or "").strip()
        if name and needle:
            rules.append(SeriesTitleRule(series_name=name, title_contains=needle))
    rules.sort(key=lambda r: len(r.title_contains), reverse=True)
    return tuple(rules)


def match_series_from_title_rules(title: str, rules: tuple[SeriesTitleRule, ...] | None = None) -> str | None:
    text = (title or "").strip()
    if not text:
        return None
    for rule in rules or load_series_title_rules():
        if rule.title_contains in text:
            return rule.series_name
    return None


def reload_series_title_rules() -> None:
    load_series_title_rules.cache_clear()
