<template>
	<div class="mindmap-container">
		<div v-if="toastVisible" class="toast-message">{{ toastText }}</div>
		<!-- 遮罩层 -->
		<div v-if="loading" class="mindmap-loading-mask">
			<div class="mindmap-loading-spinner"></div>
			<div class="mindmap-loading-text">脑图生成中，请稍候...</div>
		</div>
		<!-- 悬浮工具栏 -->
		<div class="toolbar">
			<button class="mindmap-action-btn" @click="generateMindMap">
				<img src="/mindmap/reCreate.png" class="btn-icon" />
				{{ buttonText }}
			</button>
			<button class="mindmap-action-btn" @click="exportMindMap" :disabled="!data.length">
				<img src="/mindmap/exportToDoc.png" class="btn-icon" />
				导出图片
			</button>
			<button class="mindmap-action-btn" @click="downloadMarkdown" :disabled="!data.length">
				<img src="/mindmap/exportToDoc.png" class="btn-icon" />
				导出md文件
			</button>
			<button class="mindmap-action-btn" @click="exportMarkdown" :disabled="!data.length">
				<img src="/mindmap/export.svg" class="btn-icon" />
				导入左侧文档
			</button>
		</div>

		<!-- 脑图组件 -->
		<div class="mindmap-wrapper" v-if="!loading && data.length > 0">
			<button class="refresh-btn" @click="refreshMindMap" title="刷新">
				<img src="/icons/chat/refresh.png" alt="刷新" />
				刷新
			</button>
			<mindmap
				ref="mindmapRef"
				v-model="data"
				:key="mapKey"
				:x-gap="84"
				:y-gap="18"
				:branch="4"
				:scale-extent="[0.1, 2]"
				:timetravel="true"
				:drag="true"
				:zoom="true"
				:edit="true"
				:center-btn="true"
				:fit-btn="true"
				:add-node-btn="true"
				:sharp-corner="true"
				:ctm="true"
				locale="zh"
				@update:modelValue="onMindmapChange"
				class="mind_map"
			></mindmap>
		</div>
	</div>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted, nextTick } from 'vue'
import mindmap from 'vue3-mindmap'
import 'vue3-mindmap/dist/style.css'
import { streamChat, getStreamState, isLlmConfigured } from '@/services/llmService.js'
import { resolvePrompt } from '@/services/promptService.js'
import { toUserMessage, LLM_NOT_CONFIGURED_MSG } from '@/shared/errors.js'
import { usePageToast } from '@/shared/ui/usePageToast.js'
import '@/shared/ui/page-toast.css'
import html2canvas from 'html2canvas'
import taskPane from '@/shared/wps/taskpane.js'
import { getWpsVersion, isExportAllowed } from '@/shared/wps/func_wps.js'

