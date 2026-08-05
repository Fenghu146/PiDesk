#!/usr/bin/env python3
"""Generate PiDeck tutorial HTML slide decks (1920x1080) from structured content."""
from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
# 仓库内模板，避免依赖本机 skill 绝对路径
DECK_INDEX_SRC = ROOT.parent / "templates" / "deck_index.html"

# 视觉 grammar：开发工具感、安静克制，避免紫渐变 / emoji slop
SLIDE_CSS = """
:root {
  --bg: #0e1116;
  --surface: #171b22;
  --line: rgba(255,255,255,0.08);
  --text: #e8eaed;
  --muted: #9aa3b2;
  --dim: #6b7380;
  --accent: #d4a574;
  --accent-soft: rgba(212,165,116,0.14);
  --ok: #6fbf8a;
  --bad: #e07a6a;
  --font: "Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  --mono: "Cascadia Code", "Consolas", "SF Mono", ui-monospace, monospace;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 1920px; height: 1080px; overflow: hidden;
  background: var(--bg); color: var(--text);
  font-family: var(--font);
}
.slide {
  width: 1920px; height: 1080px;
  padding: 72px 96px 80px;
  display: flex; flex-direction: column;
  position: relative;
  background:
    radial-gradient(1200px 600px at 100% -10%, rgba(212,165,116,0.08), transparent 55%),
    radial-gradient(900px 500px at -10% 110%, rgba(90,120,160,0.08), transparent 50%),
    var(--bg);
}
.slide::before {
  content: "";
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size: 48px 48px;
  pointer-events: none;
}
.mast {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 48px; position: relative; z-index: 1;
}
.brand {
  display: flex; align-items: center; gap: 14px;
  color: var(--muted); font-size: 22px; letter-spacing: 0.04em;
}
.brand-mark {
  width: 28px; height: 28px; border-radius: 8px;
  background: linear-gradient(135deg, #d4a574, #8f6b45);
  box-shadow: 0 0 0 1px rgba(212,165,116,0.35);
}
.ep-tag {
  font-family: var(--mono); font-size: 18px; color: var(--accent);
  background: var(--accent-soft); border: 1px solid rgba(212,165,116,0.28);
  padding: 8px 14px; border-radius: 999px; letter-spacing: 0.06em;
}
.content { flex: 1; position: relative; z-index: 1; display: flex; flex-direction: column; }
h1 {
  font-size: 64px; line-height: 1.15; font-weight: 650;
  letter-spacing: -0.02em; max-width: 1500px;
}
h1 .accent { color: var(--accent); }
h2 {
  font-size: 48px; line-height: 1.2; font-weight: 650;
  letter-spacing: -0.015em; margin-bottom: 28px;
}
.lead {
  margin-top: 28px; font-size: 32px; line-height: 1.55;
  color: var(--muted); max-width: 1480px;
}
.body {
  font-size: 30px; line-height: 1.65; color: var(--text);
  max-width: 1500px;
}
.body p + p { margin-top: 18px; }
.muted { color: var(--muted); }
.dim { color: var(--dim); }
.list {
  list-style: none; display: flex; flex-direction: column; gap: 18px;
  margin-top: 12px;
}
.list li {
  display: grid; grid-template-columns: 36px 1fr; gap: 18px;
  align-items: start; font-size: 30px; line-height: 1.5;
}
.list .n {
  width: 36px; height: 36px; border-radius: 10px;
  display: grid; place-items: center;
  font-family: var(--mono); font-size: 16px;
  background: var(--surface); color: var(--accent);
  border: 1px solid var(--line); margin-top: 4px;
}
.cards {
  display: grid; gap: 22px; margin-top: 18px;
}
.cards.cols-2 { grid-template-columns: 1fr 1fr; }
.cards.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
.cards.cols-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 28px 30px;
}
.card .k {
  font-family: var(--mono); font-size: 16px; color: var(--accent);
  letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px;
}
.card .t { font-size: 28px; font-weight: 600; margin-bottom: 10px; }
.card .d { font-size: 24px; line-height: 1.5; color: var(--muted); }
.quote {
  margin-top: 20px; padding: 28px 32px;
  border-left: 4px solid var(--accent);
  background: rgba(255,255,255,0.03);
  border-radius: 0 16px 16px 0;
  font-size: 34px; line-height: 1.5;
}
.compare {
  display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px;
}
.compare .col {
  background: var(--surface); border: 1px solid var(--line);
  border-radius: 18px; padding: 28px 30px;
}
.compare .col h3 {
  font-size: 26px; margin-bottom: 18px; display: flex; align-items: center; gap: 12px;
}
.compare .col ul { list-style: none; display: flex; flex-direction: column; gap: 12px; }
.compare .col li { font-size: 26px; color: var(--muted); }
.badge-ok, .badge-no {
  font-family: var(--mono); font-size: 14px; padding: 4px 10px; border-radius: 999px;
}
.badge-ok { color: var(--ok); background: rgba(111,191,138,0.12); }
.badge-no { color: var(--bad); background: rgba(224,122,106,0.12); }
.footer {
  margin-top: auto; padding-top: 24px;
  display: flex; justify-content: space-between; align-items: center;
  color: var(--dim); font-size: 18px; position: relative; z-index: 1;
  border-top: 1px solid var(--line);
}
.cover {
  justify-content: center;
  padding-bottom: 96px;
}
.cover .series {
  font-family: var(--mono); font-size: 20px; color: var(--accent);
  letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 28px;
}
.cover h1 { font-size: 84px; max-width: 1500px; }
.cover .lead { font-size: 34px; max-width: 1200px; }
.cover .meta {
  margin-top: 48px; display: flex; gap: 18px; flex-wrap: wrap;
}
.chip {
  font-size: 20px; color: var(--muted);
  border: 1px solid var(--line); background: rgba(255,255,255,0.03);
  padding: 10px 16px; border-radius: 999px;
}
.code {
  font-family: var(--mono); font-size: 28px;
  background: #0a0d12; border: 1px solid var(--line);
  border-radius: 14px; padding: 20px 24px; color: #d7dde8;
  margin-top: 18px; display: inline-block;
}
.steps {
  display: flex; flex-direction: column; gap: 16px; margin-top: 12px;
}
.step {
  display: grid; grid-template-columns: 72px 1fr; gap: 20px;
  align-items: center; background: var(--surface);
  border: 1px solid var(--line); border-radius: 16px; padding: 20px 24px;
}
.step .idx {
  font-family: var(--mono); font-size: 28px; color: var(--accent); font-weight: 600;
}
.step .txt { font-size: 28px; line-height: 1.45; }
.two-col {
  display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 36px; flex: 1; align-items: stretch;
}
.big-num {
  font-family: var(--mono); font-size: 120px; color: var(--accent);
  line-height: 1; font-weight: 600; opacity: 0.9;
}
.shot-wrap {
  flex: 1; display: flex; align-items: center; justify-content: center;
  min-height: 0;
}
.shot {
  width: 100%; max-height: 720px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(212,165,116,0.12);
  object-fit: contain; background: #0a0d12;
}
.layout-product {
  display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 40px;
  flex: 1; min-height: 0; align-items: stretch;
}
.layout-product .copy { display: flex; flex-direction: column; justify-content: center; }
.layout-product .copy .body { font-size: 26px; }
.layout-product .copy .quote { font-size: 26px; margin-top: 18px; padding: 20px 22px; }
.layout-product .copy .cards { margin-top: 20px; }
.layout-product .copy .card { padding: 18px 20px; }
.layout-product .copy .card .t { font-size: 24px; }
.layout-product .copy .card .d { font-size: 20px; }
"""


