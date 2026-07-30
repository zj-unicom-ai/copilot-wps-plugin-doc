import { onMounted, onUnmounted } from 'vue'
import taskPane from '@/shared/wps/taskpane.js'
import messageUtil from '@/utils/messageUtil.js'
import autoPaibanFun from '@/utils/autoPaiban.js'
import { MSG } from '@/features/chat/constants/messageTypes.js'

const WRITING_SYSTEM_PROMPT = `你是一个专业的写作助手，根据用户指定题材完成专业写作任务。请遵循以下规则：
                        1. 严格按照用户提示词输出内容
                        2. 不使用任何表情符号、emoji 或特殊符号
                        3. 不使用任何装饰性字符
                        4. 使用规范的中文标点符号
                        5. 保持输出内容的专业性和正式性
                        6. 包括并不限于字数要求等具体要求

                        输出要求：
                        - 使用纯文本形式
                        - 避免使用 emoji（如：😊 ✅ ❌ 等）
                        - 避免使用特殊符号装饰
                        - 使用标准标点符号`

export function useChatRibbonListener({
	emit,
	messages,
	tagInput,
	attachedFiles,
	isShowEditTemplate,
	showResult,
	currentCommand,
	translateLanguages,
	scrollToBottom,
	detectLanguage,
	checkFontsBeforeAction,
	handleToolboxCommand,
	executeCommand,
	callChat,
	confirmCallback
}) {
	let removeMessageListener = null

	onMounted(() => {
		removeMessageListener = messageUtil.addEventListener(async (event) => {
			showResult.value = false
			const message = event.data

			if (message.type === 'toolbox-command' && message.data?.commandId) {
				emit('switchTab', 'chat')
				handleToolboxCommand(message.data.commandId)
			}

			if (message.type === 'command') {
				emit('switchTab', 'chat')
				const promptResult = await taskPane.handlePrompt(message.data.command)
				currentCommand.value = message.data.command
				await executeCommand(message.data, promptResult)
			}

			if (message.type === MSG.PROMPT || message.type === 'prompt') {
				if (tagInput.value?.addTag) tagInput.value.addTag('AI写作')
				const messageList = [
					{ role: 'system', content: WRITING_SYSTEM_PROMPT },
					{ role: 'user', content: message.data.prompt }
				]
				tagInput.value.updateEditorContent(message.data.prompt)
				attachedFiles.value = []
				if (message.data.autoSend) {
					await callChat({ messageList, showUserMessage: true })
				}
			}

			if (message.type === MSG.CLEAR_TEMPLATE || message.type === 'clear-template-edit') {
				isShowEditTemplate.value = false
			}

			if (message.type === 'confirm') {
				messages.value.push({ role: 'user', content: message.data.name })
				messages.value.push({
					role: 'system',
					type: 'command',
					content: `收到命令: ${message.data.name}`,
					status: '',
					command: message.data.command,
					showActions: true,
					actions: [
						{
							text: '确认执行',
							onClick: async () => {
								const currentMessage = messages.value[messages.value.length - 1]
								currentMessage.showActions = false
								currentMessage.status = '正在执行...'
								await confirmCallback(message.data)
								currentMessage.status = '命令已执行完成'
							}
						},
						{
							text: '取消',
							onClick: () => {
								const currentMessage = messages.value[messages.value.length - 1]
								currentMessage.showActions = false
								currentMessage.status = '已取消命令'
							}
						}
					]
				})
				scrollToBottom(true)
			}

			if (message.type === 'AIPaiban') {
				messages.value.push({ role: 'user', content: '一键排版' })
				messages.value.push({
					role: 'system',
					type: 'command',
					content: '收到命令: 一键排版',
					status: '',
					command: 'AIPaiban',
					showActions: true,
					actions: [
						{
							text: '确认执行',
							onClick: async () => {
								const msg = messages.value[messages.value.length - 1]
								msg.showActions = false
								msg.status = '正在执行...'
								await autoPaibanFun()
								msg.status = '命令已执行完成'
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
			}

			if (message.type === 'translateConfirm') {
				emit('switchTab', 'chat')
				messages.value.push({ role: 'user', content: '翻译' })
				const doc = window.Application.ActiveDocument
				const selection = window.Application.Selection
				const textForDetect = selection?.Range?.Text?.trim() || doc?.Content?.Text || ''
				const detectedLang = detectLanguage(textForDetect)

				messages.value.push({
					role: 'system',
					type: 'translate-confirm',
					content: '请选择翻译的目标语言',
					status: '',
					showLanguageSelect: true,
					sourceLanguage: detectedLang.code,
					detectedLanguageName: detectedLang.name,
					detectedLanguageCode: detectedLang.code,
					targetLanguage: detectedLang.code === 'zh' ? 'en' : 'zh',
					showActions: true,
					actions: [
						{
							text: '开始翻译',
							onClick: async () => {
								const currentMessage = messages.value[messages.value.length - 1]
								const targetLang = currentMessage.targetLanguage
								const targetLangName =
									translateLanguages.value.find((lang) => lang.code === targetLang)?.name || '英语'
								currentMessage.showActions = false
								currentMessage.showLanguageSelect = false
								currentMessage.content = `翻译成${targetLangName}`
								currentMessage.status = '正在翻译...'
								try {
									const promptResult = await taskPane.handlePrompt('translate', {
										targetLanguage: targetLang,
										targetLanguageName: targetLangName
									})
									currentCommand.value = 'translate'
									if (!promptResult) throw new Error('获取提示词失败')
									const callType = targetLangName !== '中文' ? 'translate_to_others' : ''
									const content = await callChat({
										bodyData: {
											templateCode: promptResult.templateCode,
											query: promptResult.prompt,
											// 优先用 handlePrompt 返回的英文语种名，确保 ${targetLanguageName} 被正确替换
											extra: promptResult.extra
										},
										showUserMessage: false,
										callType
									})
									currentMessage.status = content ? '翻译完成' : '翻译失败'
								} catch (error) {
									currentMessage.status = '翻译失败'
									console.error('翻译执行失败:', error)
								}
							}
						},
						{
							text: '取消',
							onClick: () => {
								const currentMessage = messages.value[messages.value.length - 1]
								currentMessage.showActions = false
								currentMessage.showLanguageSelect = false
								currentMessage.status = '已取消'
							}
						}
					]
				})
				scrollToBottom(true)
			}

			const isPaibanCommand =
				message.data &&
				(message.data.command === 'paiban' ||
					message.data.command === 'AIPaiban' ||
					message.data.command === 'AIpaiban')
			if (isPaibanCommand) {
				await checkFontsBeforeAction(async () => {})
			}
		})
	})

	onUnmounted(() => {
		if (removeMessageListener) {
			removeMessageListener()
			removeMessageListener = null
		}
	})
}
