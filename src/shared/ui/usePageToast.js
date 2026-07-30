import { ref, onUnmounted } from 'vue'

/**
 * In-pane toast (z-index 9999) — visible above WPS taskpane loading masks.
 * Prefer this over ant-design `message` inside task panes.
 */
export function usePageToast(durationMs = 3000) {
	const toastVisible = ref(false)
	const toastText = ref('')
	let toastTimer = null

	const showToast = (text) => {
		toastText.value = text
		toastVisible.value = true
		if (toastTimer) clearTimeout(toastTimer)
		toastTimer = setTimeout(() => {
			toastVisible.value = false
		}, durationMs)
	}

	onUnmounted(() => {
		if (toastTimer) clearTimeout(toastTimer)
	})

	return { toastVisible, toastText, showToast }
}
