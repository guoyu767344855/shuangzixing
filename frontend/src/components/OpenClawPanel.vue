<template>
  <div class="h-full flex flex-col bg-white">
    <!-- 头部 -->
    <div class="p-3 border-b border-gray-200 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🧠</span>
        <div>
          <h2 class="font-semibold text-gray-700">OpenClaw</h2>
          <p class="text-xs text-gray-500">规划与决策</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button 
          @click="reconnect"
          class="text-xs text-blue-500 hover:underline"
        >
          🔗 重连
        </button>
        <span :class="['status-indicator', connected ? 'running' : 'failed']"></span>
        <span class="text-xs text-gray-500">{{ connected ? '已连接' : '未连接' }}</span>
      </div>
    </div>
    
    <!-- IFrame 嵌入 OpenClaw WebUI -->
    <div class="flex-1 relative">
      <iframe 
        ref="openclawFrame"
        :src="openclawUrl"
        class="w-full h-full border-0"
        @load="onOpenClawLoad"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      ></iframe>
      
      <!-- 加载状态 -->
      <div v-if="!loaded" class="absolute inset-0 flex items-center justify-center bg-gray-50">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p class="text-gray-500">正在连接 OpenClaw...</p>
        </div>
      </div>
    </div>
    
    <!-- 输入区 (可选，用于直接对话) -->
    <div class="p-3 border-t border-gray-200">
      <div class="flex gap-2">
        <input 
          v-model="inputMessage"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="直接与 OpenClaw 对话..."
          class="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-purple-500 text-sm"
        />
        <button 
          @click="sendMessage"
          class="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition text-sm"
        >
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '../stores/sessionStore'
import { sendWS, connectWebSocket } from '../api/coordinator'

const sessionStore = useSessionStore()

const openclawUrl = ref('http://localhost:8080') // OpenClaw WebUI 地址
const openclawFrame = ref(null)
const connected = ref(false)
const loaded = ref(false)
const inputMessage = ref('')

// OpenClaw WebUI 加载完成
const onOpenClawLoad = () => {
  console.log('✅ OpenClaw WebUI 已加载')
  loaded.value = true
  connected.value = true
  
  // 监听来自 OpenClaw 的消息
  window.addEventListener('message', handleOpenClawMessage)
}

// 处理 OpenClaw 消息
const handleOpenClawMessage = (event) => {
  // 验证来源
  if (!event.origin.includes('localhost:8080')) return
  
  const { type, data } = event.data
  console.log('📨 收到 OpenClaw 消息:', type, data)
  
  if (type === 'openclaw:plan') {
    // OpenClaw 生成了规划
    console.log('📋 收到规划:', data)
    
    // 添加到会话
    sessionStore.addMessage('openclaw', {
      role: 'openclaw',
      content: `规划完成：${data.goal}\n\n步骤:\n` + data.steps.map((s, i) => `${i + 1}. ${s.description}`).join('\n')
    })
    
    // 触发任务创建
    window.dispatchEvent(new CustomEvent('openclaw:plan', { detail: data }))
  }
  
  if (type === 'openclaw:review') {
    // OpenClaw 审查完成
    console.log('🔍 审查完成:', data)
    
    sessionStore.addMessage('openclaw', {
      role: 'openclaw',
      content: `审查结果：${data.review_status === 'approved' ? '✅ 通过' : '❌ 需修改'}\n\n评分：${data.quality_score}\n意见：${data.comments}`
    })
    
    // 触发审查完成事件
    window.dispatchEvent(new CustomEvent('openclaw:review', { detail: data }))
  }
}

// 发送消息到 OpenClaw
const sendMessage = async () => {
  if (!inputMessage.value.trim() || !openclawFrame.value) return
  
  const message = {
    role: 'user',
    content: inputMessage.value
  }
  
  sessionStore.addMessage('openclaw', message)
  
  // 发送到 OpenClaw WebUI
  openclawFrame.value.contentWindow.postMessage({
    type: 'user:message',
    data: message
  }, openclawUrl.value)
  
  inputMessage.value = ''
}

// 重新连接
const reconnect = () => {
  loaded.value = false
  connected.value = false
  openclawFrame.value.src = openclawUrl.value + '?t=' + Date.now()
}

// 清理
onUnmounted(() => {
  window.removeEventListener('message', handleOpenClawMessage)
})
</script>

<style scoped>
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.running {
  background-color: #10B981;
  animation: pulse 2s infinite;
}

.status-indicator.failed {
  background-color: #EF4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
