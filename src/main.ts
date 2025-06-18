import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import './assets/fonts/fonts.css'
import App from './App.vue'
import { updateCanonicalLink } from './utils/seo'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize canonical link
updateCanonicalLink(window.location.pathname)

app.mount('#app')
