#!/usr/bin/env python3
"""
把已渲染的 EP01~EP06 成片按顺序拼成合集。

用法（在仓库根目录）：
  python video-series/pipeline/concat_series.py
  python video-series/pipeline/concat_series.py --eps EP01 EP02 EP03
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent
DEFAULT_EPS = ["EP01", "EP02", "EP03", "EP04", "EP05", "EP06"]


def concat_videos(clips: list[Path], out_mp4: Path) -> None:
    list_file = out_mp4.parent / "series_concat_list.txt"
    lines = []
    for c in clips:
        p = c.resolve().as_posix().replace("'", r"'\''")
        lines.append(f"file '{p}'")
    list_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(list_file),
        "-c",
        "copy",
        str(out_mp4),
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--eps", nargs="+", default=DEFAULT_EPS)
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "PiDeck-full-series.mp4",
    )
    args = parser.parse_args()

    clips: list[Path] = []
    for ep in args.eps:
        p = ROOT / ep / f"{ep}-full.mp4"
        if not p.exists():
            raise SystemExit(f"缺少成片: {p}（请先 python render_episode.py --ep {ep}）")
        clips.append(p)
        print(f"  + {p.relative_to(ROOT.parent)}")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    print(f"拼接 {len(clips)} 集 -> {args.out}")
    concat_videos(clips, args.out)
    print(f"完成: {args.out} ({args.out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
