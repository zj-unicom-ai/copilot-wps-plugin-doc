// 删除空格、空行、幽灵字符、空白页相关功能

function processComplexSelectionWithConverter(doc, selectedRange, converter, typeName) {
	let startPos = selectedRange.Start
	let endPos = selectedRange.End
	let replaceCount = 0

	for (let i = 1; i <= doc.Paragraphs.Count; i++) {
		try {
			let paragraph = doc.Paragraphs.Item(i)
			let paraStart = paragraph.Range.Start
			let paraEnd = paragraph.Range.End
			if (paraStart >= startPos && paraEnd <= endPos && paragraph.Range.Tables.Count === 0) {
				let originalText = paragraph.Range.Text
				let convertedText = converter(originalText)
				if (originalText !== convertedText) {
					paragraph.Range.Text = convertedText
					replaceCount++
				}
			}
		} catch (e) {
			continue
		}
	}

	for (let i = 1; i <= selectedRange.Tables.Count; i++) {
		try {
			let table = selectedRange.Tables.Item(i)
			for (let row = 1; row <= table.Rows.Count; row++) {
				for (let col = 1; col <= table.Columns.Count; col++) {
					try {
						let cell = table.Cell(row, col)
						let originalText = cell.Range.Text
						let convertedText = converter(originalText)
						if (originalText !== convertedText) {
							cell.Range.Text = convertedText
							replaceCount++
						}
					} catch (e) {
						continue
					}
				}
			}
		} catch (e) {
			continue
		}
	}

	if (replaceCount > 0) {
		alert(`选中部分的${typeName}已转换，共处理 ${replaceCount} 个段落/单元格`)
	} else {
		alert(`选中部分未找到需要转换的${typeName}`)
	}
}

function processEntireDocumentWithConverter(doc, converter, typeName) {
	let replaceCount = 0
	for (let i = 1; i <= doc.Paragraphs.Count; i++) {
		try {
			let paragraph = doc.Paragraphs.Item(i)
			if (paragraph.Range.Tables.Count > 0) continue
			let originalText = paragraph.Range.Text
			let convertedText = converter(originalText)
			if (originalText !== convertedText) {
				paragraph.Range.Text = convertedText
				replaceCount++
			}
		} catch (e) {
			continue
		}
	}

	if (doc.Tables.Count > 0) {
		for (let i = 1; i <= doc.Tables.Count; i++) {
			try {
				let table = doc.Tables.Item(i)
				for (let row = 1; row <= table.Rows.Count; row++) {
					for (let col = 1; col <= table.Columns.Count; col++) {
						try {
							let cell = table.Cell(row, col)
							let originalText = cell.Range.Text
							let convertedText = converter(originalText)
							if (originalText !== convertedText) {
								cell.Range.Text = convertedText
								replaceCount++
							}
						} catch (e) {
							continue
						}
					}
				}
			} catch (e) {
				continue
			}
		}
	}

	if (replaceCount > 0) {
		alert(`全文${typeName}已转换，共处理 ${replaceCount} 个段落/单元格`)
	} else {
		alert(`未找到需要转换的${typeName}`)
	}
}

const ghostCharPattern =
	/[\u00A0\u2000-\u200F\u2028\u2029\u202F\u205F\u3000\uFEFF\u2060\u180E\u200B-\u200D\u2063]/g

export function btnGhostCharToSpace() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}
	try {
		const selection = window.Application.Selection
		const hasSelection = !!(selection && selection.Range && selection.Range.Text.trim().length > 0)
		const converter = (text) => text.replace(ghostCharPattern, ' ')

		if (hasSelection) {
			const selectedRange = selection.Range
			if (selectedRange.Tables.Count > 0) {
				processComplexSelectionWithConverter(doc, selectedRange, converter, '幽灵字符')
			} else {
				selectedRange.Text = converter(selectedRange.Text)
				alert('选中部分的幽灵字符已转换为空格')
			}
		} else {
			processEntireDocumentWithConverter(doc, converter, '幽灵字符')
		}
	} catch (e) {
		console.error(e)
		alert('转换失败，请稍后重试')
	}
}

export function btnDeleteSpaces() {
	const app = window.Application
	const doc = app && app.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}

	try {
		const selection = app.Selection
		const hasSelection = !!(
			selection &&
			selection.Range &&
			selection.Range.Text &&
			selection.Range.Text.length > 0
		)
		const targetRange = hasSelection ? selection.Range : doc.Content

		if (!targetRange || !targetRange.Find) {
			alert('当前光标不在可查找的正文范围，请将光标置于正文再试')
			return
		}

		const find = targetRange.Find
		find.ClearFormatting()
		find.Replacement.ClearFormatting()

		const replaceAll = (findText, useWildcards = false) => {
			try {
				return find.Execute(
					findText,
					false,
					false,
					useWildcards,
					false,
					false,
					true,
					1,
					false,
					'',
					2
				)
			} catch (e) {
				return false
			}
		}

		let replaced = 0
		if (replaceAll(' ')) replaced++
		if (replaceAll('\u3000')) replaced++
		if (replaceAll('^s')) replaced++

		alert(replaced > 0 ? '已删除所有空格' : '未发现空格可删除')
	} catch (e) {
		console.error(e)
		alert('删除空格失败，请稍后重试')
	}
}

