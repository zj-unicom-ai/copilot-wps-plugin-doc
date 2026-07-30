import { defineStore } from 'pinia'
//记录用户选择的排版模板类型 默认为1，就是通用公文，后续需要扩展
export const usePaibanStore = defineStore('paiban', {
	state: () => ({ type: 1 }),
	getters: {
		getType: (state) => state.type
	},
	actions: {
		setType(type) {
			this.type = type
		}
	},
	// Pinia 持久化插件需要额外安装
	persist: true
})
