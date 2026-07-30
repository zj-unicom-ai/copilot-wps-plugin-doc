/* eslint-disable no-async-promise-executor */
import Util from './util.js'
import { convertToDocx } from '@/utils/docxConverter'
import insertWpsContent from '@/utils/formatTemplates.js'
import { OpenRevision } from './func_wps.js'
import {
	extractImagesAndTags,
	restoreImages,
	restoreTables,
	processParamsWithCenterDivCheck
} from '../../utils/paibanUtils.js'
import autoPaibanFun from '@/utils/autoPaiban.js'

function onbuttonclick(idStr, param) {
	return new Promise(async (resolve, reject) => {
		try {
			if (typeof window.Application.Enum != 'object') {
				// 如果没有内置枚举值
				window.Application.Enum = Util.WPS_Enum
			}
			let result = null
			switch (idStr) {
				case 'dockLeft': {
					let tsId = window.Application.PluginStorage.getItem('taskpane_id')
					if (tsId) {
						let tskpane = window.Application.GetTaskPane(tsId)
						tskpane.DockPosition = window.Application.Enum.msoCTPDockPositionLeft
					}
					break
				}
				case 'dockRight': {
					let tsId = window.Application.PluginStorage.getItem('taskpane_id')
					if (tsId) {
						let tskpane = window.Application.GetTaskPane(tsId)
						tskpane.DockPosition = window.Application.Enum.msoCTPDockPositionRight
					}
					break
				}
				case 'hideTaskPane': {
					let tsId = window.Application.PluginStorage.getItem('taskpane_id')
					if (tsId) {
						let tskpane = window.Application.GetTaskPane(tsId)
						tskpane.Visible = false
					}
					break
				}
				case 'addString': {
					let doc = window.Application.ActiveDocument
					if (doc) {
						doc.Range(0, 0).Text = param
						//好像是wps的bug, 这两句话触发wps重绘
						let rgSel = window.Application.Selection.Range
						if (rgSel) rgSel.Select()
					}
					break
				}
				case 'appendMarkdown': {
					let doc = window.Application.ActiveDocument
					try {
						if (!doc) {
							throw new Error('没有打开的文档')
						}
						let selection = window.Application.Selection
						if (!selection) {
							// 如果没有选区，移动到文档末尾
							selection = doc.Range(doc.Content.End, doc.Content.End).Select()
						}
						//转为docx格式文档
						const docxDoc = await convertToDocx(param)

						var path = window.Application.Env.GetTempPath() + '/tempHtml.html'
						// wps.FileSystem.WriteFile(path, html);//生成html文件
						window.Application.FileSystem.writeAsBinaryString(path, docxDoc)

						window.Application.ActiveWindow.Selection.InsertFile(path)
						if (window.Application.FileSystem.Exists(path)) {
							//插入生成的文件，并删除它
							window.Application.FileSystem.Remove(path)
						} else {
							// alert('文件不存在')
						}
					} catch (error) {
						console.error('插入文本失败:', error)

						// 直接插入文档末尾
						try {
							const range = doc.Range()
							range.InsertAfter('\n' + param + '\n')
							range.Select()
						} catch (fallbackError) {
							console.error('降级插入失败:', fallbackError)
						}
					}
					break
				}
				// 尾部追加文本(原文本插入，不做格式处理)
				case 'appendContentToEnd': {
					let doc = window.Application.ActiveDocument
					try {
						if (!doc) {
							throw new Error('没有打开的文档')
						}
						const range = doc.Range()
						range.InsertAfter('\n' + param + '\n')
						range.Select()
					} catch (error) {
						console.error('文档尾部追加内容失败:', error)
					}
					break
				}
				case 'appendString': {
					let doc = window.Application.ActiveDocument
					try {
						if (!doc) {
							throw new Error('没有打开的文档')
						}
						let selection = window.Application.Selection
						if (!selection) {
							// 如果没有选区，移动到文档末尾
							selection = doc.Range(doc.Content.End, doc.Content.End).Select()
						}
						// 记录原始位置和选中内容长度
						const originalStart = selection.Range.Start
						const originalEnd = selection.Range.End
						const selectedLength = originalEnd - originalStart

						// 如果有选中的文本，先清除选中内容
						if (selection.Range.Start !== selection.Range.End) {
							selection.Range.Text = ''
						}

						// 判断是否需要在内容前换行
						const isAtParaStart = selection.Range.Start === 0
						let insertedChars = 0
						if (!isAtParaStart) {
							selection.TypeParagraph()
							insertedChars += 1
						}

						// 插入文本内容
						selection.Range.Text = param
						insertedChars += param.length
						const newPosition = originalStart - selectedLength + insertedChars

						// 移动选区到插入内容的末尾
						const newRange = doc.Range(newPosition, newPosition)
						newRange.Select()

						// 在内容后插入换行
						selection = window.Application.Selection
						selection.TypeParagraph()
					} catch (error) {
						console.error('插入文本失败:', error)

						// 降级方案：追加到文档末尾
						try {
							const range = doc.Range()
							range.InsertAfter('\n' + param + '\n')
							range.Select()
						} catch (fallbackError) {
							console.error('降级插入失败:', fallbackError)
						}
					}
					break
				}
				// 替换文本
				case 'replaceString': {
					let doc = window.Application.ActiveDocument
					if (!doc) {
						throw new Error('没有打开的文档')
					}

					// 检查文档是否受保护（关键修复点）
					if (doc.ProtectionType !== window.Application.Enum.wdNoProtection) {
						throw new Error('文档受保护，无法编辑内容')
					}

					let selection = window.Application.Selection
					if (!selection.Range.Text.length) {
						// 清空文档全部内容
						doc.Content.Select()
						const range = window.Application.Selection.Range
						range.Delete()

						// 文本替换
						range.InsertAfter(param)

						// 将光标移到文档结尾
						const endRange = doc.Range(doc.Content.End, doc.Content.End)
						endRange.Select()
					} else {
						// 有选中内容时的替换逻辑（新增换行符处理）
						const selRange = selection.Range
						const selStart = selRange.Start
						const selEnd = selRange.End
						const docEnd = doc.Content.End
						const selectedText = selRange.Text

						const lastStr = selectedText.slice(-1)
						const firstStr = selectedText.slice(0, 1)

						// 检测前后是否有换行符（\r）
						const hasBeforeNewline = selStart > 0 ? firstStr === '\r' : false
						const hasAfterNewline = selEnd < docEnd ? lastStr === '\r' : false

						// 构造带换行的替换内容
						const newContent = [
							hasBeforeNewline ? '\r' : '', // 前换行（如果有）
							param, // 原始替换内容
							hasAfterNewline ? '\r' : '' // 后换行（如果有）
						].join('')

						// 执行替换
						selRange.Delete()
						selRange.InsertAfter(newContent)

						// 调整光标到替换内容末尾
						const newEnd = selStart + newContent.length
						const newRange = doc.Range(newEnd, newEnd)
						newRange.Select()
					}
					break
				}
				case 'getDocName': {
					let doc = window.Application.ActiveDocument
					if (!doc) {
						return '当前没有打开任何文档'
					}
					return doc.Name
				}
				case 'openDocument': {
					const documentUrl = param
					if (!documentUrl) {
						throw new Error('文档地址不能为空')
					}
					// 直接让 WPS 原生打开远程 URL，避免浏览器 CORS 限制
					window.Application.Documents.Open(documentUrl)
					result = { success: true, path: documentUrl }
					await autoPaibanFun()

					break
				}
				case 'openWeb': {
					break
				}
				case 'openTaskPane': {
					let tsId = window.Application.PluginStorage.getItem('taskpane_id')
					if (tsId) {
						let tskpane = window.Application.GetTaskPane(tsId)
						if (!tskpane.Visible) {
							tskpane.Visible = true
						}
					}
					break
				}
			}
			resolve(result)
		} catch (error) {
			reject(error)
		}
	})
}

