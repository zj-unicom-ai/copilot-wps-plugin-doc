<template>
	<div class="templates-pane">
		<div class="header">
			<div class="header-title">请选择下列模板进行排版</div>
		</div>
		<div class="cards">
			<div v-for="tpl in templates" :key="tpl.id" class="card" @click="onClick(tpl)">
				<div class="card-content">
					<img src="/icons/word.svg" class="icon" />
					<div class="info">
						<div class="title">{{ tpl.title }}</div>
						<span class="note">{{ tpl.note }}</span>
					</div>
				</div>
				<div class="actions">
					<button class="btn" @click.stop="showPreview(tpl, 'example')">示例</button>
					<button class="btn" @click.stop="showPreview(tpl, 'rule')">规则</button>
					<button class="btn use-btn" @click.stop="onClick(tpl)">使用</button>
				</div>
			</div>
			<!-- 即将上线提示卡片 -->
			<div class="card card-disabled">
				<div class="card-content">
					<img src="/icons/word.svg" class="icon" />
					<div class="info">
						<div class="title">更多模板</div>
						<span class="note">更多模板及模板自定义功能，即将上线</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { usePaibanStore } from '@/store/paiban'
import { openTaskPane } from '@/shared/wps/func_wps.js'
import messageUtil from '@/utils/messageUtil'

const router = useRouter()
const paibanObj = usePaibanStore()
const templates = [
	{
		id: '001',
		title: '通用公文模板',
		note: '严格按照公文格式国标要求进行排版',
		exampleImage: './template/paiban_template.png',
		ruleImage: './template/rule.png'
	}
]

const onClick = (tpl, type = 1) => {
	openTaskPane('/chatTaskpane', 'chat_taskpane_id')
	//记录排版类型
	paibanObj.setType(type)
	const message = {
		type: 'command',
		data: {
			command: 'paiban',
			name: '智能排版',
			skipConfirm: true
		}
	}
	messageUtil.send(message)
}

const showPreview = (tpl, type) => {
	let imageUrl = ''
	let title = tpl.title

	if (type === 'example') {
		imageUrl = tpl.exampleImage
		title += '示例'
	} else if (type === 'rule') {
		imageUrl = tpl.ruleImage
		title += '规则'
	}

	if (imageUrl) {
		router.push({
			path: '/preview',
			query: {
				title: title,
				imageUrl: imageUrl
			}
		})
	}
}
</script>

<style scoped>
.templates-pane {
	width: 100%;
	height: 100%;
	padding: 16px;
	background: linear-gradient(180deg, rgba(240, 244, 245, 0.95) 0%, rgba(245, 245, 245, 0.9) 100%);
	box-sizing: border-box;
}
.header {
	margin-bottom: 24px;
}

.header-title {
	font-size: 16px;
	font-weight: 600;
	margin-bottom: 12px;
}

.cards {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.card {
	display: flex;
	flex-direction: column;
	padding: 16px;
	background: #ffffff;
	border-radius: 8px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
	transition: all 0.2s;
	cursor: pointer;
}

.card-content {
	display: flex;
	align-items: flex-start;
	gap: 12px;
	cursor: pointer;
	margin-bottom: 12px;
}

.card:hover {
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-disabled {
	opacity: 0.6;
	cursor: not-allowed;
	pointer-events: none;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
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

.btn:hover {
	color: #e60027;
	border-color: #e60027;
	background: #fff;
}

.btn.use-btn {
	color: #fff;
	background: #e60027;
	border-color: #e60027;
}

.btn.use-btn:hover {
	background: #cc0023;
	border-color: #cc0023;
	color: #fff;
}

.icon {
	margin-top: 10px;
	width: 30px;
}

.info {
	flex: 1;
	min-width: 0;
}

.title {
	height: 24px;
	font-family:
		PingFangSC,
		PingFang SC;
	font-weight: 600;
	font-size: 16px;
	color: #192134;
	line-height: 24px;
	margin-bottom: 8px;
}
.note {
	font-size: 14px;
	color: #999;
	line-height: 1.5;
	flex-grow: 1;
	/* 让描述占据剩余空间 */
	overflow: hidden;
	/* 隐藏溢出内容 */
	text-overflow: ellipsis;
	/* 显示省略号 */
	display: -webkit-box;
	-webkit-line-clamp: 3;
	/* 限制描述显示3行 */
	-webkit-box-orient: vertical;
}
</style>
