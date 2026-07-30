import Util from './util.js'

// 新增复制当前文档
export const openCopyDoc = (name = '润色') => {
	const activeDoc = window.Application.ActiveDocument
	if (!activeDoc) return

	const newDoc = window.Application.Documents.Add()

	try {
		// 生成唯一文件名
		const tempPath = activeDoc.Path + window.Application.PathSeparator
		const oldName = activeDoc.Name.replace(/\.docx$/, '')
		const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) // 生成时间戳
		const fileName = `${name}_${oldName}_${timestamp}.docx`
		const fullPath = `${tempPath}\\${fileName}`

		// 保存新文档到临时目录
		newDoc.SaveAs(fullPath)
	} catch (error) {
		console.error(error)
		alert('文档保存失败，请稍后重试')
		return newDoc
	}

	// 复制原文档内容
	activeDoc.Content.Copy()
	// 在新文档中粘贴内容
	newDoc.Content.Paste()

	// 激活新文档窗口
	newDoc.Activate()

	return newDoc
}

//任务窗格存储的key
const TASK_PANES_STORAGE_KEY = 'all_taskpanes'

// 获取存储的任务窗格数组
const getStoredTaskPanes = () => {
	const stored = window.Application.PluginStorage.getItem(TASK_PANES_STORAGE_KEY)
	return stored ? JSON.parse(stored) : []
}

// 保存任务窗格数组
const saveTaskPanes = (panes) => {
	window.Application.PluginStorage.setItem(TASK_PANES_STORAGE_KEY, JSON.stringify(panes))
}

export const saveWindowDevicePixelRatio = () => {
	window.Application.PluginStorage.setItem('devicePixelRatio', window.devicePixelRatio)
}

const getWindowDevicePixelRatio = () => {
	let devicePixelRatio = window.Application.PluginStorage.getItem('devicePixelRatio')
	return devicePixelRatio || 1
}

export const getTaskPane = (idKey) => {
	const storedPanes = getStoredTaskPanes()
	const existingPane = storedPanes.find((pane) => pane.key === idKey)
	let taskpane = window.Application.GetTaskPane(existingPane.id)
	return taskpane
}

// 关闭任务窗格
export const closeExistingTaskPane = () => {
	const storedPanes = getStoredTaskPanes()

	storedPanes.forEach(({ id }) => {
		try {
			const tskpane = window.Application.GetTaskPane(id)
			if (tskpane) {
				tskpane.Visible = false
			}
		} catch (error) {
			console.error(`关闭任务窗格失败: ${error}`)
		}
	})
}

// 清除所有任务窗格
export const clearAllTaskPanes = () => {
	const storedPanes = getStoredTaskPanes()

	storedPanes.forEach(({ id }) => {
		try {
			const tskpane = window.Application.GetTaskPane(id)
			if (tskpane) {
				tskpane.Visible = false
				tskpane.Delete()
			}
		} catch (error) {
			console.error(`删除任务窗格失败: ${error}`)
		}
	})

	// 清除存储的任务窗格记录
	window.Application.PluginStorage.removeItem(TASK_PANES_STORAGE_KEY)
}

// 清除指定任务窗格
export const clearTaskPane = (idKey) => {
	const storedPanes = getStoredTaskPanes()
	const index = storedPanes.findIndex((pane) => pane.key === idKey)

	if (index !== -1) {
		try {
			const paneInfo = storedPanes[index]
			const tskpane = window.Application.GetTaskPane(paneInfo.id)
			if (tskpane) {
				tskpane.Visible = false
				tskpane.Delete()
			}
			storedPanes.splice(index, 1)
			saveTaskPanes(storedPanes)
		} catch (error) {
			console.error(`删除任务窗格失败: ${error}`)
		}
	}
}

// 修改打开任务窗格函数
export const openTaskPane = (url, idKey, isShow = true, openNew = false) => {
	try {
		closeExistingTaskPane()
		const storedPanes = getStoredTaskPanes()
		const existingPane = storedPanes.find((pane) => pane.key === idKey)
		let tskpane
		const pageList = ['/mindMap']
		const isNewPage = pageList.includes(url) || openNew
		if (!existingPane || isNewPage) {
			const fullUrl = Util.GetUrlPath() + Util.GetRouterHash() + url
			tskpane = window.Application.CreateTaskPane(fullUrl)

			try {
				tskpane.Caption = 'AI智写'
			} catch (error) {
				console.error('设置TaskPane标题失败:', error)
			}

			if (isNewPage) {
				// 清除旧的taskPane
				const index = storedPanes.findIndex((pane) => pane.key === idKey)
				if (index !== -1) {
					try {
						// 获取旧的taskPane并清除
						const oldPane = window.Application.GetTaskPane(storedPanes[index].id)
						if (oldPane) {
							oldPane.Delete()
						}
						// 从存储中移除
						storedPanes.splice(index, 1)
						// 更新存储
						saveTaskPanes(storedPanes)
					} catch (error) {
						console.error('清除旧的taskPane失败:', error)
					}
				}
			}

			storedPanes.push({
				id: tskpane.ID,
				key: idKey
			})

			saveTaskPanes(storedPanes)
		} else {
			tskpane = window.Application.GetTaskPane(existingPane.id)

			try {
				if (window.__paiban_initPage && typeof window.__paiban_initPage === 'function') {
					window.__paiban_initPage()
				}
			} catch (error) {
				console.error('调用页面初始化方法失败:', error)
			}
		}

		tskpane.Visible = true
		tskpane.Visible = isShow

		if (!existingPane || isNewPage) {
			setTimeout(() => {
				if (isMacOS()) {
					tskpane.Width = (440 * getWindowDevicePixelRatio()) / 2
					setTimeout(() => {
						tskpane.MinWidth = (440 * getWindowDevicePixelRatio()) / 2
					}, 1000)
				} else {
					tskpane.Width = 440 * getWindowDevicePixelRatio()
					setTimeout(() => {
						tskpane.MinWidth = 440 * getWindowDevicePixelRatio()
					}, 1000)
				}
			}, 100)
		}

		return tskpane
	} catch (error) {
		console.error('打开TaskPane失败:', error)
		throw error
	}
}

