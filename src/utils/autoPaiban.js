//一键排版
async function autoPaibanFun() {
	return new Promise((resolve, reject) => {
		try {
			// 获取当前激活的 WPS 应用和文档
			// const app = window.Application.ActiveDocument();
			const app = wps.WpsApplication()
			const doc = app && app.ActiveDocument

			if (!doc) {
				alert('没有打开的文档，请先打开一份文档！')
				resolve()
				return
			}

			// 2. 设置正文段落格式
			let paras = doc.Paragraphs
			for (let i = 1; i <= paras.Count; i++) {
				let para = paras.Item(i)
				let styleName = ''
				if (para.Range.Style && para.Range.Style.NameLocal) {
					styleName = para.Range.Style.NameLocal
				} else {
					continue
				}

				// 一级标题
				if (styleName.includes('标题 1')) {
					if (document.fonts.check('12px "方正小标宋简体"')) {
						para.Range.Font.Name = '方正小标宋简体'
					} else {
						para.Range.Font.Name = '方正小标宋_GBK'
					}
					para.Range.Font.Size = 22 // 三号
					para.Range.Font.Bold = false
					para.Range.ParagraphFormat.Alignment = 1
				} else if (styleName.includes('标题 2')) {
					para.Range.Font.Name = '黑体'
					para.Range.Font.Size = 16 // 三号
					para.Range.Font.Bold = false
				}
				// 二级标题
				else if (styleName.includes('标题 3')) {
					if (document.fonts.check('12px "楷体_GB2312"')) {
						para.Range.Font.Name = '楷体_GB2312'
					} else {
						para.Range.Font.Name = '楷体'
					}
					para.Range.Font.Size = 16
					para.Range.Font.Bold = true
				}
				// 三级标题
				else if (styleName.includes('标题 4')) {
					if (document.fonts.check('12px "仿宋_GB2312"')) {
						para.Range.Font.Name = '仿宋_GB2312'
					} else {
						para.Range.Font.Name = '仿宋'
					}
					para.Range.Font.Size = 16
					para.Range.Font.Bold = true
				}
				// 正文（其他情况）
				else {
					para.Range.Text.replace(/\r|\n/g, '').trim()
					para.Range.Text.replace(/\r/g, ' ')
					if (document.fonts.check('12px "仿宋_GB2312"')) {
						para.Range.Font.Name = '仿宋_GB2312'
					} else {
						para.Range.Font.Name = '仿宋'
					}
					para.Range.Font.Size = 16 // 三号
					para.Range.Font.Bold = false
				}
				if (styleName.includes('标题 1')) {
					para.Range.ParagraphFormat.CharacterUnitFirstLineIndent = 0
					para.Range.ParagraphFormat.FirstLineIndent = 0
				} else {
					para.Alignment = 3
					para.Range.ParagraphFormat.CharacterUnitFirstLineIndent = 2
				}
				para.SpaceBeforeAuto = false
				para.SpaceAfterAuto = false
				para.SpaceBefore = 0
				para.SpaceAfter = 0
				para.LineUnitBefore = 0
				para.LineUnitAfter = 0

				para.Range.ParagraphFormat.CharacterUnitLeftIndent = 0
				para.Range.ParagraphFormat.LeftIndent = 0
				para.Range.ParagraphFormat.LineSpacingRule = 4 // wdLineSpaceAtLeast 行距至少为一个指定值。该值需要单独指定。
				para.Range.ParagraphFormat.LineSpacing = 28 // 28 磅
			}

			// 处理嵌入式图片行距为单倍行距
			const inlineShapes = doc.InlineShapes
			for (let i = 1; i <= inlineShapes.Count; i++) {
				const shape = inlineShapes.Item(i)
				shape.Range.ParagraphFormat.LineSpacingRule = 0

				// 处理图片段落的首行缩进
				const para = shape.Range.Paragraphs.Item(1)
				if (para && para.Range && para.Range.Text) {
					const text = para.Range.Text.replace(/[\r\n]/g, '').trim()
					if (text.length <= 1) {
						para.Range.ParagraphFormat.CharacterUnitFirstLineIndent = 0
						para.Range.ParagraphFormat.FirstLineIndent = 0
					}
				}
			}

			app.ActiveDocument.GoTo(1, 1, 1)

			resolve()
		} catch (error) {
			console.error('一键排版出错:', error)
			reject(error)
		}
	})
}

export default autoPaibanFun