def slide_html(ep: str, title: str, body: str, *, cover: bool = False, footer: str = "") -> str:
    mast = "" if cover else f"""
  <div class="mast">
    <div class="brand"><div class="brand-mark"></div><span>PiDeck 上手系列</span></div>
    <div class="ep-tag">{ep}</div>
  </div>"""
    foot = f"""
  <div class="footer">
    <span>PiDeck · 本地 AI 编程工作台</span>
    <span>{footer or title}</span>
  </div>"""
    cls = "slide cover" if cover else "slide"
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>{ep} · {title}</title>
<style>{SLIDE_CSS}</style>
</head>
<body>
<div class="{cls}">
{mast}
  <div class="content">
{body}
  </div>
{foot}
</div>
</body>
</html>
"""


# 每集：[(filename_stem, page_title, body_html, is_cover)]
EPISODES: dict[str, list[tuple[str, str, str, bool]]] = {}

# ────────────────────────── EP01 ──────────────────────────
EPISODES["EP01"] = [
    (
        "01-cover",
        "封面",
        """
    <div class="series">PiDeck 上手系列 · EP01</div>
    <h1>PiDeck 是什么？<br><span class="accent">为什么你需要它</span></h1>
    <p class="lead">把多项目、多会话、Git 与历史，从命令行搬进一个桌面工作台。</p>
    <div class="meta">
      <span class="chip">零基础</span>
      <span class="chip">约 3–4 分钟</span>
      <span class="chip">产品认知</span>
    </div>
""",
        True,
    ),
    (
        "02-hook",
        "开场",
        """
    <h2>如果你已经在用 AI 写代码</h2>
    <div class="quote">切换项目、管理会话、回看历史——全靠命令行，非常痛苦。</div>
    <p class="lead" style="margin-top:36px">今天要介绍的工具，叫 <span style="color:var(--text);font-weight:600">PiDeck</span>。</p>
""",
        False,
    ),
    (
        "03-pain",
        "痛点",
        """
    <h2>先问一个问题</h2>
    <p class="body">你平时有几个正在开发的项目？一个？两个？五个？</p>
    <div class="cards cols-2" style="margin-top:28px">
      <div class="card"><div class="k">痛点 01</div><div class="t">多项目多终端</div><div class="d">每个项目开一个终端，对话互相隔离，关了就难找回。</div></div>
      <div class="card"><div class="k">痛点 02</div><div class="t">历史不好回看</div><div class="d">上周的方案还在哪个窗口？终端一关，上下文就丢了。</div></div>
      <div class="card"><div class="k">痛点 03</div><div class="t">状态全靠敲命令</div><div class="d">Git、文件、模型切换，全在终端里手敲。</div></div>
      <div class="card"><div class="k">痛点 04</div><div class="t">配置不直观</div><div class="d">模型、API Key、设置散落在 JSON 和文档里。</div></div>
    </div>
""",
        False,
    ),
    (
        "04-what",
        "是什么",
        """
    <div class="layout-product">
      <div class="copy">
        <h2>PiDeck 是什么</h2>
        <p class="body">一个桌面工作台，专门管理你的 pi Agent 会话。</p>
        <div class="quote">左侧项目、中间对话、右侧文件与历史——统一管理所有项目的 AI 对话。</div>
        <div class="cards cols-1" style="margin-top:18px; display:flex; flex-direction:column; gap:12px">
          <div class="card"><div class="k">左侧</div><div class="t">项目列表</div><div class="d">添加、切换、隔离</div></div>
          <div class="card"><div class="k">中间</div><div class="t">对话区</div><div class="d">流式输出、上下文、工具轨迹</div></div>
          <div class="card"><div class="k">右侧</div><div class="t">文件与历史</div><div class="d">文件树、会话恢复</div></div>
        </div>
      </div>
      <div class="shot-wrap">
        <img class="shot" src="../../assets/piHomePage.png" alt="PiDeck 主界面" />
      </div>
    </div>
