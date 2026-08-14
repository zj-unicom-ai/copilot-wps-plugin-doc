/** Shown when LLM baseUrl / model is missing. */
export const LLM_NOT_CONFIGURED_MSG = '请先在「帮助 → 通用设置」中配置模型 API'

/** Generic message for upstream / network / proxy failures shown in the UI. */
export const LLM_REQUEST_FAILED_MSG = '请求失败，请检查网络或 API 配置后重试'

/**
 * Normalize unknown errors into a short user-facing Chinese message.
 * Avoid leaking proxy / gateway / TLS details into the chat UI.
 * @param {unknown} error
 * @param {string} [fallback='操作失败，请稍后重试']
 * @returns {string}
 */
export function toUserMessage(error, fallback = '操作失败，请稍后重试') {
	if (error == null) return fallback
	if (typeof error === 'string') {
		return sanitizeLlmErrorText(error.replace(/^Error:\s*/i, '').trim(), fallback)
	}
	if (error instanceof Error) {
		if (error.name === 'AbortError') return '已停止生成'
		const msg = (error.message || '').replace(/^Error:\s*/i, '').trim()
		if (!msg) return fallback
		return sanitizeLlmErrorText(msg, fallback)
	}
	return fallback
}

/**
 * @param {string} msg
 * @param {string} fallback
 * @returns {string}
 */
function sanitizeLlmErrorText(msg, fallback) {
	if (!msg) return fallback
	if (msg === LLM_NOT_CONFIGURED_MSG) return msg
	if (msg === LLM_REQUEST_FAILED_MSG) return msg
	if (/timeout|超时/i.test(msg)) return '网络请求超时，请检查连接后重试'
	if (/Failed to fetch|NetworkError|load failed/i.test(msg)) {
		return '网络异常，请检查网络或 API 地址'
	}
	// Missing / invalid API config → configured prompt
	if (
		/apiConfig|apiKey is required|must include baseUrl|not configured|未配置/i.test(msg)
	) {
		return LLM_NOT_CONFIGURED_MSG
	}
	// HTTP / proxy / gateway / TLS / models-list details → generic copy
	if (
		/请求失败|LLM proxy|上游|网关|认证|CERT_|certificate|fetch failed|502|411|CORS|跨域|models request|invalid URL|missing target|too many redirects|status\s*\d{3}/i.test(
			msg
		)
	) {
		return LLM_REQUEST_FAILED_MSG
	}
	return msg
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isAbortError(error) {
	return (
		error?.name === 'AbortError' ||
		(typeof error === 'object' && error != null && error.code === 20)
	)
}

/**
 * Hide export/copy actions on this assistant bubble.
 * @param {{ isError?: boolean, content?: string } | null | undefined} message
 */
export function isErrorAssistantMessage(message) {
	return !!(message?.isError || message?.content === LLM_NOT_CONFIGURED_MSG)
}

/**
 * Block document insert / accept-reject UI after callChat.
 * @param {string | null | undefined} content
 * @param {{ isError?: boolean, content?: string } | null | undefined} [lastAssistantMessage]
 * @param {boolean} [aborted=false]
 */
export function isFailedChatResult(content, lastAssistantMessage = null, aborted = false) {
	return (
		aborted ||
		!content ||
		content === LLM_NOT_CONFIGURED_MSG ||
		isErrorAssistantMessage(lastAssistantMessage)
	)
}
