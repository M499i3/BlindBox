"""Pop Mart 圖鑑 IP：由商品標題推斷（與 frontend/shared/utils/deriveIp.ts 對齊）"""

from __future__ import annotations

FALLBACK_IP = "其他 IP"

# (keyword, ip, mode)  mode: upper | title
_IP_RULES: list[tuple[str, str, str]] = [
    ("THE MONSTERS", "LABUBU", "upper"),
    ("SKULLPANDA", "SKULLPANDA", "upper"),
    ("CRYBABY", "CRYBABY", "upper"),
    ("星星人", "星星人", "title"),
    ("歡迎來到月球表面", "星星人", "title"),
    ("我們都是星星人", "星星人", "title"),
    ("HIRONO", "Hirono", "upper"),
    ("ZSIGA", "Zsiga", "upper"),
    ("PINO JELLY", "PINO JELLY", "upper"),
    ("LABUBU", "LABUBU", "upper"),
    ("HACIPUPU", "HACIPUPU", "upper"),
    ("PUCKY", "PUCKY", "upper"),
    ("DIMOO", "Dimoo", "upper"),
    ("MOLLY", "Molly", "upper"),
    ("CHAKA", "CHAKA", "upper"),
]


def derive_ip_label(title: str) -> str:
    t = (title or "").strip()
    if not t:
        return FALLBACK_IP
    upper = t.upper()
    compact = upper.replace(" ", "")
    for keyword, ip, mode in _IP_RULES:
        if mode == "upper":
            if keyword in upper or keyword.replace(" ", "") in compact:
                return ip
        elif keyword in t:
            return ip
    return FALLBACK_IP


derive_brand_label = derive_ip_label