""",
        False,
    ),
    (
        "05-isolation",
        "隔离",
        """
    <h2>最重要的一点：项目完全隔离</h2>
    <div class="two-col">
      <div>
        <p class="body">项目 A 的上下文不会污染项目 B。</p>
        <p class="body muted" style="margin-top:20px">你可以在多个项目之间自由切换；每个项目里的 AI，都记得你上次聊到哪。</p>
      </div>
      <div class="card" style="display:flex;flex-direction:column;justify-content:center">
        <div class="k">核心心智模型</div>
        <div class="t" style="font-size:34px;line-height:1.4">一个 Agent Tab<br>= 一个 pi 进程</div>
        <div class="d" style="margin-top:12px">会话、cwd、环境互相独立</div>
      </div>
    </div>
""",
        False,
    ),
    (
        "06-features",
        "能力",
        """
    <h2>你能用到的能力</h2>
    <div class="cards cols-3">
      <div class="card"><div class="k">Workspace</div><div class="t">多项目工作区</div><div class="d">并行管理多个本地项目与 Agent</div></div>
      <div class="card"><div class="k">Chat</div><div class="t">对话与上下文</div><div class="d">Markdown、流式输出、文件引用</div></div>
      <div class="card"><div class="k">Git</div><div class="t">Git 集成</div><div class="d">分支、变更、diff、提交</div></div>
      <div class="card"><div class="k">Terminal</div><div class="t">内置终端</div><div class="d">每个 Agent 绑定独立终端 Tab</div></div>
      <div class="card"><div class="k">Config</div><div class="t">配置图形编辑器</div><div class="d">模型、Auth、设置可视化管理</div></div>
      <div class="card"><div class="k">Prompt</div><div class="t">中文提示词库</div><div class="d">4000+ 精选提示词，一键导入</div></div>
    </div>
""",
        False,
    ),
    (
        "07-compare",
        "对比",
        """
    <h2>裸 pi CLI vs PiDeck</h2>
    <div class="compare">
      <div class="col">
        <h3><span class="badge-no">CLI</span> 裸 pi</h3>
        <ul>
          <li>图形界面 ✗</li>
          <li>多项目管理 ✗</li>
          <li>会话历史浏览 ✗</li>
          <li>Git 可视化 ✗</li>
          <li>配置图形编辑器 ✗</li>
          <li>pi 原生能力 ✓</li>
        </ul>
      </div>
      <div class="col">
        <h3><span class="badge-ok">GUI</span> PiDeck</h3>
        <ul>
          <li>图形界面 ✓</li>
          <li>多项目管理 ✓</li>
          <li>会话历史浏览 ✓</li>
          <li>Git 可视化 ✓</li>
          <li>配置图形编辑器 ✓</li>
          <li>pi 原生能力 ✓</li>
        </ul>
      </div>
    </div>
    <p class="lead" style="margin-top:24px;font-size:28px">PiDeck = pi 的 GUI 层。不限制你使用 pi 的任何功能。</p>
""",
        False,
    ),
    (
        "08-audience",
        "适合谁",
        """
    <h2>适合谁用</h2>
    <ol class="list">
      <li><span class="n">1</span><span>已经用 pi CLI，但觉得终端管理太麻烦</span></li>
      <li><span class="n">2</span><span>从 Cursor / Windsurf 迁移，想要更轻量、更灵活的方案</span></li>
      <li><span class="n">3</span><span>团队开发，多项目切换是常态</span></li>
      <li><span class="n">4</span><span>还在观望 AI 编程工具——免费开源，没有厂商锁定</span></li>
    </ol>
""",
        False,
    ),
    (
        "09-outro",
        "下集",
        """
    <h2>这一集到这里</h2>
    <p class="body">下一集直接上手：从下载安装到第一次启动，一步一步跑通。</p>
    <div class="card" style="margin-top:36px;max-width:900px">
      <div class="k">Next</div>
      <div class="t">EP02 · 安装与第一次启动</div>
      <div class="d">前置条件 → 下载安装 → 添加项目 → 第一条消息</div>
    </div>
    <p class="lead" style="margin-top:40px">有问题评论区见。我是曹阿宇，我们下集见。</p>
""",
        False,
    ),
]

# ────────────────────────── EP02 ──────────────────────────
EPISODES["EP02"] = [
    (
        "01-cover",
        "封面",
        """
    <div class="series">PiDeck 上手系列 · EP02</div>
    <h1>安装与<br><span class="accent">环境检测</span></h1>
    <p class="lead">装好 Node、pi、PiDeck，打开后先完成 pi 环境检测——再谈项目与对话。</p>
    <div class="meta">
      <span class="chip">零基础</span>
      <span class="chip">约 4–5 分钟</span>
      <span class="chip">安装顺序很重要</span>
    </div>
""",
        True,
    ),
    (
        "02-order",
        "顺序",
        """
    <h2>正确安装顺序</h2>
    <div class="steps">
      <div class="step"><div class="idx">01</div><div class="txt"><b>安装 Node.js 20+</b><br><span class="muted">官网下载安装</span></div></div>
      <div class="step"><div class="idx">02</div><div class="txt"><b>安装 pi CLI</b><br><span class="muted">按官方文档安装并确认可用</span></div></div>
      <div class="step"><div class="idx">03</div><div class="txt"><b>安装并打开 PiDeck</b><br><span class="muted">再做环境检测 / 自定义路径</span></div></div>
    </div>
    <p class="lead" style="font-size:26px">先把 pi 配通，再添加项目、启动 Agent。</p>
""",
        False,
    ),
    (
        "03-links",
        "官方链接",
        """
    <h2>官方安装入口</h2>
    <div class="cards cols-2">
      <div class="card">
        <div class="k">Node.js</div>
        <div class="t">下载安装</div>
        <div class="d">需要 20 或更高版本</div>
        <div class="code" style="margin-top:14px;font-size:22px;display:block">https://nodejs.org/zh-cn/download</div>
      </div>
      <div class="card">
        <div class="k">pi CLI</div>
        <div class="t">官方文档</div>
        <div class="d">安装与配置以官方最新文档为准</div>
        <div class="code" style="margin-top:14px;font-size:22px;display:block">https://pi.dev/docs/latest</div>
      </div>
    </div>
    <p class="lead" style="font-size:26px">装完后终端执行 node --version 与 pi --version 确认。</p>
