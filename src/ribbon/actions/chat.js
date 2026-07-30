import { openTaskPane } from '@/shared/wps/func_wps.js'
import messageUtil from '@/utils/messageUtil.js'

function requireSelection(actionName) {
	const selectedText = window.Application?.Selection?.Range?.Text || ''
	if (!selectedText.trim()) {
		alert(`请先选择要${actionName}的文本`)
		return false
	}
	return true
}

export function handleChatAction(controlId) {
	switch (controlId) {
		case 'btnShowPaiBan':
			openTaskPane('/templatesTaskpane', 'paiban_taskpane_id')
			return true
		case 'btnShowChatTaskPane':
			openTaskPane('/chatTaskpane', 'chat_taskpane_id')
			return true
		case 'btnShowMindMap':
			openTaskPane('/chatTaskpane', 'chat_taskpane_id')
			messageUtil.send({ type: 'confirm', data: { command: 'mindMap', name: '文档脑图' } })
			return true
		case 'ctxBtnContinuation':
		case 'btnContinuation':
			openTaskPane('/chatTaskpane', 'chat_taskpane_id')
			messageUtil.send({
				type: 'command',
				data: { command: 'continuation', name: '续写', requirements: ['wordLimit'] }
			})
			return true
		case 'ctxBtnExpansionPolish':
		case 'btnExpansionPolish':
			if (!requireSelection('扩写')) return true
			openTaskPane('/chatTaskpane', 'chat_taskpane_id')
			messageUtil.send({
				type: 'command',
				data: { command: 'expansionPolish', name: '扩写', requirements: ['wordLimit'] }
			})
			return true
		case 'ctxBtnAbbreviation':
		case 'btnAbbreviation':
			if (!requireSelection('缩写')) return true
			openTaskPane('/chatTaskpane', 'chat_taskpane_id')
			messageUtil.send({
				type: 'command',
				data: { command: 'abbreviation', name: '缩写', requirements: ['wordLimit'] }
			})
			return true
		case 'btnWriting':
			openTaskPane('/writing', 'writing_id')
			return true
		case 'ctxBtnTranslate':
		case 'btnTranslate':
			openTaskPane('/chatTaskpane', 'chat_taskpane_id')
			messageUtil.send({
				type: 'translateConfirm',
				data: { command: 'translate', name: '翻译' }
			})
			return true
		default:
			return false
	}
}
