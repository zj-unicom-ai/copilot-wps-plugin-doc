import { describe, it, expect } from 'vitest'
import { applyDesensitizeText } from '@/shared/wps/toolbox/desensitize.js'

describe('applyDesensitizeText', () => {
	it('masks Chinese mobile numbers', () => {
		const out = applyDesensitizeText('联系电话：13812345678')
		expect(out).toContain('138****5678')
		expect(out).not.toContain('13812345678')
	})

	it('masks email addresses', () => {
		const out = applyDesensitizeText('邮箱 user@example.com')
		expect(out).toMatch(/u\*{4}r@example\.com/)
	})

	it('returns empty input unchanged', () => {
		expect(applyDesensitizeText('')).toBe('')
		expect(applyDesensitizeText(null)).toBe(null)
	})
})
