import { t } from "../../i18n";

/**
 * 项目信任确认弹窗。
 *
 * 当用户在 pi-desktop 中打开含 .pi 配置资源（扩展 / skills / settings / SYSTEM.md 等）
 * 且未在 trust.json 记录决策的项目时，由主进程 AgentManager.ensureProjectTrust 经 IPC
 * 触发本弹窗。pi 在 RPC 模式下 project_trust 事件 hasUI 恒为 false，无法用其内置流程弹窗，
 * 因此信任决策由桌面端自行完成。
 *
 * 用户选择后通过 onChoose 回传，主进程据此决定是否启动 pi 进程：
 *   - trust-remember：永久信任，写入 trust.json
 *   - trust-session：仅本次会话信任，不落盘
 *   - deny：拒绝信任，阻止 Agent 创建并记录 false 避免重复打扰
 *
 * 样式复用 config-modal-overlay / config-modal-dialog / config-btn，与 ConfirmDialog 风格一致。
 * 遮罩不绑定 onClick 关闭，强制用户做出明确选择，避免误关后 Agent 卡在等待。
 */
export function TrustConfirmModal(props: {
	cwd: string;
	projectName: string;
	onChoose: (choice: "trust-remember" | "trust-session" | "deny") => void;
}) {
	return (
		<div className="config-modal-overlay">
			<div className="config-modal-dialog" onClick={(e) => e.stopPropagation()}>
				<strong>{t("agent.trust.title")}</strong>
				<p>{t("agent.trust.message")}</p>
				<p
					style={{
						wordBreak: "break-all",
						fontFamily: "var(--font-family-mono)",
						fontSize: "var(--font-size-sm)",
						color: "var(--color-text-muted)",
					}}
				>
					{t("agent.trust.project")}: {props.cwd}
				</p>
				<div className="config-modal-actions">
					<button className="config-btn" onClick={() => props.onChoose("deny")}>
						{t("agent.trust.deny")}
					</button>
					<button className="config-btn" onClick={() => props.onChoose("trust-session")}>
						{t("agent.trust.trustSession")}
					</button>
					<button
						className="config-btn primary"
						onClick={() => props.onChoose("trust-remember")}
					>
						{t("agent.trust.trustRemember")}
					</button>
				</div>
			</div>
		</div>
	);
}
