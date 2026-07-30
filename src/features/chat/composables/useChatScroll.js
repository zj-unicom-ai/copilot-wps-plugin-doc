import { ref, nextTick } from 'vue'

export function useChatScroll(scrollContainerRef) {
	const shouldAutoScroll = ref(true)
	const lastUserInteraction = ref(0)
	const showScrollButton = ref(false)

	const scrollToBottom = async (isManual) => {
		await nextTick()
		const isRecentUserInteraction = Date.now() - lastUserInteraction.value < 100
		const el = scrollContainerRef.value
		if ((el && shouldAutoScroll.value && !isRecentUserInteraction) || isManual) {
			el.scrollTop = el.scrollHeight
			showScrollButton.value = false
		}
	}

	const handleScroll = (e) => {
		const element = e.target
		if (element.scrollHeight <= element.clientHeight) return
		const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100
		if (isNearBottom) {
			shouldAutoScroll.value = true
			showScrollButton.value = false
		} else {
			lastUserInteraction.value = Date.now()
			shouldAutoScroll.value = false
			showScrollButton.value = true
		}
	}

	const handleWheel = (e) => {
		const element = scrollContainerRef.value
		if (!element || element.scrollHeight <= element.clientHeight) return
		lastUserInteraction.value = Date.now()
		if (e.deltaY < -100) {
			shouldAutoScroll.value = false
			showScrollButton.value = true
		}
	}

	const bindWheelListener = () => {
		scrollContainerRef.value?.addEventListener('wheel', handleWheel)
	}

	const unbindWheelListener = () => {
		scrollContainerRef.value?.removeEventListener('wheel', handleWheel)
	}

	const resetAutoScroll = () => {
		shouldAutoScroll.value = true
	}

	return {
		shouldAutoScroll,
		showScrollButton,
		scrollToBottom,
		handleScroll,
		bindWheelListener,
		unbindWheelListener,
		resetAutoScroll
	}
}
