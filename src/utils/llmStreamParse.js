/**
 * OpenAI-compatible stream parsing and think-tag splitting.
 * Some reasoning models emit close-tag only: `thinking...</think>answer`
 */

/** @typedef {{ content: string, thinking: string }} StreamParts */

const THINK_OPEN_RE = /<\s*think(?:ing)?\s*>/i
const THINK_CLOSE_RE = /<\s*\/\s*think(?:ing)?\s*>/i

/**
 * @param {string} content
 * @returns {StreamParts}
 */
export function splitThinkContent(content) {
	const raw = String(content || '')
	if (!raw) return { thinking: '', content: '' }

	const closeMatch = raw.match(THINK_CLOSE_RE)
	if (closeMatch) {
		const closeIdx = closeMatch.index ?? 0
		let thinking = raw.slice(0, closeIdx)
		const openMatch = thinking.match(THINK_OPEN_RE)
		if (openMatch) {
			thinking = thinking.slice((openMatch.index ?? 0) + openMatch[0].length)
		}
		return {
			thinking: thinking.trim(),
			content: raw.slice(closeIdx + closeMatch[0].length).trim()
		}
	}

	const openMatch = raw.match(THINK_OPEN_RE)
	if (openMatch) {
		const openIdx = openMatch.index ?? 0
		return {
			thinking: raw.slice(openIdx + openMatch[0].length).trim(),
			content: raw.slice(0, openIdx).trim()
		}
	}

	return { thinking: '', content: raw }
}

/** @param {string} content */
export function stripThinkContent(content) {
	return splitThinkContent(content).content
}

/** @param {string} content */
export function hasThinkCloseTag(content) {
	return THINK_CLOSE_RE.test(String(content || ''))
}

/**
 * @param {Record<string, unknown> | null | undefined} part
 * @returns {string}
 */
export function extractReasoningDelta(part) {
	if (!part || typeof part !== 'object') return ''
	for (const key of ['reasoning_content', 'reasoning', 'reasoningContent']) {
		const value = part[key]
		if (typeof value === 'string' && value) return value
	}
	return ''
}

/**
 * @param {Record<string, unknown> | null | undefined} part
 * @returns {string}
 */
export function extractContentDelta(part) {
	if (!part || typeof part !== 'object') return ''
	const c = part.content
	if (typeof c === 'string' && c) return c
	if (Array.isArray(c)) {
		return c
			.map((item) => {
				if (typeof item === 'string') return item
				if (item && typeof item.text === 'string') return item.text
				return ''
			})
			.join('')
	}
	return ''
}

/**
 * @param {{ content: string, reasoning: string }} state
 * @param {any} parsed
 * @returns {boolean}
 */
export function applyChatCompletionChunk(state, parsed) {
	if (!parsed || typeof parsed !== 'object') return false
	const choice = parsed.choices?.[0]
	const delta = choice?.delta
	const message = choice?.message
	let changed = false

	const reasoningChunk = extractReasoningDelta(delta) || extractReasoningDelta(message)
	if (reasoningChunk) {
		state.reasoning += reasoningChunk
		changed = true
	}

	const contentChunk = extractContentDelta(delta) || extractContentDelta(message)
	if (contentChunk) {
		state.content += contentChunk
		changed = true
	}

	return changed
}

/**
 * @param {string} line
 * @returns {any | null}
 */
export function parseStreamLine(line) {
	let trimmed = String(line || '').trim()
	if (!trimmed) return null
	if (trimmed.charCodeAt(0) === 0xfeff) trimmed = trimmed.slice(1).trim()
	if (trimmed.startsWith('event:')) return null

	let payload = trimmed
	if (trimmed.toLowerCase().startsWith('data:')) {
		payload = trimmed.slice(5).trim()
	} else if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
		return null
	}

	if (!payload || payload === '[DONE]') return null
	try {
		return JSON.parse(payload)
	} catch {
		return null
	}
}

/**
 * @param {string} answer
 * @param {string} taggedThinking
 * @param {string} reasoningContent
 * @returns {StreamParts}
 */
export function mergeStreamParts(answer, taggedThinking, reasoningContent) {
	const thinking = [reasoningContent, taggedThinking].filter((p) => p && String(p).trim()).join('\n\n')
	return { content: answer || '', thinking }
}

/** @param {string} modelId */
export function isReasoningModel(modelId) {
	return /r1|reasoner|thinking/i.test(String(modelId || ''))
}
