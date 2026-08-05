#!/usr/bin/env python3
"""
整集批量渲染：每页 HTML → 截图 → Edge-TTS → 单页 MP4 → concat 成完整视频

用法：
  python render_episode.py --ep EP01
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent
DECKS = ROOT.parent / "decks"
VOICE = "zh-CN-YunxiNeural"
RATE = "-10%"
PITCH = "-2Hz"

# 每集：slide 文件名 → 旁白（与 PPT 页面对齐，略口语化）
EPISODE_SCRIPTS: dict[str, list[tuple[str, str]]] = {
    "EP01": [
        (
            "01-cover.html",
            "PiDeck 上手系列第一集。PiDeck 是什么？为什么你需要它。",
        ),
        (
            "02-hook.html",
            "如果你已经在用 pi、Cursor 或者 Claude Code 写代码，"
            "你一定会遇到一个问题——切换项目、管理会话、回看历史，全靠命令行，非常痛苦。"
            "今天我要介绍的工具，叫 PiDeck。",
        ),
        (
            "03-pain.html",
            "先问一个问题。你平时有几个正在开发的项目？一个？两个？五个？"
            "如果超过一个，你就一定有这些烦恼：每个项目要开一个终端窗口，"
            "每个终端里的 AI 对话是独立的，你想回看上周写过的方案，却发现那个终端已经关了。"
            "更别说 Git 状态、文件浏览、模型切换，全都要在终端里敲命令。",
        ),
        (
            "04-what.html",
            "PiDeck 是一个桌面工作台，专门用来管理你的 pi Agent 会话。"
            "简单说，它在 pi 前面套了一个 Electron 壳，但你完全不需要管底层发生了什么。"
            "你只需要理解一件事：PiDeck 等于一个统一的地方，管理你所有项目的 AI 对话。"
            "来看一下真实界面。左侧是你的项目列表，中间是对话区，右侧是文件树和会话历史。",
        ),
        (
            "05-isolation.html",
            "最重要的是，每个项目完全隔离。"
            "项目 A 的上下文不会污染项目 B。"
            "你可以在多个项目之间自由切换，每个项目里的 AI 都记得你上次聊到哪。"
            "核心心智模型很简单：一个 Agent Tab，等于一个 pi 进程。",
        ),
        (
            "06-features.html",
            "PiDeck 支持多项目工作区、对话与上下文管理、Git 集成、内置终端、"
            "配置图形编辑器，以及中文提示词精选库。"
            "内置的 Prompt 商店有四千多中文提示词，一键就能导入。",
        ),
        (
            "07-compare.html",
            "简单总结一下。裸 pi CLI 的能力，PiDeck 全部保留。"
            "PiDeck 加的是图形化、多项目管理、会话可视化和 Git 集成。"
            "你可以把 PiDeck 理解为 pi 的 GUI 层。它不会限制你使用 pi 的任何功能。",
        ),
        (
            "08-audience.html",
            "那 PiDeck 适合谁呢？"
            "第一，如果你已经用 pi CLI 但觉得终端管理太麻烦，你是目标用户。"
            "第二，如果你之前用 Cursor 或 Windsurf，想找更轻量灵活的方案，PiDeck 值得试试。"
            "第三，如果你是团队开发，多项目切换是常态，PiDeck 的多项目隔离会省很多心。"
            "第四，如果你还在观望 AI 编程工具，PiDeck 是很好的起点，因为它免费开源，没有厂商锁定。",
        ),
        (
            "09-outro.html",
            "好，这一集到这里。"
            "下一集，我们直接上手——从下载安装到第一次启动，一步一步带你跑通。"
            "如果这个视频对你有帮助，点个赞、投个币，这是对我最大的支持。"
            "有问题评论区见。我是曹阿宇，我们下集见。",
        ),
    ],
    "EP02": [
        (
            "01-cover.html",
            "PiDeck 上手系列第二集。安装与环境检测。"
            "装好 Node、pi、PiDeck，打开后先完成 pi 环境检测，再谈项目与对话。",
        ),
        (
            "02-order.html",
            "正确安装顺序很重要。第一步安装 Node.js 二十或更高版本。"
            "第二步安装 pi 命令行。第三步再安装并打开 PiDeck，去做环境检测或自定义路径。"
            "记住：先把 pi 配通，再添加项目、启动 Agent。",
        ),
        (
            "03-links.html",
            "官方安装入口给你。Node.js 去 nodejs.org 中文下载页安装。"
            "pi 命令行请看 pi.dev 官方文档最新说明。"
            "装完后，在终端执行 node --version 和 pi --version 确认一下。",
        ),
        (
            "04-pideck.html",
            "然后去 GitHub Releases 下载对应系统的 PiDeck 安装包。"
            "Windows 下 exe，Mac 下 dmg，Linux 下 AppImage。"
            "安装完成后打开 PiDeck。首次打开时，会先做 pi 环境检测，这是最关键的一步。",
        ),
        (
            "05-env-check.html",
            "来看 pi 环境检测界面。PiDeck 会自动在系统路径和常见路径里查找 pi。"
            "如果检测不到，会给出安装指引，你也可以手动指定 pi 的可执行文件路径。"
            "用过 nvm、pnpm 或 mise 的朋友，经常需要手动粘贴路径。",
        ),
        (
            "06-dev-setting.html",
            "设置里也能管理 pi 路径。打开设置，进入开发设置。"
            "这里可以自定义 pi 路径、重置检测标记、触发重新检测。"
            "填好路径后点校验并使用；看到绿色的 Pi CLI 状态，就说明可用了。",
        ),
        (
            "07-checklist.html",
            "本集结束前确认四件事：Node.js 已安装，pi 已安装，PiDeck 已打开，"
            "环境检测通过或者已经自定义了 pi 路径。"
            "pi 连上了，下一集我们再配置模型与认证。",
        ),
        (
            "08-outro.html",
            "好，这一集到这里。下一集讲配置模型与认证："
            "Models 和 Auth 两种方式有什么区别，以及保存后怎么在底部切换模型。"
            "我是曹阿宇，我们下集见。",
        ),
    ],
    "EP03": [
        (
            "01-cover.html",
            "PiDeck 上手系列第三集。配置模型与认证。"
            "pi 通了还不够，还要告诉它用哪家模型、Key 怎么填。配好再开项目。",
        ),
        (
            "02-why.html",
            "为什么要先配模型，再开项目？因为 Agent 启动后要立刻能对话。"
            "模型没配好，项目开了也发不出有效请求。"
            "顺序是：环境可用，模型认证配好并保存，再添加项目启动 Agent。",
        ),
        (
            "03-two-modes.html",
            "配置有两种方式，别混。"
            "第一种是 Models 模型页：适合自定义供应商、中转、OpenAI 兼容接口，需要填 Base URL、API 类型和 API Key，再添加模型列表。"
            "第二种是 Auth 认证页：面向 pi 支持的官方直连，比如 DeepSeek、OpenCode 等，多数情况只需要 API Key，不用自己拼 Base URL。"
            "简单记：官方厂商优先 Auth，中转或自定义接口走 Models。",
        ),
        (
            "04-models-ui.html",
            "来看 Models 页的真实界面。可以先点配置指南。"
            "然后填 Base URL，选 API 类型，填 API Key，"
            "再获取模型列表或手动添加模型。"
            "最后一定要点保存，保存后才生效。",
        ),
        (
            "05-auth.html",
            "Auth 认证页更简单。它面向 pi 已经支持的官方提供商。"
            "DeepSeek、OpenCode 这类，通常只需填 API Key。"
            "记住分工：Auth 管官方直连凭证，Models 管供应商地址和模型列表。",
        ),
        (
            "06-zen-videos.html",
            "如果你想用 OpenCode Zen 的免费模型，可以先看我之前的 B 站演示视频："
            "如何在 PiDeck 中使用 OpenCode Zen 的免费模型。"
            "链接在幻灯片上，建议收藏，配模型时对照操作。",
        ),
        (
            "07-switch-bottom.html",
            "配置保存后，切换模型的位置在底部，不是顶部。"
            "进入会话界面后，在对话输入框底部点模型名，"
            "就可以切换模型和思考级别。"
            "下集会用真实界面演示：启动 Agent 后，在底部选模型并发消息。",
        ),
        (
            "08-outro.html",
            "好，这一集到这里。下一集：添加项目与第一次对话。"
            "左侧加号加目录，启动 Agent，底部选模型，发送消息。"
            "我是曹阿宇，我们下集见。",
        ),
    ],
    "EP04": [
        (
            "01-cover.html",
            "PiDeck 上手系列第四集。添加项目与第一次对话。"
            "pi 已通，模型已配。现在加本地项目、启动 Agent，发出第一条消息。",
        ),
        (
            "02-add-project.html",
            "先添加本地项目。点击左侧顶部的加号，选择一个本地项目目录。"
            "添加后，项目会出现在左侧列表。"
            "注意：加完目录还不会自动聊起来，还要启动 Agent。",
        ),
        (
            "03-start-agent.html",
            "启动 Agent 有几种方式。可以在侧栏项目行点加号，"
            "也可以在中间空白页点启动 Agent 按钮，"
            "右上角新会话区域也可以启动或重启。"
            "启动成功后进入会话界面，才能选模型、发消息。",
        ),
        (
            "04-first-msg.html",
            "来看会话底部。点模型名，切换模型以及思考级别。"
            "左边还可以切换普通模式或计划模式。"
            "输入内容，点发送。记住：模型选择在底部，不在顶部。",
        ),
        (
            "05-flow.html",
            "把前四集串起来：装 Node、装 pi、装 PiDeck；"
            "环境检测或自定义路径；配置 Models 或 Auth 并保存；"
            "左侧加号添加项目；启动 Agent，底部选模型，发送消息。",
        ),
        (
            "06-checklist.html",
            "确认你已经跑通：左侧有本地项目，Agent 已启动，"
            "底部能看到并切换模型，发出消息并收到回复。"
            "四项都 OK，基础闭环就完成了。",
        ),
        (
            "07-outro.html",
            "好，这一集到这里。下一集讲对话进阶："
            "文件引用、斜线命令，以及更高效的提问方式。"
            "我是曹阿宇，我们下集见。",
        ),
    ],
    "EP05": [
        (
            "01-cover.html",
            "PiDeck 上手系列第五集。对话进阶。"
            "会发消息只是起点。这一集讲艾特引用、斜线命令、Shell，以及一套更稳的提问方式。",
        ),
        (
            "02-specific.html",
            "有效对话从具体问题开始。"
            "不要只说你好，或者说帮我看看代码。"
            "要说清楚目标、文件和约束，比如看看某个文件有什么问题，或者给登录页加深色模式切换。",
        ),
        (
            "03-at-file.html",
            "文件引用很简单：在输入框输入艾特，选择项目文件。"
            "输入框提示里也能看到艾特文件。文件内容会进入上下文，不用复制粘贴。",
        ),
        (
            "04-slash.html",
            "斜线命令：输入斜杠，会弹出可用命令列表。"
            "常用的有 compact，用来压缩上下文、腾出 token。"
            "还有 session 等会话相关命令，可以自己探索。",
        ),
        (
            "05-shell.html",
            "Shell 命令：输入感叹号加命令，比如 git status。"
            "它在当前项目目录执行，输出回到对话区。"
            "适合快速核对状态、看 diff、跑测试。",
        ),
        (
            "06-stream.html",
            "回答支持 Markdown 和流式显示。"
            "下方活动轨迹会展示：读了哪些文件、跑了哪些命令、改了哪些代码。"
            "消息还能编辑和删除，prompt 写偏了可以改完重发。",
        ),
        (
            "07-workflow.html",
            "推荐工作流：底部确认模型和思考级别；"
            "艾特相关文件并提出具体需求；看活动轨迹和修改结果；"
            "用感叹号 git diff 核对变更；任务换主题时开新会话，避免上下文污染。",
        ),
        (
            "08-outro.html",
            "好，这一集到这里。下一集是进阶功能总览："
            "多项目、Git、终端、历史、Prompt 和设置。"
            "我是曹阿宇，我们下集见。",
        ),
    ],
    "EP06": [
        (
            "01-cover.html",
            "PiDeck 上手系列第六集，也是收官集。进阶功能总览。"
            "如果只用对话，大概只用了三成能力。这一集快速过完多项目、Git、终端、历史和设置。",
        ),
        (
            "02-workspace.html",
            "多项目工作区：左侧可以添加多个本地项目，随时切换。"
            "各项目上下文互不影响，项目 A 不会污染项目 B。"
            "在侧栏添加项目、切换进入，再启动 Agent 即可。",
        ),
        (
            "03-git-term.html",
            "同一界面里就能同时用到项目、Git 和终端。"
            "右侧是 Git 版本管理，可以看分支、变更和提交。"
            "底部是内置终端，可选 PowerShell、cmd、Git Bash 等。"
            "对话里的感叹号命令和终端，都在当前项目目录。",
        ),
        (
            "04-history.html",
            "会话历史是相对命令行最直观的提升之一。"
            "可以按项目浏览历史、一键恢复上下文，也可以导出记录方便归档。",
        ),
        (
            "05-prompt-settings.html",
            "Prompt 商店有中文提示词精选，支持分类搜索和一键导入。"
            "设置里有外观、代理、开发设置，包括 pi 路径和检测标记等。",
        ),
        (
            "06-compare.html",
            "和裸 pi 命令行比：PiDeck 保留全部原生能力，"
            "并补上多项目图形管理、会话历史可视化、Git 和终端面板，以及配置图形编辑器。",
        ),
        (
            "07-recap.html",
            "六集回顾：第一集是什么；第二集安装检测；第三集模型认证；"
            "第四集首个项目；第五集对话进阶；第六集进阶功能。"
            "到这里，PiDeck 的核心用法你已经全部掌握了。",
        ),
        (
            "08-outro.html",
            "系列到这里结束了。PiDeck 免费开源，觉得有用欢迎去 GitHub 点个 Star。"
            "也可以加入 QQ 交流群交流反馈。"
            "我是曹阿宇，感谢收看。我们下个系列见。",
        ),
    ],
}


def screenshot_html(html: Path, out_png: Path, page=None) -> None:
    """用 Playwright Chromium 截 1920x1080（Edge headless 在本机不稳）。"""
    out_png.parent.mkdir(parents=True, exist_ok=True)
    if page is not None:
        page.goto(html.resolve().as_uri(), wait_until="networkidle")
        page.screenshot(path=str(out_png), full_page=False)
    else:
        from playwright.sync_api import sync_playwright

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
    if not out_png.exists() or out_png.stat().st_size < 1000:
        raise SystemExit(f"截图失败: {out_png}")


def tts(text: str, out_mp3: Path) -> None:
    """子进程调用 edge-tts，避免宿主环境已有 event loop 时 asyncio.run 冲突。"""
    # 文案写临时文件，避免 Windows 命令行编码坑
    txt = out_mp3.with_suffix(".in.txt")
    txt.write_text(text, encoding="utf-8")
    # 负值必须写成 --rate=-10% 形式，否则 argparse 会把 -10% 当成未知选项
    cmd = [
        sys.executable,
        "-m",
        "edge_tts",
        f"--voice={VOICE}",
        f"--rate={RATE}",
        f"--pitch={PITCH}",
        f"--file={txt}",
        f"--write-media={out_mp3}",
        "--proxy=http://127.0.0.1:7890",
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        # 代理失败时回退直连一次
        cmd_direct = [c for c in cmd if not c.startswith("--proxy=")]
        r2 = subprocess.run(cmd_direct, capture_output=True, text=True)
        if r2.returncode != 0:
            raise SystemExit(f"TTS 失败 ({r.returncode}): {r.stderr or r.stdout}\n直连: {r2.stderr or r2.stdout}")
        r = r2
    if not out_mp3.exists() or out_mp3.stat().st_size < 500:
        raise SystemExit(f"TTS 失败: {out_mp3}")


def compose_clip(png: Path, mp3: Path, out_mp4: Path) -> None:
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
    # 静默跑，避免刷屏
    subprocess.run(cmd, check=True, capture_output=True)


def concat_videos(clips: list[Path], out_mp4: Path) -> None:
    """用 concat demuxer 拼接，要求各段编码参数一致。"""
    list_file = out_mp4.parent / "concat_list.txt"
    # ffmpeg concat 需要 escaped path；Windows 用正斜杠更稳
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


def render_episode(ep: str) -> Path:
    if ep not in EPISODE_SCRIPTS:
        raise SystemExit(f"未配置脚本: {ep}，可用: {list(EPISODE_SCRIPTS)}")

    slides_dir = DECKS / ep / "slides"
    out_dir = ROOT / ep
    clips_dir = out_dir / "clips"
    assets_dir = out_dir / "assets"
    clips_dir.mkdir(parents=True, exist_ok=True)
    assets_dir.mkdir(parents=True, exist_ok=True)

    scripts = EPISODE_SCRIPTS[ep]
    clip_paths: list[Path] = []

    # 整集复用一个 Chromium，避免每页冷启动（sync API，TTS 用 asyncio.run）
    from playwright.sync_api import sync_playwright

    # 本机 playwright 包版本与 headless_shell 目录可能不齐，优先走完整 chromium
    chrome_exe = Path.home() / "AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe"
    with sync_playwright() as p:
        launch_kwargs = {"headless": True}
        if chrome_exe.exists():
            launch_kwargs["executable_path"] = str(chrome_exe)
        browser = p.chromium.launch(**launch_kwargs)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})

        for i, (slide_name, text) in enumerate(scripts, 1):
            html = slides_dir / slide_name
            if not html.exists():
                raise SystemExit(f"缺少幻灯片: {html}")

            stem = Path(slide_name).stem
            png = assets_dir / f"{stem}.png"
            mp3 = assets_dir / f"{stem}.mp3"
            mp4 = clips_dir / f"{stem}.mp4"

            print(f"[{i}/{len(scripts)}] {stem}")
            print("  截图…")
            screenshot_html(html, png, page=page)
            print(f"  TTS… ({len(text)} 字)")
            tts(text, mp3)
            print("  合成 clip…")
            compose_clip(png, mp3, mp4)
            (assets_dir / f"{stem}.txt").write_text(text + "\n", encoding="utf-8")
            clip_paths.append(mp4)
            print(f"  ✓ {mp4.name} ({mp4.stat().st_size // 1024} KB)")

        browser.close()

    final = out_dir / f"{ep}-full.mp4"
    print(f"拼接 {len(clip_paths)} 段 → {final.name}")
    concat_videos(clip_paths, final)
    print(f"✅ 完成: {final} ({final.stat().st_size // 1024} KB)")
    return final


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ep", default="EP01", help="集数，如 EP01")
    args = parser.parse_args()
    render_episode(args.ep.upper())


if __name__ == "__main__":
    main()
