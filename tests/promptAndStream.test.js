import { describe, it, expect } from 'vitest'
import {
	stripThinkContent,
	splitThinkContent,
	extractReasoningDelta,
	applyChatCompletionChunk,
	parseStreamLine,
	mergeStreamParts
} from '@/utils/llmStreamParse.js'
import { isLikelyNonChatModel } from '@/utils/llmModel.js'
import { applyPlaceholders, buildMessages } from '@/config/prompts/index.js'
import {
	toUserMessage,
	isAbortError,
	LLM_NOT_CONFIGURED_MSG,
	LLM_REQUEST_FAILED_MSG,
	isErrorAssistantMessage,
	isFailedChatResult
} from '@/shared/errors.js'
import { getFileIcon, formatFileSize } from '@/features/chat/composables/useChatAttachments.js'
import { resolveAssistantParts } from '@/features/chat/composables/useChatActions.js'

describe('splitThinkContent', () => {
	it('splits paired think tags', () => {
		expect(splitThinkContent('<think>secret</think>\n你好')).toEqual({
			thinking: 'secret',
			content: '你好'
		})
	})

	it('treats incomplete open tag as thinking-only', () => {
		expect(stripThinkContent('<think>still thinking')).toBe('')
	})

	it('returns plain content unchanged', () => {
		expect(stripThinkContent('hello')).toBe('hello')
	})

	it('splits close-tag-only streams (reasoning models)', () => {
		const sample =
			'嗯，用户打了个招呼。保持专业调性。</think>你好！我是 AI智写。'
		expect(splitThinkContent(sample)).toEqual({
			thinking: '嗯，用户打了个招呼。保持专业调性。',
			content: '你好！我是 AI智写。'
		})
	})
})

describe('stream chunk helpers', () => {
	it('reads reasoning_content from deltas', () => {
		expect(extractReasoningDelta({ reasoning_content: 'a' })).toBe('a')
		expect(extractReasoningDelta({ content: 'x' })).toBe('')
	})

	it('accumulates reasoning then content', () => {
		const state = { content: '', reasoning: '' }
		for (const line of [
			'data: {"choices":[{"delta":{"reasoning_content":"Let me"}}]}',
			'data: {"choices":[{"delta":{"reasoning_content":" think"}}]}',
			'{"choices":[{"delta":{"content":"9.8 is greater"}}]}',
			'data: [DONE]'
		]) {
			const parsed = parseStreamLine(line)
			if (parsed) applyChatCompletionChunk(state, parsed)
		}
		expect(state.reasoning).toBe('Let me think')
		expect(state.content).toBe('9.8 is greater')
		expect(mergeStreamParts(state.content, '', state.reasoning).thinking).toBe('Let me think')
	})
})

describe('resolveAssistantParts', () => {
	it('prefers thinking field and falls back to embedded tags', () => {
		expect(resolveAssistantParts({ content: 'answer', thinking: 'from-field' })).toEqual({
			thinking: 'from-field',
			content: 'answer',
			hasThinking: true
		})
		expect(resolveAssistantParts({ content: '<think>secret</think>\n你好' })).toEqual({
			thinking: 'secret',
			content: '你好',
			hasThinking: true
		})
	})
})

describe('isLikelyNonChatModel', () => {
	it('detects embedding / rerank and allows chat models', () => {
		expect(isLikelyNonChatModel('BAAI/bge-m3')).toBe(true)
		expect(isLikelyNonChatModel('Example-R1:671B')).toBe(false)
	})
})

describe('applyPlaceholders', () => {
	it('replaces indexed placeholders and word limits', () => {
		const result = applyPlaceholders('A{0}B${minWords}-${maxWords}', {
			placeholders: ['X'],
			minWords: 10,
			maxWords: 20
		})
		expect(result).toBe('AXB10-20')
	})

	it('replaces named extra placeholders', () => {
		const result = applyPlaceholders('t={currentTime} n={paragraphCount}', {
			extra: { currentTime: 'now', paragraphCount: '3' }
		})
		expect(result).toBe('t=now n=3')
	})

	it('replaces ${named} extra placeholders used by translation templates', () => {
		const result = applyPlaceholders(
			'Translate to ${targetLanguageName} ONLY. Output in ${targetLanguageName}.',
			{ extra: { targetLanguageName: 'English' } }
		)
		expect(result).toBe('Translate to English ONLY. Output in English.')
	})

	it('does not leave a dangling $ when both ${key} and {key} forms exist', () => {
		const result = applyPlaceholders('A${name}B{name}C', {
			extra: { name: 'X' }
		})
		expect(result).toBe('AXBXC')
	})
})

