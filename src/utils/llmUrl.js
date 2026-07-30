/**
 * Resolve OpenAI-compatible chat completions and models URLs
 * from a user-configured base address (domain or full endpoint).
 * Behavior is controlled solely by the `useFullUrl` switch.
 */

/**
 * @param {string} baseUrl
 * @returns {string}
 */
function trimUrl(baseUrl) {
	return String(baseUrl || '').trim()
}

/**
 * @param {string} baseUrl
 * @returns {string}
 */
function stripTrailingSlashes(baseUrl) {
	return trimUrl(baseUrl).replace(/\/+$/, '')
}

/**
 * Build the chat completions request URL.
 * @param {string} baseUrl - Domain or full endpoint from settings
 * @param {boolean} useFullUrl - When true, use baseUrl as-is; otherwise append /v1/chat/completions
 * @returns {string}
 */
export function resolveChatCompletionsUrl(baseUrl, useFullUrl) {
	const raw = trimUrl(baseUrl)
	if (!raw) return ''
	if (useFullUrl) return raw
	return `${stripTrailingSlashes(raw)}/v1/chat/completions`
}

/**
 * Build the /v1/models request URL.
 * When useFullUrl: derive from the chat path (…/chat/completions → …/models).
 * When domain mode: append /v1/models to the base.
 * @param {string} baseUrl
 * @param {boolean} useFullUrl
 * @returns {string}
 */
export function resolveModelsUrl(baseUrl, useFullUrl) {
	const raw = trimUrl(baseUrl)
	if (!raw) return ''

	if (!useFullUrl) {
		return `${stripTrailingSlashes(raw)}/v1/models`
	}

	try {
		const parsed = new URL(raw)
		let path = (parsed.pathname || '/').replace(/\/+$/, '') || ''

		if (/\/chat\/completions$/i.test(path)) {
			path = path.replace(/\/chat\/completions$/i, '/models')
		} else if (/\/v1$/i.test(path)) {
			path = `${path}/models`
		} else {
			const v1Idx = path.toLowerCase().lastIndexOf('/v1/')
			if (v1Idx >= 0) {
				path = `${path.slice(0, v1Idx)}/v1/models`
			} else {
				path = `${path || ''}/v1/models`.replace(/\/{2,}/g, '/')
				if (!path.startsWith('/')) path = `/${path}`
			}
		}

		return `${parsed.origin}${path}`
	} catch {
		return ''
	}
}
