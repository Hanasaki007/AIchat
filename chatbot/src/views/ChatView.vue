<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'
import { marked, type Tokens } from 'marked'
import markedKatexExtension from 'marked-katex-extension'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import avatarImage from '../assets/avatar.jpg'
import userAvatarImage from '../assets/avatar-user.png'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', html)
hljs.registerLanguage('xml', html)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)

const chatStore = useChatStore()
const router = useRouter()
const inputContent = ref('')
const messagesEnd = ref<HTMLElement | null>(null)
let abortController: AbortController | null = null
let longPressTimer: ReturnType<typeof setTimeout> | null = null
const longPressDuration = 500
const copiedIndex = ref<number | null>(null)

function handleLongPress(index: number) {
  longPressTimer = setTimeout(() => {
    copiedIndex.value = index
  }, longPressDuration)
}

function handleLongPressEnd() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function hideCopyButton() {
  copiedIndex.value = null
}

async function copyMessage(index: number) {
  const message = chatStore.messages[index]
  if (!message) return

  let textToCopy = message.content

  if (message.role === 'assistant' && message.reasoningContent) {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = renderMarkdown(message.content)
    textToCopy = tempDiv.textContent || tempDiv.innerText || message.content
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(textToCopy)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = textToCopy
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setTimeout(() => {
      copiedIndex.value = null
    }, 1500)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

const renderer = {
  code(token: Tokens.Code): string {
    const code = token.text
    const language = token.lang
    let highlighted: string
    if (language && hljs.getLanguage(language)) {
      try {
        highlighted = hljs.highlight(code, { language }).value
      } catch {
        highlighted = hljs.highlightAuto(code).value
      }
    } else {
      highlighted = hljs.highlightAuto(code).value
    }
    return `<pre><code class="hljs">${highlighted}</code></pre>`
  }
}

marked.use({ renderer })
marked.use(markedKatexExtension({
  throwOnError: false,
  trust: true,
  nonStandard: true
}))
marked.setOptions({
  breaks: true,
  gfm: true
})

onMounted(() => {
  chatStore.loadFromStorage()
  scrollToBottom()
})

watch(() => chatStore.messages, () => {
  scrollToBottom()
}, { deep: true })

function scrollToBottom() {
  nextTick(() => {
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
  })
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003'

function renderMarkdown(content: string): string {
  if (!content) return ''
  return marked.parse(content) as string
}

async function sendMessage() {
  if (chatStore.isLoading && abortController) {
    abortController.abort()
    abortController = null
    chatStore.isLoading = false
    return
  }

  const content = inputContent.value.trim()
  if (!content || chatStore.isLoading) return

  chatStore.addUserMessage(content)
  inputContent.value = ''
  chatStore.isLoading = true
  chatStore.startStreamingMessage(chatStore.isThinking)

  abortController = new AbortController()

  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: abortController.signal,
      body: JSON.stringify({
        messages: chatStore.messages.slice(0, -1).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        thinking: chatStore.isThinking
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No reader available')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            continue
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              chatStore.appendToLastMessage(`错误: ${parsed.error.message || JSON.stringify(parsed.error)}`)
              continue
            }
            if (parsed.choices && parsed.choices.length > 0) {
              const choice = parsed.choices[0]
              const delta = choice.delta
              if (delta) {
                if (delta.reasoning_content) {
                  chatStore.appendToLastReasoning(delta.reasoning_content)
                }
                if (delta.content) {
                  chatStore.appendToLastMessage(delta.content)
                }
              }
            }
          } catch {
            // skip invalid JSON
          }
        }
      }
    }

    chatStore.finishStreaming()

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      chatStore.appendToLastMessage('\n\n[已停止生成]')
      chatStore.finishStreaming()
      chatStore.isLoading = false
      abortController = null
      return
    }

    console.error('Error:', error)
    let errorMessage = '网络错误，请检查后端服务是否启动。'
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        errorMessage = '无法连接到后端服务，请确保后端服务已启动。'
      } else {
        errorMessage = error.message
      }
    }
    chatStore.appendToLastMessage(errorMessage)
    chatStore.finishStreaming()
  } finally {
    chatStore.isLoading = false
    abortController = null
  }
}

