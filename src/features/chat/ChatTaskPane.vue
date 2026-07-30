<template>
	<div class="global">
		<div class="background-image-container">
			<img src="/icons/chat/背景.png" alt="背景" class="background-image" />
		</div>
		<div class="chat-container">
			<!-- 添加设置按钮和菜单 -->
			<div class="settings-menu">
				<button class="settings-button" @click="toggleSettingsMenu">⋮</button>
				<div v-if="showSettingsMenu" class="settings-dropdown">
					<div class="menu-item" @click="startNewChat">新建对话</div>
					<!-- <div class="menu-item" @click="toggleThinking">
            {{ showThinking ? '隐藏思考' : '显示思考' }}
          </div> -->
					<!-- 预留其他设置项位置 -->
				</div>
			</div>
			<div class="chat-messages" ref="chatMessages" @scroll="handleScroll">
				<div v-if="messages.length === 0" class="welcome-message">
					<div class="chat-header">
						<div class="title">
							<img
								src="/images/logo.png"
								class="dialog-icon"
								alt=""
								width="30"
								height="30"
								style="margin-top: -2px"
							/>
							<span class="title-text">HI,我是AI智写</span>
						</div>
						<div class="cpoy-right">您的办公首席顾问</div>
						<div class="cpoy-right">专业公文写作，从未如此简单</div>
					</div>
					<div class="preset-questions">
						<div
							class="preset-question"
							@click="fillQuestion('请帮我写一份本周工作周报，包含完成事项、进行中事项和下周计划')"
						>
							请帮我写一份本周工作周报，包含完成事项、进行中事项和下周计划
						</div>
						<div
							class="preset-question"
							@click="fillQuestion('请根据以下要点整理一份简洁的会议纪要：议题、讨论结论与待办')"
						>
							请根据以下要点整理一份简洁的会议纪要：议题、讨论结论与待办
						</div>
					</div>
				</div>
				<div v-for="(message, index) in messages" :key="index">
					<!-- 指令提示信息 -->
					<div v-if="message.role === 'info'" class="message-info">
						<div class="info-message" v-html="sanitizeHtml(message.content)"></div>
					</div>
					<!-- 用户消息 -->
					<div v-else-if="message.role === 'user'" class="user-message">
						<div v-if="message.type === 'attachment'" class="user-attachment">
							<div class="attachment-icon">
								<img
									:src="getFileIcon(message.attachment.type)"
									:alt="message.attachment.name"
									width="24"
									height="24"
								/>
							</div>
							<div class="attachment-content">
								<div class="attachment-name">{{ message.attachment.name }}</div>
								<div class="attachment-size">{{ formatFileSize(message.attachment.size) }}</div>
							</div>
						</div>
						<div v-else class="message-content-wrapper">
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
					<!--
          <div
            v-else-if="message.type === 'command' || message.type === 'toolbox-command'"
            class="message command-message"
          >
            <div class="content">{{ message.content }}</div>
            <div v-if="message.status" class="status">{{ message.status }}</div>
            <div v-if="message.showActions" class="actions">
              <button
                v-for="action in message.actions"
                :key="action.text"
                :disabled="isLoading || index !== messages.length - 1"
                @click="action.onClick"
                :class="{ primary: action.text === '确认执行' }"
              >
                {{ action.text }}
              </button>
            </div>
          </div> -->

					<!-- 模式切换消息 -->
					<!-- <div v-else-if="message.type === 'mode-switch'" class="message mode-switch-message">
            <div class="message-content">{{ message.content }}</div>
          </div> -->

					<!-- AI消息 -->
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
						<div class="message-list">
							<div class="message ai-message">
								<div
									class="command-message"
									v-if="message.type === 'command' || message.type === 'toolbox-command'"
								>
									<div class="content">{{ message.content }}</div>
									<div
										class="requirement"
										v-if="message.requirements && message.requirements.length > 0"
									>
										<span class="hint">您还可以补充以下要求</span>
										<div class="requirements-list">
											<label class="label">字数要求:</label>
											<input
												class="word-count-input"
												v-model="message.requirementsData.wordLimit"
												placeholder=""
												:disabled="isLoading || index !== messages.length - 1"
												@input="handleWordLimitInput(message.requirementsData, $event)"
											/>
											<label class="label">字左右</label>
										</div>
									</div>
									<div v-if="message.status" class="status">{{ message.status }}</div>
									<div v-if="message.showActions" class="actions">
										<button
											v-for="action in message.actions"
											:key="action.text"
											:disabled="isLoading || index !== messages.length - 1"
											@click="action.onClick"
											:class="{ primary: action.text === '确认执行' }"
										>
											{{ action.text }}
										</button>
									</div>
								</div>

								<!-- 翻译语言选择确认框 -->
								<div
									class="command-message translate-confirm-message"
									v-else-if="message.type === 'translate-confirm'"
								>
									<div class="content">{{ message.content }}</div>
									<div class="translate-language-select" v-if="message.showLanguageSelect">
										<div class="language-row">
											<!-- 源语言选择 -->
											<div class="language-item">
												<div
													class="language-dropdown-trigger"
													:class="{ disabled: isLoading || index !== messages.length - 1 }"
													@click="toggleSourceDropdown(index)"
												>
													<span class="selected-lang">{{
														message.detectedLanguageName || getLanguageName(message.sourceLanguage)
													}}</span>
													<img
														class="dropdown-arrow"
														:class="{ open: showSourceDropdown && activeDropdownIndex === index }"
														src="/icons/chat/展开.svg"
														alt=""
														width="12"
														height="12"
													/>
												</div>
												<div
													v-if="showSourceDropdown && activeDropdownIndex === index"
													class="language-dropdown-list"
												>
													<div
														v-for="lang in translateLanguages"
														:key="'src-' + lang.code"
														class="language-dropdown-item"
														:class="{ active: message.sourceLanguage === lang.code }"
														@click="selectSourceLanguage(message, lang.code, index)"
													>
														{{ lang.name }}
													</div>
												</div>
												<span class="language-hint" v-if="!message.sourceLanguageManuallyChanged"
													>自动检测</span
												>
												<span class="language-hint placeholder" v-else>&nbsp;</span>
											</div>
											<img
												class="arrow-icon"
												:class="{ disabled: isLoading || index !== messages.length - 1 }"
												src="/icons/transform.png"
												@click="swapLanguages(message, index)"
												title="交换语言"
											/>
											<!-- 目标语言选择 -->
											<div class="language-item">
												<div
													class="language-dropdown-trigger"
													:class="{ disabled: isLoading || index !== messages.length - 1 }"
													@click="toggleTargetDropdown(index)"
												>
													<span class="selected-lang">{{
														getLanguageName(message.targetLanguage)
													}}</span>
													<img
														class="dropdown-arrow"
														:class="{ open: showTargetDropdown && activeDropdownIndex === index }"
														src="/icons/chat/展开.svg"
														alt=""
														width="12"
														height="12"
													/>
												</div>
												<div
													v-if="showTargetDropdown && activeDropdownIndex === index"
													class="language-dropdown-list"
												>
													<div
														v-for="lang in translateLanguages"
														:key="'tgt-' + lang.code"
														class="language-dropdown-item"
														:class="{ active: message.targetLanguage === lang.code }"
														@click="selectTargetLanguage(message, lang.code, index)"
													>
														{{ lang.name }}
													</div>
												</div>
												<span class="language-hint">目标语言</span>
											</div>
										</div>
									</div>
									<div class="translate-divider"></div>

									<div v-if="message.status" class="status">{{ message.status }}</div>
									<div v-if="message.showActions" class="actions">
										<button
											v-for="action in message.actions"
											:key="action.text"
											:disabled="isLoading || index !== messages.length - 1"
											@click="action.onClick"
											:class="{ primary: action.text === '开始翻译' }"
										>
											{{ action.text }}
										</button>
									</div>
								</div>

								<div v-else-if="message.type === 'mode-switch'">
									<div class="message-content">{{ message.content }}</div>
								</div>
								<div v-else>
									<div
										v-if="resolveAssistantParts(message).hasThinking"
										class="thinking-section"
									>
										<div class="thinking-header" @click="toggleThinkingContent(index)">
											<div class="thinking-toggle">
												<span class="thinking-label">思考过程</span>
												<span class="thinking-action">
													{{ message.showThinking !== false ? '收起' : '展开' }}
												</span>
											</div>
											<img
												v-if="message.showThinking !== false"
												src="/icons/chat/收起.svg"
												alt=""
												width="16"
												height="16"
											/>
											<img v-else src="/icons/chat/展开.svg" alt="" width="16" height="16" />
										</div>
										<div v-if="message.showThinking !== false" class="thinking-content">
											{{ resolveAssistantParts(message).thinking }}
										</div>
									</div>
									<div
										class="message-content"
										v-html="renderMarkdown(resolveAssistantParts(message).content)"
									></div>
									<div v-if="!isErrorAssistantMessage(message)">
										<span class="message-warning"
											>本内容由AI生成，仅供参考；<span v-if="message.wordCount"
												>总字数：{{ message.wordCount }}</span
											></span
										>
									</div>
									<!-- 在每个AI消息下方显示操作按钮 -->
									<div
										v-if="
											!isErrorAssistantMessage(message) &&
											(!isLoading || index !== lastAiMessageIndex)
										"
										class="action-buttons"
									>
										<div
											class="action-button-wrapper"
											title="导入左侧文档"
											@click="exportToDocument(index, message.callType)"
										>
											<img
												src="/icons/chat/导出文档.svg"
												alt="导入左侧文档"
												width="14"
												height="14"
											/>
											<span class="action-label">导入左侧文档</span>
										</div>
										<div
											class="action-button-wrapper"
											title="导入新文档"
											@click="exportToNewDocument(index)"
										>
											<img
												src="/icons/chat/导入新文档.svg"
												alt="导入新文档"
												width="14"
												height="14"
											/>
											<span class="action-label">导入新文档</span>
										</div>
										<div class="action-button-wrapper" title="复制" @click="copyToClipboard(index)">
											<img src="/icons/chat/复制.svg" alt="复制" width="14" height="14" />
											<span class="action-label">复制</span>
										</div>
										<div
											class="action-button-wrapper"
											title="重新生成"
											@click="regenerateMessage(index)"
											v-if="showRegenerateButton(message, index)"
										>
											<img src="/icons/chat/重新生成.svg" alt="重新生成" width="14" height="14" />
											<span class="action-label">重新生成</span>
										</div>
									</div>
								</div>
							</div>
							<!-- 再次编辑写作模版内容 -->
							<div
								v-if="
									message.generationContext &&
									message.generationContext.type === 'agent' &&
									!isLoading &&
									index == lastAiMessageIndex &&
									isShowEditTemplate
								"
								class="edit-template-btn"
								@click="handleEditTemplate(message.generationContext.agentType)"
							>
								<span class="edit-template-text">再次编辑写作模版内容？</span>
								<img src="/icons/chat/right-arrow.svg" alt="arrow" width="16" height="16" />
							</div>
						</div>
					</div>
				</div>

				<!-- 校对、润色完成 showResult-->
				<div class="fix-result" v-if="showResult">
					<div class="fix-result-title">操作完成</div>
					<div class="fix-result-radio">
						<RadioGroup
							v-model="revisionsType"
							:options="typeOptions"
							@change="handleRevisionsTypeChange"
						/>
					</div>
					<div class="fix-result-content">
						{{ `请选中修改处并点击<接受>或<拒绝>，将会对所有修订进行操作` }}
					</div>

					<div class="fix-result-tool">
						<button @click="reFix">拒绝</button>
						<button class="primary" @click="replaceFix">接受</button>
					</div>
				</div>
			</div>

			<div class="chat-input-container">
				<div v-if="showScrollButton" class="scroll-bottom-button" @click="scrollToBottom(true)">
					<img src="/icons/24px/down.png" alt="滚动到底部" width="13" height="9" />
				</div>
				<div class="input-toolbar">
					<div class="logo" @click="autoPaibanFun()">
						<img src="/icons/chat/logo.png" alt="" />
					</div>

					<div class="size-tool" @click="switchChatSize">
						<img
							v-if="!isReduce"
							src="/icons/24px/缩小.png"
							width="14"
							height="14"
							class="reduce-icon"
							alt=""
						/>
						<img
							v-else
							src="/icons/24px/放大.png"
							width="14"
							height="14"
							class="reduce-icon"
							alt=""
						/>
					</div>
				</div>

				<div class="input-area">
					<div
						class="textarea-wrapper"
						:style="`${isReduce && attachedFiles.length <= 0 ? 'height: 150px;' : 'height: 288px;'}`"
					>
						<div
							class="attachment-preview"
							:class="{
								'with-scroll-buttons': showLeftScroll && showRightScroll,
								'left-scroll-only': showLeftScroll && !showRightScroll,
								'right-scroll-only': !showLeftScroll && showRightScroll
							}"
							v-show="attachedFiles.length > 0"
						>
							<div
								class="attachment-scroll-btn left"
								v-if="showLeftScroll"
								@click="scrollAttachments('left')"
							>
								<img src="/icons/chat/attachment/left.svg" alt="向左" width="36" height="36" />
							</div>

							<div class="attachment-list" ref="attachmentList">
								<div v-for="(file, idx) in attachedFiles" :key="idx" class="attachment-item">
									<div class="attachment-icon">
										<img :src="getFileIcon(file.type)" :alt="file.name" width="24" height="24" />
									</div>
									<div class="attachment-content">
										<div class="attachment-name">{{ file.name }}</div>
										<div class="attachment-size">{{ formatFileSize(file.size) }}</div>
									</div>
									<div class="attachment-delete" @click="removeFile(idx)">
										<img
											src="/icons/chat/attachment/bg-close.svg"
											alt="删除"
											width="16"
											height="16"
										/>
									</div>
								</div>
							</div>

							<div
								class="attachment-scroll-btn right"
								v-if="showRightScroll"
								@click="scrollAttachments('right')"
							>
								<img src="/icons/chat/attachment/right.svg" alt="向右" width="36" height="36" />
							</div>
						</div>

						<TagInput
							style="flex: 1"
							ref="tagInput"
							:placeholder="'发消息或输入技能，如需对左边部分文字进行AI操作，请先选中内容'"
							:initialTags="tags"
							@tag-added="onTagAdded"
							@click="handleEditorClick"
							@send="sendMessage"
						/>

						<div class="textarea-toolbar">
							<div class="toolbar-left">
								<!-- 深度思考按钮已隐藏
								<button
									class="mode-dropdown-btn"
									@click="toggleThinking"
									:class="{ active: showThinking }"
									:disabled="isLoading || currentMode == 'qwen' || hasTags()"
								>
									<img
										src="/icons/24px/deepseek.png"
										width="12"
										height="12"
										class="button-icon"
										alt=""
									/>
									<span class="button-text">深度思考</span>
								</button>
								-->
								<!-- <div class="mode-dropdown" @click.stop>
                  <button
                    class="mode-dropdown-btn"
                    :disabled="isKnowledgeMode || isLoading || hasTags()"
                  >
                    {{ currentModeText }}
                    <div class="dropdown-arrow" v-if="false">
                      <img
                        v-if="showModeDropdown"
                        src="/icons/chat/收起.svg"
                        alt="收起"
                        width="14"
                        height="14"
                      />
                      <img v-else src="/icons/chat/展开.svg" alt="展开" width="14" height="14" />
                    </div>
                  </button>
                  <div v-if="showModeDropdown" class="mode-dropdown-list">
                    <div class="mode-dropdown-item" @click="selectMode('qwen')">
                      Qwen3
                      <img
                        v-if="currentMode === 'qwen'"
                        src="/icons/chat/选中.svg"
                        alt="选中"
                        class="dropdown-selected-icon"
                        width="14"
                        height="14"
                      />
                    </div>
                    <div class="mode-dropdown-item" @click="selectMode('deepseek')">
                      DeepSeek
                      <img
                        v-if="currentMode === 'deepseek'"
                        src="/icons/chat/选中.svg"
                        alt="选中"
                        class="dropdown-selected-icon"
                        width="14"
                        height="14"
                      />
                    </div>
                  </div>
                </div> -->
							</div>

							<div class="inner-dialog-actions">
								<!-- 附件上传已隐藏
								<input
									type="file"
									ref="fileInput"
									@change="handleFileUpload"
									multiple
									accept=".txt,.md,.mdx,.markdown,.pdf,.html,.xlsx,.xls,.docx,.csv,.eml,.msg,.pptx,.ppt,.xml,.epub,.jpg,.jpeg,.png,.gif,.webp,.svg"
									style="display: none"
								/>
								<button
									class="attachment-btn"
									@click="triggerFileUpload"
									title="上传附件（仅识别文字"
									:disabled="isLoading || hasTags()"
								>
									<img
										src="/icons/chat/attachment/attachment.svg"
										alt="附件"
										width="24"
										height="24"
									/>
								</button>
								-->

								<button class="inner-dialog-button" @click="sendMessage()" :disabled="isLoading">
									<img
										src="/icons/chat/对话.svg"
										class="dialog-icon"
										alt=""
										width="11"
										height="12"
									/>
									<span>立即对话</span>
								</button>

								<template v-if="isLoading">
									<div class="action-separator"></div>
									<button class="stop-dialog-button" @click="stopChatGeneration">
										<img src="/icons/chat/停止.svg" alt="停止" width="24" height="24" />
									</button>
								</template>
							</div>
						</div>
					</div>
				</div>
			</div>
			<FontMissingModal
				:visible="showFontModal"
				:fonts="missingFonts"
				@close="onFontModalClose"
				@download="onFontModalDownload"
				@ignore="onFontModalIgnore"
			/>
		</div>
	</div>
