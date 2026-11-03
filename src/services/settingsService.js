/**
 * In-memory + WPS FileSystem settings for the add-in.
 * Primary file: `wps_copilot_settings.json`.
 * Legacy read-only migrate: pre-2.0 installs used a different settings filename (deprecated, remove after 2.0).
 */

const SETTINGS_FILE = 'wps_copilot_settings.json'
/** @deprecated Prefer SETTINGS_FILE. Kept only to migrate reads from older installs; removal planned after 2.0. */
const LEGACY_SETTINGS_FILE = 'tongtong_doc_common_setting.json'

/** @type {{ platform: 'unirouter' | 'custom', baseUrl: string, useFullUrl: boolean, apiKey: string, model: string, temperature: number, maxTokens: number }} */
const DEFAULT_LLM = {
	platform: 'unirouter',
	baseUrl: 'https://api.uni-router.net',
	useFullUrl: false,
	apiKey: '',
	model: '',
	temperature: 0.7,
	maxTokens: 4096
}

/**
 * Normalize persisted llm config: fill defaults and migrate legacy records
 * that stored a full chat completions endpoint without useFullUrl.
 * @param {Partial<typeof DEFAULT_LLM> | null | undefined} llm
 * @returns {typeof DEFAULT_LLM}
 */
function normalizeLlmConfig(llm) {
	const merged = { ...DEFAULT_LLM, ...(llm || {}) }
	const raw = llm || {}
	if (!('useFullUrl' in raw)) {
		// Legacy: baseUrl was the full chat completions endpoint
		merged.useFullUrl = true
	} else {
		merged.useFullUrl = !!merged.useFullUrl
	}
	if (!('platform' in raw)) {
		merged.platform = 'custom'
	}
	return merged
}

function readRaw(fileName) {
	try {
		if (window?.Application?.FileSystem) {
			const data = window.Application.FileSystem.readFileString(fileName)
			if (data) return data
		}
	} catch (e) {
		/* ignore */
	}
	try {
		return localStorage.getItem(fileName)
	} catch (e) {
		/* ignore */
	}
	return null
}

function writeRaw(fileName, json) {
	try {
		if (window?.Application?.FileSystem) {
			window.Application.FileSystem.writeFileString(fileName, json)
			localStorage.setItem(fileName, json)
			return true
		}
	} catch (e) {
		/* ignore */
	}
	try {
		localStorage.setItem(fileName, json)
		return true
	} catch (e) {
		console.error('保存设置失败:', e)
		return false
	}
}

export function readSettings() {
	for (const fileName of [SETTINGS_FILE, LEGACY_SETTINGS_FILE]) {
		try {
			const data = readRaw(fileName)
			if (data) {
				const parsed = JSON.parse(data)
				return {
					...getDefaults(),
					...parsed,
					llm: normalizeLlmConfig(parsed.llm)
				}
			}
		} catch (e) {
			/* ignore */
		}
	}
	return getDefaults()
}

function getDefaults() {
	return {
		autoStart: true,
		llm: { ...DEFAULT_LLM }
	}
}

export function writeSettings(partial) {
	const current = readSettings()
	const next = { ...current, ...partial }
	if (partial.llm) {
		next.llm = normalizeLlmConfig({ ...current.llm, ...partial.llm })
	}
	const json = JSON.stringify(next)
	writeRaw(SETTINGS_FILE, json)
	return next
}

export function getLlmConfig() {
	return normalizeLlmConfig(readSettings().llm)
}

export function isLlmConfigured() {
	const llm = getLlmConfig()
	return !!(llm.baseUrl && llm.model)
}

export { DEFAULT_LLM, SETTINGS_FILE, LEGACY_SETTINGS_FILE }