//提示词处理
function handlePrompt(command, options = {}) {
	return new Promise(async (resolve, reject) => {
		try {
			const doc = window.Application.ActiveDocument
			if (!doc) {
				reject('没有打开的文档')
				return
			}

			switch (command) {
				case 'continuation': {
					// 获取当前文档内容
					const content = doc.Content.Text

					const selection = window.Application.Selection
					const selRange = selection.Range
					const startIndex = selRange.Start // 选中内容的起始位置
					const endIndex = selRange.End // 选中内容的结束位置

					// 根据位置分割内容
					const beforeContent = content.substring(0, startIndex)
					const selectedText = content.substring(startIndex, endIndex)
					const afterContent = content.substring(endIndex)

					let prompt
					if (selectedText && selectedText.trim() !== '') {
						// 有选中内容的情况
						prompt = `请基于上文内容、选中内容、下文内容，按照下方要求对选中内容进行续写，输出续写内容：
            要求：
            1. 续写内容严禁出现与上文内容、选中内容以及下文内容重复或者相似的内容！！！
            2. 续写的内容会不改变其他全文内容，并直接插入到选中内容之后，请保证续写完成后全文内容的连贯性和逻辑性 
            3. 保持与原文相同的写作风格和语气
            4. 遵循原文的格式规范
            5. 直接输出续写后的内容，不要包含其他说明，不要包含上下文内容，不要包含选中内容
            
            上文内容：
            """${beforeContent}"""

            选中内容
            """${selectedText}"""

            下文内容：
            """${afterContent}"""
                      
            `
						resolve({
							templateCode: 'selection_continuation',
							prompt: `
            上文内容：
            """${beforeContent}"""

            选中内容
            """${selectedText}"""

            下文内容：
            """${afterContent}"""
                      
            `
						})
					} else {
						// 构建续写的 prompt
						prompt = `${content}`
					}
					resolve({
						templateCode: 'full_text_continuation',
						prompt: prompt
					})
					break
				}
				// 摘要总结的提示词
				case 'abstractSummary': {
					const selection = window.Application.Selection
					let content = ''
					if (selection.Range.Text.trim()) {
						content = selection.Range.Text
					} else {
						content = doc.Content.Text
					}
					let prompt = `${content}`

					resolve({
						templateCode: 'summary',
						prompt: prompt
					})
					break
				}
				case 'expansionPolish': {
					// 获取当前文档内容
					const content = doc.Content.Text
					const selection = window.Application.Selection
					const selectedText = selection.Range.Text

					let prompt
					if (selectedText && selectedText.trim() !== '') {
						// 有选中内容的情况
						prompt = `
            全文内容：
            """${content}"""
                      
            选中部分
            """${selectedText}"""      
            `
					} else {
						alert(`请先选择要扩写的文本`)
						reject('请先选择需要扩写的内容')
					}

					resolve({
						templateCode: 'expanding',
						prompt: prompt
					})
					break
				}
				case 'abbreviation': {
					// 获取当前文档内容
					const content = doc.Content.Text
					const selection = window.Application.Selection
					const selectedText = selection.Range.Text

					let prompt
					if (selectedText && selectedText.trim() !== '') {
						// 有选中内容的情况
						prompt = `
            全文内容：
            """${content}"""
                      
            选中部分
            """${selectedText}"""
            `
						resolve({
							templateCode: 'selection_summary',
							prompt: prompt
						})
					} else {
						prompt = `
            """${content}"""
            `
						resolve({
							templateCode: 'full_text_summary',
							prompt: prompt
						})
					}

					break
				}
				case 'paiban': {
					// 获取当前文档内容（包含图片标记）
					const content = extractImagesAndTags(doc)
					const prompt = `${content}`

					resolve({
						templateCode: 'organization',
						prompt: prompt,
						srcDoc: doc
					})
					break
				}
				// 通用翻译（支持多语言）
				case 'translate': {
					const doc = window.Application.ActiveDocument
					const selection = window.Application.Selection
					const content = selection.Range.Text || doc.Content.Text
					const targetLanguageName = options.targetLanguageName || '英语'
					const targetLanguage = options.targetLanguage || 'en'

					// 提示词内优先使用英文语种名，减少中译外时模型回写中文
					const promptLangNames = {
						zh: 'Chinese',
						en: 'English',
						es: 'Spanish',
						ar: 'Arabic',
						fr: 'French',
						ru: 'Russian',
						pt: 'Portuguese',
						ja: 'Japanese',
						ko: 'Korean'
					}
					const promptTargetName = promptLangNames[targetLanguage] || targetLanguageName

					// 针对不同目标语言使用不同的约束策略
					let prompt = ''
					let templateCode = ''

					if (targetLanguage === 'zh') {
						templateCode = 'translation2CN'
						prompt = `请将以下内容翻译成中文：\n\n${content}`
					} else {
						templateCode = 'translation2Other'
						prompt = `Translate the following text into ${promptTargetName}. Output ONLY ${promptTargetName}. Do not include any Chinese characters, notes, or bilingual text.\n\n${content}`
					}

					resolve({
						templateCode,
						prompt,
						// 供调用方传入 resolvePrompt.extra
						extra:
							targetLanguage === 'zh' ? undefined : { targetLanguageName: promptTargetName }
					})
					break
				}

				// 智能纠错
				case 'fix': {
					// 获取当前文档和选中内容
					const doc = window.Application.ActiveDocument
					const selection = window.Application.Selection
					const content = selection.Range.Text || doc.Content.Text

					// 构建翻译的 prompt
					const prompt = `请对以下内容进行AI校正：${content}`

					resolve({
						type: 'system',
						prompt: prompt,
						systemPrompt: `你是一名优秀的校对员，请对我提供的原文内容进行校对，找出其中的错别字和用词不当处，严格按以下格式返回。

              ### 输出格式要求：
              ===修正后的内容===校对后的完整内容，注意保持和原文段落的格式一致,禁止把正确的中文标点符号替换为英文标点符号,若原文中有表格和图片的部分，则不进行处理，直接过滤掉，以空字符串代替。
              ===修正报告===校对报告,包含错别字和用词不当处的位置、原文和校对后的内容、原因、建议等，无需修改的部分不用放在该报告中。

              ### 校正规则：
              1. 错别字修正（如：“真地” → “真谛”）
              2. 中文标点符号规范使用（如：“,” → “，”）
              3. 语法与常识性错误检查（如：“十年义务教育” → “九年义务教育”， “上午15点” → “下午15点”）
              4. 语境错误检查
              5. 成语用错或者成语使用不合适的地方
              6. 政策表述准确性核查（如：“十四五期间”等表述需符合2021-2025年时间框架）
              7. 时效核查，结合当前时间自动计算（如：当前是2025年，“建党102周年” → “建党104周年”）


              ### 输出示例：

              ===修正后的内容===
              [这里是修正后的文本内容]

              ===修正报告===
              | 位置 | 原文 | 校对 | 原因 | 建议 |
              |---|---|---|---|---|
              | 第一段第二行 | 十期 | 时期 | “时期”指一段时间，“十期”表述错误。 | 书写时注意区分“时期”和其他容易混淆的表述。 |
            `
					})
					break
				}

				// 通用润色
				case 'commonPolish': {
					// 获取当前文档和选中内容
					const doc = window.Application.ActiveDocument
					const selection = window.Application.Selection
					const content = selection.Range.Text || doc.Content.Text

					// 构建翻译的 prompt
					const prompt = `/no_think 请对以下内容进行通用润色：${content}`

					resolve({
						type: 'system',
						prompt: prompt,
						systemPrompt: `你是一位高效的文本优化助手，专注于对给定文本进行快速润色。
            
                ### 输出格式要求：
                ===润色后的内容===润色后的完整内容，注意保持和原文段落的结构一致
                ===润色报告===润色报告, 包含润色前后的对比、润色内容、润色原因、建议等
            
                ### 核心要求: 
                
                1. 根据文章主题,优化文章结构，使段落层次清晰,逻辑关系紧密。
                2. 修正语病与冗余表述
                3. **润色内容不要修改过多**，保持原文核心意思和结构不变
                4. 只允许对句子进行词语的替换，不建议整句的替换
                5. 时效核查，结合当前时间自动计算（如：当前是2025年，“建党102周年” → “建党104周年”）
            
                ### 示例格式：
                ===润色后的内容===
                [这里是润色后的文本内容]
            
                ===润色报告===
                [润色前后对比、润色内容、润色原因、建议等]
            `
					})
					break
				}

				// 新闻稿润色
				case 'newsPolish': {
					// 获取当前文档和选中内容
					const doc = window.Application.ActiveDocument
					const selection = window.Application.Selection
					const content = selection.Range.Text || doc.Content.Text

					// 构建翻译的 prompt
					const prompt = `/no_think 请对以下内容进行新闻稿润色：${content}`

					resolve({
						type: 'system',
						prompt: prompt,
						systemPrompt: `你是专业的新闻稿优化专家，专注于在**完全保留原文结构**和**核心信息要素**的前提下，进行精细化语言提升。

    ### 输出格式要求：
    ===润色后的内容===润色后的完整内容，注意保持和原文段落的结构一致
    ===润色报告===润色报告, 包含润色前后的对比、润色内容、润色原因、建议等

    ### 核心要求
    1. 更具时效性与吸引力，突出事件最新进展，用简洁有力的语言提炼核心看点。
    2. 修正语病与冗余表述
    3. **润色内容不要修改过多**，保持原文核心意思和结构不变
    4. 只允许对句子进行词语的替换，不建议整句的替换
    5. 时效核查，结合当前时间自动计算（如：当前是2025年，“建党102周年” → “建党104周年”）

    ### 示例格式：
    ===润色后的内容===
    [这里是润色后的文本内容]

    ===润色报告===
    [润色前后对比、润色内容、润色原因、建议等]
            `
					})
					break
				}

				case 'summarize': {
					// 获取当前文档和选中内容
					const doc = window.Application.ActiveDocument
					const content = doc.Content.Text

					// 构建翻译的 prompt
					const prompt = `请根据以下内容生成摘要：${content}`

					resolve({
						type: 'system',
						prompt: prompt,
						systemPrompt: `你是一位专业的中文文本摘要专家，具备以下核心能力：

              1. 深度理解与信息提炼：对全文进行结构化分析，精准提取关键信息。
              2. 精炼表达：生成简洁、清晰且逻辑连贯的总结内容。
              3. 内容完整性：确保不遗漏重要观点或数据，同时避免冗余描述。
            `
					})
					break
				}
				default: {
					reject(new Error(`未知的命令: ${command}`))
				}
			}
		} catch (error) {
			reject(error)
		}
	})
}

