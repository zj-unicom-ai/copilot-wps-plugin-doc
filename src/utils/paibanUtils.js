// 全局变量用于存储图片信息
let globalImageMap = {
	inline: [],
	floating: []
}
function extractImagesAndTags(doc, targetDoc = null, srcSelection = null) {
	// 重置全局映射
	globalImageMap = { inline: [], floating: [] }

	// 1. 记录源文档中的浮动图形以建立 ID 映射
	// 使用 Title 作为临时 ID 载体，确保即使在复制/粘贴或处理过程中索引发生变化，
	const sourceShapeMap = {}
	const originalTitles = {}

	for (let i = 1; i <= doc.Shapes.Count; i++) {
		const shape = doc.Shapes.Item(i)
		const id = `WPS_IMG_${i}_${new Date().getTime()}` // 唯一 ID

		// 备份原始标题
		originalTitles[i] = shape.Title

		// 设置临时 ID
		shape.Title = id

		sourceShapeMap[id] = {
			sourceIndex: i
		}
	}

	// 2. 使用临时文档处理文本和嵌入式图形
	const tempDoc = window.Application.Documents.Add(undefined, undefined, undefined, false)
	doc.Content.Copy()
	tempDoc.Content.Paste()

	if (srcSelection) {
		let targetRange = null
		const rangeStart = srcSelection.Range.Start
		const rangeEnd = srcSelection.Range.End

		// 如果有选区内容，优先处理选区
		if (srcSelection.Range.Text.trim()) {
			targetRange = tempDoc.Range(rangeStart, rangeEnd)
		} else {
			targetRange = tempDoc.Content
		}

		// 添加书签以追踪范围变化
		const bookmarkName = 'ProcessingRange'
		tempDoc.Bookmarks.Add(bookmarkName, targetRange)
	}

	// 处理表格
	const tableCount = tempDoc.Tables.Count
	for (let i = tableCount; i >= 1; i--) {
		const table = tempDoc.Tables.Item(i)
		const range = table.Range
		// 替换为标签
		range.Text = `[TBL_${i}]`
	}

	// 倒序遍历以将嵌入式图形替换为标签
	const inlineCount = tempDoc.InlineShapes.Count
	for (let i = inlineCount; i >= 1; i--) {
		const shape = tempDoc.InlineShapes.Item(i)
		// 存储索引映射（假设 WPS JS 集合中的从 1 开始的索引匹配）
		globalImageMap.inline[i] = true

		// 替换为标签
		const range = shape.Range
		range.Text = `[IMG_Inline_${i}]`
	}

	// 从临时文档中移除浮动图形以避免文本混乱（可选，但对纯文本有好处）
	// 用锚点标签替换它们并记录归一化属性
	const shapeCount = tempDoc.Shapes.Count
	for (let i = shapeCount; i >= 1; i--) {
		const shape = tempDoc.Shapes.Item(i)
		const id = shape.Title // 获取从源文档传递过来的 ID

		// 归一化位置逻辑：
		// 强制“段落”相对垂直位置以确保还原时行为一致。
		// 这计算了从段落顶部的视觉偏移，无论原始设置如何（行/页等）。
		try {
			shape.RelativeVerticalPosition = 2 // wdRelativeVerticalPositionParagraph
		} catch (e) {
			console.warn('Could not normalize shape position', e)
		}

		if (sourceShapeMap[id]) {
			// 归一化后记录属性
			globalImageMap.floating.unshift({
				// 使用 unshift 保持顺序，尽管 ID 匹配使得顺序不那么关键
				id: id,
				sourceIndex: sourceShapeMap[id].sourceIndex,
				left: shape.Left,
				top: shape.Top,
				width: shape.Width,
				height: shape.Height,
				relativeHorizontalPosition: shape.RelativeHorizontalPosition,
				relativeVerticalPosition: shape.RelativeVerticalPosition, //  2
				lockAspectRatio: shape.LockAspectRatio,
				wrapFormatType: shape.WrapFormat.Type
			})

			const anchorRange = shape.Anchor
			// 使用 ID 在锚点位置插入标签
			anchorRange.InsertBefore(`[IMG_Floating_${id}]`)
		} else {
			console.warn(`Shape in tempDoc has no matching ID in sourceDoc: ${id}`)
		}

		shape.Delete()
	}

	// 立即恢复源文档中的原始标题
	for (let i = 1; i <= doc.Shapes.Count; i++) {
		if (originalTitles[i] !== undefined) {
			doc.Shapes.Item(i).Title = originalTitles[i]
		}
	}

	const text = tempDoc.Content.Text
	if (!targetDoc) {
		tempDoc.Close(0) // wdDoNotSaveChanges
	} else {
		return tempDoc
	}

	doc.Activate()
	return text
}

