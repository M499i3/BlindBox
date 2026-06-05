#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Restore corrupted Chinese strings in Explore.tsx by line replacement."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "frontend/presentation/pages/Explore.tsx"

LINE_FIXES: dict[int, str] = {
    205: "                  ? '搜尋中…'",
    206: "                  : `「${activeQuery}」的結果${",
    208: "                        ? `（${searchResult.brands.length + searchResult.series.length + searchResult.products.length} 筆）`",
    216: "                <p className=\"text-sm text-on-surface-variant\">找不到符合的圖鑑內容，請試試其他關鍵字。</p>",
    222: "                <p className=\"text-[10px] font-black text-secondary tracking-wider uppercase mb-2\">品牌</p>",
    262: "                          <p className=\"text-[11px] text-on-surface-variant mt-1\">{s.count} 款</p>",
    274: "                <p className=\"text-[10px] font-black text-secondary tracking-wider uppercase mb-3\">盲盒</p>",
    438: "                        ? '此 IP 暫無可辨識的系列。'",
    439: "                        : '此 IP 暫無可辨識的系列名稱，請點上方 IP 或改用搜尋。'}",
}


def main() -> None:
    lines = TARGET.read_text(encoding="utf-8").splitlines()
    changed = False
    for line_no, content in LINE_FIXES.items():
        idx = line_no - 1
        if lines[idx] != content:
            lines[idx] = content
            changed = True
    if not changed:
        print("No changes needed.")
        return
    TARGET.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"Updated {TARGET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
