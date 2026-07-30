import { OpenRevision } from '@/shared/wps/func_wps.js'
import { restoreImages, restoreTables } from '@/utils/paibanUtils.js'

export function usePolishRevision({
	getProcessedDoc,
	setProcessedDoc,
	getOriginalDoc,
	lastOriginalContent,
	currentCommand,
	fixData,
	result,
	showFixResult,
	showPolishResult,
	showPolishLevelSelector,
	showMsg,
	revisionsType,
	FIX_COMMAND
}) {
	const showHandleModal = (visible) => {
		if (currentCommand.value === FIX_COMMAND) {
			showFixResult.value = visible
		} else {
			showPolishResult.value = visible
			showPolishLevelSelector.value = visible
		}
	}

	const isImageRelatedRevision = (revision) => {
		try {
			const range = revision.Range
			if (range.InlineShapes && range.InlineShapes.Count > 0) {
				return true
			}

			if (
				revision.Type === window.Application.Enum.wdRevisionParagraphProperty ||
				revision.Type === window.Application.Enum.wdRevisionSectionProperty
			) {
				const paragraph = range.Paragraphs.Item(1)
				if (paragraph && paragraph.Range.InlineShapes && paragraph.Range.InlineShapes.Count > 0) {
					return true
				}
			}

			return false
		} catch {
			return false
		}
	}

	const filterImageRevisions = (doc) => {
		try {
			const revisions = doc.Revisions
			const revisionsToRemove = []

			for (let i = 1; i <= revisions.Count; i++) {
				const rev = revisions.Item(i)
				if (isImageRelatedRevision(rev)) {
					revisionsToRemove.push(rev)
				}
			}

			for (let i = revisionsToRemove.length - 1; i >= 0; i--) {
				revisionsToRemove[i].Reject()
			}
		} catch (e) {
			console.warn('过滤图片修订时出错:', e)
		}
	}

	const mergeDocumentsWithAIContent = (aiContent) => {
		const app = window.Application
		const processedDoc = getProcessedDoc()
		processedDoc.Activate()

		if (!processedDoc || !lastOriginalContent.value) {
			console.error('Missing processedDoc or lastOriginalContent')
			return
		}

		OpenRevision(getOriginalDoc(), true, true)

		try {
			let aiParagraphs = aiContent
				.split(/\r?\n/)
				.filter((line) => line.trim())
				.map((line) => line.trim())

			const originalContent = lastOriginalContent.value

			if (originalContent.positions.length < aiParagraphs.length) {
				aiParagraphs[originalContent.positions.length - 1] = aiParagraphs
					.slice(originalContent.positions.length - 1, aiParagraphs.length)
					.join('\n')
			}

			for (let i = originalContent.positions.length - 1; i >= 0; i--) {
				const position = originalContent.positions[i]
				const range = processedDoc.Range(position.start, position.end)

				if (position.text == aiParagraphs[i]) continue

				const originalFormat = range.FormattedText
				if (i > aiParagraphs.length) {
					range.Text = ' '
				} else {
					range.Text = aiParagraphs[i]
				}
				range.Collapse(0)
				range.FormattedText = originalFormat
			}

			restoreImages(processedDoc, getOriginalDoc())
			restoreTables(processedDoc, getOriginalDoc())

			const lastParagraph = processedDoc.Paragraphs.Last
			const lastParagraphText = lastParagraph.Range.Text
			const oldLastParagraphText = getOriginalDoc().Paragraphs.Last.Range.Text
			if (!lastParagraphText.trim() && oldLastParagraphText) {
				lastParagraph.Range.Delete()
			}

			app.CompareDocuments(
				getOriginalDoc(),
				processedDoc,
				app.Enum.wdCompareDestinationOriginal,
				app.Enum.wdGranularityCharLevel,
				false,
				false,
				false,
				false,
				false,
				false,
				false,
				false,
				false,
				false,
				'AI智写',
				false
			)

			getOriginalDoc().Activate()
			filterImageRevisions(getOriginalDoc())

			const activeWindow = window.Application.ActiveWindow
			activeWindow.View.SplitSpecial = window.Application.Enum.wdPaneNone || 0

			if (getOriginalDoc().Revisions.Count >= 1) {
				showHandleModal(true)
			} else {
				showMsg.value = true
				if (currentCommand.value !== FIX_COMMAND) {
					showPolishLevelSelector.value = true
				}
				OpenRevision(getOriginalDoc(), false, false)
			}

			processedDoc.Close(window.Application.Enum.wdDoNotSaveChanges)
			setProcessedDoc(null)
		} catch (e) {
			console.error('文档比对失败:', e)
			const doc = getProcessedDoc()
			if (doc) {
				doc.Close(window.Application.Enum.wdDoNotSaveChanges)
				setProcessedDoc(null)
			}
			OpenRevision(getOriginalDoc(), false, false)
		}

		window.Application.ActiveDocument.CommandBars.ExecuteMso('ReviewHideSourceDocumentsMenu')
		getOriginalDoc().Activate()
	}

	const handleMutilRevision = () => {
		let aiContent = ''
		if (currentCommand.value === FIX_COMMAND) {
			aiContent = fixData.value.fixContent
		} else {
			aiContent = result.value.optimizedContent
		}

		revisionsType.value = 0
		mergeDocumentsWithAIContent(aiContent)
	}

	const replaceFix = () => {
		const doc = getOriginalDoc()
		const userConfirmed = confirm(
			`当前文档有${doc.Revisions.Count} 个待处理修订项（包含删除与插入修订），要全部修订吗？`
		)

		if (!userConfirmed) return

		if (doc.Revisions.Count >= 1) {
			for (let i = 1; i <= doc.Revisions.Count; i++) {
				const rev = doc.Revisions.Item(i)
				if (rev.Type === 1) {
					const index = i > 1 ? i - 1 : i
					const prevDeleted = doc.Revisions.Item(index)
					rev.Range.Font = prevDeleted.Range.Font
				}
			}
			doc.AcceptAllRevisions()
		}

		OpenRevision(doc, false, false)
		showHandleModal(false)
	}

	const reFix = () => {
		const doc = getOriginalDoc()
		const userConfirmed = confirm(
			`当前文档有${doc.Revisions.Count} 个待处理修订项（包含删除与插入修订），要全部拒绝吗？`
		)

		if (!userConfirmed) return

		if (doc.Revisions.Count >= 1) {
			doc.RejectAllRevisions()
		}

		OpenRevision(doc, false, false)
		showHandleModal(false)
	}

	return {
		showHandleModal,
		handleMutilRevision,
		replaceFix,
		reFix
	}
}
