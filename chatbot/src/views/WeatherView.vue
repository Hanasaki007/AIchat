<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const cityInput = ref('')
const loading = ref(false)
const error = ref('')
const weatherData = ref<any>(null)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003'

async function getWeather() {
  if (!cityInput.value.trim()) {
    error.value = '请输入城市名称'
    return
  }

  loading.value = true
  error.value = ''
  weatherData.value = null

  try {
    const url = API_URL.startsWith('http')
      ? `${API_URL}/api/weather?city=${encodeURIComponent(cityInput.value)}`
      : `${API_URL}/weather?city=${encodeURIComponent(cityInput.value)}`

    const response = await fetch(url)
    const text = await response.text()

    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('服务器返回格式错误，请检查后端服务是否正常')
    }

    if (!response.ok) {
      throw new Error(data.error || '获取天气失败')
    }

    weatherData.value = data
  } catch (err: any) {
    error.value = err.message || '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

function getWeatherIcon(code: string) {
  return new URL(`../assets/weather-img/${code}.png`, import.meta.url).href
}

function handleKeyPress(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    getWeather()
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(today)
  dayAfter.setDate(dayAfter.getDate() + 2)

  if (date.toDateString() === today.toDateString()) {
    return '今天'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return '明天'
  } else if (date.toDateString() === dayAfter.toDateString()) {
    return '后天'
  } else {
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekDays[date.getDay()]
  }
}
</script>

<template>
  <div class="weather-container">
    <header class="weather-header">
      <button class="back-btn" @click="router.back()" title="返回上一页">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>
      <div class="header-title">哈基米天气</div>
      <div class="header-placeholder"></div>
    </header>

    <main class="weather-content">
      <div class="search-section">
        <div class="search-wrapper">
          <input
            v-model="cityInput"
            type="text"
            class="search-input"
            placeholder="输入城市名称（如：北京、上海）"
            @keydown="handleKeyPress"
          />
          <button
            class="search-btn"
            :class="{ active: cityInput.trim() && !loading }"
            @click="getWeather()"
            :disabled="!cityInput.trim() || loading"
          >
            <span v-if="loading">搜索中</span>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <div v-if="weatherData && weatherData.results" class="weather-card">
        <div v-for="(result, index) in weatherData.results" :key="index" class="weather-info">
          <div class="location-info">
            <div class="city-name">{{ result.location.name }}</div>
          </div>

          <div class="weather-main">
            <div class="weather-icon-wrapper">
              <img :src="getWeatherIcon(result.now.code)" :alt="result.now.text" class="weather-icon" />
            </div>
            <div class="temperature">{{ result.now.temperature }}°C</div>
            <div class="weather-text">{{ result.now.text }}</div>
          </div>

          <div class="forecast-section" v-if="result.daily && result.daily.length">
            <div class="forecast-title">未来3天天气预报</div>
            <div class="forecast-list">
              <div v-for="(day, dayIndex) in result.daily" :key="dayIndex" class="forecast-item">
                <div class="forecast-date">{{ formatDate(day.date) }}</div>
                <div class="forecast-icon-wrapper">
                  <img :src="getWeatherIcon(day.code_day)" :alt="day.text_day" class="forecast-icon" />
                </div>
                <div class="forecast-text">{{ day.text_day }}</div>
                <div class="forecast-temp">
                  <span class="temp-high">{{ day.high }}°</span>
                  <span class="temp-divider">/</span>
                  <span class="temp-low">{{ day.low }}°</span>
                </div>
              </div>
            </div>
          </div>

          <div class="update-time">
            更新时间：{{ new Date(result.last_update).toLocaleString('zh-CN') }}
          </div>
        </div>
      </div>

      <div v-if="!weatherData && !error && !loading" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
        <p>输入城市名称查询天气</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.weather-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.weather-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  z-index: 100;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  cursor: pointer;
  color: #374151;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

.header-title {
  font-size: 20px;
  font-weight: 600;
  color: #374151;
}

.header-placeholder {
  width: 40px;
  height: 40px;
}

.weather-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.search-section {
  margin-bottom: 20px;
}

.search-wrapper {
  display: flex;
  gap: 12px;
  max-width: 500px;
  margin: 0 auto;
}

.search-input {
  flex: 1;
  height: 50px;
  padding: 0 18px;
  border: none;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(128,128,128,0.5);
  border-radius: 14px;
  font-size: 15px;
  outline: none;
  transition: all 0.3s ease;
  color: #374151;
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.1);
}

