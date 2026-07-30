import { message } from 'ant-design-vue'
import taskPane from '@/shared/wps/taskpane.js'
import insertWpsContent from '@/utils/formatTemplates.js'
import { streamChat, stopGeneration, isLlmConfigured } from '@/services/llmService.js'
import { resolvePrompt } from '@/services/promptService.js'
import {
	toUserMessage,
	isAbortError,
	LLM_NOT_CONFIGURED_MSG,
	isFailedChatResult
} from '@/shared/errors.js'

export function useChatStream({
	messages,
	isLoading,
	lastAborted,
	lastAiMessageIndex,
	lastAiMessage,
	showResult,
	tagInput,
	scrollToBottom,
	resetAutoScroll,
	saveChatHistory,
	handleMutilRevision,
	revisionsType
}) {
	const sendMessage = async (messageContent = null) => {
		showResult.value = false
		if (isLoading.value) return
		const content = messageContent || tagInput.value.getUserInputText().trim()
		if (!content) return
		if (!messageContent) tagInput.value.updateEditorContent('')
		try {
			if (tagInput.value?.hasTags?.()) {
				tagInput.value.clearTags()
				await callTagChat(content)
			} else {
				await sendNewTalkMessage(content)
			}
		} catch (error) {
			console.error('发送消息失败:', error)
		}
	}

	const callTagChat = async (content) => {
		const messageList = [
			{
				role: 'system',
				content: `你是一个专业的写作助手，根据用户指定题材完成专业写作任务。请遵循以下规则：
1. 严格按照用户提示词输出内容
2. 不使用任何表情符号、emoji 或特殊符号
3. 使用规范的中文标点符号
4. 保持输出内容的专业性和正式性`
			},
			{ role: 'user', content }
		]
		await callChat({ messageList, showUserMessage: true })
	}

	const sendNewTalkMessage = async (messageContent) => {
		try {
			messages.value.push({ role: 'user', content: messageContent })
			await scrollToBottom(true)
			let docContent = ''
			if (window?.Application) {
				docContent = window.Application.Selection?.Range?.Text || ''
			}
			const messageList = [
				{
					role: 'system',
					content:
						'你是 AI智写，请根据用户消息和文档选区内容（如有）进行专业回复。使用 Markdown 格式。'
				},
				{
					role: 'user',
					content: docContent
						? `文档选区：\n"""${docContent}"""\n\n用户消息：${messageContent}`
						: messageContent
				}
			]
			await callChat({ messageList, showUserMessage: false })
			saveChatHistory()
		} catch (error) {
			console.error('发送消息失败:', error)
		}
	}

	const callNewChatApi = async () => {
		message.warning('该历史消息不支持一键重新生成，请重新发送')
	}

	const calculateWordCount = (text) => {
		const app = window.Application
		const originalDoc = app.ActiveDocument
		const revisedDoc = app.Documents.Add('', '', '', false)
		revisedDoc.Activate()
		insertWpsContent(text)
		const count = revisedDoc.BuiltInDocumentProperties.Item(15).Value
		revisedDoc.Close(window.Application.Enum.wdDoNotSaveChanges)
		originalDoc.Activate()
		return count
	}

	const insertRequirementsToPrompt = (_promptResult, msg) => {
		if (!msg.requirementsData?.wordLimit) return {}
		const wordLimit = parseInt(msg.requirementsData.wordLimit, 10)
		return { minWords: Math.max(0, wordLimit - 20), maxWords: wordLimit + 20 }
	}

	const maybePushUserMessage = (showUserMessage, messageList, targetIndex) => {
		if (showUserMessage && messageList?.some((m) => m.role === 'user') && targetIndex === -1) {
			const userMessage = messageList.find((m) => m.role === 'user')
			messages.value.push({ role: 'user', content: userMessage.content })
		}
	}

	const markAssistantError = (errContent, index = lastAiMessageIndex.value) => {
		if (index < 0 || !messages.value[index]) return
		const target = messages.value[index]
		target.content = errContent
		target.isError = true
		target.showThinking = false
		target.hasThinking = false
		lastAiMessage.value = errContent
	}

	const pushOrUpdateErrorMessage = (errContent, { showUserMessage, messageList, targetIndex }) => {
		maybePushUserMessage(showUserMessage, messageList, targetIndex)
		if (targetIndex > -1 && messages.value[targetIndex]) {
			lastAiMessageIndex.value = targetIndex
			markAssistantError(errContent, targetIndex)
		} else {
			messages.value.push({ role: 'assistant', content: errContent, isError: true })
			lastAiMessageIndex.value = messages.value.length - 1
			lastAiMessage.value = errContent
		}
	}

	const callChat = async ({
		messageList,
		showUserMessage = true,
		callType = '',
		requirements = [],
		targetIndex = -1,
		bodyData = null
	}) => {
		if (!isLlmConfigured()) {
			pushOrUpdateErrorMessage(LLM_NOT_CONFIGURED_MSG, {
				showUserMessage,
				messageList,
				targetIndex
			})
			await scrollToBottom()
			saveChatHistory()
			return null
		}

		try {
			isLoading.value = true
			maybePushUserMessage(showUserMessage, messageList, targetIndex)

			if (targetIndex > -1) {
				lastAiMessageIndex.value = targetIndex
				const target = messages.value[targetIndex]
				target.content = ''
				target.isError = false
				target.showThinking = true
				target.thinking = ''
			} else {
				messages.value.push({
					role: 'assistant',
					content: '思考中',
					showThinking: true,
					generationContext: {
						type: 'chat',
						data: { messageList, showUserMessage, callType, requirements }
					}
				})
				lastAiMessageIndex.value = messages.value.length - 1
			}

			await scrollToBottom()
			messages.value[lastAiMessageIndex.value].content = ''
			lastAiMessage.value = ''

			const now = new Date()
			const currentTime = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`

			let finalMessages = messageList
			if (bodyData?.templateCode) {
				finalMessages = resolvePrompt(bodyData.templateCode, {
					query: bodyData.query,
					minWords: bodyData.placeholders?.minWords,
					maxWords: bodyData.placeholders?.maxWords,
					extra: bodyData.extra || {}
				})
			}

			// 译入非中文时不要追加中文 system 后缀，避免模型被拉回中文输出
			const skipZhSystemSuffix =
				callType === 'translate_to_others' || bodyData?.templateCode === 'translation2Other'

			finalMessages = finalMessages.map((msg) => {
				if (msg.role === 'system' && !skipZhSystemSuffix) {
					return {
						...msg,
						content: `${msg.content}\n\n当前时间：${currentTime},当前时间仅用于时效合查，不用输出到正文\n请不要在回复中使用省略号（……）或任何其他形式的省略符号。`
					}
				}
				return msg
			})

			await streamChat(
				{ messages: finalMessages },
				(content, meta = {}) => {
					const idx = lastAiMessageIndex.value
					const prev = messages.value[idx]
					if (!prev) return
					const thinking = typeof meta.thinking === 'string' ? meta.thinking : ''
					messages.value[idx] = {
						...prev,
						content,
						thinking,
						hasThinking: thinking.length > 0,
						showThinking: prev.showThinking !== false
					}
					lastAiMessage.value = content
					scrollToBottom()
				},
				(err) => console.error(err)
			)

			if (lastAborted.value) return null

			const currentMessage = messages.value[lastAiMessageIndex.value]
			if (currentMessage) {
				if (requirements?.length > 0) {
					currentMessage.wordCount = calculateWordCount(currentMessage.content || '')
				}
				currentMessage.callType = callType
			}

			const content = lastAiMessage.value || currentMessage?.content || ''
			return content || null
		} catch (error) {
			if (!isAbortError(error)) {
				console.error('API请求失败:', error)
				markAssistantError(toUserMessage(error, '抱歉，发生了错误，请稍后再试。'))
			}
			// Do not rethrow — callers (ribbon / tags / UI) often lack .catch(),
			// which surfaces as UnhandledPromiseRejection in the host.
			return null
		} finally {
			isLoading.value = false
			resetAutoScroll()
			await scrollToBottom()
			saveChatHistory()
		}
	}

	const executeCommand = async (messageData, promptResult) => {
		const shouldSkipConfirm = messageData.skipConfirm || messageData.command === 'paiban'
		messages.value.push({
			role: 'user',
			content: messageData.name || `执行命令${messageData.command || ''}`
		})

		messages.value.push({
			role: 'system',
			type: 'command',
			content: `执行操作: ${messageData.name || `${messageData.command || ''}`}`,
			status: '',
			command: messageData.command || '',
			showActions: !shouldSkipConfirm,
			requirements: messageData.requirements || [],
			requirementsData: { wordLimit: null },
			actions: [
				{
					text: '确认',
					onClick: async () => {
						const msg = messages.value[messages.value.length - 1]
						msg.showActions = false
						msg.status = '正在执行...'
						showResult.value = false
						try {
							if (!promptResult) throw new Error('获取提示词失败')
							const content = await callChat({
								showUserMessage: false,
								bodyData: {
									templateCode: promptResult.templateCode,
									placeholders: insertRequirementsToPrompt(promptResult, msg),
									query: promptResult.prompt
								},
								requirements: messageData.requirements
							})
							const lastMsg = messages.value[lastAiMessageIndex.value]
							if (lastAborted.value) {
								msg.status = '已取消命令'
								return
							}
							if (isFailedChatResult(content, lastMsg)) {
								msg.status = '命令执行失败'
								return
							}
							const commandTypes = ['fix', 'commonPolish', 'newsPolish']
							if (commandTypes.includes(messageData.command)) {
								await handleMutilRevision(messageData.command, content)
								await scrollToBottom()
							} else {
								await taskPane.handleMessageCallback(
									messageData.command,
									content,
									promptResult.srcDoc || window.Application.ActiveDocument
								)
								if (['expansionPolish', 'abbreviation'].includes(messageData.command)) {
									revisionsType.value = 0
									showResult.value = true
									await scrollToBottom()
								}
							}
							msg.status = '命令已执行完成'
						} catch (error) {
							console.error('命令执行失败:', error)
							msg.status = '命令执行失败'
							showResult.value = false
						}
					}
				},
				{
					text: '取消',
					onClick: () => {
						const msg = messages.value[messages.value.length - 1]
						msg.showActions = false
						msg.status = '已取消命令'
					}
				}
			]
		})
		scrollToBottom(true)
		if (shouldSkipConfirm) {
			const commandMessage = messages.value[messages.value.length - 1]
			await commandMessage.actions[0].onClick()
		}
	}

	const stopChatGeneration = () => {
		stopGeneration()
		isLoading.value = false
		resetAutoScroll()
	}

	return {
		sendMessage,
		callChat,
		callNewChatApi,
		executeCommand,
		stopChatGeneration
	}
}
