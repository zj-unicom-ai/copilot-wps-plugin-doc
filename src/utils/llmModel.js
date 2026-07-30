/**
 * Heuristics for models that are not suitable for chat completions.
 * @param {string} modelId
 * @returns {boolean}
 */
export function isLikelyNonChatModel(modelId) {
	const id = String(modelId || '').toLowerCase()
	if (!id) return false
	return (
		/(?:^|\/)bge[-_]/i.test(id) ||
		/(?:^|\/)(e5-|gte-|jina-embed)/i.test(id) ||
		/text-embedding|embedding|\/embed(?:ding)?(?:s)?(?:\/|$)|rerank|whisper|tts|dall-e|stable-diffusion/i.test(
			id
		)
	)
}
