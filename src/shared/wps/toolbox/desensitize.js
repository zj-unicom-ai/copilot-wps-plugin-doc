const _desensitizeRules = (() => {
	// 检测当前 JS 引擎是否支持 lookbehind 断言（ES2018）
	let supportsLookbehind = false
	try {
		new RegExp('(?<!x)')
		supportsLookbehind = true
	} catch (e) {
		supportsLookbehind = false
	}

	if (supportsLookbehind) {
		return [
			// 身份证号（18位）：前6位 + ******** + 后4位
			{
				regex: /[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g,
				replace: (m) => m.slice(0, 6) + '********' + m.slice(-4)
			},
			// 护照号（G/E/P + 8位数字）：首字母 + ****** + 后2位
			{
				regex: /(?<![A-Za-z0-9])[GEPgep]\d{8}(?![0-9])/g,
				replace: (m) => m[0] + '******' + m.slice(-2)
			},
			// 统一社会信用代码（18位字母数字）：前4位 + ********** + 后4位
			{
				regex: /(?<![A-Z0-9])[0-9A-Z]{2}\d{6}[0-9A-Z]{10}(?![A-Z0-9])/g,
				replace: (m) => m.slice(0, 4) + '**********' + m.slice(-4)
			},
			// 手机号（11位，1[3-9]开头）：前3位 + **** + 后4位
			{
				regex: /(?<!\d)1[3-9]\d{9}(?!\d)/g,
				replace: (m) => m.slice(0, 3) + '****' + m.slice(-4)
			},
			// 固定电话（区号-号码）：区号 + -****
			{
				regex: /0\d{2,3}[-\s]\d{7,8}/g,
				replace: (m) => {
					const sepIdx = m.search(/[-\s]/)
					return m.slice(0, sepIdx + 1) + '****'
				}
			},
			// 银行卡号（16-19位纯数字）：前4位 + **** **** **** + 后4位
			{
				regex: /(?<!\d)\d{16,19}(?!\d)/g,
				replace: (m) => m.slice(0, 4) + ' **** **** ' + m.slice(-4)
			},
			// 邮箱地址：首字母 + **** + 末字母@域名
			{
				regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
				replace: (m) => {
					const atIdx = m.indexOf('@')
					const local = m.slice(0, atIdx)
					const domain = m.slice(atIdx)
					if (local.length <= 2) return local[0] + '***' + domain
					return local[0] + '****' + local.slice(-1) + domain
				}
			},
			// 带货币符号的金额（¥/￥ + 数字，含千分位/小数）→ ¥***
			{
				regex: /[¥￥][\d,，]+(?:\.\d+)?/g,
				replace: (m) => m[0] + '***'
			},
			// 人民币 + 数字或中文大写金额 → 人民币***元
			{
				regex: /人民币\s*(?:[零壹贰叁肆伍陆柒捌玖拾百佰千仟万亿\d,，.]+)\s*(?:元|圆)(?:整|正)?/g,
				replace: () => '人民币***元'
			},
			// 数字万/亿（含万元/亿元）→ ***万 / ***亿 / ***万元 / ***亿元
			{
				regex: /(?<!\d)\d+(?:\.\d+)?\s*[万亿]\s*(?:元(?:整|正)?)?/g,
				replace: (m) => {
					const hasYi = m.includes('亿')
					const hasYuan = m.includes('元')
					if (hasYi) return hasYuan ? '***亿元' : '***亿'
					return hasYuan ? '***万元' : '***万'
				}
			},
			// 千分位分隔的数字金额（如 1,234,567.89元）→ ***元
			{
				regex: /\d{1,3}(?:[,，]\d{3})+(?:\.\d+)?\s*元(?:整|正)?/g,
				replace: () => '***元'
			},
			// 纯数字金额（如 3000元、500.00元）→ ***元
			{
				regex: /(?<!\d)\d+(?:\.\d+)?\s*(?:元|圆)(?:整|正)?/g,
				replace: () => '***元'
			},
			// 中文大写金额（如 壹佰万元整）→ ***元
			{
				regex: /[零壹贰叁肆伍陆柒捌玖拾百佰千仟万亿]{2,}(?:元|圆)(?:整|正)?/g,
				replace: () => '***元'
			}
		]
	} else {
		// 降级规则：去除 lookbehind，改用捕获组 + 边界字符替代
		return [
			// 身份证号
			{
				regex: /[1-9]\d{5}(?:18|19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]/g,
				replace: (m) => m.slice(0, 6) + '********' + m.slice(-4)
			},
			// 护照号（不含lookbehind，用非字母数字边界捕获组）
			{
				regex: /(^|[^A-Za-z0-9])([GEPgep]\d{8})(?![0-9])/g,
				replace: (m, pre, num) => pre + num[0] + '******' + num.slice(-2)
			},
			// 手机号
			{
				regex: /(^|[^\d])(1[3-9]\d{9})(?!\d)/g,
				replace: (m, pre, num) => pre + num.slice(0, 3) + '****' + num.slice(-4)
			},
			// 固定电话
			{
				regex: /0\d{2,3}[-\s]\d{7,8}/g,
				replace: (m) => {
					const sepIdx = m.search(/[-\s]/)
					return m.slice(0, sepIdx + 1) + '****'
				}
			},
			// 银行卡号（16-19位）
			{
				regex: /(^|[^\d])(\d{16,19})(?!\d)/g,
				replace: (m, pre, num) => pre + num.slice(0, 4) + ' **** **** ' + num.slice(-4)
			},
			// 邮箱
			{
				regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
				replace: (m) => {
					const atIdx = m.indexOf('@')
					const local = m.slice(0, atIdx)
					const domain = m.slice(atIdx)
					if (local.length <= 2) return local[0] + '***' + domain
					return local[0] + '****' + local.slice(-1) + domain
				}
			},
			// 带货币符号金额
			{
				regex: /[¥￥][\d,，]+(?:\.\d+)?/g,
				replace: (m) => m[0] + '***'
			},
			// 人民币大写
			{
				regex: /人民币\s*(?:[零壹贰叁肆伍陆柒捌玖拾百佰千仟万亿\d,，.]+)\s*(?:元|圆)(?:整|正)?/g,
				replace: () => '人民币***元'
			},
			// 千分位金额
			{
				regex: /\d{1,3}(?:[,，]\d{3})+(?:\.\d+)?\s*元(?:整|正)?/g,
				replace: () => '***元'
			},
			// 数字金额（万/亿）
			{
				regex: /(^|[^\d])(\d+(?:\.\d+)?)\s*[万亿]\s*(?:元(?:整|正)?)?/g,
				replace: (m, pre) => {
					const hasYi = m.includes('亿')
					const hasYuan = m.includes('元')
					if (hasYi) return pre + (hasYuan ? '***亿元' : '***亿')
					return pre + (hasYuan ? '***万元' : '***万')
				}
			},
			// 纯数字金额
			{
				regex: /(^|[^\d])(\d+(?:\.\d+)?)\s*(?:元|圆)(?:整|正)?/g,
				replace: (m, pre) => pre + '***元'
			},
			// 中文大写金额
			{
				regex: /[零壹贰叁肆伍陆柒捌玖拾百佰千仟万亿]{2,}(?:元|圆)(?:整|正)?/g,
				replace: () => '***元'
			}
		]
	}
})()

/** Apply desensitization rules to a plain text string (exported for tests / reuse). */
export function applyDesensitizeText(text) {
	if (!text) return text
	let result = text
	for (const rule of _desensitizeRules) {
		rule.regex.lastIndex = 0
		result = result.replace(rule.regex, rule.replace)
	}
	return result
}

export function btnDesensitize() {
	const app = window.Application
	const doc = app && app.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}

	try {
		const selection = app.Selection
		const hasSelection = !!(
			selection &&
			selection.Range &&
			selection.Range.Text &&
			selection.Range.Text.trim().length > 0
		)

		let totalCount = 0

		if (hasSelection) {
			const range = selection.Range
			const original = range.Text
			const desensitized = applyDesensitizeText(original)
			if (original !== desensitized) {
				range.Text = desensitized
				totalCount++
			}
		} else {
			const tableRanges = []
			const tableCount = doc.Tables.Count
			for (let t = 1; t <= tableCount; t++) {
				try {
					const tbl = doc.Tables.Item(t)
					tableRanges.push({ start: tbl.Range.Start, end: tbl.Range.End })
				} catch (e) {
					continue
				}
			}

			const isInTableRange = (paraStart) => {
				for (let i = 0; i < tableRanges.length; i++) {
					if (paraStart >= tableRanges[i].start && paraStart <= tableRanges[i].end) return true
				}
				return false
			}

			const paraCount = doc.Paragraphs.Count
			for (let i = 1; i <= paraCount; i++) {
				try {
					const para = doc.Paragraphs.Item(i)
					if (isInTableRange(para.Range.Start)) continue
					const paraStart = para.Range.Start
					const paraEnd = para.Range.End - 1
					if (paraEnd <= paraStart) continue
					const contentRange = doc.Range(paraStart, paraEnd)
					const original = contentRange.Text
					const desensitized = applyDesensitizeText(original)
					if (original !== desensitized) {
						contentRange.Text = desensitized
						totalCount++
					}
				} catch (e) {
					continue
				}
			}

			for (let t = 1; t <= tableCount; t++) {
				try {
					const table = doc.Tables.Item(t)
					const rowCount = table.Rows.Count
					const colCount = table.Columns.Count
					for (let r = 1; r <= rowCount; r++) {
						for (let c = 1; c <= colCount; c++) {
							try {
								const cell = table.Cell(r, c)
								const cellStart = cell.Range.Start
								const cellEnd = cell.Range.End - 1
								if (cellEnd <= cellStart) continue
								const contentRange = doc.Range(cellStart, cellEnd)
								const original = contentRange.Text
								const desensitized = applyDesensitizeText(original)
								if (original !== desensitized) {
									contentRange.Text = desensitized
									totalCount++
								}
							} catch (e) {
								continue
							}
						}
					}
				} catch (e) {
					continue
				}
			}
		}

		if (totalCount > 0) {
			alert('脱敏处理完成')
		} else {
			alert('未发现需要脱敏的敏感信息（手机号、身份证号、银行卡号、邮箱等）')
		}
	} catch (e) {
		console.error(e)
		alert('脱敏处理失败，请稍后重试')
	}
}
