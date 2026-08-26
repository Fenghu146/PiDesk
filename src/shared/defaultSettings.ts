import { createDefaultExternalEditorSettings, type AppSettings } from "./types";

/** Git 面板「AI 生成 commit message」的默认提示词 */
export const DEFAULT_GIT_COMMIT_MESSAGE_PROMPT = `请根据以下 git diff 生成一条中文 git commit message。

变更描述：
{diff}

Gitmoji 对应关系：
✨ feat - 新功能
🐛 fix - Bug 修复
📚 docs - 文档更新
💎 style - 代码格式
♻️ refactor - 重构
🧪 test - 测试
🔧 chore - 构建/工具

要求：
1. 使用对应的 Gitmoji 开头
2. 第一行简要说明修改的模块和做了什么
3. 后续用 - 列出具体变更点
4. 直接输出 commit 消息，不要解释`;

/**
 * AppSettings 的唯一默认值来源：主进程 SettingsStore、渲染进程首屏 state 和
 * 预览态 previewApi 都基于这里再叠加自己的少量差异。
 * 之前三处各自维护一份字面量，新增配置项时极易漏改导致主/渲染默认值不一致。
 */
export function createDefaultAppSettings(): AppSettings {
	return {
		useNativeTitleBar: false,
		showNativeMenu: false,
		sendShortcut: "enter-send",
		theme: "system",
		lightBackground: "white",
		language: "system",
		// 默认最大化：与历史 createWindow 在 ready-to-show 后 maximize() 的行为一致
		// （1480×960 只是最大化前的兜底尺寸，不是最终展示态）
		startupWindowMode: "maximized",
		piEnvironmentChecked: false,
		enableGitManagement: true,
		gitCommitMessagePrompt: DEFAULT_GIT_COMMIT_MESSAGE_PROMPT,
		closeToTray: true,
		// 默认单实例：托盘隐藏后再次点击快捷方式会唤起原窗口，而不是再开一个进程
		singleInstance: true,
		enableNotifications: true,
		// showThinking 跟随 pi agent 的 hideThinkingBlock，主进程启动时会覆盖为真实值
		showThinking: true,
		showDevTools: false,
		// 默认关闭 Chromium 沙箱：与历史 Windows no-sandbox 兼容策略一致
		electronChromiumSandbox: false,
		piProxyEnabled: false,
		piProxyUrl: "http://127.0.0.1:7890",
		piProxyBypass: "localhost,127.0.0.1,::1",
		desktopProxyEnabled: false,
		desktopProxyUrl: "http://127.0.0.1:7890",
		desktopProxyBypass: "localhost,127.0.0.1,::1",
		customPiPath: "",
		wslEnabled: false,
		wslDistro: "Ubuntu",
		wslUser: "root",
		telemetryEnabled: true,
		webServiceEnabled: false,
		webServiceHost: "0.0.0.0",
		webServicePort: 8765,
		rpcTimeout: 600_000,
		linkOpenMode: "external",
		contentMaxWidth: 1400,
		maxEditorFileSizeMB: 5,
		externalEditors: createDefaultExternalEditorSettings(),

		// 桌面宠物默认关闭：关闭后应用与现状完全一致，零回归风险
		petEnabled: false,
		petId: "clawd",
		petAlwaysOnTop: true,
		petScale: 0.8,
		// 巡游默认开启：宠物 idle 时自动沿屏幕底部左右走动，业务态出现即让位
		petPatrolEnabled: true,
		// 巡游碰边后 idle 停顿默认 5 分钟
		petPatrolPauseMin: 5,
		favoriteModels: [],

		// ── 扩展管理 ──
		/** 用户手动移除的内置扩展，启动时跳过自动部署 */
		removedBuiltInExtensions: [],

		// ── 更新检测：默认正常检测，用户可手动关闭忽略更新 ──
		disableUpdateCheck: false,

		// ── Agent 启动诊断/加速：offline 默认开；扩展/技能默认加载 ──
		piRpcOffline: true,
		piRpcNoExtensions: false,
		piRpcNoSkills: false,

		// 字体配置：默认值保证与历史版本行为一致，零回归
		fontSize: "default",
		uiFontSize: null,
		chatFontSize: null,
		inputFontSize: null,
		zoomFactor: 1,
		fontFamilyBase: "system",
		fontFamilyBaseCustom: "",
		fontFamilyMono: "commit-mono",
		fontFamilyMonoCustom: "",
	};
}
