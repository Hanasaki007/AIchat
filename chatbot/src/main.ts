import { createApp } from 'vue'
import { createPinia } from 'pinia'

import AppWrapper from './AppWrapper.vue'
import router from './router'

const app = createApp(AppWrapper)

app.use(createPinia())
app.use(router)

app.mount('#app')
