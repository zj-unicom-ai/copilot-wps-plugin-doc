// 文档背景颜色/背景图片/表格插入图片相关功能

function hexColorColorConvert(hexColor) {
	function toO(num, bs = 16) {
		return num >= bs ? num.toString(bs) : '0' + num.toString(bs)
	}
	const hex = hexColor.replace('#', '')
	const r = parseInt(hex.substring(0, 2), 16)
	const g = parseInt(hex.substring(2, 4), 16)
	const b = parseInt(hex.substring(4, 6), 16)
	return Number('0x' + toO(b) + toO(g) + toO(r))
}

function wpsColorConvert(wpsColor) {
	if (typeof wpsColor !== 'number' || wpsColor < 0 || wpsColor > 0xffffff) return '#000000'
	const b = (wpsColor >> 16) & 0xff
	const g = (wpsColor >> 8) & 0xff
	const r = wpsColor & 0xff
	const toHex = (n) => {
		const h = n.toString(16).toUpperCase()
		return h.length === 1 ? '0' + h : h
	}
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function btnSetBackgroundColor() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}

	try {
		const colorInput = document.createElement('input')
		colorInput.type = 'color'
		document.body.appendChild(colorInput)

		let defaultColor = '#ffffff'
		if (doc.Background.Fill.Visible) {
			try {
				defaultColor = wpsColorConvert(doc.Background.Fill.ForeColor.RGB)
			} catch (e) {
				/* 获取背景色失败时使用默认值 */
			}
		}
		colorInput.value = defaultColor

		colorInput.addEventListener('change', (e) => {
			const selectedColor = e.target.value
			const rgbDecimal = hexColorColorConvert(selectedColor)
			doc.Background.Delete()
			const fill = doc.Background.Fill
			fill.Solid()
			fill.Visible = true
			fill.ForeColor.RGB = rgbDecimal
			alert(`已设置文档背景色为 ${selectedColor}`)
			document.body.removeChild(colorInput)
		})

		colorInput.dispatchEvent(new MouseEvent('click'))
	} catch (e) {
		console.error(e)
		alert('设置背景色失败，请稍后重试')
	}
}

export function btnInsertBackgroundImage() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}

	try {
		const fileInput = document.createElement('input')
		fileInput.type = 'file'
		fileInput.accept = 'image/*'
		fileInput.style.display = 'none'
		document.body.appendChild(fileInput)

		fileInput.addEventListener('change', function (event) {
			if (event.target.files && event.target.files.length > 0) {
				const file = event.target.files[0]
				const path = Application.Env.GetTempPath() + '/' + file.name
				const reader = new FileReader()
				try {
					reader.onload = function () {
						Application.FileSystem.writeAsBinaryString(path, reader.result)
						if (!Application.FileSystem.Exists(path)) {
							alert('获取文件失败')
							return
						}
						doc.Background.Fill.ForeColor.RGB = 0xe6f2ff
						doc.Background.Fill.UserPicture(path)
						doc.Background.Fill.Visible = true
					}
					reader.readAsBinaryString(file)
				} catch (err) {
					console.error(err)
					alert('设置背景图片失败，请稍后重试')
				}
			}
			document.body.removeChild(fileInput)
		})

		fileInput.dispatchEvent(new MouseEvent('click'))
	} catch (e) {
		console.error(e)
		alert('插入背景图片失败，请稍后重试')
	}
}

function insertImageIntoCell(cell, imagePath, originalName) {
	try {
		const currentSelection = window.Application.Selection
		const shape = currentSelection.Range.InlineShapes.AddPicture(imagePath)
		const cellWidth = cell.Width - 10
		const cellHeight = cell.Height - 10
		const originalWidth = shape.Width
		const originalHeight = shape.Height
		const scale = Math.min(cellWidth / originalWidth, cellHeight / originalHeight, 1)
		shape.Width = originalWidth * scale
		shape.Height = originalHeight * scale
		cell.Range.ParagraphFormat.Alignment = 1
		alert(`图片 "${originalName}" 已成功插入到表格单元格中`)
	} catch (error) {
		console.error(error)
		alert('插入图片到单元格失败，请稍后重试')
	}
}

export function btnInsertImage() {
	const doc = window.Application.ActiveDocument
	if (!doc) {
		alert('请先打开文档')
		return
	}
	const selection = window.Application.Selection
	if (!selection?.Tables?.Count || !selection?.Cells) {
		alert('请先将光标放在表格单元格中')
		return
	}

	try {
		const cell = selection.Cells.Item(1)
		const fileInput = document.createElement('input')
		fileInput.type = 'file'
		fileInput.accept = 'image/*'
		fileInput.style.display = 'none'
		document.body.appendChild(fileInput)

		fileInput.addEventListener('change', function (event) {
			if (event.target.files && event.target.files.length > 0) {
				const file = event.target.files[0]
				if (!file.type.startsWith('image/')) {
					alert('请选择有效的图片文件')
					document.body.removeChild(fileInput)
					return
				}
				if (file.size > 10 * 1024 * 1024) {
					alert('图片文件过大，请选择小于10MB的图片')
					document.body.removeChild(fileInput)
					return
				}

				try {
					const filename = `temp_image_${Date.now()}_${file.name}`
					const tempPath = window.Application.Env.GetTempPath() + '\\' + filename
					const reader = new FileReader()
					reader.onload = function () {
						try {
							window.Application.FileSystem.writeAsBinaryString(tempPath, reader.result)
							if (!window.Application.FileSystem.Exists(tempPath)) {
								alert('保存临时文件失败')
								return
							}
							insertImageIntoCell(cell, tempPath, file.name)
							setTimeout(() => {
								try {
									if (window.Application.FileSystem.Exists(tempPath))
										window.Application.FileSystem.Remove(tempPath)
								} catch (e) {
									/* 临时文件删除失败时忽略 */
								}
							}, 1000)
						} catch (error) {
							console.error(error)
							alert('插入图片失败，请稍后重试')
						}
					}
					reader.onerror = () => alert('读取图片文件失败')
					reader.readAsBinaryString(file)
				} catch (error) {
					console.error(error)
					alert('处理图片文件失败，请稍后重试')
				}
			}
			document.body.removeChild(fileInput)
		})

		fileInput.click()
	} catch (error) {
		console.error(error)
		alert('插入图片失败，请稍后重试')
	}
}