""",
        False,
    ),
    (
        "04-pideck",
        "装 PiDeck",
        """
    <h2>安装并打开 PiDeck</h2>
    <ol class="list">
      <li><span class="n">1</span><span>从 GitHub Releases 下载对应系统安装包</span></li>
      <li><span class="n">2</span><span>Windows 用 exe · Mac 用 dmg · Linux 用 AppImage</span></li>
      <li><span class="n">3</span><span>安装完成后打开 PiDeck</span></li>
    </ol>
    <p class="lead">首次打开时，会先做 pi 环境检测——这是最关键的一步。</p>
""",
        False,
    ),
    (
        "05-env-check",
        "环境检测",
        """
    <div class="layout-product">
      <div class="copy">
        <h2>pi 环境检测</h2>
        <p class="body">PiDeck 会自动在 PATH 和常见路径里查找 pi。</p>
        <div class="quote">检测不到时，会给出安装指引，也可以手动指定 pi 路径。</div>
        <div class="cards" style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
          <div class="card"><div class="k">npm 安装</div><div class="t">按指引安装 pi</div><div class="d">装完后重新打开或点「重新检测」</div></div>
          <div class="card"><div class="k">手动路径</div><div class="t">粘贴 pi 可执行文件路径</div><div class="d">适合 nvm / pnpm / mise 等自定义安装</div></div>
        </div>
      </div>
      <div class="shot-wrap">
        <img class="shot" src="../../assets/piEnvCheck.png" alt="pi 环境检测" />
      </div>
    </div>
""",
        False,
    ),
    (
        "06-dev-setting",
        "开发设置",
        """
    <div class="layout-product">
      <div class="copy">
        <h2>设置里也能管 pi 路径</h2>
        <p class="body">打开设置 → 开发设置。</p>
        <div class="quote">可自定义 pi 路径、重置检测标记、触发重新检测。</div>
        <ol class="list" style="margin-top:16px">
          <li><span class="n">1</span><span>填写自定义 pi 路径并「校验并使用」</span></li>
          <li><span class="n">2</span><span>点「检测环境」或「重置检测标记」</span></li>
          <li><span class="n">3</span><span>看到绿色 Pi CLI 状态即表示可用</span></li>
        </ol>
      </div>
      <div class="shot-wrap">
        <img class="shot" src="../../assets/piDevSetting.png" alt="开发设置" />
      </div>
    </div>
""",
        False,
    ),
    (
        "07-checklist",
        "检查清单",
        """
    <h2>本集结束前确认</h2>
    <ol class="list">
      <li><span class="n">✓</span><span>Node.js 20+ 已安装</span></li>
      <li><span class="n">✓</span><span>pi CLI 已安装（官方文档）</span></li>
      <li><span class="n">✓</span><span>PiDeck 已打开</span></li>
      <li><span class="n">✓</span><span>环境检测通过，或已自定义 pi 路径</span></li>
    </ol>
    <p class="lead">pi 连上了，下一集再配置模型与认证。</p>
""",
        False,
    ),
    (
        "08-outro",
        "下集",
        """
    <h2>下一集</h2>
    <div class="card" style="max-width:1100px">
      <div class="k">Next</div>
      <div class="t">EP03 · 配置模型与认证</div>
      <div class="d">Models 与 Auth 两种方式 · Base URL · 保存后在底部切换模型</div>
    </div>
    <p class="lead" style="margin-top:40px">我是曹阿宇，我们下集见。</p>
""",
        False,
    ),
]

# ────────────────────────── EP03 ──────────────────────────
# 合并原「连接 + 模型」：先把 AI 配通，再去开项目
EPISODES["EP03"] = [
    (
        "01-cover",
        "封面",
        """
    <div class="series">PiDeck 上手系列 · EP03</div>
    <h1>配置模型与<br><span class="accent">认证</span></h1>
    <p class="lead">pi 通了还不够——还要告诉它用哪家模型、Key 怎么填。配好再开项目。</p>
    <div class="meta">
      <span class="chip">关键配置</span>
      <span class="chip">约 5 分钟</span>
      <span class="chip">Models ≠ Auth</span>
    </div>
""",
        True,
    ),
    (
        "02-why",
        "为什么先配模型",
        """
    <h2>为什么先配模型，再开项目？</h2>
    <div class="quote">Agent 启动后要立刻能对话。模型没配好，项目开了也发不出有效请求。</div>
    <div class="steps" style="margin-top:24px">
      <div class="step"><div class="idx">01</div><div class="txt">EP02：pi 环境可用</div></div>
      <div class="step"><div class="idx">02</div><div class="txt">本集：模型 / 认证配置完成并保存</div></div>
      <div class="step"><div class="idx">03</div><div class="txt">下集：添加项目 → 启动 Agent → 底部选模型对话</div></div>
    </div>
""",
        False,
    ),
    (
        "03-two-modes",
        "两种方式",
        """
    <h2>两种配置方式，别混</h2>
    <div class="cards cols-2">
      <div class="card">
        <div class="k">Models · 模型</div>
        <div class="t">需要 Base URL</div>
        <div class="d">自定义供应商 / 中转 / OpenAI 兼容接口。<br>填 Base URL、API 类型、API Key，再拉取或添加模型列表。</div>
      </div>
      <div class="card">
        <div class="k">Auth · 认证</div>
        <div class="t">官方直连，多半只需 API Key</div>
        <div class="d">pi 内置支持的官方通道，例如 DeepSeek、OpenCode 等。<br>通常不用自己拼 Base URL。</div>
      </div>
    </div>
    <p class="lead" style="font-size:26px">用官方厂商 → 优先看 Auth；用中转或自定义接口 → 走 Models。</p>
