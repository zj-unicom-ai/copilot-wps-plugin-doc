import { OpenRevision } from '@/shared/wps/func_wps.js'

export const useFixPolishData = ({ showResult, revisionsType }) => {
	// 开始处理修订、润色后的文本
	const handleMutilRevision = async (command, content) => {
		if (!content) return
		const data = command === 'fix' ? getFixedContent(content) : extractOptimizedAndReport(content)
		const aiContent = data ? data.allContent : ''

		OpenRevision(window.Application.ActiveDocument, true, true)
		revisionsType.value = 0

		mergeDocumentsWithAIContent(aiContent)
	}

	let revisedDoc = null
	// 修正、润色结果对比修订
	function mergeDocumentsWithAIContent(aiContent) {
		const app = window.Application // wps对象
		const originalDoc = app.ActiveDocument // 原始文档
		let selection = app.Selection
		const selectionText = selection.Range.Text // 选区内容

		try {
			// Create an in-memory temp document
			revisedDoc = app.Documents.Add('', '', '', false) // 创建新文档（未保存到磁盘）

			// Copy full content (including formatting)
			originalDoc.Content.Copy()
			revisedDoc.Content.Paste() // 粘贴时保留原格式

			// 没有选区时默认全文
			if (!selectionText) {
				const aiContentArray = aiContent
					.replace(/\n([•\-*]\s+)/g, ' $1')
					.replace(/\n/g, '\r')
					.replace(/\r+\s*\r+/g, '\r\r')
					.split('\r')
					.filter((line) => line.trim() !== '')

				const paragraphs = revisedDoc.Paragraphs
				const originalParagraphs = originalDoc.Paragraphs

				const nonEmptyOriginalIndexes = []
				for (let i = 1; i <= originalParagraphs.Count; i++) {
					const para = originalParagraphs.Item(i)
					if (para.Range.Text.trim().length > 0 && !hasImageOrTable(para.Range)) {
						nonEmptyOriginalIndexes.push(i)
					}
				}

				if (nonEmptyOriginalIndexes.length === aiContentArray.length) {
					for (let i = 0; i < nonEmptyOriginalIndexes.length; i++) {
						const index = nonEmptyOriginalIndexes[i]
						const originalPara = originalParagraphs.Item(index)
						const revisedPara = paragraphs.Item(index)

						const originalText = originalPara.Range.Text.trim()
						const aiText = (aiContentArray[i] || '').trim()

						if (originalText !== aiText) {
							const originalFormat = originalPara.Format
							const range = revisedPara.Range

							range.Text = aiContentArray[i] || ''
							revisedPara.Format = originalFormat

							range.Collapse(0)
							range.InsertParagraphAfter()
						}
					}
				} else {
					// 全文替换
					revisedDoc.Content.Text = aiContent
				}
			} else {
				// 选区有内容时
				const originRange = selection.Range
				const selStart = originRange.Start
				const selEnd = originRange.End

				// 选中区域的第一个字和最后一个字，用于判断是否需要添加换行符
				const selLastText = originRange.Text.slice(-1).trim()
				const selStartText = originRange.Text.slice(0, 1).trim()

				const newContent = [
					selStartText.length ? '' : '\r',
					aiContent,
					selLastText.length ? '' : '\r'
				].join('')

				// 使用新文本替换临时文档中选区的内容
				const range = revisedDoc.Range(selStart, selEnd)

				// 删除原选区内容并插入新内容
				// range.Delete()
				// range.InsertAfter(newContent)
				range.Text = newContent
			}

			// 获取临时文档最后一段
			const lastParagraph = revisedDoc.Paragraphs.Last
			// 最后一段的文本
			const lastParagraphText = lastParagraph.Range.Text
			// 原文档最后一段的文本
			const oldLastParagraphText = originalDoc.Paragraphs.Last.Range.Text
			// 若新文档最后一段是空而老文档最后一段非空，则删除新文档的空白行
			if (!lastParagraphText.trim() && oldLastParagraphText) {
				// 删除最后一段
				lastParagraph.Range.Delete()
			}

			originalDoc.Compare(
				revisedDoc.FullName,
				'AI智写',
				app.Enum.wdCompareTargetCurrent,
				false,
				false,
				false,
				false
			)

			// 原文档与临时文档进行对比，比对差异直接在原始文档中标记修订
			// app.CompareDocuments(
			//   originalDoc, // 原始文档
			//   revisedDoc, // 内存中的修订后文档
			//   app.Enum.wdCompareDestinationOriginal, // 直接在原始文档中标记修订 wdCompareDestinationOriginal
			//   app.Enum.wdGranularityCharLevel, // 按字符级比较
			//   false,
			//   false,
			//   false,
			//   false,
			//   false,
			//   false,
			//   false,
			//   false,
			//   false,
			//   false,
			//   'AI写作助手',
			//   false
			// )

			// 激活当前文档
			originalDoc.Activate()
			window.Application.ActiveWindow.View.SplitSpecial = 0 // 重置视图分割

			// 显示修正/润色完成弹框
			showHandleModal(true)
		} catch (e) {
			console.error('文档比对失败:', e)
			// Close temp document without saving
			if (revisedDoc) {
				revisedDoc.Close(window.Application.Enum.wdDoNotSaveChanges)
				revisedDoc = null // 清空引用
			}
		}
	}

	// 新增：检测段落中的图片和表格
	function hasImageOrTable(paragraph) {
		// 检查是否包含图片（InlineShapes）
		const hasImage = paragraph.InlineShapes.Count > 0
		// 检查是否包含表格（Tables）
		const hasTable = paragraph.Tables.Count > 0
		return hasImage || hasTable
	}

	// 显示或隐藏修正、润色的弹框
	const showHandleModal = (visible) => {
		showResult.value = visible

		// Close temp document without saving
		if (revisedDoc) {
			revisedDoc.Close(window.Application.Enum.wdDoNotSaveChanges)
			revisedDoc = null // 清空引用
		}
	}

	// 允许全部修订结果
	const replaceFix = () => {
		const doc = window.Application.ActiveDocument

		const userConfirmed = confirm(
			`当前文档有${doc.Revisions.Count} 个待处理修订项（包含删除与插入修订），要全部修订吗？`
		)

		// 如果用户点击取消，则直接返回
		if (!userConfirmed) {
			return
		}
		if (doc.Revisions.Count >= 1) {
			// doc.AcceptAllRevisionsShown()

			for (let i = 1; i <= doc.Revisions.Count; i++) {
				const rev = doc.Revisions.Item(i)
				if (rev.Type === 1) {
					const index = i > 1 ? i - 1 : i
					const prevDeleted = doc.Revisions.Item(index)
					rev.Range.Font = prevDeleted.Range.Font
				}
			}

			doc.AcceptAllRevisions()

			OpenRevision(doc, false, false)
		}
		// 使用通用排版格式化文档
		// replaceAllContentByCommonStyle()

		// 关闭弹框
		showHandleModal(false)
	}

	// 撤销修正
	const reFix = () => {
		const doc = window.Application.ActiveDocument
		const userConfirmed = confirm(
			`当前文档有${doc.Revisions.Count} 个待处理修订项（包含删除与插入修订），要全部拒绝吗？`
		)

		// 如果用户点击取消，则直接返回
		if (!userConfirmed) {
			return
		}
		if (doc.Revisions.Count >= 1) {
			doc.RejectAllRevisions()
			OpenRevision(doc, false, false)
		}

		showHandleModal(false)
	}

	// 获取修正后的结果
	const getFixedContent = (content) => {
		// 首先尝试标准格式
		const standardRegex = /===修正后的内容===([\s\S]*?)===修正报告===(.*)/s
		let match = content.match(standardRegex)

		if (match) {
			const allContent = match[1].trim()
			const reportContent = match[2].trim()
			return {
				allContent,
				reportContent
			}
		}

		return {
			allContent: '',
			reportContent: '无法解析纠错结果，请重试。'
		}
	}

	// 提取润色内容和报告内容的工具函数
	const extractOptimizedAndReport = (content) => {
		// 首先尝试标准格式
		const standardRegex = /===润色后的内容===(.*?)===润色报告===(.*)/s
		let match = content.match(standardRegex)

		if (match) {
			const allContent = match[1].trim()
			const reportContent = match[2].trim()
			return {
				allContent,
				reportContent
			}
		}

		return {
			allContent: '',
			reportContent: '无法解析润色结果，请重试。'
		}
	}

	return {
		handleMutilRevision,
		replaceFix,
		reFix
	}
}
