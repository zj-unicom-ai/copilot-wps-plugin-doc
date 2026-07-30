import promptsData from './prompts.json'
import { PROMPT_CODES } from './codes.js'

export { PROMPT_CODES }

export function getPromptTemplate(code) {
	return promptsData[code] || null
}

export function applyPlaceholders(
	content,
	{ placeholders = [], minWords, maxWords, extra = {} } = {}
) {
	let result = content
	placeholders.forEach((value, index) => {
		result = result.replace(new RegExp(`\\{${index}\\}`, 'g'), value ?? '')
	})
	if (minWords != null) {
		result = result.replace(/\$\{minWords\}/g, String(minWords))
	}
	if (maxWords != null) {
		result = result.replace(/\$\{maxWords\}/g, String(maxWords))
	}
	Object.entries(extra).forEach(([key, value]) => {
		const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		const text = value ?? ''
		// 必须先替换 ${key}，再替换 {key}，否则 ${key} 会被 {key} 规则吃掉留下残留 `$`
		result = result.replace(new RegExp(`\\$\\{${escaped}\\}`, 'g'), text)
		result = result.replace(new RegExp(`\\{${escaped}\\}`, 'g'), text)
	})
	return result
}

export function buildMessages(systemContent, userContent) {
	const messages = []
	if (systemContent?.trim()) {
		messages.push({ role: 'system', content: systemContent })
	}
	if (userContent?.trim()) {
		messages.push({ role: 'user', content: userContent })
	}
	return messages
}

export function resolvePrompt(
	code,
	{ query = '', placeholders = [], minWords, maxWords, extra = {} } = {}
) {
	const template = getPromptTemplate(code)
	if (!template) {
		throw new Error(`未找到提示词模板: ${code}`)
	}
	const system = applyPlaceholders(template.content, { placeholders, minWords, maxWords, extra })
	return buildMessages(system, query)
}

export function resolvePromptWithUserPrefix(
	code,
	{ query = '', placeholders = [], minWords, maxWords, userPrefix = '' } = {}
) {
	const messages = resolvePrompt(code, { query, placeholders, minWords, maxWords })
	if (userPrefix && messages.length > 0) {
		const last = messages[messages.length - 1]
		if (last.role === 'user') {
			last.content = userPrefix + last.content
		}
	}
	return messages
}

export default promptsData
