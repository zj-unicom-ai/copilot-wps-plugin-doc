import { ref } from 'vue'
import { extractImagesAndTags } from '@/utils/paibanUtils.js'

function countLeadingSpaces(originalText, text) {
	const firstChar = text[0]
	const firstCharIndex = originalText.indexOf(firstChar)
	return firstCharIndex || 0
}

export function usePolishSelection() {
	let processedDoc = null
	// WPS COM 对象不能放入 Vue ref，否则 Proxy 会导致 Shapes 等属性访问失败
	let originalDoc = null
	const lastOriginalContent = ref(null)
	const lastSelectionRange = ref(null)

	const closeProcessedDoc = () => {
		if (!processedDoc) return
		try {
			processedDoc.Close(0)
		} catch (e) {
			console.warn('Failed to close previous processedDoc', e)
		}
		processedDoc = null
	}

	const getRangeTextWithoutTables = (range) => {
		const result = []
		const paragraphs = range.Paragraphs
		const doc = range.Parent

		for (let i = 1; i <= paragraphs.Count; i++) {
			const para = paragraphs.Item(i)
			let paraRange = {}
			let originalText = ''
			let paraText = ''

			if (range.Start <= para.Range.Start && range.End >= para.Range.End) {
				paraRange = para.Range
			} else {
				const actualStart = Math.max(range.Start, para.Range.Start)
				const actualEnd = Math.min(range.End, para.Range.End)
				paraRange = doc.Range(actualStart, actualEnd)
			}
			originalText = paraRange.Text
			paraText = paraRange.Text.trim()

			if (paraText && paraText != '\x07') {
				const startSpaces = countLeadingSpaces(originalText, paraText)
				result.push({
					text: paraText,
					start: paraRange.Start + startSpaces,
					end: paraRange.Start + startSpaces + paraText.length,
					startSpaces,
					isList: false
				})
			}
		}

		const formatResult = result.filter((item) => item.text !== '/' && item.text.trim() !== '')

		return {
			text: formatResult.map((p) => p.text).join('\n\n'),
			positions: formatResult.filter((p) => p.text.length > 0)
		}
	}

	const getSelectedTextWithoutTables = (doc, selection) => {
		closeProcessedDoc()

		const bookmarkName = 'ProcessingRange'
		processedDoc = extractImagesAndTags(doc, true, selection)

		let finalRange = null
		if (processedDoc.Bookmarks.Exists(bookmarkName)) {
			finalRange = processedDoc.Bookmarks.Item(bookmarkName).Range
		} else {
			finalRange = processedDoc.Content
		}

		return getRangeTextWithoutTables(finalRange)
	}

	return {
		getProcessedDoc: () => processedDoc,
		setProcessedDoc: (doc) => {
			processedDoc = doc
		},
		getOriginalDoc: () => originalDoc,
		setOriginalDoc: (doc) => {
			originalDoc = doc
		},
		closeProcessedDoc,
		lastOriginalContent,
		lastSelectionRange,
		getSelectedTextWithoutTables
	}
}
