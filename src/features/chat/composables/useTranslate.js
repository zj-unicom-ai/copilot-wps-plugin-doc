import { ref } from 'vue'

export function useTranslate(isLoading, messages) {
	const translateLanguages = ref([
		{ code: 'zh', name: '中文' },
		{ code: 'en', name: '英语' },
		{ code: 'es', name: '西班牙语' },
		{ code: 'ar', name: '阿拉伯语' },
		{ code: 'fr', name: '法语' },
		{ code: 'ru', name: '俄语' },
		{ code: 'pt', name: '葡萄牙语' },
		{ code: 'ja', name: '日语' },
		{ code: 'ko', name: '韩语' }
	])

	const showSourceDropdown = ref(false)
	const showTargetDropdown = ref(false)
	const activeDropdownIndex = ref(-1)

	const getLanguageName = (code) => {
		const lang = translateLanguages.value.find((l) => l.code === code)
		return lang ? lang.name : '中文'
	}

	const toggleSourceDropdown = (index) => {
		if (isLoading.value) return
		showTargetDropdown.value = false
		if (showSourceDropdown.value && activeDropdownIndex.value === index) {
			showSourceDropdown.value = false
			activeDropdownIndex.value = -1
		} else {
			showSourceDropdown.value = true
			activeDropdownIndex.value = index
		}
	}

	const toggleTargetDropdown = (index) => {
		if (isLoading.value) return
		showSourceDropdown.value = false
		if (showTargetDropdown.value && activeDropdownIndex.value === index) {
			showTargetDropdown.value = false
			activeDropdownIndex.value = -1
		} else {
			showTargetDropdown.value = true
			activeDropdownIndex.value = index
		}
	}

	const selectSourceLanguage = (message, code) => {
		message.sourceLanguage = code
		message.detectedLanguageName = null
		message.sourceLanguageManuallyChanged = true
		showSourceDropdown.value = false
		activeDropdownIndex.value = -1
		if (message.targetLanguage === code) {
			message.targetLanguage = code === 'zh' ? 'en' : 'zh'
		}
	}

	const selectTargetLanguage = (message, code) => {
		message.targetLanguage = code
		showTargetDropdown.value = false
		activeDropdownIndex.value = -1
	}

	const closeLanguageDropdowns = () => {
		showSourceDropdown.value = false
		showTargetDropdown.value = false
		activeDropdownIndex.value = -1
	}

	const swapLanguages = (message, index) => {
		if (isLoading.value || index !== messages.value.length - 1) return
		const tempCode = message.sourceLanguage
		message.sourceLanguage = message.targetLanguage
		message.targetLanguage = tempCode
		message.detectedLanguageName = null
		message.sourceLanguageManuallyChanged = true
		closeLanguageDropdowns()
	}

	// 基于字符统计的轻量语言检测
	const detectLanguage = (text) => {
		if (!text || text.trim().length === 0) return { code: 'zh', name: '中文' }

		const sampleText = text.trim().substring(0, 100)
		let zhCount = 0,
			enCount = 0,
			jaCount = 0,
			koCount = 0
		let arCount = 0,
			ruCount = 0,
			esCount = 0,
			frCount = 0,
			ptCount = 0
		let latinCount = 0,
			totalCount = 0

		for (const char of sampleText) {
			if (/\s/.test(char)) continue
			totalCount++

			if (/[\u4e00-\u9fff]/.test(char)) zhCount++
			else if (/[\u3040-\u309f\u30a0-\u30ff]/.test(char)) jaCount++
			else if (/[\uac00-\ud7af\u1100-\u11ff]/.test(char)) koCount++
			else if (/[\u0600-\u06ff]/.test(char)) arCount++
			else if (/[\u0400-\u04ff]/.test(char)) ruCount++
			else if (/[ñÑ¿¡]/.test(char)) {
				esCount += 3
				latinCount++
			} else if (/[ãõÃÕ]/.test(char)) {
				ptCount += 3
				latinCount++
			} else if (/[œæŒÆ]/.test(char)) {
				frCount += 3
				latinCount++
			} else if (/[çÇ]/.test(char)) {
				frCount += 1
				ptCount += 1
				latinCount++
			} else if (/[éèêëàâîïôûùÿÉÈÊËÀÂÎÏÔÛÙŸ]/.test(char)) {
				frCount += 1
				latinCount++
			} else if (/[áíóúÁÍÓÚ]/.test(char)) {
				esCount += 0.5
				ptCount += 0.5
				latinCount++
			} else if (/[a-zA-Z]/.test(char)) latinCount++
		}

		if (totalCount === 0) return { code: 'zh', name: '中文' }
		if (latinCount > 0 && esCount === 0 && frCount === 0 && ptCount === 0) enCount = latinCount

		const langScores = [
			{ code: 'zh', name: '中文', count: zhCount },
			{ code: 'en', name: '英语', count: enCount },
			{ code: 'ja', name: '日语', count: jaCount },
			{ code: 'ko', name: '韩语', count: koCount },
			{ code: 'ar', name: '阿拉伯语', count: arCount },
			{ code: 'ru', name: '俄语', count: ruCount },
			{ code: 'es', name: '西班牙语', count: esCount },
			{ code: 'fr', name: '法语', count: frCount },
			{ code: 'pt', name: '葡萄牙语', count: ptCount }
		]

		const detected = langScores.reduce((max, lang) => (lang.count > max.count ? lang : max), {
			code: 'zh',
			name: '中文',
			count: 0
		})

		return detected.count === 0
			? { code: 'zh', name: '中文' }
			: { code: detected.code, name: detected.name }
	}

	return {
		translateLanguages,
		showSourceDropdown,
		showTargetDropdown,
		activeDropdownIndex,
		getLanguageName,
		toggleSourceDropdown,
		toggleTargetDropdown,
		selectSourceLanguage,
		selectTargetLanguage,
		closeLanguageDropdowns,
		swapLanguages,
		detectLanguage
	}
}
