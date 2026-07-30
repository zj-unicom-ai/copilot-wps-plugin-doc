import { ref } from 'vue'
import { readSettings, writeSettings } from '@/services/settingsService.js'

const REQUIRED_FONTS = ['方正小标宋简体', '仿宋_GB2312', '楷体_GB2312']
const IGNORE_KEY = 'ignorePaibanFonts'

/**
 * Detect whether a font family is available in the browser / WPS host.
 * Official fonts must be installed by the user — this project does not redistribute commercial fonts.
 */
function isFontAvailable(font) {
	const testString = 'mmmmmmmmmmlli'
	const baseFonts = ['monospace', 'sans-serif', 'serif']
	const span = document.createElement('span')
	span.style.cssText = 'position:absolute;left:-9999px;font-size:72px'
	span.textContent = testString
	document.body.appendChild(span)

	const baseWidths = {}
	for (const base of baseFonts) {
		span.style.fontFamily = base
		baseWidths[base] = span.getBoundingClientRect().width
	}

	let available = false
	for (const base of baseFonts) {
		span.style.fontFamily = `${font},${base}`
		if (span.getBoundingClientRect().width !== baseWidths[base]) {
			available = true
			break
		}
	}
	document.body.removeChild(span)
	return available
}

export function usePaibanFonts() {
	const showFontModal = ref(false)
	const missingFonts = ref([...REQUIRED_FONTS])
	let pendingAction = null

	const detectMissingFonts = () => REQUIRED_FONTS.filter((f) => !isFontAvailable(f))

	const shouldShowFontModal = () => {
		if (readSettings()[IGNORE_KEY]) return false
		const missing = detectMissingFonts()
		if (missing.length > 0) {
			missingFonts.value = missing
			return true
		}
		return false
	}

	const checkFontsBeforeAction = async (action) => {
		if (shouldShowFontModal()) {
			pendingAction = action
			showFontModal.value = true
		} else {
			await action()
		}
	}

	const onFontModalDownload = async () => {
		alert(
			'本插件不附带商用字体文件。请从字体版权方或贵单位授权渠道安装：方正小标宋、仿宋_GB2312、楷体_GB2312，安装后重新打开文档即可。'
		)
		onFontModalClose()
	}

	const onFontModalIgnore = () => {
		writeSettings({ [IGNORE_KEY]: true })
		onFontModalClose()
	}

	const onFontModalClose = async () => {
		showFontModal.value = false
		if (typeof pendingAction === 'function') {
			const fn = pendingAction
			pendingAction = null
			await fn()
		}
	}

	return {
		showFontModal,
		missingFonts,
		checkFontsBeforeAction,
		onFontModalDownload,
		onFontModalIgnore,
		onFontModalClose
	}
}
