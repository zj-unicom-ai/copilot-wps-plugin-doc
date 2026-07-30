<template>
	<div
		class="editor"
		contenteditable="true"
		:data-placeholder="placeholder"
		@keydown="handleKeyDown"
		@input="updateInput"
		@focus="$emit('focus', $event)"
		@click="handleEditorClick"
		ref="editableDiv"
	>
		<!-- <span v-for="(tag, index) in tags" :key="index" class="tag" contenteditable="false">
      {{ tag.text }}
      <span class="tag-close" @click.stop="removeTag(index)">×</span>
    </span> -->
	</div>
</template>

<script>
import { ref, watch, nextTick, onMounted } from 'vue'

export default {
	name: 'TagInput',
	props: {
		placeholder: {
			type: String,
			default: ''
		},
		modelValue: {
			type: String,
			default: ''
		},
		initialTags: {
			type: Array,
			default: () => []
		}
		// initialInputs: {
		//   type: String,
		//   default: () => []
		// }
	},
	emits: ['update:modelValue', 'tag-added', 'tag-removed', 'focus', 'click', 'send'],
	setup(props, { emit }) {
		const editableDiv = ref(null)
		const tags = ref(props.initialTags || [])
		const inputValue = ref('')

		// 监听外部传入的标签变化
		watch(
			() => props.initialTags,
			(newTags) => {
				if (newTags) {
					tags.value = [...newTags]
				}
			}
		)

		onMounted(() => {})

		// 更新编辑器内容，保留标签
		const updateEditorContent = (text) => {
			if (!editableDiv.value) return
			try {
				// 保存当前标签
				const currentTags = [...tags.value]

				// 清空编辑器
				editableDiv.value.innerHTML = ''

				// 重新添加标签
				currentTags.forEach((tag) => {
					const tagElement = document.createElement('span')
					tagElement.className = 'tag'
					tagElement.contentEditable = 'false'
					tagElement.textContent = tag.text

					const closeElement = document.createElement('span')
					closeElement.className = 'tag-close'
					closeElement.textContent = '×'
					closeElement.style.display = 'none'
					closeElement.addEventListener('click', (e) => {
						e.stopPropagation()
						const index = tags.value.findIndex((t) => t.text === tag.text)
						removeTag(index)
					})
					tagElement.addEventListener('mouseenter', () => {
						closeElement.style.display = 'inline-block'
					})

					tagElement.addEventListener('mouseleave', () => {
						closeElement.style.display = 'none'
					})

					tagElement.appendChild(closeElement)
					editableDiv.value.appendChild(tagElement)
				})

				// 添加文本内容
				if (text) {
					const textNode = document.createTextNode(text)
					editableDiv.value.appendChild(textNode)
				}
			} catch (error) {
				console.warn('placeCursorAtEnd error:', error)
			}

			nextTick(() => {
				placeCursorAtEnd()
			})
		}

		// 将光标放在编辑器末尾
		const placeCursorAtEnd = () => {
			if (!editableDiv.value || !editableDiv.value.isConnected) return

			try {
				const range = document.createRange()
				const selection = window.getSelection()

				// 检查编辑器是否有内容
				if (editableDiv.value.childNodes.length === 0) {
					// 如果没有内容，创建一个空的文本节点
					const textNode = document.createTextNode('')
					editableDiv.value.appendChild(textNode)
				}

				range.selectNodeContents(editableDiv.value)
				range.collapse(false) // 折叠到末尾

				selection.removeAllRanges()
				selection.addRange(range)
			} catch (error) {
				console.warn('placeCursorAtEnd error:', error)
			}
		}

		// 添加标签
		const addTag = (text) => {
			if (!text || text.trim() === '') return

			// 检查是否已存在相同标签
			if (tags.value.some((tag) => tag.text === text.trim())) return

			const newTag = { text: text.trim() }
			tags.value = [newTag, ...tags.value] // 添加到开头

			nextTick(() => {
				// 更新编辑器内容，保持用户输入
				const userInput = getUserInputText()
				updateEditorContent(userInput)
				emit('tag-added', newTag)
			})
		}

		// 删除标签
		const removeTag = (index = -1) => {
			if (!tags.value || tags.value.length === 0) {
				updateEditorContent('')
				return
			}

			if (index < 0 || index >= tags.value.length) {
				return
			}

			tags.value.splice(index, 1)

			nextTick(() => {
				// 更新编辑器内容，保持用户输入
				// const userInput = getUserInputText()
				// updateEditorContent(userInput)
				updateEditorContent('')
			})
		}

		// 获取用户输入的纯文本（不包含标签）
		const getUserInputText = () => {
			if (!editableDiv.value) return ''

			// 创建临时div来提取纯文本
			const tempDiv = document.createElement('div')
			tempDiv.innerHTML = editableDiv.value.innerHTML

			// 移除所有标签元素
			const tagElements = tempDiv.querySelectorAll('.tag')
			if (tagElements && tagElements.length > 0) {
				tagElements.forEach((tag) => tag.remove())
			}

			// 返回剩余的纯文本
			return tempDiv.textContent.trim()
		}

		// 处理输入更新
		const updateInput = () => {
			getUserInputText()

			if (editableDiv.value && tags.value.length > 0) {
				const tagElements = editableDiv.value.querySelectorAll('.tag')

				if (tagElements.length === 0 && tags.value.length > 0) {
					// 清空tags数组
					tags.value = []
				}
			}
		}

		// 处理编辑器点击
		const handleEditorClick = (e) => {
			emit('click', e)
		}

		// 处理键盘事件
		const handleKeyDown = (e) => {
			// 处理退格键删除标签
			if (e.key === 'Backspace') {
				const selection = window.getSelection()
				if (selection.rangeCount > 0) {
					const range = selection.getRangeAt(0)

					if (range.startOffset === 0) {
						// 光标在开始位置按退格键
						const node = range.startContainer

						// 检查前一个节点是否是标签
						let previousNode = null

						if (node.nodeType === Node.TEXT_NODE && node.previousSibling) {
							previousNode = node.previousSibling
						} else if (node.parentNode && node.parentNode.previousSibling) {
							previousNode = node.parentNode.previousSibling
						}

						if (previousNode && previousNode.classList && previousNode.classList.contains('tag')) {
							e.preventDefault()
							const tagText = previousNode.textContent.replace('×', '').trim()

							// 查找并删除对应的tag
							const tagIndex = tags.value.findIndex((tag) => tag.text === tagText)
							if (tagIndex !== -1) {
								removeTag(tagIndex)
							}

							return
						}
					}
				}
			}

			// shift + enter 换行
			if (e.key === 'Enter' && e.shiftKey) {
				return // 允许默认的换行行为
			}

			// 普通 enter 发送
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault() // 阻止换行
				emit('send')
			}
		}

		// 暴露给父组件的方法
		const hasTags = () => tags.value.length > 0
		const getTagsContent = () => tags.value.map((tag) => tag.text)
		const clearTags = () => {
			tags.value = []
			nextTick(() => {
				updateEditorContent(props.modelValue)
			})
		}

		return {
			editableDiv,
			tags,
			inputValue,
			addTag,
			removeTag,
			updateInput,
			handleKeyDown,
			handleEditorClick,
			hasTags,
			getTagsContent,
			clearTags,
			updateEditorContent,
			getUserInputText
		}
	}
}
</script>