function handleMessageCallback(command, param, srcDoc) {
	let oldTrackRevisions = window.Application.ActiveDocument.TrackRevisions
	return new Promise(async (resolve, reject) => {
		try {
			switch (command) {
				case 'paiban': {
					paiban(param, srcDoc)
					resolve()
					break
				}
				case 'continuation': {
					const selection = window.Application.Selection
					const selectedText = selection.Range.Text
					if (selectedText && selectedText.trim() !== '') {
						selection.Collapse(0)
						selection.TypeParagraph()
						insertWpsContent(param)
					} else {
						insertWpsContent(param, 3)
					}
					resolve()
					break
				}
				case 'expansionPolish': {
					OpenRevision(window.Application.ActiveDocument, true, true)
					insertWpsContent(param)
					window.Application.ActiveDocument.TrackRevisions = oldTrackRevisions
					resolve()
					break
				}
				case 'abbreviation': {
					OpenRevision(window.Application.ActiveDocument, true, true)
					insertWpsContent(param)
					// const selection = window.Application.Selection
					// const selectedText = selection.Range.Text
					// if (selectedText && selectedText.trim() !== '') {
					//   insertWpsContent(param)
					// } else {
					//   insertWpsContent(param, 4)
					// }
					window.Application.ActiveDocument.TrackRevisions = oldTrackRevisions
					resolve()
					break
				}
				default: {
					resolve()
				}
			}
		} catch (error) {
			reject(error)
		}
	})
}
function paiban(params, srcDoc) {
	const processedParams = processParamsWithCenterDivCheck(params)

	window.Application.Documents.Add('', '', '', true)

	const newDoc = window.Application.ActiveDocument

	insertWpsContent(processedParams)

	restoreTables(newDoc, srcDoc)

	restoreImages(newDoc, srcDoc)

	const doc = window.Application.ActiveDocument
	if (doc) {
		const startRange = doc.Range(0, 0) // 文档开头位置
		startRange.Select()
	}
}

// 监听WPS文档中的键盘事件
function initDocumentKeyListener() {
	try {
		const doc = window.Application.ActiveDocument
		if (doc) {
			// 使用WPS的事件系统监听键盘输入
			window.Application.KeyBindings.Add('/', 'OpenCopilotTaskPane', () => {
				onbuttonclick('openTaskPane')
				return false // 阻止默认的/字符输入
			})
		}
	} catch (error) {
		console.error('初始化文档键盘监听失败:', error)
	}
}

// 在插件加载时初始化监听器
if (typeof window !== 'undefined' && window.Application) {
	// initDocumentKeyListener()
}

export default {
	onbuttonclick,
	initDocumentKeyListener,
	handlePrompt,
	handleMessageCallback
}