.search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border: 1px solid rgba(128,128,128,0.5);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: gray;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
}

.search-btn.active {
  background: #6b7280;
  border-color: #6b7280;
  color: white;
}

.search-btn.active:hover:not(:disabled) {
  background: #4b5563;
  border-color: #4b5563;
}

.search-btn:hover:not(:disabled):not(.active) {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.9);
}

.search-btn:disabled {
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.5);
  color: #9ca3af;
}

.error-message {
  max-width: 500px;
  margin: 0 auto 20px;
  padding: 14px 18px;
  background: rgba(254, 242, 242, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(252, 165, 165, 0.8);
  border-radius: 12px;
  color: #b91c1c;
  font-size: 14px;
  text-align: center;
}

.weather-card {
  max-width: 500px;
  margin: 0 auto;
}

.weather-info {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.location-info {
  text-align: center;
  margin-bottom: 24px;
}

.city-name {
  font-size: 28px;
  font-weight: 700;
  color: #374151;
}

.weather-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 28px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
}

.weather-icon-wrapper {
  width: 140px;
  height: 140px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.weather-icon {
  width: 100px;
  height: 100px;
  object-fit: contain;
}

.temperature {
  font-size: 64px;
  font-weight: 800;
  color: #374151;
  line-height: 1;
  margin-bottom: 8px;
}

.weather-text {
  font-size: 22px;
  font-weight: 600;
  color: #4b5563;
}

.forecast-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(229, 231, 235, 0.8);
}

.forecast-title {
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
  text-align: center;
}

.forecast-list {
  display: flex;
  gap: 12px;
}

.forecast-item {
  flex: 1;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.forecast-item:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.forecast-date {
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.forecast-icon-wrapper {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.forecast-icon {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.forecast-text {
  font-size: 14px;
  font-weight: 500;
  color: #4b5563;
}

.forecast-temp {
  font-size: 17px;
  font-weight: 700;
}

.temp-high {
  color: #374151;
}

.temp-divider {
  color: #9ca3af;
  margin: 0 4px;
}

.temp-low {
  color: #6b7280;
}

.update-time {
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  padding-top: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #6b7280;
  text-align: center;
}

.empty-state svg {
  margin-bottom: 20px;
  opacity: 0.4;
}

.empty-state p {
  font-size: 16px;
  margin-bottom: 8px;
}

@media (max-width: 640px) {
  .weather-header {
    padding: 10px 16px;
  }

  .header-title {
    font-size: 18px;
  }

  .back-btn {
    width: 36px;
    height: 36px;
  }

  .header-placeholder {
    width: 36px;
    height: 36px;
  }

  .weather-content {
    padding: 16px 12px;
  }

  .search-input,
  .search-btn {
    height: 46px;
  }

  .weather-info {
    padding: 20px;
  }

  .weather-icon-wrapper {
    width: 100px;
    height: 100px;
  }

  .weather-main {
    padding: 16px;
  }

  .weather-icon-wrapper {
    width: 110px;
    height: 110px;
  }

  .weather-icon {
    width: 76px;
    height: 76px;
  }

  .temperature {
    font-size: 52px;
  }

  .weather-text {
    font-size: 18px;
  }

  .city-name {
    font-size: 24px;
  }

  .forecast-list {
    gap: 8px;
  }

  .forecast-item {
    padding: 14px 8px;
  }

  .forecast-icon-wrapper {
    width: 52px;
    height: 52px;
    background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  }

  .forecast-icon {
    width: 38px;
    height: 38px;
  }

  .forecast-text {
    font-size: 13px;
  }

  .forecast-temp {
    font-size: 15px;
  }
}
</style>