</template>

<script>
import { onMounted, ref, nextTick, onUnmounted, onBeforeUnmount, computed } from 'vue'
import { message } from 'ant-design-vue'
import { createMarkdownRenderer, sanitizeHtml } from '@/shared/markdown/createMarkdownRenderer.js'
import 'github-markdown-css'
import Util from '@/shared/wps/util.js'
import autoPaibanFun from '@/utils/autoPaiban.js'
import { getStreamState } from '@/services/llmService.js'
import { useFixPolishData } from '@/features/polish/composables/useFixPolishData.js'
import TagInput from '@/shared/components/TagInput/TagInput.vue'
import { openTaskPane, saveWindowDevicePixelRatio, getTaskPane } from '@/shared/wps/func_wps.js'
import RadioGroup from '@/shared/components/RadioGroup/index.vue'
import { useTranslate } from '@/features/chat/composables/useTranslate.js'
import { usePaibanFonts } from '@/features/chat/composables/usePaibanFonts.js'
import { useChatScroll } from '@/features/chat/composables/useChatScroll.js'
import { useChatHistory } from '@/features/chat/composables/useChatHistory.js'
import { useChatStream } from '@/features/chat/composables/useChatStream.js'
import { useChatActions } from '@/features/chat/composables/useChatActions.js'
import { useChatRibbonListener } from '@/features/chat/composables/useChatRibbonListener.js'
import FontMissingModal from '@/features/chat/components/FontMissingModal.vue'
import { getFileIcon, formatFileSize } from '@/features/chat/composables/useChatAttachments.js'
import { isErrorAssistantMessage } from '@/shared/errors.js'

