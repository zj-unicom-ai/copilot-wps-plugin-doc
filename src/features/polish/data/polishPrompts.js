import { CORRECTION_TYPE } from '@/utils/correctionType.js'

/**
 * UI tip / label helpers for polish flow.
 * Actual LLM prompt bodies live in `src/config/prompts/` (via resolvePrompt).
 * Do not duplicate full prompt text here.
 */

function previewSnippet(selectedText) {
	return selectedText.length > 20
		? selectedText.substring(0, 10) +
				'...' +
				selectedText.substring(selectedText.length - 10, selectedText.length)
		: selectedText
}

/** @param {string} selectedText */
export const getSummarizePrompts = (selectedText) => ({
	userText: '摘要总结',
	selectedText,
	modelText: selectedText,
	tip: `⏱ 将对全文进行摘要总结。`
})

/**
 * @param {string} selectedText
 * @param {string} [correctionType]
 */
export const getFixPrompts = (selectedText, correctionType = CORRECTION_TYPE.SMART) => {
	const text = previewSnippet(selectedText)
	return {
		userText: correctionType === CORRECTION_TYPE.ONLY ? '文字纠错' : 'AI智能校正',
		selectedText,
		modelText: selectedText,
		tip: `⏱ 将对<a>[${text.replace(/\s+/g, '')}]</a> 之间的文案进行AI校正。`
	}
}

/** @param {string} selectedText */
export const getCommonPolishPrompts = (selectedText) => {
	const text = previewSnippet(selectedText)
	return {
		selectedText,
		userText: '润色',
		modelText: selectedText,
		tip: `⏱ 将对<a>[${text.replace(/\s+/g, '')}]</a> 之间的文案进行通用润色。`
	}
}

/** @param {string} selectedText */
export const getNewsPolishPrompts = (selectedText) => {
	const text = previewSnippet(selectedText)
	return {
		selectedText,
		userText: '新闻稿润色',
		modelText: selectedText,
		tip: `⏱ 将对<a>[${text.replace(/\s+/g, '')}]</a> 之间的文案进行新闻稿润色。`
	}
}