""",
        False,
    ),
    (
        "04-models-ui",
        "模型页",
        """
    <div class="layout-product">
      <div class="copy">
        <h2>Models：按步骤配供应商</h2>
        <ol class="list">
          <li><span class="n">1</span><span>可先点「配置指南」</span></li>
          <li><span class="n">2</span><span>填 Base URL</span></li>
          <li><span class="n">3</span><span>选 API 类型</span></li>
          <li><span class="n">4</span><span>填 API Key</span></li>
          <li><span class="n">5</span><span>获取模型列表 / 手动添加</span></li>
          <li><span class="n">6</span><span>点「保存」——保存后才生效</span></li>
        </ol>
      </div>
      <div class="shot-wrap">
        <img class="shot" src="../../assets/piModelConfig.png" alt="模型配置" />
      </div>
    </div>
""",
        False,
    ),
    (
        "05-auth",
        "Auth",
        """
    <h2>Auth：官方通道更简单</h2>
    <p class="body">认证页面向 pi 已支持的官方提供商。</p>
    <div class="cards cols-2" style="margin-top:20px">
      <div class="card"><div class="k">典型</div><div class="t">DeepSeek / OpenCode …</div><div class="d">多数情况只需填 API Key，不用手写 Base URL</div></div>
      <div class="card"><div class="k">对比</div><div class="t">和 Models 分工不同</div><div class="d">Auth = 官方直连凭证；Models = 供应商 + 地址 + 模型列表</div></div>
    </div>
    <p class="lead" style="font-size:26px">不确定用哪种时：官方产品优先 Auth；第三方中转用 Models。</p>
""",
        False,
    ),
    (
        "06-zen-videos",
        "免费模型视频",
        """
    <h2>OpenCode Zen 免费模型（参考视频）</h2>
    <p class="body">若你想用 OpenCode Zen 的免费模型，可先看这两期完整演示：</p>
    <div class="cards" style="margin-top:20px;display:flex;flex-direction:column;gap:14px">
      <div class="card">
        <div class="k">Bilibili</div>
        <div class="t">如何在 PiDeck 中使用 OpenCode Zen 的免费模型</div>
        <div class="code" style="margin-top:12px;font-size:20px;display:block">https://www.bilibili.com/video/BV1NRTK6LE5z</div>
      </div>
      <div class="card">
        <div class="k">同系列</div>
        <div class="t">配置细节以视频演示为准</div>
        <div class="d">建议收藏，配模型时对照操作</div>
      </div>
    </div>
""",
        False,
    ),
    (
        "07-switch-bottom",
        "底部切换",
        """
    <h2>保存后，在底部切换模型</h2>
    <div class="quote">不是顶部——是对话输入框底部的模型选择器。</div>
    <div class="cards cols-3" style="margin-top:24px">
      <div class="card"><div class="k">1</div><div class="t">配置并保存</div><div class="d">Models / Auth 改完点保存</div></div>
      <div class="card"><div class="k">2</div><div class="t">启动 Agent 后</div><div class="d">进入会话界面</div></div>
      <div class="card"><div class="k">3</div><div class="t">底部点模型名</div><div class="d">切换模型与思考级别</div></div>
    </div>
    <p class="lead" style="font-size:26px">下集会用真实界面演示：启动 Agent 后，在底部选模型并发消息。</p>
""",
        False,
    ),
    (
        "08-outro",
        "下集",
        """
    <h2>下一集</h2>
    <div class="card" style="max-width:1100px">
      <div class="k">Next</div>
      <div class="t">EP04 · 添加项目与第一次对话</div>
      <div class="d">左侧加号加目录 → 启动 Agent → 底部选模型 → 发送消息</div>
    </div>
    <p class="lead" style="margin-top:40px">我是曹阿宇，我们下集见。</p>
""",
        False,
    ),
]

# ────────────────────────── EP04 ──────────────────────────
EPISODES["EP04"] = [
    (
        "01-cover",
        "封面",
        """
    <div class="series">PiDeck 上手系列 · EP04</div>
    <h1>添加项目与<br><span class="accent">第一次对话</span></h1>
    <p class="lead">pi 已通、模型已配。现在加本地项目、启动 Agent，发出第一条消息。</p>
    <div class="meta">
      <span class="chip">实操</span>
      <span class="chip">约 4–5 分钟</span>
      <span class="chip">最新界面</span>
    </div>
""",
        True,
    ),
    (
        "02-add-project",
        "加项目",
        """
    <div class="layout-product">
      <div class="copy">
        <h2>添加本地项目</h2>
        <ol class="list">
          <li><span class="n">1</span><span>点左侧顶部「+」</span></li>
          <li><span class="n">2</span><span>选择一个本地项目目录</span></li>
          <li><span class="n">3</span><span>项目会出现在左侧列表</span></li>
        </ol>
        <div class="quote">加完目录还不会自动聊起来——还要启动 Agent。</div>
      </div>
      <div class="shot-wrap">
        <img class="shot" src="../../assets/piStartAgent.png" alt="添加项目与启动 Agent" />
      </div>
    </div>
""",
        False,
    ),
    (
        "03-start-agent",
        "启动 Agent",
        """
    <h2>启动 Agent 的几种方式</h2>
    <div class="cards cols-3">
      <div class="card"><div class="k">列表</div><div class="t">项目旁的「+」</div><div class="d">在侧栏项目行启动</div></div>
      <div class="card"><div class="k">空白页</div><div class="t">「启动 Agent」按钮</div><div class="d">中间欢迎区主按钮</div></div>
      <div class="card"><div class="k">右上</div><div class="t">新会话区域</div><div class="d">也可启动或重启</div></div>
    </div>
    <p class="lead">启动成功后，进入会话界面，才能选模型、发消息。</p>