export default {
	name: 'TaskPane',
	components: {
		TagInput,
		RadioGroup,
		FontMissingModal
	},
	emits: ['clear-prompt'],
	setup(props, { emit }) {
		const chatMessages = ref(null)
		const {
			showScrollButton,
			scrollToBottom,
			handleScroll,
			bindWheelListener,
			unbindWheelListener,
			resetAutoScroll
		} = useChatScroll(chatMessages)
		const userInput = ref('')
		const messages = ref([])
		const lastAiMessageIndex = ref(-1)
		const showThinking = ref(false)
		const lastAiMessage = ref('')
		const currentCommand = ref('')
		const tagInput = ref(null)

		const isShowEditTemplate = ref(true)
		const { isLoading, lastAborted } = getStreamState()

		const {
			showFontModal,
			missingFonts,
			checkFontsBeforeAction,
			onFontModalDownload,
			onFontModalIgnore,
			onFontModalClose
		} = usePaibanFonts()

		// 翻译功能 composable（语言选项、检测、下拉框）
		const {
			translateLanguages,
			showSourceDropdown,
			showTargetDropdown,
			activeDropdownIndex,
			getLanguageName,
			toggleSourceDropdown,
			toggleTargetDropdown,
			selectSourceLanguage,
			selectTargetLanguage,
			closeLanguageDropdowns,
			swapLanguages,
			detectLanguage
		} = useTranslate(isLoading, messages)

		const markdown = createMarkdownRenderer('chat')
		const showResult = ref(false)

		const { saveChatHistory, loadChatHistory, STORAGE_KEY } = useChatHistory(messages)

		const revisionsType = ref(0)
		const typeOptions = ref([
			{ label: '显示删除线', value: 0 },
			{ label: '仅批注', value: 1 }
		])
		const { handleMutilRevision } = useFixPolishData({ showResult, revisionsType })

		const { sendMessage, callChat, callNewChatApi, executeCommand, stopChatGeneration } =
			useChatStream({
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
			})

		const {
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
		} = useChatActions({
			messages,
			lastAiMessageIndex,
			markdown,
			scrollToBottom,
			callChat,
			callNewChatApi,
			isLoading
		})

		const attachedFiles = ref([])

		useChatRibbonListener({
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
		})

		onMounted(() => {
			loadChatHistory()
			scrollToBottom()
			initWindowWidth()
			document.addEventListener('click', closeSettingsMenu)
			document.addEventListener('click', closeDropdown)
			bindWheelListener()
		})

		const initWindowWidth = () => {
			// 保存设备像素比
			saveWindowDevicePixelRatio()
			// 初始聊天宽度
			setTimeout(() => {
				if (isMacOS()) {
					getTaskPane('chat_taskpane_id').Width = (440 * window.devicePixelRatio) / 2
				} else {
					getTaskPane('chat_taskpane_id').Width = 440 * window.devicePixelRatio
				}
			}, 100)
		}

		function isMacOS() {
			return /^Mac/i.test(navigator.platform)
		}

		onUnmounted(() => {
			unbindWheelListener()
			document.removeEventListener('click', closeDropdown)
		})

		const isReduce = ref(true)

		const switchChatSize = () => {
			isReduce.value = !isReduce.value
		}

		const closeDropdown = (e) => {
			const dropdown = document.querySelector('.mode-dropdown')
			if (dropdown && !dropdown.contains(e.target)) {
				showModeDropdown.value = false
			}
			// 关闭语言下拉框
			const languageDropdown = e.target.closest('.language-item')
			if (!languageDropdown) {
				closeLanguageDropdowns()
			}
		}

		const toggleThinking = () => {
			showThinking.value = !showThinking.value
			showSettingsMenu.value = false
		}

		const revisionsMap = {
			0: 'ReviewShowRevisorInformationInBalloons',
			1: 'ReviewShowRevisionsInBalloons'
		}

		// 切换修订模式
		const handleRevisionsTypeChange = (value) => {
			let key = revisionsMap[value] || 'ReviewShowRevisorInformationInBalloons'

			if (window.Application.CommandBars.GetEnabledMso(key)) {
				// 在批注框中显示修订者信息
				window.Application.CommandBars.ExecuteMso(key)
			}
			let rgSel = window.Application.Selection.Range
			if (rgSel) rgSel.Select()
		}

		const replaceFix = () => {
			const doc = window.Application.ActiveDocument
			const userConfirmed = confirm(
				`当前文档有${doc.Revisions.Count} 个待处理修订项（包含删除与插入修订），要全部修订吗？`
			)

			// 如果用户点击取消，则直接返回
			if (!userConfirmed) {
				return
			}
			doc.AcceptAllRevisions()
			showResult.value = false
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
			}
			showResult.value = false
		}

		const showSettingsMenu = ref(false)

		const toggleSettingsMenu = () => {
			showSettingsMenu.value = !showSettingsMenu.value
		}

		const startNewChat = () => {
			messages.value = []
			showSettingsMenu.value = false
			localStorage.removeItem(STORAGE_KEY)
			showScrollButton.value = false
			stopChatGeneration()
		}

		const closeSettingsMenu = (e) => {
			if (!e.target.closest('.settings-menu')) {
				showSettingsMenu.value = false
			}
		}

		const fillQuestion = (question) => {
			// userInput.value = question
			tagInput.value.updateEditorContent(question)
			sendMessage()
		}
		onBeforeUnmount(() => {
			saveChatHistory()
		})

		const showModeDropdown = ref(false)
		const currentMode = ref('deepseek') // 'deepseek' 或 'qwen'

		const currentModeText = computed(() => {
			if (currentMode.value === 'qwen') return 'Qwen3'
			return 'DeepSeek'
		})

		const selectMode = (mode) => {
			if (mode == 'qwen') {
				showThinking.value = false
			}
			currentMode.value = mode
			showModeDropdown.value = false
			scrollToBottom()
		}

		const handleEditTemplate = () => {
			openTaskPane('/writing', 'writing_id')
		}

		// 附件相关的状态
		const fileInput = ref(null)
		const attachmentList = ref(null)
		const showLeftScroll = ref(false)
		const showRightScroll = ref(false)

		const triggerFileUpload = () => {
			message.info('附件上传功能已移除')
		}

		const handleFileUpload = async () => {}

		const removeFile = (index) => {
			attachedFiles.value.splice(index, 1)
			checkScrollButtons()
		}

		const checkScrollButtons = () => {
			nextTick(() => {
				if (!attachmentList.value) return

				const container = attachmentList.value
				showLeftScroll.value = container.scrollLeft > 0
				showRightScroll.value = container.scrollLeft < container.scrollWidth - container.clientWidth
			})
		}

		const scrollAttachments = (direction) => {
			if (!attachmentList.value) return

			const container = attachmentList.value
			const scrollAmount = 150

			if (direction === 'left') {
				container.scrollLeft -= scrollAmount
			} else {
				container.scrollLeft += scrollAmount
			}

			setTimeout(() => {
				checkScrollButtons()
			}, 300)
		}

		// 在setup函数中添加
		const editableDiv = ref(null)
		const tags = ref([])

		// 添加标签
		const addTag = (text) => {
			tags.value = []
			tags.value.push({ text })
			nextTick(() => {
				placeCursorAtEnd()
			})
		}

		// 移除标签
		const removeTag = (index) => {
			tags.value.splice(index, 1)
			nextTick(() => {
				// 移除标签后聚焦编辑区域
				if (editableDiv.value) {
					editableDiv.value.focus()
				}
			})
		}

		// 将光标放到编辑区域末尾
		const placeCursorAtEnd = () => {
			if (editableDiv.value) {
				editableDiv.value.focus()
				const range = document.createRange()
				const selection = window.getSelection()
				range.selectNodeContents(editableDiv.value)
				range.collapse(false) // false表示collapse到end
				selection.removeAllRanges()
				selection.addRange(range)
			}
		}

		// 处理编辑区域点击
		const handleEditorClick = () => {
			// 确保点击div时能获得焦点
			if (editableDiv.value) {
				editableDiv.value.focus()
			}
		}
		// 更新用户输入内容
		const updateUserInput = () => {
			if (editableDiv.value) {
				// 获取div中的所有内容
				const divContent = editableDiv.value.innerHTML

				// 创建临时DOM元素来解析HTML
				const tempDiv = document.createElement('div')
				tempDiv.innerHTML = divContent

				// 移除所有标签元素
				const tagElements = tempDiv.querySelectorAll('.tag')
				tagElements.forEach((tag) => tag.remove())

				// 获取剩余的纯文本内容
				userInput.value = tempDiv.textContent.trim()
			}
		}

		// 处理标签添加事件
		const onTagAdded = (tag) => {
			if (!tags.value.some((t) => t.text === tag.text)) {
				tags.value = [tag, ...tags.value]

				if (tag.text === 'AI写作' || tag.text === '写作') {
					attachedFiles.value = []
				}
			}
		}

		// 检查是否有标签
		const hasTags = () => {
			return tagInput.value?.hasTags() || false
		}

		// 获取所有标签内容
		const getTagsContent = () => {
			return tags.value.map((tag) => tag.text)
		}

		const handleWordLimitInput = (requirementsData, event) => {
			return Util.handleWordLimitInput(requirementsData, event)
		}

		return {
			autoPaibanFun,
			chatMessages,
			userInput,
			messages,
			markdown,
			isLoading,
			lastAiMessageIndex,
			showThinking,
			showScrollButton,
			scrollToBottom,
			fillQuestion,
			sendMessage,
			stopChatGeneration,
			exportToDocument,
			exportToNewDocument,
			regenerateMessage,
			showRegenerateButton,
			copyToClipboard,
			showSettingsMenu,
			toggleSettingsMenu,
			startNewChat,
			toggleThinking,
			renderMarkdown,
			resolveAssistantParts,
			sanitizeHtml,
			handleToolboxCommand,
			toggleThinkingContent,
			handleScroll,
			showModeDropdown,
			currentMode,
			currentModeText,
			selectMode,
			showResult,
			revisionsType,
			typeOptions,
			handleRevisionsTypeChange,
			replaceFix,
			reFix,
			isErrorAssistantMessage,
			fileInput,
			attachedFiles,
			attachmentList,
			showLeftScroll,
			showRightScroll,
			triggerFileUpload,
			handleFileUpload,
			removeFile,
			getFileIcon,
			formatFileSize,
			checkScrollButtons,
			scrollAttachments,
			editableDiv,
			updateUserInput,
			tags,
			addTag,
			removeTag,
			handleEditorClick,
			onTagAdded,
			hasTags,
			getTagsContent,
			tagInput,
			handleWordLimitInput,
			isReduce,
			switchChatSize,
			showFontModal,
			missingFonts,
			onFontModalDownload,
			onFontModalIgnore,
			onFontModalClose,
			translateLanguages,
			showSourceDropdown,
			showTargetDropdown,
			activeDropdownIndex,
			getLanguageName,
			toggleSourceDropdown,
			toggleTargetDropdown,
			selectSourceLanguage,
			selectTargetLanguage,
			closeLanguageDropdowns,
			swapLanguages,
			handleEditTemplate,
			isShowEditTemplate
		}
	}
}
</script>

<style scoped src="./styles/chat-taskpane.css"></style>
<style scoped src="@/shared/styles/components/settings-menu.css"></style>
