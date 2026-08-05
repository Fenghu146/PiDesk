import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

export type ModalSize = "full" | "medium" | "small";

export interface ModalProps {
	/** 是否显示弹框 */
	open: boolean;
	/** 关闭弹框回调 */
	onClose: () => void;
	/** 弹框标题（可选）。传 title 时自动展示 header 区域 */
	title?: string;
	/** 弹框尺寸，对应预设的宽高 */
	size?: ModalSize;
	/** 主体内容 */
	children: ReactNode;
	/** 额外的根元素 class */
	className?: string;
	/** 额外的 content wrapper class */
	contentClassName?: string;
}

/**
 * 基于 Radix UI Dialog 的共享弹框组件。
 * 遵循 AGENTS.md 弹框尺寸规范：
 * - full:  width/height → min(1300px / 850px, calc(100vw - 48px) / calc(100vh - 48px))
 * - medium: width → min(800px, calc(100vw - 48px))，高度自适应
 * - small:  width → min(480px, calc(100vw - 48px))，高度自适应
 *
 * 默认使用 Portal 渲染，不受父容器 z-index / overflow 影响。
 */
export function Modal({
	open,
	onClose,
	title,
	size = "full",
	children,
	className,
	contentClassName,
}: ModalProps) {
	return (
		<Dialog.Root open={open} onOpenChange={(open) => !open && onClose()}>
			<Dialog.Portal>
				<Dialog.Overlay
					className={["modal-radix-overlay", className].filter(Boolean).join(" ")}
				/>
				<Dialog.Content
					className={[
						"modal-radix-content",
						`modal-radix-${size}`,
						contentClassName,
					]
						.filter(Boolean)
						.join(" ")}
				>
					{title && (
						<div className="modal-header">
							<Dialog.Title asChild>
								<strong>{title}</strong>
							</Dialog.Title>
							<Dialog.Close asChild>
								<button
									type="button"
									aria-label="Close"
								>
									✕
								</button>
							</Dialog.Close>
						</div>
					)}
					{children}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
