<template>
	<div class="writing-pane">
		<div class="background-image-container">
			<img src="/icons/chat/背景.png" alt="背景" class="background-image" />
		</div>
		<div class="tab-container">
			<div class="tab-header">
				<div
					v-for="(tab, index) in tabs"
					:key="index"
					class="tab"
					:class="{ active: currentTab === index }"
					@click="currentTab = index"
				>
					<img :src="tab.icon" alt="" width="12" height="12" />
					{{ tab.name }}
				</div>
			</div>

			<div class="tab-content">
				<div class="prompt-grid">
					<div
						v-for="(item, index) in tabs[currentTab].items"
						:key="index"
						class="prompt-item"
						@click="selectPrompt(item)"
					>
						<div class="item-title">{{ item.title }}</div>
						<div class="item-desc">{{ item.description }}</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { ref } from 'vue'
import { writingPrompts } from './data/writingPrompts'
import messageUtil from '@/utils/messageUtil.js'
import { openTaskPane } from '@/shared/wps/func_wps.js'

export default {
	name: 'WritingPane',
	emits: ['select-prompt'],
	setup() {
		const currentTab = ref(0)
		const tabs = ref(writingPrompts)

		const selectPrompt = (item) => {
			openTaskPane('/chatTaskpane', 'chat_taskpane_id')
			messageUtil.send({
				type: 'prompt',
				data: { prompt: item.prompt }
			})
		}

		return {
			currentTab,
			tabs,
			selectPrompt
		}
	}
}
</script>

<style scoped>
.writing-pane {
	height: 100%;
	/* background-color: #f8f9fa; */
	display: flex;
	flex-direction: column;
	width: 100%;
}

.background-image-container {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	z-index: 0;
	overflow: hidden;
	display: flex;
	justify-content: center;
	align-items: flex-start;
}

.tab-container {
	border-radius: 8px;
	background: linear-gradient(180deg, rgba(240, 244, 245, 0.95) 0%, rgba(245, 245, 245, 0.9) 100%);
	box-shadow: inset 1px 0px 0px 0px #e3e3e6;
	backdrop-filter: blur(10px);
	height: 100%;
	display: flex;
	flex-direction: column;
	width: 100%;
	z-index: 1;
}

.tab-header {
	display: flex;
	border-bottom: 1px solid #e3e3e6;
	background: transparent;
	border-radius: 8px 8px 0 0;
	padding-bottom: 10px;
	padding: 10px 16px;
	gap: 8px;
}

.tab {
	padding: 5px 8px;
	cursor: pointer;
	transition: all 0.3s;
	background: rgba(250, 251, 255, 0.65);
	border-radius: 4px;
	border: 1px solid #ffffff;
	font-size: 12px;
	display: flex;
	align-items: center;
	gap: 4px;
}

.tab:hover {
	background:
		linear-gradient(#fafbff, #fafbff) padding-box,
		linear-gradient(270deg, rgba(230, 0, 39, 0.8), rgba(255, 117, 140, 0.8)) border-box;
	border: 1px solid transparent;
	box-shadow:
		0px 2px 4px 0px rgba(230, 0, 39, 0.2),
		0px 0px 8px 0px rgba(230, 0, 39, 0.1);
}

.tab.active {
	background:
		linear-gradient(#fafbff, #fafbff) padding-box,
		linear-gradient(270deg, rgba(230, 0, 39, 0.8), rgba(255, 117, 140, 0.8)) border-box;
	border: 1px solid transparent;
	box-shadow:
		0px 2px 4px 0px rgba(230, 0, 39, 0.2),
		0px 0px 8px 0px rgba(230, 0, 39, 0.1);
	color: #e60027;
}

.tab-content {
	flex: 1;
	overflow-y: auto;
	padding: 20px;
}

.prompt-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
	gap: 20px;
	width: 100%;
}

.prompt-item {
	background: white;
	border: 1px solid #e0e0e0;
	border-radius: 8px;
	padding: 16px;
	cursor: pointer;
	transition: all 0.3s;
}

.prompt-item:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.item-title {
	font-weight: bold;
	margin-bottom: 8px;
}

.prompt-item:hover .item-title {
	color: #e60027;
}

.item-desc {
	font-size: 14px;
	color: #666;
	margin-bottom: 8px; /* Added spacing for buttons */
}

.item-actions {
	display: flex;
	gap: 10px;
	justify-content: flex-end;
}

.btn {
	padding: 4px 12px;
	border: 1px solid #d9d9d9;
	background: #fff;
	border-radius: 4px;
	font-size: 14px;
	cursor: pointer;
	color: #333;
	transition: all 0.2s;
}

.example-btn {
	color: #333;
}

.example-btn:hover {
	color: #e60027;
	border-color: #e60027;
	background: #fff;
}

.use-btn {
	color: #fff;
	background: #e60027;
	border-color: #e60027;
}

.use-btn:hover {
	background: #cc0023;
	border-color: #cc0023;
	color: #fff;
}
</style>
