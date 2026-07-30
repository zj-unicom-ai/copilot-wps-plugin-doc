import { describe, it, expect, beforeEach } from 'vitest'
import {
	readSettings,
	writeSettings,
	getLlmConfig,
	isLlmConfigured,
	SETTINGS_FILE,
	LEGACY_SETTINGS_FILE,
	DEFAULT_LLM
} from '@/services/settingsService.js'

describe('settingsService', () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it('returns defaults when no settings exist', () => {
		const settings = readSettings()
		expect(settings.autoStart).toBe(true)
		expect(settings.llm.platform).toBe('unirouter')
		expect(settings.llm.baseUrl).toBe(DEFAULT_LLM.baseUrl)
		expect(settings.llm.useFullUrl).toBe(false)
		expect(settings.llm.model).toBe('')
		expect(isLlmConfigured()).toBe(false)
	})

	it('persists settings under the new filename', () => {
		writeSettings({
			llm: {
				apiKey: 'test-key',
				baseUrl: DEFAULT_LLM.baseUrl,
				model: 'gpt-4o-mini',
				platform: 'unirouter',
				useFullUrl: false
			}
		})
		expect(localStorage.getItem(SETTINGS_FILE)).toBeTruthy()
		expect(isLlmConfigured()).toBe(true)
		expect(getLlmConfig().apiKey).toBe('test-key')
		expect(getLlmConfig().useFullUrl).toBe(false)
	})

	it('reads legacy settings filename for compatibility', () => {
		localStorage.setItem(
			LEGACY_SETTINGS_FILE,
			JSON.stringify({
				autoStart: false,
				llm: { ...DEFAULT_LLM, apiKey: 'legacy-key' }
			})
		)
		const settings = readSettings()
		expect(settings.autoStart).toBe(false)
		expect(settings.llm.apiKey).toBe('legacy-key')
	})

	it('treats missing useFullUrl as full URL mode for old configs', () => {
		localStorage.setItem(
			SETTINGS_FILE,
			JSON.stringify({
				autoStart: true,
				llm: {
					baseUrl: 'https://api.openai.com/v1/chat/completions',
					apiKey: 'old-key',
					model: 'gpt-4o-mini',
					temperature: 0.7,
					maxTokens: 4096
				}
			})
		)
		const llm = getLlmConfig()
		expect(llm.useFullUrl).toBe(true)
		expect(llm.platform).toBe('custom')
		expect(llm.baseUrl).toBe('https://api.openai.com/v1/chat/completions')
		expect(isLlmConfigured()).toBe(true)
	})

	it('preserves explicit useFullUrl false after save', () => {
		writeSettings({
			llm: {
				platform: 'unirouter',
				baseUrl: 'https://www.unirouter.net/',
				useFullUrl: false,
				apiKey: 'k',
				model: 'm'
			}
		})
		expect(getLlmConfig().useFullUrl).toBe(false)
		expect(getLlmConfig().platform).toBe('unirouter')
	})
})
