import { openTaskPane } from '@/shared/wps/func_wps.js'

export function handleSettingsAction(controlId) {
	switch (controlId) {
		case 'btnRefresh':
			if (window.messageUtil) {
				window.messageUtil.send({ type: 'versionUpdate' })
			} else {
				window.location.reload(true)
			}
			return true
		case 'btnSetting':
			openTaskPane('/settings', 'settings_id')
			return true
		default:
			return false
	}
}
