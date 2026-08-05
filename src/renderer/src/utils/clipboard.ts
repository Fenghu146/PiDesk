/**
 * 剪贴板写入工具函数。
 *
 * 优先使用 Electron 主进程 clipboard API（通过 preload 暴露），
 * 不依赖 document focus，避免 navigator.clipboard.writeText()
 * 在窗口失焦时抛 "Document is not focused" 异常。
 *
 * 在非 Electron 环境（preview / web）下回退到 Web Clipboard API。
 */

export async function writeClipboard(text: string): Promise<void> {
  // 1. Electron 环境：通过 preload bridge 直接调用主进程 clipboard
  const pd = (window as { piDesktop?: { clipboard?: { writeText: (t: string) => void } } }).piDesktop;
  if (pd?.clipboard?.writeText) {
    try {
      pd.clipboard.writeText(text);
      return;
    } catch {
      // preload bridge 写入失败，回退到 Web API
    }
  }

  // 2. Web Clipboard API（需要 document focus，但作为兜底）
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // 某些场景下 document 可能无焦点导致抛异常
  }

  // 3. 最后兜底：textarea + execCommand（已废弃但短期内仍可用）
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  } catch {
    // 所有方式均失败，静默忽略（调用方已处理自己的错误通知）
  }
}
