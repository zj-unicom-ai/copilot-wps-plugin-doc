// 清除格式、超链接、下划线、页眉线相关功能

export function btnClearFormat() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}
	const selection = window.Application.Selection
	if (selection && selection.Range) {
		try {
			selection.ClearFormatting()
			alert('选中内容格式已清除')
		} catch (e) {
			console.error(e)
			alert('清除格式失败，请稍后重试')
		}
	} else {
		alert('请先选择要清除格式的内容')
	}
}

export function btnRemoveHyperlinks() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}
	try {
		const hyperlinks = doc.Hyperlinks
		const count = hyperlinks.Count
		for (let i = count; i >= 1; i--) {
			hyperlinks.Item(i).Delete()
		}
		alert('超链接已去除')
	} catch (e) {
		console.error(e)
		alert('去除超链接失败，请稍后重试')
	}
}

export function btnRemoveUnderline() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}
	try {
		const selection = window.Application.Selection
		const hasSelection = !!(selection && selection.Range && selection.Range.Text.trim().length > 0)
		let processAll = true

		if (hasSelection) {
			processAll = confirm('是否消除全文的下划线？点击"确定"处理全文，点击"取消"仅处理选中内容')
		}

		if (processAll) {
			doc.Content.Font.Underline = 0
			if (doc.Tables && doc.Tables.Count > 0) {
				for (let i = 1; i <= doc.Tables.Count; i++) {
					doc.Tables.Item(i).Range.Font.Underline = 0
				}
			}
			alert('全文下划线已消除')
		} else {
			selection.Range.Font.Underline = 0
			alert('选中内容的下划线已消除')
		}
	} catch (e) {
		console.error(e)
		alert('消除下划线失败，请稍后重试')
	}
}

export function btnRemoveHeaderLine() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}
	try {
		const sections = doc.Sections
		for (let i = 1; i <= sections.Count; i++) {
			const header = sections.Item(i).Headers.Item(1)
			if (header.Range.Borders) {
				header.Range.Borders.Item(3).LineStyle = 0
			}
		}
		alert('页眉横线已去除')
	} catch (e) {
		console.error(e)
		alert('去除页眉横线失败，请稍后重试')
	}
}
