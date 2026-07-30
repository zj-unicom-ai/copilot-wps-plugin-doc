const polishChannelUtil = {
	timer: null,
	// 发送消息
	send(message) {
		window.Application.PluginStorage.setItem('polish_command', JSON.stringify(message))
	},
	// 订阅
	subscribe(callback) {
		this.timer = setInterval(() => {
			const message = window.Application.PluginStorage.getItem('polish_command')
			if (message) {
				callback(JSON.parse(message))
				window.Application.PluginStorage.removeItem('polish_command')
			}
		}, 300)
	},
	unsubscribe() {
		this.timer && clearInterval(this.timer)
		this.timer = null
	}
}

export default polishChannelUtil