""",
        False,
    ),
    (
        "04-first-msg",
        "发消息",
        """
    <div class="layout-product">
      <div class="copy">
        <h2>底部选模型，再发送</h2>
        <ol class="list">
          <li><span class="n">1</span><span>输入框底部点模型名，切换模型 / 思考级别</span></li>
          <li><span class="n">2</span><span>可切换普通模式 / 计划模式</span></li>
          <li><span class="n">3</span><span>输入内容，点发送</span></li>
        </ol>
        <div class="quote">模型选择在底部，不在顶部。</div>
      </div>
      <div class="shot-wrap">
        <img class="shot" src="../../assets/piStartMsg.png" alt="第一次发消息" />
      </div>
    </div>
""",
        False,
    ),
    (
        "05-flow",
        "完整流程",
        """
    <h2>从安装到第一条消息</h2>
    <div class="steps">
      <div class="step"><div class="idx">01</div><div class="txt">装 Node → 装 pi → 装 PiDeck</div></div>
      <div class="step"><div class="idx">02</div><div class="txt">环境检测 / 自定义 pi 路径</div></div>
      <div class="step"><div class="idx">03</div><div class="txt">配置 Models 或 Auth 并保存</div></div>
      <div class="step"><div class="idx">04</div><div class="txt">左侧加号添加项目目录</div></div>
      <div class="step"><div class="idx">05</div><div class="txt">启动 Agent → 底部选模型 → 发送</div></div>
    </div>
""",
        False,
    ),
    (
        "06-checklist",
        "检查清单",
        """
    <h2>确认你已经跑通</h2>
    <ol class="list">
      <li><span class="n">✓</span><span>左侧有本地项目</span></li>
      <li><span class="n">✓</span><span>Agent 已启动</span></li>
      <li><span class="n">✓</span><span>底部能看到并切换模型</span></li>
      <li><span class="n">✓</span><span>发出消息并收到回复</span></li>
    </ol>
    <p class="lead">四项都 OK，基础闭环就完成了。</p>
""",
        False,
    ),
    (
        "07-outro",
        "下集",
        """
    <h2>下一集</h2>
    <div class="card" style="max-width:1100px">
      <div class="k">Next</div>
      <div class="t">EP05 · 对话进阶</div>
      <div class="d">@ 文件引用 · 斜线命令 · 更高效的提问方式</div>
    </div>
    <p class="lead" style="margin-top:40px">我是曹阿宇，我们下集见。</p>
""",
        False,
    ),
]

# ────────────────────────── EP05 ──────────────────────────
EPISODES["EP05"] = [
    (
        "01-cover",
        "封面",
        """
    <div class="series">PiDeck 上手系列 · EP05</div>
    <h1>对话进阶<br><span class="accent">用得更高效</span></h1>
    <p class="lead">会发消息只是起点。这一集讲 @ 引用、斜线命令、Shell，以及一套更稳的提问方式。</p>
    <div class="meta">
      <span class="chip">实操</span>
      <span class="chip">约 5 分钟</span>
      <span class="chip">接上集第一次对话</span>
    </div>
""",
        True,
    ),
    (
        "02-specific",
        "具体问题",
        """
    <h2>有效对话从具体问题开始</h2>
    <div class="compare">
      <div class="col">
        <h3><span class="badge-no">弱</span> 太宽泛</h3>
        <ul>
          <li>「你好」</li>
          <li>「帮我看看代码」</li>
          <li>然后就没有然后了</li>
        </ul>
      </div>
      <div class="col">
        <h3><span class="badge-ok">强</span> 足够具体</h3>
        <ul>
          <li>「看看 src/App.tsx 有什么问题」</li>
          <li>「给登录页加深色模式切换」</li>
          <li>目标、文件、约束说清楚</li>
        </ul>
      </div>
    </div>
""",
        False,
    ),
    (
        "03-at-file",
        "@ 引用",
        """
    <div class="layout-product">
      <div class="copy">
        <h2>文件引用：输入 @</h2>
        <ol class="list">
          <li><span class="n">1</span><span>在输入框输入 @</span></li>
          <li><span class="n">2</span><span>从列表选择项目文件</span></li>
          <li><span class="n">3</span><span>文件内容进入上下文</span></li>
        </ol>
        <div class="quote">不用复制粘贴，也不用手写长路径。</div>
      </div>
      <div class="shot-wrap">
        <img class="shot" src="../../assets/files.png" alt="文件引用" />
      </div>
    </div>
""",
        False,
    ),
    (
        "04-slash",
        "斜线命令",
        """
    <div class="layout-product">
      <div class="copy">
        <h2>斜线命令：输入 /</h2>
        <p class="body">弹出可用命令列表，带说明。</p>
        <div class="cards" style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
          <div class="card"><div class="k">常用</div><div class="t">/compact</div><div class="d">压缩上下文，腾出 token</div></div>
          <div class="card"><div class="k">会话</div><div class="t">/session 等</div><div class="d">管理当前会话相关操作</div></div>
        </div>
      </div>
      <div class="shot-wrap">
        <img class="shot" src="../../assets/slash-commands.png" alt="斜线命令" />
      </div>
    </div>
""",
        False,
    ),
    (
        "05-shell",
        "Shell",
        """
    <h2>Shell：输入 ! + 命令</h2>
    <div class="cards cols-2">
      <div class="card">
        <div class="k">写法</div>
        <div class="t">!git status</div>
        <div class="d">在当前项目目录执行，输出回到对话区</div>
      </div>
      <div class="card">
        <div class="k">场景</div>
        <div class="t">快速核对状态</div>
        <div class="d">看 diff、跑测试、查文件——不用切出聊天</div>
      </div>
    </div>
    <div class="quote" style="margin-top:24px">! 命令作用在当前项目目录，不是系统随便一个目录。</div>
