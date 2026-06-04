"""產品線系列名：由商品標題推斷（與 frontend/shared/utils/catalogHierarchy deriveSeriesName 對齊）"""

from __future__ import annotations

import re

from domain.series_title_rules import match_series_from_title_rules

FALLBACK_SERIES = "未分系列"

_SERIES_SUFFIX_RE = re.compile(
    r"(手辦|公仔|手办|盲盒|模型|挂件|掛件|周邊|周边)$"
)
# 系列名前綴：含英文標點（如 CHEER UP, BABY!系列）
_SERIES_NAME_CHARS = r"A-Za-z0-9\u4e00-\u9fff ×xX·\-\(\)（）,!?&+#:%@'\""
_SERIES_NAME_RE = re.compile(rf"([{_SERIES_NAME_CHARS}]{{2,48}}?系列)")


def derive_series_name(title: str) -> str:
    raw = (title or "").strip()
    manual = match_series_from_title_rules(raw)
    if manual:
        return manual
    cleaned = re.sub(r"^泡泡萌粒\s*", "", raw)
    cleaned = _SERIES_SUFFIX_RE.sub("", cleaned).strip()
    m = _SERIES_NAME_RE.search(cleaned)
    return m.group(1).strip() if m else FALLBACK_SERIES


_SLUG_MAX_LEN = 120
# 與 derive_series_name 字元集對齊；保留中文避免多個系列都變成 unknown
_SLUG_SAFE_RE = re.compile(r"[^a-z0-9\u4e00-\u9fff]+")


def slugify_label(label: str) -> str:
    text = (label or "").strip()
    if not text:
        return "unknown"
    slug = _SLUG_SAFE_RE.sub("-", text.lower()).strip("-")
    slug = re.sub(r"-+", "-", slug).strip("-")
    if len(slug) > _SLUG_MAX_LEN:
        slug = slug[:_SLUG_MAX_LEN].rstrip("-")
    return slug or "unknown"
