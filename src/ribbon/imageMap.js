export const RIBBON_IMAGE_MAP = {
	wpsAddinTab: 'images/logo.png',
	Menu_ContextMenuText: 'images/logo.png',
	btnShowChatTaskPane: 'images/AI助手.svg',
	btnShowMindMap: 'images/文档脑图.svg',
	ctxBtnTextErrorCorrection: 'images/文本纠错.svg',
	btnTextErrorCorrection: 'images/文本纠错.svg',
	menuPolishbox: 'images/润色.svg',
	ContextMenu_Polishbox: 'images/润色.svg',
	btnContinuation: 'images/续写.svg',
	btnWriting: 'images/写作.svg',
	menuToolbox: 'images/工具箱.svg',
	btnShowPaiBan: 'images/排版.svg',
	ctxBtnTranslate: 'images/翻译.svg',
	btnTranslate: 'images/翻译.svg',
	menuHelp: 'images/设置&帮助.svg',
	ctxBtnDeleteSpaces: 'images/删除空格.svg',
	btnDeleteSpaces: 'images/删除空格.svg'
}

export function getRibbonImage(controlId) {
	return RIBBON_IMAGE_MAP[controlId] || 'images/AI助手.svg'
}
