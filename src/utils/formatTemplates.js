import {
	createMarkdownRenderer,
	renderSafeMarkdown
} from '@/shared/markdown/createMarkdownRenderer.js'
import { usePaibanStore } from '@/store/paiban'
const md = createMarkdownRenderer('document')

function preprocessNumberedLines(text) {
	// 处理有序列表项（确保独立成行）
	text = text.replace(/(\n)(\d+\.\s+)/g, '$1\n$2')

	// 使用多行模式处理所有列表项
	text = text.replace(/^\s*[-*+]\s+(.+)$/gm, '$1\n')

	// 在每个列表项前确保有换行符
	text = text.replace(/^([^\d\s].*)$/gm, '\n$1')

	// 清理多余的换行符
	text = text.replace(/\n{3,}/g, '\n\n')

	return text
}

// 辅助对象，用于维护标题序号计数器
const headingCounters = { h1_doc_title: 0, h2: 0, h3: 0, h4: 0 }
/**
 * 将 Markdown 转换为符合公文格式要求的 HTML 字符串
 * @param {string} markdownText 原始 Markdown 文本
 * @returns {string} 包含公文排版样式的完整 HTML 字符串
 */
function convertMarkdownToStyledHtmlForCommon(markdownText) {
	// 重置计数器以便每次排版都从头开始计数
	headingCounters.h1_doc_title = 0
	headingCounters.h2 = 0
	headingCounters.h3 = 0
	headingCounters.h4 = 0
	headingCounters.strong = 0

	// 1. 将 Markdown 转换为基本的 HTML 结构（消毒后写入文档）
	let htmlContentBody = renderSafeMarkdown(md, preprocessNumberedLines(markdownText))

	const parser = new DOMParser()
	const doc = parser.parseFromString(htmlContentBody, 'text/html')

	// **文档总标题 (Markdown H1) **：小标宋简体，三号，居中
	const h1Elements = doc.querySelectorAll('h1')
	if (h1Elements.length > 0) {
		h1Elements[0].classList.add('title1')
		// const brElement = doc.createElement('br')
		// h1Elements[0].after(brElement)
		const nextElement = h1Elements[0].nextElementSibling

		if (
			nextElement &&
			nextElement.tagName === 'DIV' &&
			nextElement.getAttribute('align') === 'center' &&
			nextElement.querySelector('p')
		) {
			// 情况1：下一个元素是<div align="center"><p></p></div>结构，在div后添加换行
			const brElement = doc.createElement('br')
			nextElement.after(brElement)
		} else {
			// 情况2：下一个元素不是上述结构，直接在H1后添加换行
			const brElement = doc.createElement('br')
			h1Elements[0].after(brElement)
		}
	}

	// 其他标题样式
	doc.querySelectorAll('h2').forEach((el) => el.classList.add('title2'))
	doc.querySelectorAll('h3').forEach((el) => el.classList.add('title3'))
	doc.querySelectorAll('h4').forEach((el) => el.classList.add('title4'))
	doc.querySelectorAll('h5').forEach((el) => el.classList.add('title5'))

	// **新增部分：移除 li 下的 p 标签**
	const listItems = doc.querySelectorAll('li')
	listItems.forEach((li) => {
		const paragraphs = li.querySelectorAll('p')
		paragraphs.forEach((p) => {
			// 遍历 p 标签的所有子节点（包括文本、span等），然后把它们移到 li 下面
			while (p.firstChild) {
				li.insertBefore(p.firstChild, p)
			}
			// 最后移除空的 p 标签
			p.remove()
		})
	})

	const headingElements = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
	headingElements.forEach((heading) => {
		// 处理数字编号开头的标题，移除编号后的空格
		const headingText = heading.textContent.trim()
		if (/^\d+\.\s+/.test(headingText)) {
			const originalHTML = heading.innerHTML
			heading.innerHTML = originalHTML.replace(/^(<[^>]*>)*(\d+\.)\s+/, '$1$2')
		}
	})

	const pElements = doc.querySelectorAll('p')

	pElements.forEach((p) => {
		//针对报告特殊处理
		if (p.textContent.includes('报告人')) {
			p.classList.add('centerText')
		} else {
			// p.classList.add('pElements')
		}
		// 判断是否 "一、二、三、四、五、六" 开头
		const text = p.textContent.trim()
		if (/^(一|二|三|四|五|六)、/.test(text) && text.length < 15) {
			p.classList.add('title2')
		}
		// 判断是否 "（一）（二）（三）（四）（五）（六）" 开头
		else if (/^[(（](一|二|三|四|五|六)[)）]/.test(text) && text.length < 15) {
			p.classList.add('title3')
		}
		// 处理数字编号开头的段落，移除编号后的空格
		if (/^\d+\.\s+/.test(text)) {
			const originalText = p.innerHTML
			p.innerHTML = originalText.replace(/^(<[^>]*>)*(\d+\.)\s+/, '$1$2')
		}

		//匹配删除句号后的空格
		const originalHTML = p.innerHTML
		p.innerHTML = originalHTML.replace(/(。)\s+/g, '$1')

		if (p.innerHTML.includes('<br>')) {
			const parts = p.innerHTML.split('<br>')
			const parent = p.parentNode

			// 保留第一个部分在原 p 标签中
			p.innerHTML = parts[0]

			// 为每个额外的部分创建新的 p 标签
			for (let i = 1; i < parts.length; i++) {
				const newP = doc.createElement('p')
				newP.innerHTML = parts[i]
				parent.insertBefore(newP, p.nextSibling)
				p = newP // 更新 p 指针，以便继续插入
			}
		}
	})

	processTextNodesForSpaceRemoval(doc)
	// 3. 将修改后的 DOM 重新序列化为 HTML 字符串
	const bodyContent = doc.body.innerHTML

	const fullHtml = `<!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <title>排版内容</title>
       <style>
    body {
        font-family: '仿宋_GB2312';
        font-size: 16pt;
        line-height: 28pt;
        margin: 0;
        padding: 0;
    }
    *{ margin-top: 0 !important;margin-bottom: 0 !important;padding-top: 0 !important;padding-bottom: 0 !important;}
    p{margin-top: 0 !important;margin-bottom: 0 !important;padding-top: 0 !important;padding-bottom: 0 !important; }
    pElements{margin-top: 0 !important;margin-bottom: 0 !important;padding-top: 0 !important;padding-bottom: 0 !important; }
    /* 普遍重置：将所有元素的内外边距归零 */
    /* 确保列表的默认内外边距也归零 */
    h1, h2, h3, h4, h5, h6, p, ul, ol, li, blockquote, div, hr, strong, em {
        margin-top: 0 !important; /* 使用 !important 提高优先级 */
        margin-bottom: 0 !important;
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        padding-left: 0 !important; /* 特别是列表的 padding-left */
    }
    .centerText{text-align: center;}
    .title1 {
        font-family: '方正小标宋简体';
        font-size: 22pt;
        text-align: center;
        line-height: 28pt;
        font-weight: normal;
        margin-bottom:28pt;
    }

    .title2 {
        font-family: '黑体';
        font-size: 16pt;        
        text-align: left;
        line-height: 28pt;
        font-weight: normal;        
    }

    .title3 { /* 确保 h3 有独立的样式 */
        font-family: '楷体_GB2312';
        font-size: 16pt;        
        text-align: left;
        line-height: 28pt;
        font-weight: bold;        
    }
    .title4 {       
      font-family: '仿宋_GB2312';
        text-align: left;
        font-size: 16pt;
        line-height: 28pt;
        font-weight: bold;        
    }
    .title5 {       
      font-family: '仿宋_GB2312';
      text-align: left;
      font-size: 16pt;
      line-height: 28pt;
      font-weight: normal;        
    }

</style>
        </head>
        <body>
        ${bodyContent}
        </body>
        </html>`

	return fullHtml
}