<style>
/* 样式与原组件保持一致 */
.editor {
	width: 100%;
	min-height: 100px;
	/* max-height: 130px; */
	padding: 10px;
	border: none;
	font-size: 14px;
	line-height: 1.5;
	outline: none;
	overflow-y: auto;
	white-space: pre-wrap;
	word-break: break-word;
	background-color: #fff;
	color: #333 !important;
	-webkit-user-modify: read-write-plaintext-only;
	-moz-user-modify: read-write-plaintext-only;
	user-modify: read-write-plaintext-only;
}

/* 空白提示文字 */
.editor:empty:before {
	content: attr(data-placeholder);
	color: #999;
	pointer-events: none;
}

/* 标签样式 */
.tag {
	display: inline-flex;
	align-items: center;
	background: rgba(232, 23, 58, 0.1);
	border-radius: 10px;
	font-family:
		PingFangSC,
		PingFang SC;
	font-weight: 500;
	font-size: 12px;
	color: #e8173a;
	line-height: 12px;
	padding: 4px 6px;
	margin-right: 5px;
	margin-bottom: 5px;
	font-size: 12px;
	user-select: none;
	cursor: default;
	position: relative;
}

.tag-close {
	margin-left: 4px;
	font-size: 12px;
	cursor: pointer;
	display: inline-block;
	width: 16px;
	text-align: center;
	line-height: 14px;
	border-radius: 50%;
}

.tag-close:hover {
	background-color: rgba(255, 255, 255, 0.3);
}

/* 修改滚动条样式 */
.editor::-webkit-scrollbar {
	width: 8px;
	margin-right: 4px;
}

.editor::-webkit-scrollbar-track {
	background: transparent;
	border-radius: 3px;
	margin: 4px;
}

.editor::-webkit-scrollbar-thumb {
	background: linear-gradient(270deg, rgba(255, 205, 210, 0.8), rgba(255, 117, 140, 0.5));
	border-radius: 3px;
	transition: background 0.2s ease-in-out;
	border: 2px solid white;
}

.editor::-webkit-scrollbar-thumb:hover {
	background: linear-gradient(270deg, #e60027 0%, #ff758c 100%);
}

.editor::-webkit-scrollbar-corner {
	background: transparent;
}
</style>
