import { ref } from 'vue'
import { defineStore } from 'pinia'

interface Message {
  role: 'user' | 'assistant'
  content: string
  reasoningContent?: string
  isStreaming?: boolean
  showReasoning?: boolean
  isReasoningExpanded?: boolean
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([])
  const isThinking = ref(false)
  const isLoading = ref(false)

  function loadFromStorage() {
    const saved = localStorage.getItem('aichat_messages')
    if (saved) {
      const loadedMessages = JSON.parse(saved)
      messages.value = loadedMessages.map((msg: Message) => ({
        ...msg,
        isReasoningExpanded: msg.isReasoningExpanded ?? false
      }))
    }
  }

  function saveToStorage() {
    localStorage.setItem('aichat_messages', JSON.stringify(messages.value))
  }

  function addUserMessage(content: string) {
    messages.value.push({
      role: 'user',
      content
    })
    saveToStorage()
  }

  function addAssistantMessage(content: string, reasoningContent?: string) {
    messages.value.push({
      role: 'assistant',
      content,
      reasoningContent
    })
    saveToStorage()
  }

  function startStreamingMessage(showReasoning: boolean) {
    messages.value.push({
      role: 'assistant',
      content: '',
      isStreaming: true,
      showReasoning,
      isReasoningExpanded: false
    })
  }

  function toggleReasoningExpanded(index: number) {
    if (messages.value[index]) {
      messages.value[index].isReasoningExpanded = !messages.value[index].isReasoningExpanded
      saveToStorage()
    }
  }

  function appendToLastMessage(chunk: string) {
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.content += chunk
    }
  }

  function appendToLastReasoning(chunk: string) {
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.showReasoning) {
      lastMessage.reasoningContent = (lastMessage.reasoningContent || '') + chunk
    }
  }

  function finishStreaming() {
    const lastMessage = messages.value[messages.value.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.isStreaming = false
      if (!lastMessage.showReasoning) {
        lastMessage.reasoningContent = undefined
      }
      saveToStorage()
    }
  }

  function clearMessages() {
    messages.value = []
    localStorage.removeItem('aichat_messages')
  }

  function clearAllData() {
    messages.value = []
    localStorage.removeItem('aichat_messages')
    sessionStorage.clear()
    if (window.location.href.includes('?')) {
      window.location.href = window.location.pathname
    }
  }

  function newSession() {
    messages.value = []
    saveToStorage()
  }

  function toggleThinking() {
    isThinking.value = !isThinking.value
  }

  return {
    messages,
    isThinking,
    isLoading,
    loadFromStorage,
    saveToStorage,
    addUserMessage,
    addAssistantMessage,
    startStreamingMessage,
    appendToLastMessage,
    appendToLastReasoning,
    finishStreaming,
    clearMessages,
    newSession,
    clearAllData,
    toggleThinking,
    toggleReasoningExpanded
  }
})
