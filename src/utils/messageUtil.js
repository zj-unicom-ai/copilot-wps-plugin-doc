const bc = new BroadcastChannel('wps')

const messageUtil = {
	send(message) {
		bc.postMessage(message)
	},

	addEventListener(callback) {
		const wrapper = (event) => {
			try {
				Promise.resolve(callback(event)).catch((err) => {
					console.error('messageUtil handler failed:', err ?? 'unknown')
				})
			} catch (err) {
				console.error('messageUtil handler failed:', err ?? 'unknown')
			}
		}
		bc.addEventListener('message', wrapper)
		return () => {
			bc.removeEventListener('message', wrapper)
		}
	},

	close() {
		bc.close()
	}
}

export default messageUtil
