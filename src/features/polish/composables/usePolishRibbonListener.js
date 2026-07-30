import { onMounted, onUnmounted } from 'vue'
import polishChannelUtil from '@/utils/polishChannelUtil.js'

export function usePolishRibbonListener({ onMessage }) {
	onMounted(() => {
		polishChannelUtil.subscribe(onMessage)
	})

	onUnmounted(() => {
		polishChannelUtil.unsubscribe()
	})
}
