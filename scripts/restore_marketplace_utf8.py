# -*- coding: utf-8 -*-
"""Restore Marketplace.tsx UTF-8 from git and re-apply navigation/UI patches."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend/presentation/pages/Marketplace.tsx"

base = subprocess.check_output(
    ["git", "show", "8208f1c:frontend/presentation/pages/Marketplace.tsx"]
).decode("utf-8")

# --- navigation: navigateWithReturn ---
replacements = [
    (
        "      navigate(`/listing/${item.id}`, { state: { from: homeReturnPath } });",
        "      navigateWithReturn(navigate, `/listing/${item.id}`, location, { from: homeReturnPath });",
    ),
    (
        "    [navigate, homeReturnPath]",
        "    [navigate, location, homeReturnPath]",
    ),
    (
        "            onClick={() => navigate('/cart')}",
        "            onClick={() => navigateWithReturn(navigate, '/cart', location)}",
    ),
    (
        "              navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');",
        """              navigateWithReturn(
                navigate,
                q ? `/search?q=${encodeURIComponent(q)}` : '/search',
                location
              );""",
    ),
    (
        "            onClick={() => navigate('/search')}",
        "            onClick={() => navigateWithReturn(navigate, '/search', location)}",
    ),
    (
        "                  onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}",
        """                  onClick={() =>
                    navigateWithReturn(navigate, `/search?q=${encodeURIComponent(tag)}`, location)
                  }""",
    ),
    (
        "          onClick={() => navigate('/add-listing')}",
        "          onClick={() => navigateWithReturn(navigate, '/add-listing', location)}",
    ),
]

t = base
for old, new in replacements:
    if old not in t:
        raise SystemExit(f"missing patch anchor:\n{old[:80]}")
    t = t.replace(old, new, 1)

# --- banner styling ---
t = t.replace(
    'className="flex h-[200px] w-full flex-col overflow-hidden rounded-2xl border-[2.5px] border-outline bg-white text-left shadow-[6px_6px_0_#111] transition-transform active:scale-[0.99] active:shadow-[4px_4px_0_#111]"',
    'className="home-banner-btn flex h-[200px] w-full flex-col overflow-hidden rounded-2xl border-[2.5px] border-outline bg-white text-left transition-transform active:scale-[0.99]"',
)
t = t.replace(
    'className="mb-0.5 text-2xl font-extrabold text-on-background"',
    'className="mb-0.5 text-2xl font-extrabold text-accent-coral"',
)

# --- trending tags section ---
t = t.replace(
    '<h2 className="text-lg font-semibold text-on-surface mb-3">\u71b1\u9580\u6a19\u7c64</h2>',
    '<h2 className="mb-stack-lg text-2xl font-semibold text-on-surface">\u71b1\u9580\u6a19\u7c64</h2>',
)
t = t.replace(
    'text-xs font-bold text-on-surface-variant active:scale-95 transition-transform"',
    'text-xs font-bold text-accent-amber active:scale-95 transition-transform"',
)

# --- FAB blue hard shadow hook class ---
t = t.replace(
    'className="flex h-14 w-14 items-center justify-center rounded-full premium-gradient text-white active:scale-90 transition-transform"',
    'className="fab-listing-btn flex h-14 w-14 items-center justify-center rounded-full premium-gradient text-white active:scale-90 transition-transform"',
)

if "navigateWithReturn" not in t and "import { navigateWithReturn }" not in t:
    t = t.replace(
        "import { useListingCardActions } from '@/frontend/presentation/hooks/useListingCardActions';",
        "import { useListingCardActions } from '@/frontend/presentation/hooks/useListingCardActions';\n"
        "import { navigateWithReturn } from '@/frontend/shared/utils/routeNavigation';",
    )

OUT.write_text(t, encoding="utf-8", newline="\n")

# verify
text = OUT.read_text(encoding="utf-8")
assert "????" not in text, "still has ???? placeholders"
for needle in ["\u641c\u5c0b", "\u8cfc\u7269\u8eca", "\u71b1\u9580\u6a19\u7c64", "\u4ea4\u6613\u65b9\u5f0f"]:
    assert needle in text, f"missing {needle!r}"
print("restored", OUT)
