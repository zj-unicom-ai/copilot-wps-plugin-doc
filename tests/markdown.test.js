import { describe, it, expect } from 'vitest'
import {
	createMarkdownRenderer,
	renderSafeMarkdown,
	sanitizeHtml
} from '@/shared/markdown/createMarkdownRenderer.js'

describe('sanitizeHtml', () => {
	it('strips script tags from untrusted HTML', () => {
		const dirty = '<p>hello</p><script>alert(1)</script>'
		const clean = sanitizeHtml(dirty)
		expect(clean).toContain('<p>hello</p>')
		expect(clean).not.toMatch(/script/i)
	})

	it('strips javascript: URLs', () => {
		const dirty = '<a href="javascript:alert(1)">x</a>'
		const clean = sanitizeHtml(dirty)
		expect(clean).not.toMatch(/javascript:/i)
	})
})

describe('renderSafeMarkdown', () => {
	const md = createMarkdownRenderer('chat')

	it('renders markdown and sanitizes embedded HTML', () => {
		const html = renderSafeMarkdown(md, '**bold**\n\n<script>alert(1)</script>')
		expect(html).toMatch(/<strong>bold<\/strong>/)
		expect(html).not.toMatch(/script/i)
	})
})
