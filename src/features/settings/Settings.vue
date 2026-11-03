<template>
	<div class="settings-page">
		<div class="card">
			<div class="card-title">通用设置</div>
			<div class="setting-row" @click="toggleAutoStart">
				<div class="left">
					<input
						class="basic-checkbox"
						type="checkbox"
						:checked="autoStart"
						@click.stop
						@change="toggleAutoStart"
					/>
					<span class="label">打开 WPS 自动打开右侧 AI 对话窗口</span>
				</div>
			</div>
		</div>

		<div class="card">
			<div class="card-title">模型配置</div>
			<p class="hint">配置 OpenAI 兼容 API，所有 AI 功能将使用此配置。</p>

			<div class="form-field">
				<label><span class="required">*</span> 模型平台</label>
				<select v-model="llm.platform" @change="onPlatformChange">
					<option value="unirouter">UniRouter</option>
					<option value="custom">自定义</option>
				</select>
			</div>

			<div class="form-field">
				<label><span class="required">*</span> API 请求地址</label>
				<input
					v-model="llm.baseUrl"
					type="text"
					:placeholder="urlPlaceholder"
					@blur="onCredentialsChange"
				/>
			</div>

			<div class="form-field switch-field">
				<div class="switch-row">
					<span class="switch-label">完整 URL</span>
					<label class="switch">
						<input v-model="llm.useFullUrl" type="checkbox" @change="onCredentialsChange" />
						<span class="slider"></span>
					</label>
				</div>
				<p class="field-hint">
					{{ llm.useFullUrl ? '将直接使用上方地址发起请求' : '系统会自动拼接请求路径' }}
				</p>
			</div>

			<div class="form-field">
				<label>API Key</label>
				<input
					v-model="llm.apiKey"
					type="password"
					placeholder="sk-..."
					autocomplete="off"
					@blur="onCredentialsChange"
				/>
			</div>

			<div class="form-field">
				<label><span class="required">*</span> 模型名称</label>
				<div class="model-combo" ref="comboRef">
					<div class="model-combo-input-wrap">
						<input
							v-model="llm.model"
							type="text"
							placeholder="选择或输入模型名称"
							autocomplete="off"
							@focus="openModelDropdown"
							@input="onModelInput"
							@keydown.down.prevent="moveHighlight(1)"
							@keydown.up.prevent="moveHighlight(-1)"
							@keydown.enter.prevent="selectHighlighted"
							@keydown.esc="closeModelDropdown"
						/>
						<button
							type="button"
							class="model-combo-arrow"
							tabindex="-1"
							aria-label="展开模型列表"
							@mousedown.prevent="toggleModelDropdown"
						>
							<svg viewBox="0 0 12 8" width="12" height="8" aria-hidden="true">
								<path d="M1 1.5L6 6.5L11 1.5" fill="none" stroke="currentColor" stroke-width="1.5" />
							</svg>
						</button>
					</div>
					<ul v-show="modelDropdownOpen" class="model-dropdown" role="listbox">
						<li v-if="modelsLoading" class="model-dropdown-empty">正在加载…</li>
						<li v-else-if="filteredModels.length === 0" class="model-dropdown-empty">暂无数据</li>
						<li
							v-for="(id, index) in filteredModels"
							:key="id"
							class="model-dropdown-item"
							:class="{ active: index === highlightIndex }"
							role="option"
							@mousedown.prevent="selectModel(id)"
						>
							{{ id }}
						</li>
					</ul>
				</div>
				<p v-if="modelsError" class="field-hint error">{{ modelsError }}</p>
			</div>

			<button class="save-btn" @click="saveLlmSettings">保存模型配置</button>
			<p v-if="saveMessage" class="save-msg">{{ saveMessage }}</p>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { readSettings, writeSettings, DEFAULT_LLM } from '@/services/settingsService.js'
import { fetchAvailableModels } from '@/services/llmService.js'
import { isLikelyNonChatModel } from '@/utils/llmModel.js'

const UNIROUTER_BASE_URL = 'https://api.uni-router.net'

const autoStart = ref(true)
const llm = ref({ ...DEFAULT_LLM })
const saveMessage = ref('')
const modelOptions = ref([])
const modelsLoading = ref(false)
const modelsError = ref('')
const modelDropdownOpen = ref(false)
const highlightIndex = ref(-1)
const comboRef = ref(null)
const filterText = ref('')

let fetchTimer = null
let fetchSeq = 0
let lastFetchKey = ''
let abortController = null

const urlPlaceholder = computed(() =>
	llm.value.useFullUrl
		? 'https://your-api-instance.com/v1/chat/completions'
		: 'https://your-api-instance.com'
)