export default defineComponent({
	components: { mindmap },
	setup() {
		getStreamState()
		const { toastVisible, toastText, showToast } = usePageToast()
		const data = ref([])
		const loading = ref(false)
		const buttonText = ref('生成脑图')
		const isModalVisible = ref(false)
		const previewImage = ref('')
		const mapKey = ref(1)
		const mindmapRef = ref(null)
		const buttonStatusMap = ref({}) // { [docId]: '生成中' | '生成脑图' | '重新生成' }
		let windowActivateHandler = null
		let windowDocumentOpenHandler = null

		// 获取文档唯一标识
		const getDocId = () => {
			try {
				const doc = window.Application.ActiveDocument
				if (!doc) return null
				return doc.Name || doc.Path
			} catch (error) {
				console.error('获取文档ID失败:', error)
				return null
			}
		}

		// 从 PluginStorage 加载数据
		const loadFromStorage = () => {
			try {
				const docId = getDocId()
				if (!docId) {
					return
				}
				mapKey.value = mapKey.value + 1
				const ps = window.Application.PluginStorage
				const storedData = ps.getItem(`mindmap_${docId}`)

				// 优先判断该文档是否正在生成脑图
				const status = buttonStatusMap.value[docId]
				if (status === '生成中') {
					buttonText.value = '正在生成脑图...'
					loading.value = true
					data.value = storedData ? JSON.parse(storedData) : []
				} else if (storedData) {
					data.value = JSON.parse(storedData)
					buttonText.value = '重新生成'
					loading.value = false
				} else {
					data.value = []
					buttonText.value = '生成脑图'
					loading.value = false
				}
			} catch (error) {
				console.error('从存储加载数据失败:', error)
				data.value = []
				buttonText.value = '生成脑图'
				loading.value = false
			}
		}

		// 保存数据到 PluginStorage
		const saveToStorage = (docId, mindMapData) => {
			try {
				if (!docId) {
					return
				}
				const ps = window.Application.PluginStorage
				ps.setItem(`mindmap_${docId}`, JSON.stringify(mindMapData))
			} catch (error) {
				console.error('保存数据到存储失败:', error)
			}
		}

		const sendPrompt = async (fullContent) => {
			const messages = resolvePrompt('mind_map', { query: fullContent })
			let res = null
			const docId = getDocId()
			await streamChat({ messages }, (updatedContent) => {
				res = updatedContent
			})
			if (!res) {
				throw new Error('脑图生成失败，请稍后重试')
			}
			if (res.startsWith('```json')) {
				res = res.substring(7)
			}
			if (res.endsWith('```')) {
				res = res.substring(0, res.length - 3)
			}
			const mindMapData = JSON.parse(res)
			if (docId === getDocId()) {
				data.value = mindMapData
			}
			saveToStorage(docId, mindMapData)
		}

		const generateMindMap = async () => {
			const docId = getDocId()
			if (!docId) return

			if (!isLlmConfigured()) {
				showToast(LLM_NOT_CONFIGURED_MSG)
				buttonStatusMap.value[docId] = '生成脑图'
				loadFromStorage()
				return
			}

			buttonStatusMap.value[docId] = '生成中'
			loadFromStorage() // 立即刷新按钮状态

			try {
				data.value = []
				const doc = window.Application.ActiveDocument
				let fullContent = ''
				if (window.Application.Selection.Range.Text.trim() !== '') {
					fullContent = window.Application.Selection.Range.Text
				} else {
					fullContent = doc.Content.Text
				}
				await sendPrompt(fullContent)
				buttonStatusMap.value[docId] = '重新生成'
				loadFromStorage() // 立即刷新按钮状态
			} catch (error) {
				console.error('获取脑图数据失败:', error)
				buttonStatusMap.value[docId] = '生成脑图'
				loadFromStorage()
				showToast(toUserMessage(error, '脑图生成失败，请稍后重试'))
			}
		}

		onMounted(() => {
			// 监听 WindowActivate 和 DocumentOpen 事件
			if (window.Application && window.Application.ApiEvent) {
				windowActivateHandler = function (doc) {
					// 这里的 doc 是当前激活的文档
					if (doc) {
						loadFromStorage()
					}
				}
				windowDocumentOpenHandler = function (doc) {
					if (doc) {
						loadFromStorage()
					}
				}
				window.Application.ApiEvent.AddApiEventListener('WindowActivate', windowActivateHandler)
				window.Application.ApiEvent.AddApiEventListener('DocumentOpen', windowDocumentOpenHandler)
			}

			// 页面加载时自动生成脑图（如果当前文档没有已缓存的脑图）
			const docId = getDocId()
			if (docId) {
				// 每次自动生成新的
				generateMindMap()
				// if (!storedData) {
				//   // 没有缓存数据，自动生成脑图
				//   generateMindMap();
				// } else {
				//   // 有缓存数据，直接加载
				//   loadFromStorage();
				// }
			}
		})

		onUnmounted(() => {
			if (window.Application && window.Application.ApiEvent) {
				if (windowActivateHandler) {
					window.Application.ApiEvent.RemoveApiEventListener(
						'WindowActivate',
						windowActivateHandler
					)
				}
				if (windowDocumentOpenHandler) {
					window.Application.ApiEvent.RemoveApiEventListener(
						'DocumentOpen',
						windowDocumentOpenHandler
					)
				}
			}
		})

		const exportMindMap = async () => {
			// 检查 WPS 版本是否允许导出
			const wpsVersion = getWpsVersion()
			if (!isExportAllowed()) {
				alert(`当前 WPS 版本 (${wpsVersion || '未知'}) 不支持导出功能，请升级到更高版本`)
				return
			}
			try {
				// 确保视图更新完成
				await nextTick()
				// 调用适应视图方法
				if (mindmapRef.value) {
					mindmapRef.value.fitView()
					await new Promise((resolve) => setTimeout(resolve, 500))
				}

				// 只选中脑图 SVG 部分
				const mindMapElement = document.querySelector('#Mindmap_svg-wrapper_fgvb6')
				if (!mindMapElement) {
					throw new Error('找不到脑图SVG元素')
				}
				// 获取文档名并去除扩展名
				let docName = ''
				try {
					const doc = window.Application.ActiveDocument
					if (doc && doc.Name) {
						docName = doc.Name.replace(/\.[^.]+$/, '')
					} else {
						docName = 'mindmap'
					}
				} catch (e) {
					docName = 'mindmap'
				}
				const canvas = await html2canvas(mindMapElement, {
					scale: 5,
					useCORS: true,
					backgroundColor: '#ffffff'
				})

				canvas.toBlob((blob) => {
					if (blob) {
						const blobUrl = URL.createObjectURL(blob)
						const link = document.createElement('a')
						link.href = blobUrl
						link.download = docName + '.png'
						document.body.appendChild(link)
						link.click()
						document.body.removeChild(link)
						URL.revokeObjectURL(blobUrl)
					}
				}, 'image/png')
			} catch (error) {
				console.error('导出脑图失败:', error)
			}
		}
		const saveImage = () => {
			const link = document.createElement('a')
			link.href = previewImage.value
			link.download = 'mindmap.png'
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
		}

		// 将脑图数据转换为 Markdown 格式
		const convertToMarkdown = (node, level = 0) => {
			let markdown = ''

			// 根节点处理为标题，其余节点处理为列表项
			if (level === 0) {
				markdown += `# ${node.name}\n\n` // 一级标题
			} else {
				markdown += `${'  '.repeat(level - 1)}- ${node.name}\n` // 列表项，带缩进
			}

			// 遍历子节点
			if (node.children && node.children.length > 0) {
				node.children.forEach((child) => {
					markdown += convertToMarkdown(child, level + 1) // 递归处理子节点
				})
			}

			return markdown
		}

		// 将 Markdown 数据导出到左侧文档
		const exportMarkdown = () => {
			if (!data.value || data.value.length === 0) {
				console.error('脑图数据为空，无法导出 Markdown')
				return
			}
			// 将脑图数据转换为 Markdown 格式
			const markdown = convertToMarkdown({ name: '脑图根节点', children: data.value })
			taskPane.onbuttonclick('appendContentToEnd', markdown)
		}

		// 下载 Markdown 数据
		const downloadMarkdown = () => {
			// 检查 WPS 版本是否允许导出
			const wpsVersion = getWpsVersion()
			if (!isExportAllowed()) {
				alert(`当前 WPS 版本 (${wpsVersion || '未知'}) 不支持导出功能，请升级到更高版本`)
				return
			}

			if (!data.value || data.value.length === 0) {
				console.error('脑图数据为空，无法导出 Markdown')
				return
			}
			// 下载md文件 - 直接转换脑图数据，不添加额外的根节点
			let markdown = ''
			data.value.forEach((node) => {
				markdown += convertToMarkdown(node, 0)
			})

			const blob = new Blob([markdown], { type: 'text/markdown' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = 'mindmap.md'
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
		}

		const refreshMindMap = () => {
			mapKey.value = mapKey.value + 1
		}

		// 监听脑图组件数据变化，更新缓存
		const onMindmapChange = (newVal) => {
			const docId = getDocId()
			if (docId) {
				saveToStorage(docId, newVal)
			}
		}

		return {
			data,
			loading,
			buttonText,
			isModalVisible,
			previewImage,
			mapKey,
			mindmapRef,
			toastVisible,
			toastText,
			generateMindMap,
			exportMindMap,
			saveImage,
			exportMarkdown,
			refreshMindMap,
			onMindmapChange,
			downloadMarkdown
		}
	}
})
</script>

<style scoped>
.mindmap-container {
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	align-items: center;
	height: 100%;
	width: 100%;
	overflow: auto;
	position: relative;
}

/* 悬浮工具栏样式 */
.toolbar {
	position: relative;
	top: 0;
	left: 0;
	width: 100%;
	display: flex;
	justify-content: start;
	gap: 5px;
	padding: 10px 10px;
	background-color: #f5f5f5;
	z-index: 1000;
	border-bottom: 1px solid #ddd;
}

.mind_map {
	width: 100%;
}

/* 按钮样式 */
.btn {
	display: inline-block;
	padding: 8px 16px;
	font-size: 14px;
	font-weight: 500;
	text-align: center;
	text-decoration: none;
	border: 1px solid transparent;
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s ease;
	outline: none;
	user-select: none;
	line-height: 1.5;
}

.btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.btn-primary {
	background-color: #4285f4;
	border-color: #4285f4;
	color: #fff;
}

.btn-primary:hover {
	background-color: #357ae8;
	border-color: #357ae8;
}

.btn-default {
	background-color: #fff;
	border-color: #d9d9d9;
	color: #333;
}

.btn-default:hover {
	background-color: #f5f5f5;
	border-color: #bcbcbc;
	color: #333;
}

/* 刷新图标样式 */
.icon-refresh {
	display: inline-block;
	font-size: 20px;
	vertical-align: middle;
	transition: transform 0.3s ease;
}

.fab-refresh {
	position: fixed;
	right: 32px;
	bottom: 32px;
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background: #4285f4;
	color: #fff;
	border: none;
	box-shadow: 0 2px 8px rgba(80, 80, 160, 0.12);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 2000;
	cursor: pointer;
	transition: background 0.2s;
}
.fab-refresh:hover {
	background: #357ae8;
}
.fab-refresh:active {
	background: #2a5dab;
}
.fab-refresh:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}
.fab-refresh .icon-refresh {
	margin-right: 0;
}
.mindmap-action-btn {
	height: 28px;
	background: rgba(250, 251, 255, 0.65);
	border-radius: 4px;
	border: 1px solid #ffffff;
	display: flex;
	align-items: center;
	padding: 5px 5px;
	font-family:
		PingFangSC,
		PingFang SC;
	font-weight: 400;
	font-size: 12px;
	color: #171a1d;
	line-height: 18px;
	margin-right: 8px;
	outline: none;
	cursor: pointer;
}
.mindmap-action-btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
.mindmap-action-btn .btn-icon {
	width: 12px;
	height: 12px;
	margin-right: 4px;
	display: inline-block;
}
.mindmap-action-btn:last-child {
	margin-right: 0;
}
.mindmap-wrapper {
	position: relative;
	width: 100%;
	height: 100%;
}
.refresh-btn {
	position: absolute;
	top: 8px;
	left: 8px;
	z-index: 10;
	display: flex;
	align-items: center;
	background: transparent;
	border: none;
	color: #666;
	font-size: 14px;
	cursor: pointer;
	padding: 2px 8px 2px 2px;
	border-radius: 4px;
	transition: background 0.2s;
}
.refresh-btn:hover {
	background: #f0f0f0;
}
.refresh-btn img {
	width: 16px;
	height: 16px;
	margin-right: 4px;
}

.mindmap-loading-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.2); /* 浅黑色，带透明度 */
	z-index: 3000;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.mindmap-loading-spinner {
	border: 4px solid #f3f3f3;
	border-top: 4px solid #e60027;
	border-radius: 50%;
	width: 48px;
	height: 48px;
	animation: mindmap-spin 1s linear infinite;
	margin-bottom: 16px;
}

@keyframes mindmap-spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.mindmap-loading-text {
	font-size: 16px;
	color: #e60027;
	font-weight: bold;
}
</style>