// 修改判断任务窗格是否可见的函数
export const isTaskPaneVisible = (idKey) => {
	const storedPanes = getStoredTaskPanes()
	const existingPane = storedPanes.find((pane) => pane.key === idKey)

	if (!existingPane) {
		return false
	}

	try {
		const tskpane = window.Application.GetTaskPane(existingPane.id)
		return tskpane.Visible
	} catch {
		return false
	}
}

// 判断任务窗格是否存在的函数
export const isTaskPaneExist = (idKey) => {
	const storedPanes = getStoredTaskPanes()
	return storedPanes.some((pane) => pane.key === idKey)
}

function isMacOS() {
	return /^Mac/i.test(navigator.platform)
}

// 打开、关闭修订
export const OpenRevision = (doc, bOpenRevision, bShowRevision) => {
	if (!doc) return

	const orignalName = window.Application.UserName
	if (orignalName !== 'AI智写') {
		window.Application.UserName = 'AI智写'
	}

	// 初始化修订模式
	doc.TrackRevisions = bOpenRevision // //如果标记对指定文档的修改，则该属性值为True
	// doc.ShowRevisions = true //如果标记对指定文档的修改，则该属性值为True

	const Options = window.Application.Options
	Options.DeletedTextColor = window.Application.Enum.wdColorRed //设置删除文本颜色wdColorRed
	Options.InsertedTextColor = window.Application.Enum.wdColorGreen //设置插入文本颜色
	Options.RevisedLinesColor = window.Application.Enum.wdColorGreen

	const l_v = doc.ActiveWindow.View
	l_v.ShowRevisionsAndComments = bShowRevision // 如果为True，则 WPS 显示使用"修订"功能对文档所作的修订和批注
	l_v.RevisionsBalloonShowConnectingLines = bShowRevision //如果为 True，则 WPS 显示从文本到修订和批注气球之间的连接线
	l_v.ShowInsertionsAndDeletions = bShowRevision //如果为 True，则 WPS 显示插入和删除
	// ShowFormatChanges 是否显示格式变化

	window.Application.CommandBars.ExecuteMso('ReviewShowRevisorInformationInBalloons')

	// l_v.ShowMarkupAreaHighlight = true
	// window.Application.CommandBars.ExecuteMso('KsoEx_RevisionCommentModify_Disable') //去掉修改痕迹信息框中的接受修订和拒绝修订勾叉，使其不可用
	// l_v.RevisionsMode = 2 //2为不支持气泡显示。
}

// 批量设置修订者姓名
export const setRevisionAuthor = (doc, name) => {
	if (!doc) return

	const revisions = doc.Revisions
	for (let i = 1; i <= revisions.Count; i++) {
		const revision = revisions.Item(i)
		// console.log('设置修订者姓名:', revision)
		revision.Author = name || 'AI智写'
	}
}

// 获取 WPS 版本号
export const getWpsVersion = () => {
	try {
		if (window.Application && window.Application.Build) {
			return window.Application.Build
		}
		return null
	} catch (error) {
		console.error('获取 WPS 版本号失败:', error)
		return null
	}
}

// 检查版本是否允许导出（版本号 >= 指定版本才允许）
export const isExportAllowed = (minVersion = '12.1.0.0') => {
	const currentVersion = getWpsVersion()
	// console.log('获取到的版本号：', currentVersion);
	if (!currentVersion) {
		console.warn('无法获取 WPS 版本号，默认允许导出')
		return true
	}
	// 版本号比较：将版本号按 . 分割后逐段比较
	const current = currentVersion.split('.').map(Number)
	const min = minVersion.split('.').map(Number)
	for (let i = 0; i < Math.max(current.length, min.length); i++) {
		const c = current[i] || 0
		const m = min[i] || 0
		if (c > m) return true
		if (c < m) return false
	}
	return true // 版本相等
}
