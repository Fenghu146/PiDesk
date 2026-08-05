import type { ChatMessage } from "../../shared/types";

/**
 * 后台加载历史消息完成后，把加载期间新增的实时消息接回历史尾部。
 * 大会话 get_messages 可能很慢；用户在等待期间发送的消息不能被历史结果覆盖。
 */
export function mergeHistoryWithPreservedMessages(
	historyMessages: ChatMessage[],
	currentMessages: ChatMessage[],
	preserveMessagesAfter?: number,
): ChatMessage[] {
	if (!preserveMessagesAfter) return historyMessages;
	const historyIds = new Set(historyMessages.map((message) => message.id));
	const preservedMessages = currentMessages.filter(
		(message) =>
			message.timestamp >= preserveMessagesAfter &&
			!historyIds.has(message.id) &&
			message.meta?.historyLoading !== true,
	);
	return preservedMessages.length > 0
		? [...historyMessages, ...preservedMessages]
		: historyMessages;
}
