// 表格相关功能：在表格前插入字符、标题行重复、批量选中、自动调整列宽

export function btnInsertCursor() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}
	const selection = window.Application.Selection
	if (!selection?.Tables?.Count) {
		alert('请先选择一个表格')
		return
	}

	try {
		const table = selection.Tables.Item(1)
		const tableRange = table.Range
		let insertPosition = tableRange.Start

		if (insertPosition !== 0) {
			insertPosition = insertPosition - 1
			const insertRange = doc.Range(insertPosition, insertPosition)
			insertRange.Text = ' '
			insertRange.Select()
		} else {
			tableRange.InsertBefore('\n')
		}
		alert('已在表格前成功插入文本')
	} catch (error) {
		console.error(error)
		alert('插入字符失败，请稍后重试')
	}
}

export function btnTableHeaderRepeat() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}
	const selection = window.Application.Selection
	if (!selection?.Tables?.Count) {
		alert('请先选择一个表格')
		return
	}

	try {
		const table = selection.Tables.Item(1)
		if (table.Rows.Count > 0) {
			table.Rows.Item(1).HeadingFormat = true
		}
	} catch (e) {
		console.error('处理表格时出错:', e)
	}
}

export function btnSelectAllTable() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}

	try {
		const tableCount = doc.Tables.Count
		if (tableCount === 0) {
			alert('文档中没有找到表格')
			return
		}

		let processedCount = 0
		for (let i = 1; i <= tableCount; i++) {
			try {
				const table = doc.Tables.Item(i)
				if (i === 1) {
					table.Select()
				} else {
					const currentSelection = window.Application.Selection.Range
					const newStart = Math.min(currentSelection.Start, table.Range.Start)
					const newEnd = Math.max(currentSelection.End, table.Range.End)
					doc.Range(newStart, newEnd).Select()
				}
				processedCount++
			} catch (e) {
				continue
			}
		}
		alert(`已完成！成功选择了 ${processedCount} 个表格`)
	} catch (error) {
		console.error(error)
		alert('批量选中表格失败，请稍后重试')
	}
}

export function btnAutoAdjustTable() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}
	const selection = window.Application.Selection

	if (selection && selection.Tables && selection.Tables.Count > 0) {
		try {
			selection.Tables.Item(1).AutoFitBehavior(2)
			alert('表格已自动调整')
		} catch (e) {
			console.error(e)
			alert('自动调整表格失败，请稍后重试')
		}
	} else {
		alert('请先选择一个表格')
	}
}
