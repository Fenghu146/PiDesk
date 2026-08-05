#!/usr/bin/env python3
"""
把 docs/images 下的产品截图同步到 decks/assets，供 HTML 幻灯片引用。

用法（在仓库根目录）：
  python video-series/pipeline/sync_assets.py
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "docs" / "images"
DST = ROOT / "video-series" / "decks" / "assets"


def main() -> None:
    if not SRC.is_dir():
        raise SystemExit(f"源目录不存在: {SRC}")
    DST.mkdir(parents=True, exist_ok=True)
    count = 0
    for p in sorted(SRC.glob("*.png")):
        target = DST / p.name
        shutil.copy2(p, target)
        print(f"  {p.name} -> {target.relative_to(ROOT)}")
        count += 1
    print(f"同步完成：{count} 张 PNG")
    print(f"源: {SRC}")
    print(f"目标: {DST}")


if __name__ == "__main__":
    main()