function handleKeyPress(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <div class="chat-container" @click="hideCopyButton">
    <header class="header">
      <button
        class="icon-btn trash-btn"
        @click="chatStore.clearAllData()"
        title="清空所有对话"
        :disabled="chatStore.isLoading"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
      <h1 class="app-title">哈基米AI</h1>
      <button
        class="icon-btn user-btn"
        @click="router.push('/account')"
        title="用户账户"
        :disabled="chatStore.isLoading"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </button>
    </header>

    <main class="messages-container">
      <div v-if="chatStore.messages.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <p>今天有什么可以帮到你</p>
      </div>

      <div v-for="(message, index) in chatStore.messages" :key="index" class="message-wrapper">
        <div
          :class="['message', message.role]"
          @mousedown="handleLongPress(index)"
          @mouseup="handleLongPressEnd"
          @mouseleave="handleLongPressEnd"
          @touchstart="handleLongPress(index)"
          @touchend="handleLongPressEnd"
          @click.stop
        >
          <div class="message-avatar">
            <img v-if="message.role === 'user'" :src="userAvatarImage" alt="User" class="avatar-img">
            <img v-else :src="avatarImage" alt="AI" class="avatar-img">
          </div>
          <div class="message-content">
            <div v-if="message.reasoningContent" class="reasoning-wrapper">
              <button
                class="reasoning-toggle"
                @click="chatStore.toggleReasoningExpanded(index)"
              >
                <span class="toggle-icon">{{ message.isReasoningExpanded ? '▼' : '▶' }}</span>
                <span>思考过程</span>
              </button>
              <div v-if="message.isReasoningExpanded" class="reasoning-content">
                <div class="reasoning-text markdown-body" v-html="renderMarkdown(message.reasoningContent)"></div>
              </div>
            </div>
            <div
              v-if="message.role === 'assistant'"
              class="message-text markdown-body"
              v-html="renderMarkdown(message.content)"
            ></div>
            <div v-else class="message-text">{{ message.content }}</div>
            <span v-if="message.isStreaming" class="cursor-blink"><span></span><span></span><span></span></span>
          </div>
        </div>
        <div v-if="copiedIndex === index" class="copy-actions">
          <button class="copy-btn" @click.stop="copyMessage(index)">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>复制</span>
          </button>
        </div>
      </div>

      <div ref="messagesEnd"></div>
    </main>

    <footer class="input-area">
      <div class="input-wrapper">
        <div class="thinking-toggle" :class="{ active: chatStore.isThinking }" @click="chatStore.toggleThinking()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span class="toggle-text-full">{{ chatStore.isThinking ? '启用思考' : '关闭思考' }}</span>
          <span class="toggle-text-mobile">思考</span>
        </div>
        <input
          v-model="inputContent"
          type="text"
          class="input-field"
          placeholder="输入消息..."
          @keydown="handleKeyPress"
          :disabled="chatStore.isLoading"
        />
        <button
          class="send-btn"
          :class="{ active: inputContent.trim() }"
          @click="sendMessage()"
          :disabled="!inputContent.trim() && !chatStore.isLoading"
        >
          <svg v-if="!chatStore.isLoading" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        </button>
      </div>
      <div class="developer-info">Developed by WStella</div>
    </footer>
  </div>
</template>

<style>
@import 'highlight.js/styles/github-dark.css';
@import 'katex/dist/katex.min.css';
</style>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  overflow-x: hidden;
}

.header {
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

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: #374151;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  /* border: 1px solid #9ca3af; */
  border: none;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  cursor: pointer;
  color: #374151;
  transition: all 0.3s ease;
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.icon-btn:disabled:hover {
  background: rgba(255, 255, 255, 0.6);
  transform: none;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

.trash-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.2);
}

.user-btn:hover {
  background: rgba(99, 102, 241, 0.1);
  color: #4f46e5;
  border-color: rgba(99, 102, 241, 0.2);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
}

.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  text-align: center;
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-state p {
  font-size: 16px;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
  position: relative;
}

.message-wrapper:last-child {
  margin-bottom: 0;
}

.copy-actions {
  display: flex;
  justify-content: center;
  margin-top: 8px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid #d1d5db;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: #ffffff;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.copy-btn:active {
  transform: scale(0.98);
}

.message.user + .copy-actions {
  justify-content: flex-end;
  padding-right: 48px;
}

.message.assistant + .copy-actions {
  justify-content: flex-start;
  padding-left: 48px;
}

.message {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 80%;
  padding: 16px 18px;
  border-radius: 20px;
}

.message.user {
  margin-left: auto;
  background: #e5e7eb;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #374151;
  border-bottom-right-radius: 6px;
  border: 1px solid #d1d5db;
}

.message.assistant {
  background: #e5e7eb;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom-left-radius: 6px;
  border: 1px solid #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.message-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #374151;
}

.message.user .message-avatar {
  order: 2;
  background: rgba(255, 255, 255, 0.8);
  color: #374151;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.reasoning-wrapper {
  margin-bottom: 12px;
}

.reasoning-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid #d1d5db;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  width: 100%;
  text-align: left;
  transition: all 0.2s ease;
}

.reasoning-toggle:hover {
  background: rgba(156, 163, 175, 0.1);
}

.toggle-icon {
  font-size: 10px;
  transition: transform 0.2s ease;
}

.reasoning-content {
  margin-top: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid #d1d5db;
  border-radius: 12px;
}

.reasoning-text {
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
  white-space: pre-wrap;
}

.message-text {
  font-size: 15px;
  line-height: 1.6;
  color: #374151;
  word-wrap: break-word;
}

.message.user .message-text {
  white-space: pre-wrap;
  color: #374151;
}

.cursor-blink {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
  vertical-align: middle;
}

