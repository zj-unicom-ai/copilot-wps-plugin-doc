import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import {
	createMarkdownRenderer,
	renderSafeMarkdown
} from '@/shared/markdown/createMarkdownRenderer.js'

const md = createMarkdownRenderer('document')

// 从HTML解析并创建docx文档结构
async function parseHtmlToDocx(htmlContent) {
	const parser = new DOMParser()
	const doc = parser.parseFromString(htmlContent, 'text/html')
	const children = []

	let currentListLevel = 0
	let instanceCounter = 0

	// 递归处理HTML节点
	function processNode(node) {
		switch (node.nodeType) {
			case Node.ELEMENT_NODE:
				switch (node.tagName.toLowerCase()) {
					case 'h1':
					case 'h2':
					case 'h3':
						children.push(
							new Paragraph({
								children: [
									new TextRun({
										text: node.textContent,
										size: node.tagName === 'h1' ? 32 : node.tagName === 'h2' ? 28 : 24,
										bold: true
									})
								],
								spacing: { before: 400, after: 200 }
							})
						)
						break

					case 'p': {
						// 分割内容处理 <br> 标签
						const parts = node.innerHTML.split('<br>')
						parts.forEach((part, index) => {
							const tempDiv = document.createElement('div')
							tempDiv.innerHTML = part

							// 处理每个部分的内容
							children.push(
								new Paragraph({
									children: Array.from(tempDiv.childNodes)
										.map((child) => {
											if (child.nodeType === Node.TEXT_NODE) {
												return new TextRun({
													text: child.textContent.trim(),
													size: 24
												})
											} else if (child.nodeType === Node.ELEMENT_NODE) {
												switch (child.tagName.toLowerCase()) {
													case 'strong':
													case 'b':
														return new TextRun({
															text: child.textContent,
															bold: true,
															size: 24
														})
													case 'em':
													case 'i':
														return new TextRun({
															text: child.textContent,
															italic: true,
															size: 24
														})
													default:
														return new TextRun({
															text: child.textContent,
															size: 24
														})
												}
											}
										})
										.filter(Boolean),
									spacing: {
										before: index === 0 ? 200 : 100, // 第一段前间距大一些
										after: index === parts.length - 1 ? 200 : 100 // 最后一段后间距大一些
									}
								})
							)
						})
						break
					}

					case 'ol':
						currentListLevel++ // 进入新的列表层级

						// 重置实例计数器
						instanceCounter++

						Array.from(node.children).forEach((li) => {
							children.push(
								new Paragraph({
									children: processInlineContent(li),
									numbering: {
										reference: 'mainNumbering',
										level: currentListLevel - 1,
										instance: instanceCounter // 添加实例编号以重新开始计数
									},
									spacing: { before: 60, after: 60 },
									indent: { left: 360 * currentListLevel }
								})
							)
						})

						currentListLevel--
						break

					case 'ul':
						Array.from(node.children).forEach((li) => {
							// 处理列表项内容
							const contentParts = li.innerHTML.split('<br>')

							contentParts.forEach((part) => {
								const tempDiv = document.createElement('div')
								tempDiv.innerHTML = part

								children.push(
									new Paragraph({
										children: [
											new TextRun({
												text: '• ',
												size: 24
											}),
											...Array.from(tempDiv.childNodes)
												.map((child) => {
													if (child.nodeType === Node.TEXT_NODE) {
														return new TextRun({
															text: child.textContent.trim(),
															size: 24
														})
													} else if (child.nodeType === Node.ELEMENT_NODE) {
														switch (child.tagName.toLowerCase()) {
															case 'strong':
															case 'b':
																return new TextRun({
																	text: child.textContent,
																	bold: true,
																	size: 24
																})
															default:
																return new TextRun({
																	text: child.textContent,
																	size: 24
																})
														}
													}
												})
												.filter(Boolean)
										],
										spacing: { before: 60, after: 60 }, // 减小段落间距
										indent: { left: 360, hanging: 240 } // 调整缩进
									})
								)
							})
						})
						break

					default:
						// 递归处理子节点
						Array.from(node.childNodes).forEach(processNode)
				}
				break

			case Node.TEXT_NODE:
				if (node.textContent.trim()) {
					children.push(
						new Paragraph({
							children: [
								new TextRun({
									text: node.textContent,
									size: 24
								})
							]
						})
					)
				}
				break
		}
	}

	processNode(doc.body)

	return new Document({
		sections: [
			{
				properties: {},
				children: children
			}
		],
		numbering: {
			config: [
				{
					reference: 'mainNumbering',
					levels: [
						{
							level: 0,
							format: 'decimal',
							text: '%1.',
							alignment: AlignmentType.START,
							style: {
								paragraph: {
									indent: { left: 720, hanging: 360 }
								}
							},
							start: 1, // 确保从1开始
							restart: true // 每个新列表都重新开始计数
						},
						{
							level: 1,
							format: 'decimal',
							text: '%2.',
							alignment: AlignmentType.START,
							style: {
								paragraph: {
									indent: { left: 1440, hanging: 360 }
								}
							},
							start: 1,
							restart: true
						},
						{
							level: 2,
							format: 'decimal',
							text: '%3.',
							alignment: AlignmentType.START,
							style: {
								paragraph: {
									indent: { left: 2160, hanging: 360 }
								}
							},
							start: 1,
							restart: true
						}
					]
				}
			]
		}
	})
}

//
function processInlineContent(node) {
	return Array.from(node.childNodes)
		.map((child) => {
			if (child.nodeType === Node.TEXT_NODE) {
				const text = child.textContent.trim()
				return text
					? new TextRun({
							text,
							size: 24
						})
					: null
			} else if (child.nodeType === Node.ELEMENT_NODE) {
				switch (child.tagName.toLowerCase()) {
					case 'strong':
					case 'b':
						return new TextRun({
							text: child.textContent,
							bold: true,
							size: 24
						})
					case 'br':
						return new TextRun({
							text: '',
							break: 1
						})
					default:
						return processInlineContent(child)
				}
			}
		})
		.filter(Boolean)
		.flat()
}

// 主转换函数
export async function convertToDocx(markdownText) {
	try {
		// 1. 将 Markdown 转换为 HTML（消毒后供 docx 解析）
		const html = renderSafeMarkdown(md, markdownText)

		const doc = await parseHtmlToDocx(html)
		const blob = await Packer.toBlob(doc)
		const arrayBuffer = await blob.arrayBuffer()
		const uint8Array = new Uint8Array(arrayBuffer)
		const binaryString = Array.from(uint8Array)
			.map((byte) => String.fromCharCode(byte))
			.join('')
		return binaryString
	} catch (error) {
		console.error('转换失败:', error)
		throw error
	}
}
