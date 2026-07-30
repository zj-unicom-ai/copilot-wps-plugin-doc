<template>
	<div class="polish-chat-container">
		<!-- 添加设置按钮和菜单 -->
		<div class="settings-menu">
			<button class="settings-button" @click="toggleSettingsMenu">⋮</button>
			<div v-if="showSettingsMenu" class="settings-dropdown">
				<div class="menu-item" @click="startNewChat">新建对话</div>
			</div>
		</div>

		<div class="polish-chat-message-group" ref="polishChatMessageRef" @scroll="handleScroll">
			<div class="chat-header" v-if="!chatMessages.length">
				<div class="title">
					<img src="/icons/chat/AI助手.svg" class="dialog-icon" alt="" width="18" height="18" />
					<span class="title-text">HI,我是AI智写</span>
				</div>
				<div class="content">很高兴为您服务，请选择文本纠错/文本润色按钮来体验吧！</div>
			</div>
			<div class="polish-chat-message" v-for="(message, index) in chatMessages" :key="index">
				<!-- 指令提示  -->
				<div class="polish-chat-message-info" v-if="message.role === 'info'">
					<div class="info-message" v-html="renderMarkdown(message.content)"></div>
				</div>
				<!-- 用户提问 -->
				<div v-else-if="message.role === 'user'" class="polish-user-message">
					<div class="message-content-wrapper">
						<div class="message-content">{{ message.content }}</div>
					</div>
					<img
						src="/icons/chat/用户头像.svg"
						alt="用户头像"
						class="avatar user-avatar"
						width="24"
						height="24"
					/>
				</div>
				<!-- ai回复 -->
				<div v-else class="message-group">
					<div class="avatar ai-avatar-wrapper">
						<img
							src="/images/logo.png"
							alt="AI头像"
							class="avatar ai-avatar"
							width="24"
							height="24"
						/>
					</div>
					<div class="polish-chat-message-ai">
						<div v-if="message.thinking || message.hasThinking" class="thinking-section">
							<div class="thinking-toggle" @click="toggleThinkingContent(index)">
								{{ message.showThinking ? '收起思考过程' : '查看思考过程' }}
							</div>
							<div v-if="message.showThinking" class="thinking-content">
								{{ message.thinking }}
							</div>
						</div>
						<!-- 否则正常展示内容 -->
						<div v-html="renderMarkdown(message.content)"></div>
						<div v-if="!isErrorAssistantMessage(message)" class="message-footer">
							<span class="message-warning">本内容由AI生成，仅供参考</span>
						</div>
						<!-- 在每个AI消息下方显示操作按钮 -->
						<div
							v-if="
								!isErrorAssistantMessage(message) &&
								(!isLoading || index !== lastAiMessageIndex) &&
								message.content
							"
							class="action-buttons"
						>
							<div
								class="action-button-wrapper"
								title="导入左侧文档"
								@click="exportToDocument(index)"
							>
								<img src="/icons/chat/导出文档.svg" alt="导入左侧文档" width="16" height="16" />
								<span class="action-label">导入左侧文档</span>
							</div>
							<div
								class="action-button-wrapper"
								title="导入新文档"
								@click="exportToNewDocument(index)"
							>
								<img src="/icons/chat/导入新文档.svg" alt="导入左侧文档" width="16" height="16" />
								<span class="action-label">导入新文档</span>
							</div>
							<div class="action-button-wrapper" title="复制" @click="copyToClipboard(index)">
								<img src="/icons/chat/复制.svg" alt="复制" width="16" height="16" />
								<span class="action-label">复制</span>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div v-if="showScrollButton" class="scroll-bottom-button" @click="scrollToBottom(true)">
				<img src="/icons/chat/向下.svg" alt="滚动到底部" width="16" height="16" />
				<span>滚动到底</span>
			</div>

			<!-- 润色等级选择器 -->
			<div class="message-group" v-if="showPolishLevelSelector">
				<div class="ai-avatar-placeholder"></div>
				<div class="polish-level-selector">
					<div class="level-current">
						当前润色等级：{{ polishLevels.find((l) => l.level === currentPolishLevel)?.label }}
					</div>
					<div class="level-hint">润色程度不满足要求？请选择润色等级：</div>
					<div class="level-buttons">
						<button
							v-for="item in polishLevels"
							:key="item.level"
							:class="['level-btn', { active: item.level === currentPolishLevel }]"
							@click="selectPolishLevel(item.level)"
						>
							{{ item.label }}
						</button>
					</div>
				</div>
			</div>

			<!-- 校对、润色完成 -->
			<div class="fix-result" v-if="showPolishResult">
				<div class="fix-result-title">润色完成</div>
				<div class="fix-result-radio">
					<RadioGroup
						v-model="revisionsType"
						:options="typeOptions"
						@change="handleRevisionsTypeChange"
					/>
					<!-- <a-radio-group v-model:value="revisionsType" @change="handleRevisionsTypeChange">
            <a-radio :value="0" style="margin-right: 12px">显示删除线</a-radio>
            <a-radio :value="1">仅批注</a-radio>
          </a-radio-group> -->
				</div>
				<div class="fix-result-content">
					{{ `请选中修改处并点击<接受>或<拒绝>，将会对所有修订进行操作` }}
				</div>

				<div class="fix-result-tool">
					<button @click="reFix">拒绝</button>
					<button class="primary" @click="replaceFix">接受</button>
				</div>
			</div>

			<div class="fix-result" v-if="showFixResult">
				<div class="fix-result-title">AI校对完成</div>
				<div class="fix-result-radio">
					<RadioGroup
						v-model="revisionsType"
						:options="typeOptions"
						@change="handleRevisionsTypeChange"
					/>
					<!-- <a-radio-group v-model:value="revisionsType" @change="handleRevisionsTypeChange">
            <a-radio :value="0" style="margin-right: 12px"><span style="padding-left: 10px;">显示删除线</span></a-radio>
            <a-radio :value="1">仅批注</a-radio>
          </a-radio-group> -->
				</div>
				<div class="fix-result-content">
					{{ `请选中修改处并点击<接受>或<拒绝>，将会对所有修订进行操作` }}
				</div>

				<div class="fix-result-tool">
					<button @click="reFix">拒绝</button>
					<button class="primary" @click="replaceFix">接受</button>
				</div>
			</div>

			<div class="result-notify" v-if="showMsg">
				<div class="circle">i</div>
				已完成，未发现需“{{ currentCommand === 'fix_text_errors' ? '校对' : '润色' }}”内容
			</div>
		</div>

		<div v-if="isLoading" class="loading-container">
			<div class="loading-bar"></div>
			<button class="stop-button" @click="stopGeneration">停止</button>
		</div>
	</div>
