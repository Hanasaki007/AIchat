<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goToWeather() {
  router.push('/weather')
}
</script>

<template>
  <div class="account-container">
    <header class="account-header">
      <button class="back-btn" @click="router.back()" title="返回上一页">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>
      <div class="header-title">账户</div>
      <div class="header-placeholder"></div>
    </header>

    <main class="account-content">
      <div class="profile-section">
        <div class="avatar-wrapper">
          <div class="avatar">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
        </div>
        <div class="username">用户</div>
      </div>

      <div class="menu-section">
        <div class="menu-card">
          <div class="menu-item" @click="goToWeather()">
            <div class="menu-icon weather-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
            </div>
            <div class="menu-text">哈基米天气</div>
            <div class="menu-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
          <div class="menu-divider"></div>
          <div class="menu-item">
            <div class="menu-icon more-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <circle cx="19" cy="12" r="3"></circle>
                <circle cx="5" cy="12" r="3"></circle>
              </svg>
            </div>
            <div class="menu-text">更多哈基米开发中</div>
            <div class="menu-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="account-footer">
      <div class="developer-info">Developed by WStella</div>
    </footer>
  </div>
</template>

<style scoped>
.account-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.account-header {
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

.account-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px 20px;
  overflow-y: auto;
}

.profile-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.avatar-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(128,128,128,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4b5563;
}

.avatar svg {
  width: 60px;
  height: 60px;
}

.username {
  font-size: 28px;
  font-weight: 700;
  color: #374151;
}

.menu-section {
  width: 100%;
  max-width: 400px;
}

.menu-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  padding: 4px 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 16px;
}

.menu-item:first-child {
  border-radius: 20px 20px 0 0;
}

.menu-item:last-child {
  border-radius: 0 0 20px 20px;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.9);
}

.menu-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(128,128,128,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4b5563;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.menu-item:hover .menu-icon {
  background: rgba(156, 163, 175, 0.1);
  color: #374151;
  border-color: rgba(156, 163, 175, 0.2);
}

.menu-text {
  flex: 1;
  font-size: 18px;
  font-weight: 500;
  color: #374151;
}

.menu-arrow {
  color: #9ca3af;
  flex-shrink: 0;
}

.menu-divider {
  height: 1px;
  background: rgba(229, 231, 235, 0.8);
  margin: 0 20px;
}

.account-footer {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.developer-info {
  font-size: 12px;
  color: #6b7280;
  user-select: none;
}

@media (max-width: 640px) {
  .account-header {
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

  .avatar {
    width: 100px;
    height: 100px;
  }

  .avatar svg {
    width: 50px;
    height: 50px;
  }

  .username {
    font-size: 24px;
  }

  .menu-item {
    padding: 14px 16px;
  }

  .menu-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
  }

  .menu-text {
    font-size: 16px;
  }

  .developer-info {
    font-size: 11px;
  }
}
</style>
