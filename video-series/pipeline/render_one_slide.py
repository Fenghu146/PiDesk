#!/usr/bin/env python3
"""
单页演示管线：HTML 幻灯片 → 截图 → Edge-TTS → ffmpeg 合成 MP4

用法：
  python render_one_slide.py
  python render_one_slide.py --slide ../decks/EP01/slides/03-pain.html --text "先问一个问题。你平时有几个正在开发的项目？"
"""
from __future__ import annotations

import argparse
import asyncio
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent
DEFAULT_SLIDE = ROOT.parent / "decks" / "EP01" / "slides" / "02-hook.html"
DEFAULT_TEXT = (
    "如果你已经在用 pi、Cursor 或者 Claude Code 写代码，"
    "你一定会遇到一个问题——切换项目、管理会话、回看历史，全靠命令行，非常痛苦。"
    "今天我要介绍的工具，叫 PiDeck。"
)
VOICE = "zh-CN-YunxiNeural"
RATE = "-10%"
PITCH = "-2Hz"


def screenshot_html(html: Path, out_png: Path) -> None:
    """用 Playwright Chromium 截 1920x1080 幻灯片。"""
    from playwright.sync_api import sync_playwright

    out_png.parent.mkdir(parents=True, exist_ok=True)
    chrome_exe = Path.home() / "AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe"
    with sync_playwright() as p:
        launch_kwargs = {"headless": True}
        if chrome_exe.exists():
            launch_kwargs["executable_path"] = str(chrome_exe)
        browser = p.chromium.launch(**launch_kwargs)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto(html.resolve().as_uri(), wait_until="networkidle")
        page.screenshot(path=str(out_png), full_page=False)
        browser.close()
    if not out_png.exists():
        raise SystemExit(f"截图失败: {out_png}")


async def tts(text: str, out_mp3: Path) -> None:
    import edge_tts

    communicate = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
    await communicate.save(str(out_mp3))


def compose(png: Path, mp3: Path, out_mp4: Path) -> None:
    """静帧 + 旁白合成视频，时长跟音频对齐。"""
    cmd = [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        str(png),
        "-i",
        str(mp3),
        "-c:v",
        "libx264",
        "-tune",
        "stillimage",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-shortest",
        "-movflags",
        "+faststart",
        str(out_mp4),
    ]
    subprocess.run(cmd, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slide", type=Path, default=DEFAULT_SLIDE)
    parser.add_argument("--text", type=str, default=DEFAULT_TEXT)
    parser.add_argument("--out-dir", type=Path, default=ROOT / "demo")
    args = parser.parse_args()

    out_dir = args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    png = out_dir / "slide.png"
    mp3 = out_dir / "voice.mp3"
    mp4 = out_dir / "preview.mp4"

    print(f"[1/3] 截图 {args.slide.name}")
    screenshot_html(args.slide, png)
    print(f"  -> {png} ({png.stat().st_size} bytes)")

    print(f"[2/3] TTS  {VOICE} {RATE}")
    asyncio.run(tts(args.text, mp3))
    print(f"  -> {mp3} ({mp3.stat().st_size} bytes)")

    print("[3/3] ffmpeg 合成")
    compose(png, mp3, mp4)
    print(f"  -> {mp4} ({mp4.stat().st_size} bytes)")
    print("完成。用播放器打开 preview.mp4 查看效果。")


if __name__ == "__main__":
    main()
