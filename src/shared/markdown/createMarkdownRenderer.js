import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const PRESETS = {
	chat: {
		html: true,
		linkify: true,
		typographer: true,
		breaks: true,
		quotes: '“”‘’'
	},
	polish: {
		html: true,
		linkify: true,
		typographer: true,
		breaks: true
	},
	document: {
		html: true,
		breaks: true,
		linkify: true,
		typographer: true
	}
}

/**
 * Sanitize HTML produced from untrusted sources (e.g. LLM markdown output).
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
	if (!html) return ''
	const purify = typeof window !== 'undefined' && window.DOMPurify ? window.DOMPurify : DOMPurify
	return purify.sanitize(html, { USE_PROFILES: { html: true } })
}

/**
 * Create a configured markdown-it instance for the given use case.
 * @param {'chat'|'polish'|'document'} preset
 */
export function createMarkdownRenderer(preset = 'chat') {
	const options = PRESETS[preset] || PRESETS.chat
	const md = new MarkdownIt(options)
	if (preset === 'document') {
		md.disable('list')
	}
	return md
}

/**
 * Render markdown then sanitize the HTML (safe for v-html / innerHTML).
 * @param {import('markdown-it')} md
 * @param {string} content
 * @returns {string}
 */
export function renderSafeMarkdown(md, content) {
	try {
		return sanitizeHtml(md.render(content || ''))
	} catch (error) {
		console.error('Markdown 渲染错误:', error)
		return sanitizeHtml(String(content || ''))
	}
}

export default createMarkdownRenderer
