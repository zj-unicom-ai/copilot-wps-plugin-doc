import { describe, it, expect } from 'vitest'
import { resolveChatCompletionsUrl, resolveModelsUrl } from '@/utils/llmUrl.js'

describe('llmUrl', () => {
	describe('resolveChatCompletionsUrl', () => {
		it('appends /v1/chat/completions when useFullUrl is false', () => {
			expect(resolveChatCompletionsUrl('https://api.uni-router.net', false)).toBe(
				'https://api.uni-router.net/v1/chat/completions'
			)
			expect(resolveChatCompletionsUrl('https://api.example.com', false)).toBe(
				'https://api.example.com/v1/chat/completions'
			)
		})

		it('returns the address as-is when useFullUrl is true', () => {
			const full = 'https://api.example.com/v1/chat/completions'
			expect(resolveChatCompletionsUrl(full, true)).toBe(full)
			expect(resolveChatCompletionsUrl('https://api.example.com/custom/path', true)).toBe(
				'https://api.example.com/custom/path'
			)
		})

		it('still appends when useFullUrl is false even if path looks like completions', () => {
			const full = 'https://api.uni-router.net/v1/chat/completions'
			expect(resolveChatCompletionsUrl(full, false)).toBe(
				'https://api.uni-router.net/v1/chat/completions/v1/chat/completions'
			)
		})

		it('returns empty string for blank input', () => {
			expect(resolveChatCompletionsUrl('', false)).toBe('')
			expect(resolveChatCompletionsUrl('   ', true)).toBe('')
		})
	})

	describe('resolveModelsUrl', () => {
		it('appends /v1/models when useFullUrl is false', () => {
			expect(resolveModelsUrl('https://api.uni-router.net', false)).toBe(
				'https://api.uni-router.net/v1/models'
			)
			expect(resolveModelsUrl('https://api.uni-router.net/v1/chat/completions', false)).toBe(
				'https://api.uni-router.net/v1/chat/completions/v1/models'
			)
		})

		it('derives /v1/models from full chat URL when useFullUrl is true', () => {
			expect(resolveModelsUrl('https://api.uni-router.net/v1/chat/completions', true)).toBe(
				'https://api.uni-router.net/v1/models'
			)
			expect(resolveModelsUrl('https://api.uni-router.net/v1/chat/completions ', true)).toBe(
				'https://api.uni-router.net/v1/models'
			)
			expect(resolveModelsUrl('https://api.example.com:8443/gateway/v1/chat/completions', true)).toBe(
				'https://api.example.com:8443/gateway/v1/models'
			)
		})

		it('returns empty string for invalid full URL', () => {
			expect(resolveModelsUrl('not-a-url', true)).toBe('')
		})
	})
})