const filteredModels = computed(() => {
	const q = filterText.value.trim().toLowerCase()
	if (!q) return modelOptions.value
	return modelOptions.value.filter((id) => id.toLowerCase().includes(q))
})

const credentialsKey = () => {
	const { baseUrl, apiKey, useFullUrl } = llm.value
	return `${(baseUrl || '').trim()}|${(apiKey || '').trim()}|${!!useFullUrl}`
}

const canFetchModels = () => !!llm.value.baseUrl?.trim()

const initSettings = () => {
	const s = readSettings()
	autoStart.value = s.autoStart !== false
	llm.value = { ...DEFAULT_LLM, ...s.llm }
	if (canFetchModels()) {
		scheduleFetchModels()
	}
}

const onPlatformChange = () => {
	if (llm.value.platform === 'unirouter') {
		llm.value.baseUrl = UNIROUTER_BASE_URL
		llm.value.useFullUrl = false
		llm.value.apiKey = ''
		llm.value.model = ''
	} else {
		llm.value.baseUrl = ''
		llm.value.useFullUrl = false
		llm.value.apiKey = ''
		llm.value.model = ''
	}
	modelOptions.value = []
	modelsError.value = ''
	lastFetchKey = ''
	closeModelDropdown()
}

const onCredentialsChange = () => {
	lastFetchKey = ''
	scheduleFetchModels()
}

const scheduleFetchModels = () => {
	if (fetchTimer) clearTimeout(fetchTimer)
	fetchTimer = setTimeout(() => {
		loadModels({ force: false })
	}, 200)
}

const loadModels = async ({ force = false } = {}) => {
	if (!canFetchModels()) {
		modelOptions.value = []
		modelsError.value = ''
		modelsLoading.value = false
		lastFetchKey = ''
		return
	}

	const key = credentialsKey()
	if (!force && key === lastFetchKey) {
		return
	}

	if (abortController) {
		abortController.abort()
	}
	abortController = new AbortController()
	const seq = ++fetchSeq
	modelsLoading.value = true
	modelsError.value = ''

	try {
		const ids = await fetchAvailableModels({
			baseUrl: llm.value.baseUrl,
			apiKey: llm.value.apiKey,
			useFullUrl: llm.value.useFullUrl,
			signal: abortController.signal
		})
		if (seq !== fetchSeq) return
		modelOptions.value = ids.filter((id) => !isLikelyNonChatModel(id))
		lastFetchKey = key
		modelsError.value = ''
	} catch (err) {
		if (err?.name === 'AbortError') return
		if (seq !== fetchSeq) return
		modelOptions.value = []
		lastFetchKey = ''
		modelsError.value = '获取模型列表失败，可手动输入'
	} finally {
		if (seq === fetchSeq) {
			modelsLoading.value = false
		}
	}
}

const openModelDropdown = () => {
	modelDropdownOpen.value = true
	filterText.value = ''
	highlightIndex.value = -1
	if (canFetchModels() && (lastFetchKey !== credentialsKey() || modelOptions.value.length === 0)) {
		loadModels({ force: lastFetchKey !== credentialsKey() })
	}
}

const closeModelDropdown = () => {
	modelDropdownOpen.value = false
	highlightIndex.value = -1
	filterText.value = ''
}

const toggleModelDropdown = () => {
	if (modelDropdownOpen.value) {
		closeModelDropdown()
	} else {
		openModelDropdown()
	}
}

const onModelInput = () => {
	filterText.value = llm.value.model || ''
	if (!modelDropdownOpen.value) {
		modelDropdownOpen.value = true
	}
	highlightIndex.value = filteredModels.value.length ? 0 : -1
}

const selectModel = (id) => {
	llm.value.model = id
	closeModelDropdown()
}

const moveHighlight = (delta) => {
	if (!modelDropdownOpen.value) {
		openModelDropdown()
		return
	}
	const len = filteredModels.value.length
	if (!len) return
	highlightIndex.value = (highlightIndex.value + delta + len) % len
}

const selectHighlighted = () => {
	if (highlightIndex.value >= 0 && filteredModels.value[highlightIndex.value]) {
		selectModel(filteredModels.value[highlightIndex.value])
	} else {
		closeModelDropdown()
	}
}

const onDocumentPointerDown = (e) => {
	if (!comboRef.value?.contains(e.target)) {
		closeModelDropdown()
	}
}

const toggleAutoStart = (e) => {
	const fromCheckbox = e?.target?.type === 'checkbox'
	const checked = fromCheckbox ? e.target.checked : !autoStart.value
	autoStart.value = checked
	writeSettings({ autoStart: checked })
}