</template>

<script>
import { onMounted, ref, onUnmounted } from 'vue'
import {
	getCommonPolishPrompts,
	getNewsPolishPrompts,
	getFixPrompts,
	getSummarizePrompts
} from './data/polishPrompts.js'
import { useStreamData } from '@/features/polish/composables/usePolishStream.js'
import { useChatScroll } from '@/features/chat/composables/useChatScroll.js'
import { usePolishSelection } from '@/features/polish/composables/usePolishSelection.js'
import { usePolishRibbonListener } from '@/features/polish/composables/usePolishRibbonListener.js'
import { usePolishRevision } from '@/features/polish/composables/usePolishRevision.js'
import { OpenRevision } from '@/shared/wps/func_wps.js'
import {
	createMarkdownRenderer,
	renderSafeMarkdown as renderSafeMd
} from '@/shared/markdown/createMarkdownRenderer.js'
import 'github-markdown-css'
import { stopGeneration, getStreamState } from '@/services/llmService.js'
import { isErrorAssistantMessage } from '@/shared/errors.js'
import RadioGroup from '@/shared/components/RadioGroup/index.vue'

export default {
	name: 'polishTaskPane',
	components: { RadioGroup },

	setup() {
		const polishChatMessageRef = ref(null)
		const {
			showScrollButton,
			scrollToBottom,
			handleScroll,
			bindWheelListener,
			unbindWheelListener,
			resetAutoScroll
		} = useChatScroll(polishChatMessageRef)
		const chatMessages = ref([])
		const lastAiMessageIndex = ref(-1) // 记录最后一个AI消息的索引
		const userText = ref('')
		const currentCommand = ref('') // 当前收到的命令
		const showMsg = ref(false) // 没有纠错、润色内容提示词

		// 润色等级
		const currentPolishLevel = ref(1)
		const polishLevels = [
			{ level: 1, label: '1级（少量调整逻辑与表达）' },
			{ level: 2, label: '2级（大量优化逻辑与表达）' },
			{ level: 3, label: '3级（大幅扩写）' }
		]

		const typeOptions = ref([
			{ label: '显示删除线', value: 0 },
			{ label: '仅批注', value: 1 }
		])

		// 文本修正弹框
		const showFixResult = ref(false)
		const fixData = ref()

		// 润色弹框
		const showPolishResult = ref(false)
		const showPolishLevelSelector = ref(false)
		const result = ref({})

		const markdown = createMarkdownRenderer('polish')

		const FIX_COMMAND = 'fix_text_errors'
		const SUMMARY_COMMAND = 'text_summary'
		// const POLISH_COMMAND = 'polish_fast'

		// 优化流式输出时，无法滚动的问题（由 useChatScroll 管理）

		const { isLoading, lastAborted } = getStreamState()
		const {
			streamDataGet,
			polishWithLevelStream,
			exportToDocument,
			exportToNewDocument,
			copyToClipboard,
			// extractOptimizedAndReport,
			getFixedContent,
			loadChatHistory,
			STORAGE_KEY
		} = useStreamData({
			isLoading,
			userText,
			chatMessages,
			lastAiMessageIndex,
			scrollToBottom,
			resetAutoScroll,
			lastAborted
		})

		const {
			getProcessedDoc,
			setProcessedDoc,
			getOriginalDoc,
			setOriginalDoc,
			lastOriginalContent,
			lastSelectionRange,
			getSelectedTextWithoutTables
		} = usePolishSelection()

		let lastPolishCommand = null

		const resetData = () => {
			showFixResult.value = false
			showPolishResult.value = false
			showPolishLevelSelector.value = false
			showMsg.value = false
			result.value = {}
			fixData.value = {}
		}

		const revisionsType = ref(0)
		const revisionsMap = {
			0: 'ReviewShowRevisorInformationInBalloons',
			1: 'ReviewShowRevisionsInBalloons'
		}

		const { showHandleModal, handleMutilRevision, replaceFix, reFix } = usePolishRevision({
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
		})

		const handlePolishData = async (
			message,
			selectedText,
			correctionType = null,
			level = 1,
			isLevelRerun = false
		) => {
			try {
				// 关闭当前正在进行的请求
				stopGeneration()
				currentCommand.value = message
				if (message === 'polish_fast' || message === 'polish_news') {
					lastPolishCommand = message
				}
				let prompt_obj
				switch (message) {
					case FIX_COMMAND:
						prompt_obj = getFixPrompts(selectedText, correctionType)
						break
					case SUMMARY_COMMAND:
						prompt_obj = getSummarizePrompts(selectedText)
						break
					case 'polish_fast':
						prompt_obj = getCommonPolishPrompts(selectedText)
						break
					case 'polish_news':
						prompt_obj = getNewsPolishPrompts(selectedText)
						break
				}
				if (prompt_obj) {
					userText.value = prompt_obj.modelText

					const defaultMessage = isLevelRerun
						? [
								{
									role: 'user',
									content: `润色等级:${polishLevels.find((l) => l.level === level)?.label || level + '级'}`
								},
								{ role: 'assistant', content: '', showThinking: false }
							]
						: [
								{ role: 'info', content: prompt_obj.tip },
								{ role: 'user', content: prompt_obj.userText },
								{ role: 'assistant', content: '', showThinking: false }
							]

					chatMessages.value = [...chatMessages.value, ...defaultMessage]
					await scrollToBottom()

					let resp
					if (message === 'polish_fast' || message === 'polish_news') {
						// 润色命令使用新润色等级接口
						resp = await polishWithLevelStream(level, selectedText)
					} else {
						resp = await streamDataGet(message, selectedText)
					}
					if (lastAborted && lastAborted.value) {
						return
					}
					// 流式请求失败（如未配置 API）时终止流程，不写入文档
					if (resp == null || resp === '') {
						return
					}

					// 文本校正
					if (message === FIX_COMMAND) {
						fixData.value = getFixedContent(resp) || {}
						if (fixData.value.fixContent) {
							handleMutilRevision()
						}
					} else if (message === SUMMARY_COMMAND) {
						// summary: stream result is already in chat; no revision merge
					} else {
						result.value = { optimizedContent: resp }
						if (result.value.optimizedContent) {
							handleMutilRevision()
						}
					}

					await scrollToBottom()
				} else {
					showHandleModal(false)
				}
			} catch (error) {
				console.error('消息处理失败:', error)
				showHandleModal(false)
			}
		}

		//设置功能项
		const showSettingsMenu = ref(false)

		const toggleSettingsMenu = () => {
			showSettingsMenu.value = !showSettingsMenu.value
		}

		// 新建对话，清楚历史记录
		const startNewChat = () => {
			chatMessages.value = []
			showSettingsMenu.value = false
			localStorage.removeItem(STORAGE_KEY)
			stopGeneration()
		}

		// 点击其他区域关闭菜单
		const closeSettingsMenu = (e) => {
			if (!e.target.closest('.settings-menu')) {
				showSettingsMenu.value = false
			}
		}

		const renderMarkdown = (content) => {
			const html = renderSafeMd(markdown, content || '')
			return html.replace(/<table>/g, '<table class="custom-markdown-table">')
		}

		const handleRevisionsTypeChange = (value) => {
			let key = revisionsMap[value] || 'ReviewShowRevisorInformationInBalloons'

			if (window.Application.CommandBars.GetEnabledMso(key)) {
				window.Application.CommandBars.ExecuteMso(key)
			}
			let rgSel = window.Application.Selection.Range
			if (rgSel) rgSel.Select()
		}

		const handleRibbonMessage = (message) => {
			resetData()
			const doc = window.Application.ActiveDocument
			setOriginalDoc(doc)
			const selection = window.Application.Selection
			lastSelectionRange.value = {
				start: selection.Range.Start,
				end: selection.Range.End,
				text: selection.Range.Text || ''
			}
			const contentObj = getSelectedTextWithoutTables(doc, selection)
			doc.Activate()
			lastOriginalContent.value = contentObj
			showMsg.value = false

			let command, correctionType
			if (typeof message === 'object' && message.command) {
				command = message.command
				correctionType = message.correctionType
			} else {
				command = message
				correctionType = null
			}

			if (command === 'polish_fast' || command === 'polish_news') {
				lastPolishCommand = command
			}

			handlePolishData(command, contentObj.text, correctionType)
		}

		usePolishRibbonListener({ onMessage: handleRibbonMessage })

		onMounted(async () => {
			window.Application.ActiveDocument.CommandBars.ExecuteMso('ReviewHideSourceDocumentsMenu')
			loadChatHistory()
			await scrollToBottom()
			bindWheelListener()
		})

		const selectPolishLevel = async (level) => {
			const doc = getOriginalDoc()
			if (doc.Revisions.Count >= 1) {
				doc.RejectAllRevisions()
			}
			OpenRevision(doc, false, false)

			resetData()

			if (lastSelectionRange.value && getOriginalDoc()) {
				const mockSelection = {
					Range: {
						Start: lastSelectionRange.value.start,
						End: lastSelectionRange.value.end,
						Text: lastSelectionRange.value.text
					}
				}
				const contentObj = getSelectedTextWithoutTables(getOriginalDoc(), mockSelection)
				lastOriginalContent.value = contentObj
			}

			const selectedText = lastOriginalContent.value ? lastOriginalContent.value.text : ''
			await handlePolishData(lastPolishCommand || 'polish_fast', selectedText, null, level, true)
		}

		const toggleThinkingContent = (index) => {
			if (!chatMessages.value[index].showThinking) {
				chatMessages.value[index].showThinking = true
			} else {
				chatMessages.value[index].showThinking = false
			}
		}

		onUnmounted(() => {
			unbindWheelListener()
		})

		return {
			chatMessages,
			isLoading,
			polishChatMessageRef,
			stopGeneration,
			lastAiMessageIndex,
			exportToDocument,
			exportToNewDocument,
			copyToClipboard,
			renderMarkdown,
			isErrorAssistantMessage,
			currentCommand,
			showMsg,
			showPolishResult,
			showPolishLevelSelector,
			result,
			showFixResult,
			replaceFix,
			reFix,
			toggleThinkingContent,
			showSettingsMenu,
			toggleSettingsMenu,
			closeSettingsMenu,
			startNewChat,
			handleRevisionsTypeChange,
			revisionsType,
			showScrollButton,
			handleScroll,
			scrollToBottom,
			typeOptions,
			currentPolishLevel,
			polishLevels,
			selectPolishLevel
		}
	}
}
</script>

<style scoped src="./styles/polish-taskpane.css"></style>
<style scoped src="@/shared/styles/components/settings-menu.css"></style>
