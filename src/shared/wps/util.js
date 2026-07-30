//在后续的wps版本中，wps的所有枚举值都会通过wps.Enum对象来自动支持，现阶段先人工定义
var WPS_Enum = {
	msoCTPDockPositionLeft: 0,
	msoCTPDockPositionRight: 2
}

function GetUrlPath() {
	// file:// — strip the filename to get the add-in root
	if (window.location.protocol === 'file:') {
		const path = window.location.href
		return path.substring(0, path.lastIndexOf('/'))
	}

	// http(s) — use the directory of the current page (supports Vite base './' and nested deploy paths)
	const { protocol, hostname, port, pathname } = window.location
	const portPart = port ? `:${port}` : ''
	const dir = pathname.includes('/') ? pathname.substring(0, pathname.lastIndexOf('/')) : ''
	return `${protocol}//${hostname}${portPart}${dir}`
}

function GetRouterHash() {
	if (window.location.protocol === 'file:') {
		return ''
	}

	return '/#'
}

function GetTemplatePath() {
	// 使用WPS提供的临时目录路径
	if (window.Application && window.Application.TemporaryFolder) {
		return window.Application.TemporaryFolder
	}

	// 备用方案：使用公共文档目录下的临时文件夹
	return 'C:\\Users\\Public\\Documents\\WPS临时文件'
}

// 解析大模型返回的文本
const format_string_to_json = (content) => {
	const contentParts = content.split('</think>')
	let jsonString = contentParts[contentParts.length - 1]
		.replace(/(\r\n|\n|\r)/gm, '')
		.replace(/```json|```/g, '')
		.trim()

	// 只截取{}中的内容，包括{}
	const match = jsonString.match(/{.*}/s)
	jsonString = match ? match[0] : jsonString

	try {
		let result = JSON.parse(jsonString)
		return {
			think: contentParts[0],
			data: result
		}
	} catch (error) {
		console.error('JSON解析错误:', error)
		return null
	}
}
// Error message — never expose raw exception text to UI callers
const formatErrorMessage = (error) => {
	if (error != null) console.error(error)
	return '操作失败，请稍后重试'
}

const handleWordLimitInput = (requirementsData, event) => {
	// 只允许正整数，上限为10000
	const value = event.target.value
	// 移除非数字字符
	let numericValue = value.replace(/[^\d]/g, '')

	// 如果为空或者0，设置为空字符串（允许用户清空）
	if (numericValue === '' || numericValue === '0') {
		requirementsData.wordLimit = ''
		event.target.value = ''
		return
	}

	// 转换为数字并限制范围
	let numValue = parseInt(numericValue, 10)

	// 限制上限为10000
	if (numValue > 10000) {
		numValue = 10000
	}

	// 更新数据模型和输入框值
	requirementsData.wordLimit = numValue.toString()
	event.target.value = numValue.toString()
}

export default {
	WPS_Enum,
	GetUrlPath,
	GetRouterHash,
	GetTemplatePath,
	format_string_to_json,
	formatErrorMessage,
	handleWordLimitInput
}