// 主函数：插入并排版 isInsertEnd 是否插入到文档末尾
function insertAndFormatContentCommon(rawMarkdown, insertPosition, isForeignLanguage) {
	if (!rawMarkdown) {
		// alert('请输入 Markdown 内容！')
		return
	}
	// 1. 将 Markdown 转换为带公文样式的 HTML
	// const cleanedMarkdown = cleanSpecificSpaces(rawMarkdown)

	const styledHtmlContent = convertMarkdownToStyledHtmlForCommon(rawMarkdown)
	// const cleanedHtmlContent = cleanSpacesInHtml(styledHtmlContent)

	try {
		// 获取 WPS 文档和选区对象
		let doc = window.Application.ActiveDocument
		let selection = window.Application.Selection

		// 记录插入前的位置

		// 检查当前选区是否有效，如果无效则移动到文档末尾
		// selection.Type === 0 表示 wdSelectionNone (没有选区/插入点)
		if (!selection || selection.Type === 0 || insertPosition == 3) {
			const endOfDocRange = doc.Content
			endOfDocRange.Collapse(0) // wdCollapseEnd，将范围折叠到末尾，形成一个插入点
			endOfDocRange.Select() // 选中这个插入点，使其成为当前选区
			selection = window.Application.Selection // 重新获取 selection 对象以确保它指向最新的选区
			selection.TypeParagraph() //换行
		}

		if (insertPosition == 4) {
			doc.Content.Select()
		}
		let startRange = selection.Start

		// 构造临时文件路径
		// 确保 Env.GetTempPath() 返回的路径是有效的，并且路径分隔符是正确的
		const tempPath = window.Application.Env.GetTempPath()
		const filePath =
			tempPath +
			(tempPath.endsWith('/') || tempPath.endsWith('\\') ? '' : '/') +
			'formatted_wps_content.html'

		// 写入HTML内容到临时文件
		// 假设 window.Application.FileSystem.WriteFile 是同步的，如果它是异步的，需要 await
		// 明确指定 "utf-8" 编码以避免乱码问题
		window.Application.FileSystem.WriteFile(filePath, styledHtmlContent)

		// 插入临时文件到WPS文档
		// InsertFile 可能会有 ConfirmConversions, LinkToFile, DisplayAsIcon 等可选参数
		// 根据 WPS 官方文档确定是否需要这些参数或其默认值
		selection.InsertFile(filePath)

		// 插入后删除临时文件
		if (window.Application.FileSystem.Exists(filePath)) {
			window.Application.FileSystem.Remove(filePath)
			//开始调用wpsjs方法
			let endRange = selection.Range.End
			let newContentRange = doc.Range(startRange, endRange)
			// autoPaibanFunForRange(newContentRange);
			autoPaibanFun(newContentRange, isForeignLanguage)
		} else {
			console.warn('临时文件不存在或已删除，无需再次删除。')
		}
	} catch (error) {
		console.error('WPS 操作过程中发生错误:', error)
		alert('操作失败，请稍后重试')
	}
}

