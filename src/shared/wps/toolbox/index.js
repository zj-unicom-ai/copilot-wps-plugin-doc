import {
	btnCnToEnPunct,
	btnEnToCnPunct,
	btnApostropheConvert,
	btnQuoteConvert
} from './punctuation.js'
import {
	btnGhostCharToSpace,
	btnDeleteSpaces,
	btnDeleteEmptyLines,
	btnDeleteGhostChar,
	btnDeleteBlankPage
} from './cleanup.js'
import {
	btnClearFormat,
	btnRemoveHyperlinks,
	btnRemoveUnderline,
	btnRemoveHeaderLine
} from './format.js'
import {
	btnInsertCursor,
	btnTableHeaderRepeat,
	btnSelectAllTable,
	btnAutoAdjustTable
} from './table.js'
import { btnSetBackgroundColor, btnInsertBackgroundImage, btnInsertImage } from './background.js'
import { btnDesensitize } from './desensitize.js'

// 工具箱功能元数据，供意图识别使用
export const toolboxFunctions = {
	btnEnToCnPunct: {
		name: '英文标点转中文',
		description: '将文档中的英文标点符号转换为中文标点符号',
		message: '我想要将文档中的英文标点符号转换为中文标点符号。'
	},
	btnCnToEnPunct: {
		name: '中文标点转英文',
		description: '将文档中的中文标点符号转换为英文标点符号',
		message: '我想要将文档中的中文标点符号转换为英文标点符号。'
	},
	btnGhostCharToSpace: {
		name: '幽灵字符转空格',
		description: '将文档中的不可见幽灵字符替换为空格',
		message: '我想要将文档中的幽灵字符替换为空格。'
	},
	btnApostropheConvert: {
		name: '单引号转双引号',
		description: '将文档中的单引号转换为双引号',
		message: '我想要将文档中的单引号转换为双引号。'
	},
	btnQuoteConvert: {
		name: '双引号转单引号',
		description: '将文档中的双引号转换为单引号',
		message: '我想要将文档中的双引号转换为单引号。'
	},
	btnDeleteSpaces: {
		name: '删除空格',
		description: '删除文档中的空格',
		message: '我想要删除文档中的所有空格。'
	},
	btnDeleteEmptyLines: {
		name: '删除多余空行',
		description: '删除文档中多余的空行',
		message: '我想要删除文档中多余的空行。'
	},
	btnClearFormat: {
		name: '清除格式',
		description: '清除选中文本的所有格式',
		message: '我想要清除选中文本的格式。'
	},
	btnRemoveHyperlinks: {
		name: '去除超链接',
		description: '去除文档中所有超链接',
		message: '我想要去除文档中的所有超链接。'
	},
	btnRemoveUnderline: {
		name: '消除下划波浪线',
		description: '消除文档中所有的下划线',
		message: '我想要消除文档中的所有下划线。'
	},
	btnRemoveHeaderLine: {
		name: '去除页眉横线',
		description: '去除文档页眉中的横线',
		message: '我想要去除文档页眉中的横线。'
	},
	btnDeleteGhostChar: {
		name: '删除幽灵字符',
		description: '删除文档中的不可见幽灵字符',
		message: '我想要删除文档中的不可见幽灵字符。'
	},
	btnDeleteBlankPage: {
		name: '删除空白页',
		description: '删除文档中的空白页面',
		message: '我想要删除文档中的空白页面。'
	},
	btnAutoAdjustTable: {
		name: '自动调整表格',
		description: '自动调整选中表格的列宽',
		message: '我想要自动调整选中表格的列宽。'
	},
	btnInsertBackgroundImage: {
		name: '设置背景图片',
		description: '设置背景图片',
		message: '我想要设置背景图片。'
	},
	btnSetBackgroundColor: {
		name: '设置背景颜色',
		description: '设置背景颜色',
		message: '我想要设置背景颜色。'
	},
	btnInsertImage: {
		name: '表格中插入图片',
		description: '表格中插入图片',
		message: '我想要在表格中插入图片。'
	},
	btnDesensitize: {
		name: '一键脱敏',
		description:
			'对文档中的敏感信息进行脱敏处理，用*替代敏感内容（身份证号、手机号、银行卡号、邮箱、护照号等）',
		message:
			'我想要对文档中的敏感信息（身份证号、手机号、银行卡号、邮箱等）进行脱敏处理，用*替代敏感内容。'
	}
}

// 工具箱动作分发入口
export default function runToolboxAction(control) {
	const eleId = control.Id
	switch (eleId) {
		case 'btnEnToCnPunct':
			btnEnToCnPunct()
			break
		case 'btnCnToEnPunct':
			btnCnToEnPunct()
			break
		case 'btnGhostCharToSpace':
			btnGhostCharToSpace()
			break
		case 'btnApostropheConvert':
			btnApostropheConvert()
			break
		case 'btnQuoteConvert':
			btnQuoteConvert()
			break
		case 'ctxBtnDeleteSpaces':
		case 'btnDeleteSpaces':
			btnDeleteSpaces()
			break
		case 'btnDeleteEmptyLines':
			btnDeleteEmptyLines()
			break
		case 'btnClearFormat':
			btnClearFormat()
			break
		case 'btnRemoveHyperlinks':
			btnRemoveHyperlinks()
			break
		case 'btnRemoveUnderline':
			btnRemoveUnderline()
			break
		case 'btnRemoveHeaderLine':
			btnRemoveHeaderLine()
			break
		case 'btnDeleteGhostChar':
			btnDeleteGhostChar()
			break
		case 'btnInsertCursor':
			btnInsertCursor()
			break
		case 'btnTableHeaderRepeat':
			btnTableHeaderRepeat()
			break
		case 'btnSelectAllTable':
			btnSelectAllTable()
			break
		case 'btnDeleteBlankPage':
			btnDeleteBlankPage()
			break
		case 'btnInsertImage':
			btnInsertImage()
			break
		case 'btnAutoAdjustTable':
			btnAutoAdjustTable()
			break
		case 'btnSetBackgroundColor':
			btnSetBackgroundColor()
			break
		case 'btnInsertBackgroundImage':
			btnInsertBackgroundImage()
			break
		case 'btnDesensitize':
			btnDesensitize()
			break
		default:
			break
	}
}
