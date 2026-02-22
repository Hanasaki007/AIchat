<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  document.addEventListener('touchstart', function(event) {
    if (event.touches.length > 1) {
      event.preventDefault()
    }
  }, { passive: false })

  let lastTouchEnd = 0
  document.addEventListener('touchend', function(event) {
    const now = Date.now()
    if (now - lastTouchEnd <= 300) {
      event.preventDefault()
    }
    lastTouchEnd = now
  }, { passive: false })

  document.addEventListener('gesturestart', function(event) {
    event.preventDefault()
  }, { passive: false })

  document.addEventListener('gesturechange', function(event) {
    event.preventDefault()
  }, { passive: false })

  document.addEventListener('gestureend', function(event) {
    event.preventDefault()
  }, { passive: false })
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  touch-action: manipulation;
}

html, body {
  height: 100%;
  overflow-x: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  touch-action: manipulation;
}

#app {
  height: 100%;
  overflow-x: hidden;
  touch-action: manipulation;
}
</style>
