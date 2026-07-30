import { onAddinLoad } from './onAddinLoad.js'
import { getRibbonImage } from './imageMap.js'
import { handleChatAction } from './actions/chat.js'
import { handlePolishAction } from './actions/polish.js'
import { handleSettingsAction } from './actions/settings.js'
import { onToolboxAction } from './actions/toolbox.js'

function OnAction(control) {
	try {
		const eleId = control.Id
		if (handleChatAction(eleId)) return true
		if (handlePolishAction(eleId)) return true
		if (handleSettingsAction(eleId)) return true
	} catch (error) {
		console.error('OnAction failed:', control?.Id, error)
	}
	return true
}

function GetImage(control) {
	return getRibbonImage(control.Id)
}

function OnGetEnabled() {
	return true
}

function OnGetVisible() {
	return true
}

const ribbon = {
	OnAddinLoad: onAddinLoad,
	OnAction,
	GetImage,
	OnGetEnabled,
	OnGetVisible,
	onToolboxAction
}

if (typeof window !== 'undefined') {
	window.ribbon = ribbon
}

export default ribbon
