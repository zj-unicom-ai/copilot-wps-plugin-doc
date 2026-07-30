const STORAGE_KEY = 'wps-copilot-chat-history'

export function useChatHistory(messages) {
	const saveChatHistory = () => {
		try {
			const filteredMessages = messages.value.filter(
				(msg) => msg.type !== 'command' && msg.type !== 'toolbox-command'
			)
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ historicMessages: filteredMessages, timestamp: Date.now() })
			)
		} catch (error) {
			console.error('保存聊天记录失败:', error)
		}
	}

	const loadChatHistory = () => {
		try {
			const historyData = localStorage.getItem(STORAGE_KEY)
			if (!historyData) return
			const { historicMessages, timestamp } = JSON.parse(historyData)
			const isRecent = Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000
			if (isRecent) {
				messages.value = historicMessages || []
			} else {
				localStorage.removeItem(STORAGE_KEY)
			}
		} catch (error) {
			console.error('加载聊天记录失败:', error)
		}
	}

	return { saveChatHistory, loadChatHistory, STORAGE_KEY }
}
