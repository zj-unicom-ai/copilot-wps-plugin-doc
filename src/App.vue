<template>
	<a-config-provider
		:theme="{
			token: {
				colorPrimary: 'var(--color-primary)'
			}
		}"
	>
		<RouterView />
	</a-config-provider>
</template>

<script>
import { onMounted } from 'vue'
import ribbon from '@/utils/ribbon.js'
import messageUtil from '@/utils/messageUtil.js'

export default {
	setup() {
		const setupGlobalErrorHandling = () => {
			window.addEventListener('unhandledrejection', (event) => {
				console.error('未处理的Promise错误:', event.reason)
				if (
					event.reason?.message?.includes('Failed to fetch dynamically imported module') ||
					event.reason?.message?.includes('Failed to load module script')
				) {
					setTimeout(() => window.location.reload(), 1000)
				}
			})

			window.addEventListener('error', (event) => {
				if (
					event.message?.includes('Failed to load module script') ||
					event.message?.includes('Expected a JavaScript module script')
				) {
					setTimeout(() => window.location.reload(), 1000)
				}
			})
		}

		onMounted(() => {
			window.ribbon = ribbon
			window.messageUtil = messageUtil
			setupGlobalErrorHandling()

			messageUtil.addEventListener((event) => {
				const msg = event.data
				if (msg.type === 'versionUpdate') {
					setTimeout(() => window.location.reload(true), 1000)
				}
			})
		})
	}
}
</script>