// 新增：处理文本节点中特定空格的函数
function processTextNodesForSpaceRemoval(doc) {
	const isTitleLineTextNode = (textNode) => {
		const parent = textNode.parentElement
		if (!parent) return false
		return Boolean(
			parent.closest('h1, h2, h3, h4, h5, h6, .title1, .title2, .title3, .title4, .title5')
		)
	}

	// 创建TreeWalker遍历所有文本节点
	const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false)

	const textNodes = []
	// 收集所有文本节点
	let node = walker.nextNode()
	while (node) {
		textNodes.push(node)
		node = walker.nextNode()
	}

	// 处理每个文本节点
	textNodes.forEach((textNode) => {
		// 标题行保留原始空格，不进行空格清理
		if (isTitleLineTextNode(textNode)) {
			return
		}

		if (textNode.nodeValue && textNode.nodeValue.trim()) {
			let text = textNode.nodeValue
			const CJK = '\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF'
			const PUNC = `.,;:!?'"()\\[\\]{}\\-_=+*\\/\\\\|&@#$%^~\`<>，。！？；：“”‘’（）【】《》、—…`
			// 3. 删除全角空格
			text = text.replace(/\u3000/g, '')
			// 删除 中文 ↔ 中文 之间的空格
			text = text.replace(new RegExp(`([${CJK}]) +([${CJK}])`, 'g'), '$1$2')
			// 删除 中文 ↔ 标点 之间的空格
			text = text.replace(new RegExp(`([${CJK}]) +([${PUNC}])`, 'g'), '$1$2')
			// 删除 标点 ↔ 中文 之间的空格
			text = text.replace(new RegExp(`([${PUNC}]) +([${CJK}])`, 'g'), '$1$2')
			// 更新文本节点
			textNode.nodeValue = text
		}
	})
}

//大模型处理后的文档插入处理,isInstertEnd：是否插入到文末 insertPosition 1 当前位置；2 文首；3 文末；4 全文替换
function insertWpsContent(text, insertPosition = 1, isForeignLanguage = false) {
	const paiban = usePaibanStore()
	const type = paiban.getType || 1
	switch (type) {
		case 1:
			insertAndFormatContentCommon(text, insertPosition, isForeignLanguage)
			break
		default:
			//默认公文模板
			insertAndFormatContentCommon(text, insertPosition)
	}
}