.cursor-blink span {
  width: 6px;
  height: 6px;
  background: #374151;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.cursor-blink span:nth-child(1) {
  animation-delay: -0.32s;
}

.cursor-blink span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
  line-height: 1.3;
  color: #111827;
}

.message.user .markdown-body :deep(h1),
.message.user .markdown-body :deep(h2),
.message.user .markdown-body :deep(h3),
.message.user .markdown-body :deep(h4),
.message.user .markdown-body :deep(h5),
.message.user .markdown-body :deep(h6) {
  color: #374151;
}

.markdown-body :deep(h1:last-child),
.markdown-body :deep(h2:last-child),
.markdown-body :deep(h3:last-child),
.markdown-body :deep(h4:last-child),
.markdown-body :deep(h5:last-child),
.markdown-body :deep(h6:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(h1) { font-size: 1.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
.markdown-body :deep(h2) { font-size: 1.3em; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
.markdown-body :deep(h3) { font-size: 1.15em; }
.markdown-body :deep(h4) { font-size: 1em; }

.markdown-body :deep(p) {
  margin-bottom: 12px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin-bottom: 12px;
  padding-left: 24px;
}

.markdown-body :deep(ul:last-child),
.markdown-body :deep(ol:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(li) {
  margin-bottom: 4px;
}

.markdown-body :deep(code) {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 6px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.9em;
  color: #e11d48;
}

.message.user .markdown-body :deep(code) {
  background: rgba(0, 0, 0, 0.08);
  color: #e11d48;
}

.markdown-body :deep(pre) {
  background: #1f2937;
  border-radius: 12px;
  padding: 14px 16px;
  overflow-x: auto;
  margin-bottom: 12px;
}

.markdown-body :deep(pre:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #e5e7eb;
  font-size: 13px;
  line-height: 1.5;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid #d1d5db;
  padding-left: 16px;
  margin: 12px 0;
  color: #6b7280;
}

.message.user .markdown-body :deep(blockquote) {
  border-left-color: #d1d5db;
  color: #6b7280;
}

.markdown-body :deep(blockquote:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 12px;
}

.markdown-body :deep(table:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 10px 14px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: #f9fafb;
  font-weight: 600;
}

.markdown-body :deep(a) {
  color: #6366f1;
  text-decoration: none;
}

.message.user .markdown-body :deep(a) {
  color: #4f46e5;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 16px 0;
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 12px;
}

.input-area {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.5);
}

.developer-info {
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  margin-top: 10px;
  user-select: none;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 1000px;
  margin: 0 auto;
}

.thinking-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 50px;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(128,128,128,0.5);
  border-radius: 14px;
  cursor: pointer;
  /* color: #9ca3af; */
  color: gray;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  user-select: none;
  flex-shrink: 0;
}

.toggle-text-full {
  display: inline;
}

.toggle-text-mobile {
  display: none;
}

.thinking-toggle:hover {
  background: rgba(255, 255, 255, 0.9);
}

.thinking-toggle.active {
  background: #6b7280;
  border-color: #6b7280;
  color: white;
}

.input-field {
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
  font-family: inherit;
  resize: none;
  outline: none;
  transition: all 0.3s ease;
  line-height: 50px;
  overflow: hidden;
  color: #374151;
}

.input-field:focus {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 3px rgba(156, 163, 175, 0.1);
}

.input-field:disabled {
  background: rgba(255, 255, 255, 0.5);
  color: #9ca3af;
  cursor: not-allowed;
}

.send-btn {
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
  flex-shrink: 0;
}

.send-btn.active {
  background: #6b7280;
  border-color: #6b7280;
  color: white;
}

.send-btn.active:hover:not(:disabled) {
  background: #4b5563;
  border-color: #4b5563;
}

.send-btn:hover:not(:disabled):not(.active) {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.9);
}

.send-btn:disabled {
  cursor: not-allowed;
  background: rgba(255, 255, 255, 0.5);
  color: #9ca3af;
}

@media (max-width: 640px) {
  .header {
    padding: 10px 16px;
  }

  .app-title {
    font-size: 18px;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
  }

  .messages-container {
    padding: 16px 12px;
  }

  .message {
    max-width: 90%;
    padding: 14px 16px;
  }

  .message-avatar {
    width: 32px;
    height: 32px;
  }

  .message-text {
    font-size: 14px;
  }

  .input-area {
    padding: 12px 12px;
  }

  .input-wrapper {
    gap: 8px;
  }

  .developer-info {
    font-size: 11px;
    margin-top: 8px;
  }

  .thinking-toggle {
    height: 46px;
    padding: 0 12px;
    font-size: 13px;
  }

  .toggle-text-full {
    display: none;
  }

  .toggle-text-mobile {
    display: inline;
  }

  .input-field {
    height: 46px;
    line-height: 46px;
    min-width: 0;
  }

  .send-btn {
    width: 46px;
    height: 46px;
    flex-shrink: 0;
  }
}
</style>