""",
        False,
    ),
    (
        "06-stream",
        "轨迹",
        """
    <div class="layout-product">
      <div class="copy">
        <h2>流式输出与活动轨迹</h2>
        <p class="body">回答支持 Markdown 与流式显示。</p>
        <div class="quote">下方活动轨迹会展示：读了哪些文件、跑了哪些命令、改了哪些代码。</div>
        <p class="body muted" style="margin-top:18px">消息可编辑、删除——prompt 写偏了可以改完重发。</p>
      </div>
      <div class="shot-wrap">
        <img class="shot" src="../../assets/conversation.png" alt="对话与轨迹" />
      </div>
    </div>
""",
        False,
    ),
    (
        "07-workflow",
        "工作流",
        """
    <h2>推荐工作流</h2>
    <div class="steps">
      <div class="step"><div class="idx">01</div><div class="txt">底部确认模型与思考级别</div></div>
      <div class="step"><div class="idx">02</div><div class="txt">@ 相关文件，提出具体需求</div></div>
      <div class="step"><div class="idx">03</div><div class="txt">看活动轨迹与修改结果</div></div>
      <div class="step"><div class="idx">04</div><div class="txt">!git diff 核对变更</div></div>
      <div class="step"><div class="idx">05</div><div class="txt">任务切主题时开新会话，避免上下文污染</div></div>
    </div>
""",
        False,
    ),
    (
        "08-outro",
        "下集",
        """
    <h2>下一集</h2>
    <div class="card" style="max-width:1100px">
      <div class="k">Next</div>
      <div class="t">EP06 · 进阶功能总览</div>
      <div class="d">多项目 · Git · 终端 · 历史 · Prompt · 设置</div>
    </div>
    <p class="lead" style="margin-top:40px">我是曹阿宇，我们下集见。</p>
""",
        False,
    ),
]

# ────────────────────────── EP06 ──────────────────────────
EPISODES["EP06"] = [
    (
        "01-cover",
        "封面",
        """
    <div class="series">PiDeck 上手系列 · EP06</div>
    <h1>进阶功能<br><span class="accent">总览</span></h1>
    <p class="lead">如果只用对话，大概只用了三成能力。这一集快速过完多项目、Git、终端、历史和设置。</p>
    <div class="meta">
      <span class="chip">进阶</span>
      <span class="chip">约 5 分钟</span>
      <span class="chip">系列收官</span>
    </div>
""",
        True,
    ),
    (
        "02-workspace",
        "工作区",
        """
    <div class="layout-product">
      <div class="copy">
        <h2>多项目工作区</h2>
        <p class="body">左侧可添加多个本地项目，随时切换；各项目上下文互不影响。</p>
        <div class="cards" style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
          <div class="card"><div class="k">左侧</div><div class="t">项目列表</div><div class="d">添加项目、切换进入、启动 Agent</div></div>
          <div class="card"><div class="k">隔离</div><div class="t">上下文分开</div><div class="d">项目 A 不会污染项目 B</div></div>
        </div>
      </div>
      <div class="shot-wrap">
        <img class="shot" src="../../assets/piProjectTerminalGit.png" alt="多项目工作区" />
      </div>
    </div>
""",
        False,
    ),
    (
        "03-git-term",
        "Git 与终端",
        """
    <div class="layout-product">
      <div class="copy">
        <h2>Git 集成 · 内置终端</h2>
        <p class="body">同一界面里就能同时用到项目、Git 和终端。</p>
        <ol class="list">
          <li><span class="n">1</span><span>右侧：Git 版本管理（分支、变更、提交）</span></li>
          <li><span class="n">2</span><span>底部：内置终端（可选 pwsh / cmd / Git Bash 等）</span></li>
          <li><span class="n">3</span><span>对话里的 ! 命令与终端，都在当前项目目录</span></li>
        </ol>
      </div>
      <div class="shot-wrap">
        <img class="shot" src="../../assets/piProjectTerminalGit.png" alt="项目 · 终端 · Git" />
      </div>
    </div>
""",
        False,
    ),
    (
        "04-history",
        "历史",
        """
    <h2>会话历史</h2>
    <div class="cards cols-3">
      <div class="card"><div class="k">浏览</div><div class="t">项目内历史列表</div><div class="d">按时间找回过往对话</div></div>
      <div class="card"><div class="k">恢复</div><div class="t">一键回到上下文</div><div class="d">接着聊，不用重讲背景</div></div>
      <div class="card"><div class="k">导出</div><div class="t">可导出记录</div><div class="d">方便归档与分享方案</div></div>
    </div>
    <p class="lead" style="font-size:26px">这是相对裸命令行最直观的提升之一。</p>
""",
        False,
    ),
    (
        "05-prompt-settings",
        "Prompt 与设置",
        """
    <div class="layout-product">
      <div class="copy">
        <h2>Prompt 与设置</h2>
        <div class="cards" style="display:flex;flex-direction:column;gap:12px">
          <div class="card"><div class="k">Prompt</div><div class="t">中文提示词精选</div><div class="d">分类搜索，一键导入本地模板</div></div>
          <div class="card"><div class="k">设置</div><div class="t">外观 / 代理 / 开发</div><div class="d">含 pi 路径、检测标记、代理等</div></div>
        </div>
      </div>
      <div class="shot-wrap">
        <img class="shot" src="../../assets/setting.png" alt="设置" />
      </div>
    </div>
""",
        False,
    ),
    (
        "06-compare",
        "对比",
        """
    <h2>裸 pi CLI vs PiDeck</h2>
    <div class="compare">
      <div class="col">
        <h3><span class="badge-no">CLI</span> 裸 pi</h3>
        <ul>
          <li>多项目图形管理 ✗</li>
          <li>会话历史可视化 ✗</li>
          <li>Git / 终端面板 ✗</li>
          <li>配置图形编辑器 ✗</li>
          <li>pi 原生能力 ✓</li>
        </ul>
      </div>
      <div class="col">
        <h3><span class="badge-ok">GUI</span> PiDeck</h3>
        <ul>
          <li>多项目图形管理 ✓</li>
          <li>会话历史可视化 ✓</li>
          <li>Git / 终端面板 ✓</li>
          <li>配置图形编辑器 ✓</li>
          <li>pi 原生能力 ✓</li>
        </ul>
      </div>
    </div>
