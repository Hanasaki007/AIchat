import { createRouter, createWebHistory } from 'vue-router'
import ChatView from '../views/ChatView.vue'
import AccountView from '../views/AccountView.vue'
import WeatherView from '../views/WeatherView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'chat',
      component: ChatView
    },
    {
      path: '/account',
      name: 'account',
      component: AccountView
    },
    {
      path: '/weather',
      name: 'weather',
      component: WeatherView
    }
  ],
})

export default router
