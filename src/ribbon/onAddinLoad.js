import Util from '@/shared/wps/util.js'
import { openTaskPane } from '@/shared/wps/func_wps.js'
import { readSettings } from '@/services/settingsService.js'

export function onAddinLoad(ribbonUI) {
	try {
		if (typeof window.Application.ribbonUI != 'object') {
			window.Application.ribbonUI = ribbonUI
		}

		if (typeof window.Application.Enum != 'object') {
			window.Application.Enum = Util.WPS_Enum
		}

		const settings = readSettings()
		if (settings.autoStart !== false) {
			openTaskPane('/chatTaskpane', 'chat_taskpane_id')
		}
	} catch (error) {
		console.error('OnAddinLoad failed:', error)
	}

	return true
}
