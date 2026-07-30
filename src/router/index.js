import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
	history: createWebHashHistory(''),
	routes: [
		{
			path: '/',
			name: 'RibbonHost',
			component: () => import('@/app/RibbonHost.vue')
		},
		{
			path: '/chatTaskpane',
			name: 'AI智写',
			component: () => import('@/features/chat/ChatTaskPane.vue')
		},
		{
			path: '/settings',
			name: '设置',
			component: () => import('@/features/settings/Settings.vue')
		},
		{
			path: '/polishTaskPane',
			name: '文本纠错润色任务窗格',
			component: () => import('@/features/polish/PolishTaskPane.vue')
		},
		{
			path: '/mindMap',
			name: '文档脑图',
			component: () => import('@/features/mindmap/MindMap.vue')
		},
		{
			path: '/templatesTaskpane',
			name: '智能排版',
			component: () => import('@/features/formatting/TemplatesTaskpane.vue')
		},
		{
			path: '/preview',
			name: 'PreviewPage',
			component: () => import('@/features/formatting/PreviewPage.vue')
		},
		{
			path: '/writing',
			name: 'SpeechWriter',
			component: () => import('@/features/writing/WritingPane.vue')
		}
	]
})

export default router