describe('buildMessages', () => {
	it('omits empty roles', () => {
		expect(buildMessages('sys', 'user')).toEqual([
			{ role: 'system', content: 'sys' },
			{ role: 'user', content: 'user' }
		])
		expect(buildMessages('', 'only-user')).toEqual([{ role: 'user', content: 'only-user' }])
	})
})

describe('toUserMessage / isAbortError', () => {
	it('maps AbortError', () => {
		const err = new Error('aborted')
		err.name = 'AbortError'
		expect(isAbortError(err)).toBe(true)
		expect(toUserMessage(err)).toBe('已停止生成')
	})

	it('maps timeout and network errors', () => {
		expect(toUserMessage(new Error('timeout'))).toContain('超时')
		expect(toUserMessage(new Error('Failed to fetch'))).toContain('网络')
	})

	it('hides proxy / gateway details behind a generic request-failed message', () => {
		expect(
			toUserMessage(
				new Error('请求失败 (502): LLM proxy: 上游返回跨域重定向到 http://198.51.100.10:8080')
			)
		).toBe(LLM_REQUEST_FAILED_MSG)
		expect(
			toUserMessage(
				new Error('请求失败 (502): LLM proxy: 上游返回跨域重定向到 http://10.0.0.1:8080')
			)
		).toBe(LLM_REQUEST_FAILED_MSG)
		expect(toUserMessage(new Error('请求被网络网关拦截，请先在浏览器打开'))).toBe(
			LLM_REQUEST_FAILED_MSG
		)
		expect(toUserMessage(new Error('models request failed (502)'))).toBe(LLM_REQUEST_FAILED_MSG)
		expect(toUserMessage(new Error('LLM proxy: missing target origin'))).toBe(
			LLM_REQUEST_FAILED_MSG
		)
	})

	it('maps English apiConfig errors to not-configured message', () => {
		expect(toUserMessage(new Error('apiConfig must include baseUrl and model'))).toBe(
			LLM_NOT_CONFIGURED_MSG
		)
		expect(toUserMessage(new Error('apiConfig.apiKey is required'))).toBe(LLM_NOT_CONFIGURED_MSG)
	})

	it('exports LLM not configured message', () => {
		expect(LLM_NOT_CONFIGURED_MSG).toContain('通用设置')
	})
})

describe('isErrorAssistantMessage / isFailedChatResult', () => {
	it('detects error assistant bubbles by flag or config message', () => {
		expect(isErrorAssistantMessage({ isError: true, content: 'x' })).toBe(true)
		expect(isErrorAssistantMessage({ content: LLM_NOT_CONFIGURED_MSG })).toBe(true)
		expect(isErrorAssistantMessage({ content: '正常回复' })).toBe(false)
	})

	it('blocks subsequent ops for null, config error, isError, or abort', () => {
		expect(isFailedChatResult(null)).toBe(true)
		expect(isFailedChatResult('')).toBe(true)
		expect(isFailedChatResult(LLM_NOT_CONFIGURED_MSG)).toBe(true)
		expect(isFailedChatResult('ok', { isError: true })).toBe(true)
		expect(isFailedChatResult('ok', null, true)).toBe(true)
		expect(isFailedChatResult('正常生成内容')).toBe(false)
	})
})

describe('useChatAttachments helpers', () => {
	it('picks icons by MIME / extension hints', () => {
		expect(getFileIcon('application/pdf')).toContain('pdf.svg')
		expect(getFileIcon('image/png')).toContain('png.svg')
	})

	it('formats byte sizes', () => {
		expect(formatFileSize(0)).toBe('0 B')
		expect(formatFileSize(2048)).toBe('2 KB')
	})
})
