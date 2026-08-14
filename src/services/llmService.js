import useLLMApi from '@/utils/llmApi.js'
import { resolveChatCompletionsUrl, resolveModelsUrl } from '@/utils/llmUrl.js'
import { LLM_NOT_CONFIGURED_MSG, LLM_REQUEST_FAILED_MSG } from '@/shared/errors.js'
import { getLlmConfig, isLlmConfigured } from './settingsService.js'

let llmApiInstance = null

function getLlmApi() {
	if (!llmApiInstance) {
		llmApiInstance = useLLMApi()
	}
	return llmApiInstance
}

/**
 * In dev, route cross-origin LLM requests through Vite's /llm-proxy to avoid CORS.
 */
function resolveDevApiUrl(baseUrl) {
	if (!import.meta.env.DEV || typeof window === 'undefined') {
		return baseUrl
	}

	try {
		const parsed = new URL(baseUrl)
		if (parsed.origin === window.location.origin) {
			return baseUrl
		}
		const params = new URLSearchParams(parsed.search)
		params.set('__target', parsed.origin)
		return `/llm-proxy${parsed.pathname}?${params.toString()}`
	} catch {
		return baseUrl
	}
}

/**
 * Build OpenAI-compatible API config from local settings (with Vite DEV proxy rewrite).
 * @returns {{ baseUrl: string, apiKey: string, model: string }}
 */
export function getApiConfig() {
	const llm = getLlmConfig()
	const chatUrl = resolveChatCompletionsUrl(llm.baseUrl, !!llm.useFullUrl)
	return {
		baseUrl: resolveDevApiUrl(chatUrl),
		apiKey: llm.apiKey,
		model: llm.model
	}
}

/**
 * Fetch available model IDs from the provider's /v1/models endpoint.
 * Expects OpenAI-compatible `{ data: [{ id: string }], object: 'list' }`.
 * @param {{ baseUrl?: string, apiKey?: string, useFullUrl?: boolean, signal?: AbortSignal }} [override]
 * @returns {Promise<string[]>}
 */
export async function fetchAvailableModels(override = {}) {
	const llm = getLlmConfig()
	const baseUrl = override.baseUrl ?? llm.baseUrl
	const apiKey = override.apiKey ?? llm.apiKey
	const useFullUrl = !!(override.useFullUrl ?? llm.useFullUrl)
	const signal = override.signal

	const modelsUrl = resolveModelsUrl(baseUrl, useFullUrl)
	if (!modelsUrl) {
		return []
	}

	const headers = { Accept: 'application/json' }
	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`
	}

	const response = await fetch(resolveDevApiUrl(modelsUrl), {
		method: 'GET',
		headers,
		signal
	})
	if (!response.ok) {
		throw new Error(LLM_REQUEST_FAILED_MSG)
	}
	const json = await response.json()
	const list = Array.isArray(json?.data) ? json.data : []
	return list.map((item) => item?.id).filter((id) => typeof id === 'string' && id)
}

/**
 * Stream a chat completion using the user's configured LLM.
 * @param {{ messages: Array, temperature?: number, maxTokens?: number, hideThinkContent?: boolean, body?: object }} opts
 * @param {(content: string, meta?: { thinking?: string }) => void} onDataUpdate
 * @param {(msg: string) => void} [onErrorMessage]
 */
export async function streamChat(
	{ messages, temperature, maxTokens, hideThinkContent = true, body } = {},
	onDataUpdate,
	onErrorMessage
) {
	if (!isLlmConfigured()) {
		const err = new Error(LLM_NOT_CONFIGURED_MSG)
		onErrorMessage?.(err.message)
		throw err
	}

	const llm = getLlmConfig()
	const { callLLMAPIStream } = getLlmApi()

	return callLLMAPIStream(
		{
			apiConfig: getApiConfig(),
			messages,
			temperature: temperature ?? llm.temperature,
			maxTokens: maxTokens ?? llm.maxTokens,
			hideThinkContent,
			body,
			isDirectModel: !!llm.apiKey
		},
		onDataUpdate,
		onErrorMessage
	)
}

export function stopGeneration() {
	getLlmApi().stopGeneration()
}

export function getStreamState() {
	const api = getLlmApi()
	return {
		isLoading: api.isLoading,
		isManuallyAborted: api.isManuallyAborted,
		lastAborted: api.lastAborted
	}
}

export { isLlmConfigured }
