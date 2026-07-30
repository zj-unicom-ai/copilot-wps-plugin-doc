import './shared/styles/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'
import router from './router'
import ribbon from '@/utils/ribbon.js'
import messageUtil from '@/utils/messageUtil.js'

// WPS 会在 Vue 挂载前调用 ribbon.OnAddinLoad，需尽早暴露全局对象
window.ribbon = ribbon
window.messageUtil = messageUtil

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

createApp(App).use(router).use(Antd).use(pinia).mount('#app')