function restoreImages(newDoc, sourceDoc) {
	const selection = window.Application.Selection

	// 1. 还原嵌入式图形
	newDoc.Activate()
	selection.HomeKey(6) // wdStory
	const find = selection.Find
	find.ClearFormatting()
	find.MatchWildcards = true
	find.Text = '\\[IMG_Inline_*\\]'

	while (find.Execute()) {
		const text = selection.Range.Text // 例如 [IMG_Inline_5]
		const match = text.match(/\[IMG_Inline_(\d+)\]/)
		if (match) {
			const index = parseInt(match[1])
			if (sourceDoc.InlineShapes.Count >= index) {
				// 从源文档复制
				try {
					sourceDoc.InlineShapes.Item(index).Range.Copy()
					selection.Range.Paste()
					// 重置段落格式行距以确保图片完全可见
					selection.ParagraphFormat.LineSpacingRule = 0 // wdLineSpaceSingle
					const para = selection.Range.Paragraphs.Item(1)
					if (para && selection.Range.Start === para.Range.Start) {
						para.Format.CharacterUnitFirstLineIndent = 0
						para.Format.FirstLineIndent = 0
					}
				} catch (e) {
					console.error(`Error restoring inline shape ${index}`, e)
				}
			}
		}
		selection.Collapse(0) // wdCollapseEnd
	}

	// 2. 还原浮动图形
	// 重置搜索设置以进行字面匹配
	selection.Find.ClearFormatting()
	selection.Find.MatchWildcards = false

	for (const item of globalImageMap.floating) {
		// 确保新文档处于活动状态以进行搜索
		newDoc.Activate()

		if (sourceDoc.Shapes.Count >= item.sourceIndex) {
			// 在新文档中查找锚点标签
			selection.HomeKey(6) // wdStory
			const find = selection.Find
			find.ClearFormatting() // 确保每次都重置搜索设置
			find.MatchWildcards = false
			find.Text = `[IMG_Floating_${item.id}]`

			// 如果找到锚点，光标位于插入点。
			// 如果没有，Range(0,0)。
			if (find.Execute()) {
				// 找到标签。选区现在是标签文本。
				selection.Text = '' // 删除标签
			} else {
				console.warn(`Anchor tag for floating shape ${item.id} not found. Pasting at start.`)
				newDoc.Range(0, 0).Select()
			}

			// 从源文档复制（切换上下文）
			sourceDoc.Activate()
			try {
				// 强制取消选择以防止意外复制先前的选择
				window.Application.Selection.Collapse()

				// 使用 sourceIndex，因为在源文档中恢复了标题，所以无法按标题/ID 搜索。
				sourceDoc.Shapes.Item(item.sourceIndex).Select()
				window.Application.Selection.Copy()
			} catch (e) {
				console.error(`Error copying floating shape ${item.sourceIndex}`, e)
				continue
			}

			// 切换回新文档并粘贴
			newDoc.Activate()

			const oldShapeCount = newDoc.Shapes.Count
			const oldInlineCount = newDoc.InlineShapes.Count

			try {
				// 确保粘贴前没有选中其他图形
				window.Application.Selection.Collapse(0) // wdCollapseEnd
				window.Application.Selection.Paste()
			} catch (e) {
				console.error('Paste failed', e)
				continue
			}

			// 验证是否添加了图形并识别它
			let newShape = null

			// 策略1：优先检查 Selection (最准确，因为粘贴后通常会自动选中)
			try {
				// 优先使用 Selection 判断
				const selType = window.Application.Selection.Type
				// 兼容枚举值和硬编码
				if (selType === 8 || selType === window.Application.Enum.wdSelectionShape) {
					if (window.Application.Selection.ShapeRange.Count > 0) {
						newShape = window.Application.Selection.ShapeRange.Item(1)
					}
				} else if (selType === 7 || selType === window.Application.Enum.wdSelectionInlineShape) {
					if (window.Application.Selection.InlineShapes.Count > 0) {
						const inline = window.Application.Selection.InlineShapes.Item(1)
						newShape = inline.ConvertToShape()
					}
				}
			} catch (e) {
				console.warn('Failed to get shape from selection, trying fallback...', e)
			}

			// 策略2：如果 Selection 失败，检查 Shapes 数量是否增加 (处理偶现的选区丢失问题)
			if (!newShape) {
				const newShapeCount = newDoc.Shapes.Count
				const newInlineCount = newDoc.InlineShapes.Count

				if (newShapeCount > oldShapeCount) {
					// 假设最后一个是刚粘贴的
					newShape = newDoc.Shapes.Item(newShapeCount)
				} else if (newInlineCount > oldInlineCount) {
					// 处理粘贴为 InlineShape 的情况
					try {
						const inlineShape = newDoc.InlineShapes.Item(newInlineCount)
						newShape = inlineShape.ConvertToShape()
					} catch (e) {
						console.error('Failed to convert InlineShape back to Floating Shape (Fallback)', e)
					}
				} else {
					console.error(
						`Paste verification failed: Shape count did not increase. Old: ${oldShapeCount}, New: ${newShapeCount}`
					)
				}
			}

			// 恢复属性
			if (newShape) {
				try {
					// 0. 将缩放重置为 100% 以避免继承的缩放伪影
					try {
						newShape.ScaleHeight(1, 1) // msoTrue (relative to original size)
						newShape.ScaleWidth(1, 1) // msoTrue
					} catch (e) {
						console.warn('Scale reset failed', e)
					}

					// 1. 首先恢复环绕格式类型（影响定位行为）
					newShape.WrapFormat.Type = item.wrapFormatType

					// 2. 恢复相对定位基准
					// 强制垂直相对于段落 (2)，如提取时归一化的那样
					newShape.RelativeVerticalPosition = 2 // wdRelativeVerticalPositionParagraph
					newShape.RelativeHorizontalPosition = item.relativeHorizontalPosition

					// 3. 恢复尺寸和纵横比（移至定位之前）
					// 首先解锁纵横比，以确保可以独立设置宽度/高度
					newShape.LockAspectRatio = 0 // msoFalse

					// 多次强制设置宽度/高度以克服副作用
					newShape.Width = item.width
					newShape.Height = item.height
					// 双重检查并在发生漂移时重新应用
					if (
						Math.abs(newShape.Width - item.width) > 1 ||
						Math.abs(newShape.Height - item.height) > 1
					) {
						newShape.Width = item.width
						newShape.Height = item.height
					}

					// 最后恢复锁定状态
					newShape.LockAspectRatio = item.lockAspectRatio

					// 4. 恢复绝对偏移量（现在相对于段落）（移至最后）
					newShape.Left = item.left
					newShape.Top = item.top
				} catch (e) {
					console.error('Error restoring shape props', e)
				}
			} else {
				console.warn(`Failed to restore floating shape index ${item.sourceIndex}`)
			}
		}
	}
}