""",
        False,
    ),
    (
        "07-recap",
        "六集回顾",
        """
    <h2>六集回顾</h2>
    <div class="cards cols-3">
      <div class="card"><div class="k">EP01</div><div class="t">是什么</div><div class="d">定位与动机</div></div>
      <div class="card"><div class="k">EP02</div><div class="t">安装检测</div><div class="d">Node / pi / 环境</div></div>
      <div class="card"><div class="k">EP03</div><div class="t">模型认证</div><div class="d">Models 与 Auth</div></div>
      <div class="card"><div class="k">EP04</div><div class="t">首个项目</div><div class="d">启动 Agent 对话</div></div>
      <div class="card"><div class="k">EP05</div><div class="t">对话进阶</div><div class="d">@ / ! / 工作流</div></div>
      <div class="card"><div class="k">EP06</div><div class="t">进阶功能</div><div class="d">Git · 终端 · 更多</div></div>
    </div>
""",
        False,
    ),
    (
        "08-outro",
        "收官",
        """
    <h2>系列到这里结束了</h2>
    <p class="body">PiDeck 免费开源。觉得有用，欢迎去 GitHub 点个 Star。</p>
    <div class="cards cols-2" style="margin-top:28px">
      <div class="card"><div class="k">GitHub</div><div class="t">github.com/ayuayue/PiDeck</div><div class="d">源码 · Releases · Issue</div></div>
      <div class="card"><div class="k">QQ 群</div><div class="t">1026218644</div><div class="d">交流使用心得与反馈</div></div>
    </div>
    <p class="lead" style="margin-top:36px">我是曹阿宇，感谢收看。我们下个系列见。</p>
""",
        False,
    ),
]



def write_episode(ep_id: str, slides: list[tuple[str, str, str, bool]]) -> None:
    ep_dir = ROOT / ep_id
    slides_dir = ep_dir / "slides"
    if slides_dir.exists():
        shutil.rmtree(slides_dir)
    slides_dir.mkdir(parents=True, exist_ok=True)

    manifest_items = []
    titles = {
        "EP01": "PiDeck 是什么",
        "EP02": "安装与环境检测",
        "EP03": "配置模型与认证",
        "EP04": "添加项目与第一次对话",
        "EP05": "对话进阶",
        "EP06": "进阶功能总览",
    }
    for stem, page_title, body, is_cover in slides:
        html = slide_html(ep_id, page_title, body, cover=is_cover, footer=titles[ep_id])
        (slides_dir / f"{stem}.html").write_text(html, encoding="utf-8")
        manifest_items.append(
            f'    {{ file: "slides/{stem}.html", label: "{page_title}" }}'
        )

    # Copy deck_index shell and inject manifest
    if not DECK_INDEX_SRC.exists():
        raise SystemExit(f"Missing deck template: {DECK_INDEX_SRC}")
    template = DECK_INDEX_SRC.read_text(encoding="utf-8")
    manifest_js = ",\n".join(manifest_items)
    # Replace default MANIFEST block
    start = template.find("window.DECK_MANIFEST = [")
    end = template.find("];", start)
    if start < 0 or end < 0:
        raise SystemExit("Cannot locate DECK_MANIFEST in template")
    new_template = (
        template[:start]
        + "window.DECK_MANIFEST = [\n"
        + manifest_js
        + "\n  "
        + template[end:]
    )
    # Title
    new_template = new_template.replace(
        "<title>Deck · Multi-file Slide Index</title>",
        f"<title>PiDeck {ep_id} · {titles[ep_id]}</title>",
    )
    (ep_dir / "index.html").write_text(new_template, encoding="utf-8")
    print(f"{ep_id}: {len(slides)} slides -> {ep_dir}")


def main() -> None:
    for ep_id, slides in EPISODES.items():
        write_episode(ep_id, slides)
    # Root index linking all episodes
    links = "\n".join(
        f'      <a class="card" href="{ep}/index.html"><div class="k">{ep}</div>'
        f'<div class="t">{title}</div></a>'
        for ep, title in [
            ("EP01", "PiDeck 是什么"),
            ("EP02", "安装与环境检测"),
            ("EP03", "配置模型与认证"),
            ("EP04", "添加项目与第一次对话"),
            ("EP05", "对话进阶"),
            ("EP06", "进阶功能总览"),
        ]
    )
    root = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>PiDeck 上手系列 · HTML PPT</title>
<style>
  {SLIDE_CSS}
  body {{ width: auto; height: auto; min-height: 100vh; overflow: auto; }}
  .wrap {{ max-width: 1100px; margin: 0 auto; padding: 64px 32px 96px; }}
  h1 {{ font-size: 48px; margin-bottom: 12px; }}
  .sub {{ color: var(--muted); font-size: 20px; margin-bottom: 40px; line-height: 1.6; }}
  .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }}
  a.card {{ text-decoration: none; color: inherit; transition: border-color .15s, transform .15s; }}
  a.card:hover {{ border-color: rgba(212,165,116,0.45); transform: translateY(-2px); }}
  .hint {{ margin-top: 36px; color: var(--dim); font-size: 16px; line-height: 1.6; }}
</style>
</head>
<body>
<div class="wrap">
  <h1>PiDeck 上手系列</h1>
  <p class="sub">6 集 HTML 幻灯片。点进某一集后：概览墙点选页面，或按 Space / ← → 翻页，ESC 回概览。</p>
  <div class="grid">
{links}
  </div>
  <p class="hint">每集目录下有 index.html + slides/*.html，可直接双击打开。源文案仍保留在上级 EP0X-narration.md。</p>
</div>
</body>
</html>
"""
    (ROOT / "index.html").write_text(root, encoding="utf-8")
    print(f"Root index -> {ROOT / 'index.html'}")


if __name__ == "__main__":
    main()