function autoPaibanFun(range, isForeignLanguage) {
	const app = wps.WpsApplication()
	const doc = app && app.ActiveDocument

	if (!doc) {
		alert('没有打开的文档，请先打开一份文档！')
		return
	}

	// 2. 设置正文段落格式
	let paras = range.Paragraphs
	// let paras = doc.Paragraphs
	for (let i = 1; i <= paras.Count; i++) {
		let para = paras.Item(i)
		let styleName = para.Style.NameLocal
		if (i == 1 && styleName.includes('标题 1')) {
			para.Format.CharacterUnitFirstLineIndent = 0 // 设置首行缩进为0
			para.Range.Font.Name = getAvailableFont('方正小标宋简体', '方正小标宋_GBK')
			para.Range.ParagraphFormat.LineSpacingRule = 4 // 固定值
			para.Range.ParagraphFormat.LineSpacing = 28 // 28 磅
		} else {
			if (styleName.includes('标题 2')) {
				para.Range.Font.Bold = false
				para.Range.Font.Name = '黑体'
			} else if (styleName.includes('标题 3')) {
				para.Range.Font.Bold = true
				para.Range.Font.Name = getAvailableFont('楷体_GB2312', '楷体')
			} else if (styleName.includes('标题 4')) {
				para.Range.Font.Bold = true
				para.Range.Font.Name = getAvailableFont('仿宋_GB2312', '仿宋')
			} else {
				para.Range.Font.Bold = false
				para.Range.Font.Name = getAvailableFont('仿宋_GB2312', '仿宋')
			}
			if (styleName.includes('普通(网站)')) {
				para.Range.Font.Bold = false
				para.Range.Font.Name = getAvailableFont('仿宋_GB2312', '仿宋')
			}
			if (styleName.includes('正文')) {
				para.Range.Font.Bold = false
				para.Range.Font.Name = getAvailableFont('仿宋_GB2312', '仿宋')
			}
		}

		formatFirstSentence(para)

		if (para.Alignment == 1) {
			//居中段落首行缩进为0
			para.Format.CharacterUnitFirstLineIndent = 0
		} else {
			const trimmedText = para.Range.Text.trim()
			const isWithinFirstThree = i <= 7
			const endsWithColon = /[：:]$/.test(trimmedText)
			const hasOnlyOneSentence = !/[。！？.!?]/.test(trimmedText)

			if (isWithinFirstThree && endsWithColon && hasOnlyOneSentence) {
				// 如果是前三段且以冒号结尾，首行缩进为0
				para.Format.CharacterUnitFirstLineIndent = 0
			} else {
				//其余为2
				para.Format.CharacterUnitFirstLineIndent = 2
			}
			// 设置段落对齐方式为两端对齐
			para.Alignment = 3
		}

		para.Range.Font.NameAscii = 'Times New Roman'
		para.Range.Font.NameOther = 'Times New Roman'
		if (isForeignLanguage) {
			para.Range.Font.Name = 'Times New Roman'
			para.Range.Font.NameBi = 'Times New Roman'
			para.Range.Font.NameFarEast = 'Times New Roman'
		}

		// para.Range.ParagraphFormat.LineSpacingRule = 1 // 固定值
		para.Range.ParagraphFormat.LineSpacingRule = 4 // 固定值
		para.Range.ParagraphFormat.LineSpacing = 28 // 28 磅

		// 判断是否为编号段落
		let isNumbered = false
		try {
			if (para.Range.ListFormat && para.Range.ListFormat.ListType !== 0) {
				isNumbered = true
			}
		} catch (e) {
			// 兼容无 ListFormat 的情况
			isNumbered = false
		}

		//针对编号类文档不做处理
		if (!isNumbered) {
			para.Format.SpaceBefore = 0
			para.Format.SpaceAfter = 0
			// para.Format.FirstLineIndent = 32
		} else {
			para.Format.FirstLineIndent = 0
			para.Format.SpaceBefore = 0
			para.Format.SpaceAfter = 0
			// para.Format.LeftIndent = 0
		}
	}
}

// 新增函数：处理段落首句格式
function formatFirstSentence(para) {
	const text = para.Range.Text.trim()
	if (!text) return

	// 提取首句（假设以句号、感叹号、问号分割）
	const sentences = text.split(/[。！？：]/)

	// 如果只有一个句子，则不需要处理
	if (sentences.length === 1) return

	const firstSentence = sentences[0]
	if (firstSentence.length > 20) return

	// 定义不同开头的格式规则
	const rules = [
		{ pattern: /^[一二三四五六七八九十]、/, font: '黑体', bold: false },
		{
			pattern: /^（[一二三四五六七八九十]）/,
			font: getAvailableFont('楷体_GB2312', '楷体'),
			bold: true
		},
		{ pattern: /^\d+\./, font: getAvailableFont('仿宋_GB2312', '仿宋'), bold: true }
	]

	// 应用匹配的规则
	for (const rule of rules) {
		if (rule.pattern.test(firstSentence)) {
			applyFormatToRange(para.Range, firstSentence.length, rule)
			break
		}
	}
}

// 辅助函数：应用格式到指定范围
function applyFormatToRange(range, length, format) {
	const start = range.Start
	const end = start + length
	const sentenceRange = range.Document.Range(start, end)

	sentenceRange.Font.Name = format.font
	sentenceRange.Font.Bold = format.bold
}

function getAvailableFont(preferredFont, fallbackFont) {
	if (document.fonts && document.fonts.check(`12px "${preferredFont}"`)) {
		return preferredFont // 如果首选字体可用，直接返回
	}
	return fallbackFont // 否则返回备用字体
}

export default insertWpsContent
export { insertWpsContent }