function restoreTables(newDoc, sourceDoc) {
	const selection = window.Application.Selection
	newDoc.Activate()
	selection.HomeKey(6) // wdStory

	const find = selection.Find
	find.ClearFormatting()
	find.MatchWildcards = true
	find.Text = '\\[TBL_*\\]'

	while (find.Execute()) {
		const text = selection.Range.Text // 例如 [TBL_1]
		const match = text.match(/\[TBL_(\d+)\]/)
		if (match) {
			const index = parseInt(match[1])
			if (sourceDoc.Tables.Count >= index) {
				// 从源文档复制
				try {
					sourceDoc.Tables.Item(index).Range.Copy()
					selection.Range.Paste()
				} catch (e) {
					console.error(`Error restoring table ${index}`, e)
				}
			}
		}
		selection.Collapse(0) // wdCollapseEnd
	}
}

function processParamsWithCenterDivCheck(params) {
	// 检查params是否包含<div align="center"><p></p></div>类型的标签
	const centerDivRegex = /<div\s+align\s*=\s*["']center["']\s*>\s*<p[^>]*>.*?<\/p>\s*<\/div>/gi

	if (!centerDivRegex.test(params)) {
		// 如果不包含目标标签，直接返回原params
		return params
	}

	// 获取原文档的前5段内容
	const doc = window.Application.ActiveDocument
	if (!doc) {
		console.error('没有打开的文档')
		return params
	}

	let originalParagraphs = []
	const paragraphs = doc.Paragraphs
	const count = Math.min(5, paragraphs.Count)

	for (let i = 1; i <= count; i++) {
		const paragraph = paragraphs.Item(i)
		const text = paragraph.Range.Text
		// 去除段落结束符(\r)并检查是否为空
		const cleanText = text.replace(/\r$/, '').trim()
		if (cleanText !== '') {
			originalParagraphs.push(cleanText)
		}
	}

	// 查找包含center div的所有匹配项
	const allMatches = params.match(centerDivRegex)

	if (!allMatches) {
		return params
	}

	// 对每个匹配项进行内容提取和匹配验证
	let processedParams = params
	for (const match of allMatches) {
		// 提取<div>标签内的内容
		const contentMatch = match.match(
			/<div\s+align\s*=\s*["']center["']\s*>\s*<p[^>]*>(.*?)<\/p>\s*<\/div>/i
		)

		if (contentMatch && contentMatch[1]) {
			const innerContent = contentMatch[1].trim() // 获取标签内的内容并去除首尾空白
			let shouldRemove = false

			// 检查innerContent是否与原文前5段内容完全一致
			const isMatchFound = originalParagraphs.some(
				(originalText) => innerContent === originalText // 完全相等才视为匹配
			)
			if (!isMatchFound) {
				shouldRemove = true
			}

			if (!shouldRemove) {
				// 通过移除当前匹配的div，检查剩余内容中是否还包含innerContent
				const paramsExcludingMatch = params.replace(match, '')
				if (paramsExcludingMatch.includes(innerContent)) {
					shouldRemove = true
				}
			}
			if (!shouldRemove && innerContent.length > 20) {
				//将标签<div align="center"><p></p></div>删除，保留内容
				processedParams = processedParams.replace(match, innerContent).trim()
			}

			if (shouldRemove) {
				// 如果不匹配或重复，从params中移除这个div标签
				processedParams = processedParams.replace(match, '').trim()
			}
		}
	}

	return processedParams
}

export { extractImagesAndTags, restoreImages, restoreTables, processParamsWithCenterDivCheck }