export function btnDeleteEmptyLines() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}

	try {
		const findObj = doc.Content.Find
		findObj.ClearFormatting()
		findObj.Replacement.ClearFormatting()
		let replaceCount = 0

		const replaced = findObj.Execute(
			'^p^p',
			false,
			false,
			false,
			false,
			false,
			true,
			1,
			false,
			'^p',
			2
		)
		if (replaced) {
			let maxIterations = 10
			let iterations = 0
			while (
				iterations < maxIterations &&
				findObj.Execute('^p^p', false, false, false, false, false, true, 1, false, '^p', 2)
			) {
				replaceCount++
				iterations++
			}
			replaceCount++
		}

		if (replaceCount > 0) {
			alert('已删除多余空行')
		} else {
			alert('文档中没有发现多余空行')
		}
	} catch (e) {
		console.error(e)
		alert('删除空行失败，请稍后重试')
	}
}

export function btnDeleteGhostChar() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}

	try {
		const selection = window.Application.Selection
		const hasSelection = !!(selection && selection.Range && selection.Range.Text.trim().length > 0)
		const deleteGhostChars = (text) => (text ? text.replace(ghostCharPattern, '') : text)

		if (hasSelection) {
			const selectedRange = selection.Range
			if (selectedRange.Tables.Count > 0) {
				processComplexSelectionWithConverter(doc, selectedRange, deleteGhostChars, '幽灵字符')
			} else {
				selectedRange.Text = deleteGhostChars(selectedRange.Text)
				alert('选中部分的幽灵字符已删除')
			}
		} else {
			processEntireDocumentWithConverter(doc, deleteGhostChars, '幽灵字符')
		}
	} catch (e) {
		console.error(e)
		alert('删除幽灵字符失败，请稍后重试')
	}
}

function isBlankPage(pageRange) {
	try {
		// eslint-disable-next-line no-control-regex
		const ctrlCharRe = /[\u0001-\u001F]/g
		const wsRe = /[\r\n\f\t\s\u00A0\u2000-\u200F\u2028\u2029\u202F\u205F\u3000\uFEFF]/g
		const strip = (s) => s.replace(wsRe, '').replace(ctrlCharRe, '')

		if (typeof pageRange === 'string') {
			const cleanContent = strip(pageRange)
			return cleanContent.length === 0 || cleanContent.length <= 2
		}
		if (pageRange.Tables && pageRange.Tables.Count > 0) return false
		if (pageRange.InlineShapes && pageRange.InlineShapes.Count > 0) return false
		if (pageRange.ShapeRange && pageRange.ShapeRange.Count > 0) return false

		const pageText = pageRange.Text || ''
		const cleanContent = strip(pageText)
		return cleanContent.length === 0 || cleanContent.length <= 2
	} catch (error) {
		return false
	}
}

export function btnDeleteBlankPage() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}

	try {
		const originalStart = window.Application.Selection.Start
		const originalEnd = window.Application.Selection.End
		let totalPages = doc.ComputeStatistics(2)

		if (totalPages <= 1) {
			alert('文档只有一页，无需删除空白页')
			return
		}

		let deletedPages = 0
		let currentPage = totalPages
		let maxLoop = totalPages * 2

		while (currentPage >= 1 && maxLoop > 0) {
			maxLoop--
			try {
				const Selection = window.Application.Selection
				Selection.GoTo(1, 1, currentPage)
				const start = Selection.Start
				Selection.GoTo(1, 1, currentPage + 1)
				const end = Selection.Start

				if (start === end) {
					doc.Range(start, doc.Range().End).Select()
				} else {
					doc.Range(start, end - 1).Select()
				}

				if (isBlankPage(Selection.Range)) {
					window.Application.Selection.Delete()
					deletedPages++
				}
				currentPage--
			} catch (e) {
				currentPage--
				continue
			}
		}

		try {
			const newDocLength = doc.Content.End
			doc.Range(Math.min(originalStart, newDocLength), Math.min(originalEnd, newDocLength)).Select()
		} catch (e) {
			doc.Range(0, 0).Select()
		}

		if (deletedPages > 0) {
			alert(`成功删除了 ${deletedPages} 个空白页`)
		} else {
			alert('未发现空白页')
		}
	} catch (error) {
		console.error(error)
		alert('删除空白页失败，请稍后重试')
	}
}
