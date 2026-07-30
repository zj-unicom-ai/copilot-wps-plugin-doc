import { openTaskPane, closeExistingTaskPane, isTaskPaneVisible } from '@/shared/wps/func_wps.js'
import polishChannelUtil from '@/utils/polishChannelUtil.js'
import { CORRECTION_TYPE } from '@/utils/correctionType.js'

export function onPolishClick(control, text = '润色', correctionType = null) {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}

	const selectedText = window.Application.Selection.Range.Text || doc.Content.Text
	if (!selectedText.trim()) {
		alert(`请先选择要${text}的文本`)
		return
	}

	if (!isTaskPaneVisible('polishTaskPaneId')) {
		closeExistingTaskPane()
		openTaskPane('/polishTaskPane', 'polishTaskPaneId')
	}

	polishChannelUtil.send({ command: control, correctionType })
}

export function handlePolishAction(controlId) {
	switch (controlId) {
		case 'ctxBtnFastPolish':
		case 'btnFastPolish':
			onPolishClick('polish_fast')
			return true
		case 'ctxBtnTextErrorCorrection':
		case 'btnTextErrorCorrection':
			onPolishClick('fix_text_errors', '智能纠错', CORRECTION_TYPE.SMART)
			return true
		default:
			return false
	}
}
