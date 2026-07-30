import { openTaskPane } from '@/shared/wps/func_wps.js'
import messageUtil from '@/utils/messageUtil.js'
import { TOOLBOX_IDS } from '../constants.js'

export function onToolboxAction(control) {
	try {
		const eleId = control.Id
		if (TOOLBOX_IDS.includes(eleId)) {
			openTaskPane('/chatTaskpane', 'chat_taskpane_id')
			messageUtil.send({
				type: 'toolbox-command',
				data: { commandId: eleId }
			})
		}
	} catch (error) {
		console.error('onToolboxAction failed:', control?.Id, error)
	}
	return true
}
