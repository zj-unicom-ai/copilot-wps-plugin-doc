import { ref } from 'vue'
import { isLikelyNonChatModel } from '@/utils/llmModel.js'
import { LLM_NOT_CONFIGURED_MSG, LLM_REQUEST_FAILED_MSG } from '@/shared/errors.js'
import {
	applyChatCompletionChunk,
	hasThinkCloseTag,
	isReasoningModel,
	mergeStreamParts,
	parseStreamLine,
	splitThinkContent
} from '@/utils/llmStreamParse.js'

export {
	splitThinkContent,
	stripThinkContent,
	extractReasoningDelta,
	parseStreamLine,
	applyChatCompletionChunk,
	isReasoningModel
} from '@/utils/llmStreamParse.js'

export default function useLLMApi() {
	const isLoading = ref(false)
	const controller = ref(null)
	const isManuallyAborted = ref(false)
	const lastAborted = ref(false)

	const callLLMAPIStream = async (
		{
			apiConfig,
			messages,
			body = undefined,
			hideThinkContent = true,
			isDirectModel = true,
			temperature = null,
			maxTokens = null
		} = {},
		onDataUpdate,
		onErrorMessage = (msg) => console.error(msg)
	) => {
		try {
			lastAborted.value = false
			if (!apiConfig?.baseUrl || !apiConfig?.model) {
				throw new Error(LLM_NOT_CONFIGURED_MSG)
			}
			if (isDirectModel && !apiConfig.apiKey) {
				throw new Error(LLM_NOT_CONFIGURED_MSG)
			}

			isLoading.value = true
			controller.value = new AbortController()

			const headers = { 'Content-Type': 'application/json' }
			if (isDirectModel) {
				headers.Authorization = `Bearer ${apiConfig.apiKey}`
			}

			const postBody = {
				model: apiConfig.model,
				messages,
				stream: true
			}
			if (temperature != null) {
				postBody.temperature = temperature
			}
			if (maxTokens != null && Number(maxTokens) > 0) {
				postBody.max_tokens = Number(maxTokens)
			}
			if (isReasoningModel(apiConfig.model)) {
				postBody.enable_thinking = true
			}

			const response = await fetch(apiConfig.baseUrl, {
				method: 'POST',
				headers,
				body: body ? JSON.stringify(body) : JSON.stringify(postBody),
				signal: controller.value.signal
			})

			if (!response.ok) {
				if (import.meta.env.DEV) {
					let detail = ''
					try {
						detail = await response.clone().text()
					} catch {
						/* ignore */
					}
					console.error('LLM request failed', response.status, detail.slice(0, 500))
				}
				onErrorMessage(LLM_REQUEST_FAILED_MSG)
				throw new Error(LLM_REQUEST_FAILED_MSG)
			}

			const reader = response.body.getReader()
			const state = { content: '', reasoning: '' }
			const decoder = new TextDecoder('utf-8')
			let buffer = ''

			const emitUpdate = () => {
				if (!hideThinkContent) {
					onDataUpdate(state.content, { thinking: state.reasoning })
					return
				}

				const split = splitThinkContent(state.content)
				const merged = mergeStreamParts(split.content, split.thinking, state.reasoning)

				// Close-tag-only streams: before </think>, show text in thinking pane
				if (
					!merged.thinking &&
					state.content &&
					isReasoningModel(apiConfig.model) &&
					!hasThinkCloseTag(state.content)
				) {
					onDataUpdate('', { thinking: state.content })
					return
				}

				onDataUpdate(merged.content, { thinking: merged.thinking })
			}

			const consumeDataLine = (line) => {
				const parsed = parseStreamLine(line)
				if (!parsed) return
				if (applyChatCompletionChunk(state, parsed)) emitUpdate()
			}

			// eslint-disable-next-line no-constant-condition
			while (true) {
				const { done, value } = await reader.read()
				if (done) break

				buffer += decoder.decode(value, { stream: true })
				const lines = buffer.split(/\r?\n/)
				buffer = lines.pop() || ''
				for (const line of lines) consumeDataLine(line)
			}

			buffer += decoder.decode()
			for (const line of buffer.split(/\r?\n/)) consumeDataLine(line)

			const finalSplit = hideThinkContent
				? splitThinkContent(state.content)
				: { thinking: '', content: state.content }
			const finalMerged = mergeStreamParts(
				finalSplit.content,
				finalSplit.thinking,
				state.reasoning
			)

			if (!finalMerged.content.trim() && !finalMerged.thinking.trim()) {
				const model = apiConfig.model
				const errorMsg = isLikelyNonChatModel(model)
					? `模型「${model}」未返回对话内容。它可能是 Embedding / Rerank 等非对话模型，请在设置中更换对话模型后重试。`
					: '模型未返回有效内容，请换一个对话模型重试。'
				onErrorMessage(errorMsg)
				throw new Error(errorMsg)
			}

			emitUpdate()
			return finalMerged.content
		} catch (error) {
			if (isManuallyAborted.value) return ''
			throw error
		} finally {
			isManuallyAborted.value = false
			isLoading.value = false
			controller.value = null
		}
	}

	const stopGeneration = () => {
		if (controller.value) {
			isManuallyAborted.value = true
			lastAborted.value = true
			controller.value.abort()
			controller.value = null
			isLoading.value = false
		}
	}

	return {
		callLLMAPIStream,
		stopGeneration,
		isLoading,
		isManuallyAborted,
		lastAborted
	}
}
