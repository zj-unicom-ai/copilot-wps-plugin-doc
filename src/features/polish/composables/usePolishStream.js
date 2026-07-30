import insertWpsContent from '@/utils/formatTemplates.js'
import {
	createMarkdownRenderer,
	renderSafeMarkdown
} from '@/shared/markdown/createMarkdownRenderer.js'
import 'github-markdown-css'
import { streamChat, isLlmConfigured } from '@/services/llmService.js'
import { resolvePrompt } from '@/services/promptService.js'
import { toUserMessage, isAbortError, LLM_NOT_CONFIGURED_MSG } from '@/shared/errors.js'

export const useStreamData = ({
	isLoading,
	chatMessages,
	lastAiMessageIndex,
	scrollToBottom,
	resetAutoScroll,
	lastAborted
}) => {
	const FIX_COMMAND = 'fix_text_errors'

	const md = createMarkdownRenderer('polish')

	const markStreamError = (error) => {
		const idx = lastAiMessageIndex.value
		if (idx < 0 || !chatMessages.value[idx]) return
		const content = isAbortError(error)
			? '用户终止生成回应'
			: toUserMessage(error, '抱歉，服务器发生错误，请稍后再试。')
		chatMessages.value[idx] = {
			...chatMessages.value[idx],
			content,
			isError: true,
			showThinking: false
		}
	}

	/** @returns {boolean} true if not configured (caller should return null) */
	const failIfLlmNotConfigured = () => {
		if (isLlmConfigured()) return false
		markStreamError(new Error(LLM_NOT_CONFIGURED_MSG))
		return true
	}

	// 当前执行的摘要总结命令时，只执行一次接口，当命令为纠错和润色时，修正、润色内容和纠错、润色报告分为2次执行
	const streamDataGet = async (currentCommand, selectedText) => {
		const paragraphCount = selectedText.split('\n\n').filter((p) => p.trim()).length || 1
		const templateCode =
			currentCommand === FIX_COMMAND ? 'intelligent_correction' : 'polish_write_one'

		try {
			lastAiMessageIndex.value = chatMessages.value.length - 1
			if (failIfLlmNotConfigured()) return null

			const messages = resolvePrompt(templateCode, {
				query: selectedText,
				extra: {
					paragraphCount: String(paragraphCount),
					currentTime: new Date().toLocaleString('zh-CN')
				}
			})

			await streamChat({ messages }, (content, meta = {}) => {
				const currentMessage = chatMessages.value[lastAiMessageIndex.value]
				if (currentCommand === FIX_COMMAND && !currentMessage.firstChunkProcessed) {
					currentMessage.content = '===修正后的内容===\n'
					currentMessage.firstChunkProcessed = true
				}
				currentMessage.content =
					(currentCommand === FIX_COMMAND ? '===修正后的内容===\n' : '') + content
				if (meta.thinking) {
					currentMessage.thinking = meta.thinking
					currentMessage.hasThinking = true
				}
				scrollToBottom()
			})

			if (lastAborted && lastAborted.value) {
				return chatMessages.value[lastAiMessageIndex.value]?.content || ''
			}

			if (currentCommand == FIX_COMMAND) {
				// 第二次调用：生成修正报告
				const currentMessage = chatMessages.value[lastAiMessageIndex.value]
				const ALLTAG = currentCommand === FIX_COMMAND ? '===修正后的内容===' : '===润色后的内容==='
				const REPORTTAG = currentCommand === FIX_COMMAND ? '===修正报告===' : '===润色报告==='
				const correctedText = currentMessage.content.replace(ALLTAG, '')
				const reportMessages = resolvePrompt('correction_report', {
					query:
						currentCommand === FIX_COMMAND
							? `请基于以下文章一和文章二生成表格形式的差异报告（仅输出存在差异的部分）：\n文章一: ${selectedText}\n文章二: ${correctedText}`
							: `请基于以下原文和润色后的文本生成润色报告：\n原文: ${selectedText}\n润色后文本: ${correctedText}`
				})

				await streamChat({ messages: reportMessages }, (reportContent) => {
					if (!currentMessage.secondChunkProcessed) {
						currentMessage.content += `\n${REPORTTAG}\n`
						currentMessage.secondChunkProcessed = true
					}
					const prefix = currentMessage.content.split(REPORTTAG)[0] + REPORTTAG + '\n'
					currentMessage.content = prefix + reportContent
					scrollToBottom()
				})
			}

			return chatMessages.value[lastAiMessageIndex.value].content
		} catch (error) {
			markStreamError(error)
			// 出错时返回 null，避免调用方把错误文案当作润色/纠错结果写入文档
			return null
		} finally {
			isLoading.value = false
			resetAutoScroll()
			if (!lastAborted || !lastAborted.value) {
				const msg = chatMessages.value[lastAiMessageIndex.value]
				if (msg && !msg.isError) processCorrectionReport()
				await scrollToBottom()
				saveChatHistory()
			}
		}
	}

	const processCorrectionReport = () => {
		const currentMessage = chatMessages.value[lastAiMessageIndex.value]
		const contentParts = currentMessage.content.split('\n===修正报告===\n')

		if (contentParts.length === 2) {
			const beforeReport = contentParts[0]
			const reportContent = contentParts[1]

			// 过滤和重新编号表格
			const processedReport = filterAndRenumberTable(reportContent)

			// 更新消息内容
			currentMessage.content = beforeReport + '\n===修正报告===\n' + processedReport
		}
	}

	const filterAndRenumberTable = (tableContent) => {
		const lines = tableContent.trim().split('\n')

		// 检查是否是有效表格
		if (lines.length < 3 || !lines[0].startsWith('|')) {
			return tableContent // 不是有效表格，直接返回
		}

		const headerLines = lines.slice(0, 2) // 表头和分隔行
		const dataLines = lines.slice(2) // 数据行

		// 过滤掉"建议"列为"无需修改"的行
		const filteredLines = dataLines.filter((line) => {
			const columns = line.split('|')
			if (columns.length >= 6) {
				// 确保有足够的列
				const reason = columns[4].trim() // 原因列
				const suggestion = columns[5].trim() // 建议列

				// 如果满足任一过滤条件，则过滤掉该行
				return !(
					reason.includes('完全相同') ||
					reason.includes('内容相同') ||
					reason.includes('内容一致') ||
					reason.includes('无差异项') ||
					suggestion.includes('无需修改') ||
					suggestion === '无'
				)
			}
			return true // 无法判断的行保留
		})

		// 重新编号
		const renumberedLines = filteredLines.map((line, index) => {
			const columns = line.split('|')
			if (columns.length >= 6) {
				columns[1] = (index + 1).toString() // 更新序号
				return columns.join('|')
			}
			return line
		})

		// 如果没有有效行，返回提示语
		if (renumberedLines.length === 0) {
			return '未发现需"校对"内容'
		}

		// 组合最终内容
		return [...headerLines, ...renumberedLines].join('\n')
	}

	const STORAGE_KEY = 'wps-copilot-polish-history'

	// 保存聊天记录
	const saveChatHistory = () => {
		try {
			const historyData = {
				historicMessages: chatMessages.value,
				timestamp: Date.now()
			}
			localStorage.setItem(STORAGE_KEY, JSON.stringify(historyData))
		} catch (error) {
			console.error('保存聊天记录失败:', error)
		}
	}

	// 加载聊天记录
	const loadChatHistory = () => {
		try {
			const historyData = localStorage.getItem(STORAGE_KEY)
			if (historyData) {
				const { historicMessages, timestamp } = JSON.parse(historyData)
				const isRecent = Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000
				if (isRecent) {
					chatMessages.value = historicMessages || []
				} else {
					// 清除过期记录
					localStorage.removeItem(STORAGE_KEY)
				}
			}
		} catch (error) {
			console.error('加载聊天记录失败:', error)
		}
	}

	// 获取修正后的结果
	const getFixedContent = (content) => {
		// 首先尝试标准格式
		const standardRegex = /===修正后的内容===([\s\S]*?)===修正报告===(.*)/s
		let match = content.match(standardRegex)

		if (match) {
			const fixContent = match[1].trim()
			const reportContent = match[2].trim()
			return {
				fixContent,
				reportContent
			}
		}

		return {
			fixContent: '',
			reportContent: '无法解析纠错结果，请重试。'
		}
	}

	// 提取润色内容和报告内容的工具函数
	const extractOptimizedAndReport = (content) => {
		// 首先尝试标准格式
		const standardRegex = /===润色后的内容===(.*?)===润色报告===(.*)/s
		let match = content.match(standardRegex)

		if (match) {
			const optimizedContent = match[1].trim()
			const reportContent = match[2].trim()
			return {
				optimizedContent,
				reportContent
			}
		}

		return {
			optimizedContent: '',
			reportContent: '无法解析润色结果，请重试。'
		}
	}

	// 导出到文档
	const exportToDocument = (index) => {
		const messageIndex = index !== undefined ? index : lastAiMessageIndex.value
		if (messageIndex !== -1 && chatMessages.value[messageIndex].role === 'assistant') {
			let content = chatMessages.value[messageIndex].content
			const thinkStart = content.indexOf('</think>')
			if (thinkStart !== -1) {
				content = content.substring(thinkStart + 8).trim()
			}

			insertWpsContent(content) // 使用通用排版格式化文档
			// taskPane.onbuttonclick('appendMarkdown', content)
		}
	}

	const exportToNewDocument = (index) => {
		const messageIndex = index !== undefined ? index : lastAiMessageIndex.value
		if (messageIndex !== -1 && chatMessages.value[messageIndex].role === 'assistant') {
			let content = chatMessages.value[messageIndex].content
			const thinkStart = content.indexOf('</think>')
			if (thinkStart !== -1) {
				content = content.substring(thinkStart + 8).trim()
			}
			if (content) {
				window.Application.Documents.Add('', '', '', true)
				insertWpsContent(content)
				const doc = window.Application.ActiveDocument
				if (doc) {
					const startRange = doc.Range(0, 0)
					startRange.Select()
				}
			} else {
				alert('导出的内容不能为空')
			}
		}
	}

	const copyToClipboard = (index) => {
		const messageIndex = index !== undefined ? index : lastAiMessageIndex.value
		if (messageIndex !== -1 && chatMessages.value[messageIndex].role === 'assistant') {
			const content = chatMessages.value[messageIndex].content
			// fallbackCopy(content)
			let htmlContent = renderSafeMarkdown(md, content)
			let copyContent = extractPlainText(htmlContent)
			fallbackCopy(copyContent)
		}
	}

	const extractPlainText = (html) => {
		// 创建临时容器
		const container = document.createElement('div')
		container.innerHTML = html

		// 处理有序列表：保留数字序号
		container.querySelectorAll('ol').forEach((ol) => {
			let counter = 1
			ol.querySelectorAll('li').forEach((li) => {
				// 在列表项前添加数字序号
				li.textContent = `${counter}. ${li.textContent}`
				counter++
			})
		})

		// 处理无序列表：移除项目符号
		container.querySelectorAll('ul').forEach((ul) => {
			ul.querySelectorAll('li').forEach((li) => {
				// 移除无序列表符号（保持原文本）
				li.textContent = li.textContent.replace(/^\s*[-*]\s+/, '')
			})
		})

		// 转换为纯文本（保留换行）
		const contentWithLineBreaks = Array.from(container.childNodes)
			.map((node) => node.textContent)
			.join('\n')

		// 清理多余空行和空格
		return contentWithLineBreaks
			.replace(/\n{3,}/g, '\n\n') // 合并多个空行
			.trim()
	}

	// 复制
	const fallbackCopy = (text) => {
		const textArea = document.createElement('textarea')
		textArea.value = text

		// 设置样式使其不可见
		textArea.style.position = 'fixed'
		textArea.style.top = '0'
		textArea.style.left = '0'
		textArea.style.width = '2em'
		textArea.style.height = '2em'
		textArea.style.padding = '0'
		textArea.style.border = 'none'
		textArea.style.outline = 'none'
		textArea.style.boxShadow = 'none'
		textArea.style.background = 'transparent'

		document.body.appendChild(textArea)
		textArea.focus()
		textArea.select()

		try {
			const successful = document.execCommand('copy')
			if (successful) {
				alert('已复制到剪贴板')
			} else {
				alert('复制失败，请手动复制')
			}
		} catch (err) {
			console.error('execCommand失败:', err)
			alert('复制失败，请手动复制')
		}

		document.body.removeChild(textArea)
	}

	// 润色等级 → 本地提示词模板
	const POLISH_LEVEL_CODES = {
		1: 'polish_write_one',
		2: 'polish_write_two',
		3: 'polish_write_three'
	}

	// 按润色等级调用 LLM（本地 prompt + streamChat）
	const polishWithLevelStream = async (level, selectedText) => {
		const paragraphCount = selectedText.split('\n\n').filter((p) => p.trim()).length || 1
		const templateCode = POLISH_LEVEL_CODES[level] || 'polish_write_one'

		try {
			lastAiMessageIndex.value = chatMessages.value.length - 1
			if (failIfLlmNotConfigured()) return null

			const currentMessage = chatMessages.value[lastAiMessageIndex.value]

			const messages = resolvePrompt(templateCode, {
				query: selectedText,
				extra: {
					paragraphCount: String(paragraphCount),
					currentTime: new Date().toLocaleString('zh-CN')
				}
			})

			await streamChat({ messages }, (content, meta = {}) => {
				currentMessage.content = content
				if (meta.thinking) {
					currentMessage.thinking = meta.thinking
					currentMessage.hasThinking = true
				}
				scrollToBottom()
			})

			if (lastAborted && lastAborted.value) {
				return chatMessages.value[lastAiMessageIndex.value]?.content || ''
			}

			return chatMessages.value[lastAiMessageIndex.value].content
		} catch (error) {
			markStreamError(error)
			// 出错时返回 null，避免调用方把错误文案当作润色结果写入文档
			return null
		} finally {
			isLoading.value = false
			resetAutoScroll()
			if (!lastAborted || !lastAborted.value) {
				await scrollToBottom()
				saveChatHistory()
			}
		}
	}

	return {
		streamDataGet,
		polishWithLevelStream,
		exportToDocument,
		exportToNewDocument,
		copyToClipboard,
		extractOptimizedAndReport,
		getFixedContent,
		loadChatHistory,
		STORAGE_KEY
	}
}
