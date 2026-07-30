// 标点符号转换相关功能

function convertQuotesWithFind(range) {
	let replaceCount = 0
	let inDoubleQuote = false
	let replacement = inDoubleQuote ? 'replacementEven' : 'replacementOdd'
	let findObj = range.Find

	while (findObj.Execute('"', false, false, false, false, false, true, 1, false, replacement, 1)) {
		replaceCount++
		inDoubleQuote = !inDoubleQuote
		replacement = inDoubleQuote ? 'replacementEven' : 'replacementOdd'
	}
	findObj.Execute('replacementOdd', false, false, false, false, false, true, 1, false, '\u201c', 2)
	findObj.Execute('replacementEven', false, false, false, false, false, true, 1, false, '\u201d', 2)

	let inSingleQuote = false
	replacement = inSingleQuote ? 'replacementEven' : 'replacementOdd'
	while (findObj.Execute("'", false, false, false, false, false, true, 1, false, replacement, 1)) {
		replaceCount++
		inSingleQuote = !inSingleQuote
		replacement = inSingleQuote ? 'replacementEven' : 'replacementOdd'
	}
	findObj.Execute('replacementOdd', false, false, false, false, false, true, 1, false, '\u2018', 2)
	findObj.Execute('replacementEven', false, false, false, false, false, true, 1, false, '\u2019', 2)
	return replaceCount
}

function docConvertTextNew(punctMap, isEnToCn) {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}

	try {
		const selection = window.Application.Selection
		const hasSelection = !!(selection && selection.Range && selection.Range.Text.trim().length > 0)
		const targetRange = hasSelection ? selection.Range : doc.Content
		let replaceCount = 0

		if (isEnToCn) {
			for (let engPunct in punctMap) {
				if (engPunct === '"' || engPunct === "'") continue
				const chnPunct = punctMap[engPunct]
				const findObj = targetRange.Find
				findObj.ClearFormatting()
				findObj.Replacement.ClearFormatting()
				if (
					findObj.Execute(engPunct, false, false, false, false, false, true, 1, false, chnPunct, 2)
				) {
					replaceCount++
				}
			}
			replaceCount = convertQuotesWithFind(targetRange) + replaceCount
		} else {
			for (let chnPunct in punctMap) {
				const engPunct = punctMap[chnPunct]
				const findObj = targetRange.Find
				findObj.ClearFormatting()
				findObj.Replacement.ClearFormatting()
				if (
					findObj.Execute(chnPunct, false, false, false, false, false, true, 1, false, engPunct, 2)
				) {
					replaceCount++
				}
			}
		}

		if (replaceCount > 0) {
			alert(hasSelection ? '选中部分内容已转换' : '全文内容已转换')
		} else {
			alert('未找到需要转换的内容')
		}
	} catch (e) {
		console.error(e)
		alert('转换失败，请稍后重试')
	}
}

export function btnCnToEnPunct() {
	const punctMap = {
		'\uff0c': ',',
		'\u3002': '.',
		'\uff1f': '?',
		'\uff01': '!',
		'\uff1a': ':',
		'\uff1b': ';',
		'\uff08': '(',
		'\uff09': ')',
		'\u3010': '[',
		'\u3011': ']',
		'\u300a': '<',
		'\u300b': '>',
		'\u201c': '"',
		'\u201d': '"',
		'\u2018': "'",
		'\u2019': "'",
		'\u300e': "'",
		'\u300f': "'",
		'\u300c': "'",
		'\u300d': "'",
		'\u3001': ',',
		'\uff5e': '~'
	}
	docConvertTextNew(punctMap)
}

export function btnEnToCnPunct() {
	const punctMap = {
		',': '\uff0c',
		'.': '\u3002',
		'?': '\uff1f',
		'!': '\uff01',
		':': '\uff1a',
		';': '\uff1b',
		'(': '\uff08',
		')': '\uff09',
		'[': '\u3010',
		']': '\u3011',
		'<': '\u300a',
		'>': '\u300b',
		'~': '\uff5e'
	}
	docConvertTextNew(punctMap, true)
}

export function btnApostropheConvert() {
	const punctMap = { '\u2018': '"', '\u2019': '"', "'": '"' }
	docConvertTextNew(punctMap)
}

export function btnQuoteConvert() {
	const punctMap = { '\u201c': '\u2018', '\u201d': '\u2019', '"': "'" }
	docConvertTextNew(punctMap)
}