const saveLlmSettings = () => {
	const next = {
		...llm.value,
		baseUrl: (llm.value.baseUrl || '').trim(),
		apiKey: (llm.value.apiKey || '').trim(),
		model: (llm.value.model || '').trim(),
		useFullUrl: !!llm.value.useFullUrl
	}
	llm.value = { ...llm.value, ...next }
	writeSettings({ llm: next })
	saveMessage.value = '已保存'
	setTimeout(() => {
		saveMessage.value = ''
	}, 2000)
	scheduleFetchModels()
}

onMounted(() => {
	initSettings()
	document.addEventListener('mousedown', onDocumentPointerDown)
})

onUnmounted(() => {
	if (fetchTimer) clearTimeout(fetchTimer)
	if (abortController) abortController.abort()
	document.removeEventListener('mousedown', onDocumentPointerDown)
})
</script>

<style scoped>
.settings-page {
	padding: 16px;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: 16px;
	background: linear-gradient(180deg, rgba(240, 244, 245, 0.95) 0%, rgba(245, 245, 245, 0.9) 100%);
}

.card {
	background: #fff;
	border-radius: 4px;
	box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
	padding: 16px;
}

.card-title {
	font-size: 16px;
	font-weight: 600;
	margin-bottom: 12px;
	color: #000;
}

.hint {
	font-size: 13px;
	color: #666;
	margin-bottom: 12px;
}

.setting-row {
	display: flex;
	align-items: center;
	padding: 10px 0;
	cursor: pointer;
}

.left {
	display: flex;
	align-items: center;
	gap: 8px;
}

.basic-checkbox {
	width: 16px;
	height: 16px;
}

.label {
	font-size: 14px;
	color: #171a1d;
}

.form-field {
	margin-bottom: 12px;
}

.form-field label {
	display: block;
	font-size: 13px;
	color: #333;
	margin-bottom: 4px;
}

.required {
	color: #e60027;
	margin-right: 2px;
}

.form-field input[type='text'],
.form-field input[type='password'],
.form-field select {
	width: 100%;
	padding: 8px 10px;
	border: 1px solid #d9d9d9;
	border-radius: 4px;
	font-size: 14px;
	box-sizing: border-box;
	background: #fff;
}

.form-field select {
	cursor: pointer;
}

.model-combo {
	position: relative;
}

.model-combo-input-wrap {
	position: relative;
	display: flex;
	align-items: center;
}

.model-combo-input-wrap input {
	padding-right: 32px;
}

.model-combo-arrow {
	position: absolute;
	right: 4px;
	top: 50%;
	transform: translateY(-50%);
	width: 28px;
	height: 28px;
	border: none;
	background: transparent;
	color: #666;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
}

.model-dropdown {
	position: absolute;
	left: 0;
	right: 0;
	top: calc(100% + 4px);
	z-index: 20;
	margin: 0;
	padding: 4px 0;
	list-style: none;
	max-height: 220px;
	overflow-y: auto;
	background: #fff;
	border: 1px solid #d9d9d9;
	border-radius: 4px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.model-dropdown-item {
	padding: 8px 12px;
	font-size: 13px;
	color: #333;
	cursor: pointer;
	word-break: break-all;
}

.model-dropdown-item:hover,
.model-dropdown-item.active {
	background: #f5f5f5;
}

.model-dropdown-empty {
	padding: 12px;
	font-size: 13px;
	color: #999;
	text-align: center;
}

.switch-field {
	margin-bottom: 12px;
}

.switch-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.switch-label {
	font-size: 13px;
	color: #333;
}

.switch {
	position: relative;
	display: inline-block;
	width: 40px;
	height: 22px;
	margin: 0;
}

.switch input {
	opacity: 0;
	width: 0;
	height: 0;
}

.slider {
	position: absolute;
	cursor: pointer;
	inset: 0;
	background: #ccc;
	border-radius: 22px;
	transition: 0.2s;
}

.slider::before {
	position: absolute;
	content: '';
	height: 18px;
	width: 18px;
	left: 2px;
	bottom: 2px;
	background: #fff;
	border-radius: 50%;
	transition: 0.2s;
}

.switch input:checked + .slider {
	background: #e60027;
}

.switch input:checked + .slider::before {
	transform: translateX(18px);
}

.field-hint {
	margin: 6px 0 0;
	font-size: 12px;
	color: #888;
}

.field-hint.error {
	color: #e60027;
}

.save-btn {
	margin-top: 8px;
	padding: 8px 20px;
	background: #e60027;
	color: #fff;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 14px;
}

.save-btn:hover {
	opacity: 0.9;
}

.save-msg {
	margin-top: 8px;
	font-size: 13px;
	color: #52c41a;
}
</style>
