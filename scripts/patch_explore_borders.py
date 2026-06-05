# -*- coding: utf-8 -*-
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend/presentation/pages/Explore.tsx"

data = subprocess.check_output(["git", "show", "HEAD:frontend/presentation/pages/Explore.tsx"])
OUT.write_bytes(data)
t = data.decode("utf-8")

patches = [
    (
        '<p className="text-[10px] font-black text-secondary tracking-wider uppercase mb-2">BRAND</p>',
        '<p className="text-[10px] font-black text-accent-coral tracking-wider uppercase mb-2">BRAND</p>',
    ),
    (
        "                                ? 'h-[96px] w-[96px] border-secondary opacity-100'\n"
        "                                : 'h-[72px] w-[72px] border-outline opacity-60'",
        "                                ? 'h-[96px] w-[96px] border-accent-coral opacity-100'\n"
        "                                : 'h-[72px] w-[72px] border-accent-coral/45 opacity-60'",
    ),
    (
        '<p className="text-[10px] font-black text-secondary tracking-wider uppercase">IP</p>',
        '<p className="text-[10px] font-black text-accent-amber tracking-wider uppercase">IP</p>',
    ),
    (
        "                                    ? 'h-[80px] w-[80px] border-secondary opacity-100'\n"
        "                                    : 'h-[60px] w-[60px] border-outline opacity-60'",
        "                                    ? 'h-[80px] w-[80px] border-accent-amber opacity-100'\n"
        "                                    : 'h-[60px] w-[60px] border-accent-amber/45 opacity-60'",
    ),
    (
        '<p className="text-[10px] font-black text-secondary tracking-wider uppercase">SERIES</p>',
        '<p className="text-[10px] font-black text-accent-sky tracking-wider uppercase">SERIES</p>',
    ),
]

for old, new in patches:
    if old not in t:
        raise SystemExit(f"missing:\n{old[:80]}")
    t = t.replace(old, new, 1)

# IP empty card (unique surrounding text)
ip_empty_old = (
    '                  <div className="glass-card rounded-2xl p-5">\n'
    "                    <p className=\"text-sm text-on-surface-variant\">"
    + "\u6b64\u54c1\u724c\u66ab\u7121\u53ef\u7528\u7684 IP \u8cc7\u6599\u3002"
    + "</p>"
)
ip_empty_new = (
    '                  <div className="glass-card rounded-2xl border-[2.5px] border-accent-amber p-5 shadow-[4px_4px_0_#111]">\n'
    "                    <p className=\"text-sm text-on-surface-variant\">"
    + "\u6b64\u54c1\u724c\u66ab\u7121\u53ef\u7528\u7684 IP \u8cc7\u6599\u3002"
    + "</p>"
)
if ip_empty_old not in t:
    raise SystemExit("ip empty block missing")
t = t.replace(ip_empty_old, ip_empty_new, 1)

OUT.write_text(t, encoding="utf-8", newline="\n")
assert "\u5716\u9451" in t
assert "????" not in t
print("ok")
