import { openTaskPane } from '@/shared/wps/func_wps.js'
import insertWpsContent from '@/utils/formatTemplates.js'
import runToolboxAction, { toolboxFunctions } from '@/shared/wps/toolbox/index.js'
import { renderSafeMarkdown } from '@/shared/markdown/createMarkdownRenderer.js'
import { splitThinkContent } from '@/utils/llmStreamParse.js'

/**
 * Resolve thinking vs answer for display. Prefers message.thinking, falls back to
 * extracting think blocks still embedded in content.
 * @param {{ content?: string, thinking?: string, hasThinking?: boolean }} message
 * @returns {{ thinking: string, content: string, hasThinking: boolean }}
 */
export function resolveAssistantParts(message) {
	const rawContent = message?.content || ''
	const fromField = typeof message?.thinking === 'string' ? message.thinking.trim() : ''
	if (fromField) {
		return {
			thinking: fromField,
			content: rawContent,
			hasThinking: true
		}
	}
	const split = splitThinkContent(rawContent)
	if (split.thinking) {
		return {
			thinking: split.thinking,
			content: split.content,
			hasThinking: true
		}
	}
	return {
		thinking: '',
		content: rawContent,
		hasThinking: !!message?.hasThinking
	}
}

function extractPlainText(html) {
	const container = document.createElement('div')
	container.innerHTML = html
	container.querySelectorAll('ol').forEach((ol) => {
		let counter = 1
		ol.querySelectorAll('li').forEach((li) => {
			li.textContent = `${counter}. ${li.textContent}`
			counter++
		})
	})
	return Array.from(container.childNodes)
		.map((node) => node.textContent)
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
}

function fallbackCopy(text) {
	const textArea = document.createElement('textarea')
	textArea.value = text
	textArea.style.cssText =
		'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;outline:none;opacity:0'
	document.body.appendChild(textArea)
	textArea.focus()
	textArea.select()
	try {
		const ok = document.execCommand('copy')
		alert(ok ? '已复制到剪贴板' : '复制失败，请手动复制')
	} catch (err) {
		console.error('execCommand失败:', err)
		alert('复制失败，请手动复制')
	}
	document.body.removeChild(textArea)
}

export function useChatActions({
	messages,
	lastAiMessageIndex,
	markdown,
	scrollToBottom,
	callChat,
	callNewChatApi,
	isLoading
}) {
	const renderMarkdown = (content) => {
		const html = renderSafeMarkdown(markdown, content || '')
		return html.replace(/<table>/g, '<table class="custom-markdown-table">')
	}

	const toggleThinkingContent = (index) => {
		const msg = messages.value[index]
		if (!msg) return
		messages.value[index] = {
			...msg,
			showThinking: !msg.showThinking
		}
	}

	const exportToDocument = (index, callType = '') => {
		const messageIndex = index !== undefined ? index : lastAiMessageIndex.value
		if (messageIndex === -1 || messages.value[messageIndex].role !== 'assistant') return
		const content = resolveAssistantParts(messages.value[messageIndex]).content
		if (!content) {
			alert('导出的内容不能为空')
			return
		}
		if (callType === 'translate_to_others') {
			insertWpsContent(content, 1, true)
		} else {
			insertWpsContent(content)
		}
	}

	const exportToNewDocument = (index) => {
		const messageIndex = index !== undefined ? index : lastAiMessageIndex.value
		if (messageIndex === -1 || messages.value[messageIndex].role !== 'assistant') return
		const content = resolveAssistantParts(messages.value[messageIndex]).content
		if (!content) {
			alert('导出的内容不能为空')
			return
		}
		window.Application.Documents.Add('', '', '', true)
		insertWpsContent(content)
		const doc = window.Application.ActiveDocument
		if (doc) doc.Range(0, 0).Select()
	}

	const regenerateMessage = async (index) => {
		if (isLoading.value) return
		const message = messages.value[index]
		if (!message?.generationContext) {
			console.warn('无法重新生成：缺少上下文信息')
			return
		}
		const { type, data } = message.generationContext
		try {
			if (type === 'newChat') {
				await callNewChatApi(data.queryParams, data.files, index, data.parentId || null)
			} else if (type === 'chat') {
				await callChat({
					messageList: data.messageList,
					showUserMessage: data.showUserMessage,
					callType: data.callType,
					requirements: data.requirements,
					targetIndex: index
				})
			}
		} catch (error) {
			console.error('重新生成失败:', error)
			message.content = '重新生成失败，请稍后重试。'
		}
	}

	const showRegenerateButton = (message, index) => {
		if (index !== messages.value.length - 1) return false
		if (!message.generationContext) return false
		return message.generationContext.type === 'newChat'
	}

	const copyToClipboard = (index) => {
		const messageIndex = index !== undefined ? index : lastAiMessageIndex.value
		if (messageIndex === -1 || messages.value[messageIndex].role !== 'assistant') return
		const answer = resolveAssistantParts(messages.value[messageIndex]).content
		const copyContent = extractPlainText(renderSafeMarkdown(markdown, answer))
		if (copyContent) fallbackCopy(copyContent)
		else alert('复制的内容为空')
	}

	const confirmCallback = async (messageData) => {
		if (messageData.command === 'mindMap') {
			openTaskPane('/mindMap', 'mindmap_taskpane_id')
		}
	}

	const handleToolboxCommand = (commandId) => {
		const toolboxFunction = toolboxFunctions[commandId]
		if (!toolboxFunction) {
			console.error('未知的toolbox命令:', commandId)
			return
		}
		messages.value.push({ role: 'user', content: toolboxFunction.message })
		messages.value.push({
			role: 'system',
			type: 'toolbox-command',
			content: `执行操作：${toolboxFunction.name}`,
			commandId,
			showActions: true,
			actions: [
				{
					text: '确认',
					onClick: async () => {
						const msg = messages.value[messages.value.length - 1]
						msg.showActions = false
						msg.status = '正在执行...'
						try {
							runToolboxAction({ Id: commandId })
							msg.status = '操作已完成'
						} catch (error) {
							msg.status = '操作失败'
							console.error('执行toolbox命令失败:', error)
						}
					}
				},
				{
					text: '取消',
					onClick: () => {
						const msg = messages.value[messages.value.length - 1]
						msg.showActions = false
						msg.status = '已取消操作'
					}
				}
			]
		})
		scrollToBottom()
	}

	return {
		renderMarkdown,
		resolveAssistantParts,
		toggleThinkingContent,
		exportToDocument,
		exportToNewDocument,
		regenerateMessage,
		showRegenerateButton,
		copyToClipboard,
		confirmCallback,
		handleToolboxCommand
	}
}
