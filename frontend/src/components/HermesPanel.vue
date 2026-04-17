<template>
  <div class="h-full flex flex-col bg-white">
    <!-- 头部 -->
    <div class="p-3 border-b border-gray-200 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🛠️</span>
        <div>
          <h2 class="font-semibold text-gray-700">Hermes</h2>
          <p class="text-xs text-gray-500">执行与操作</p>
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
    
    <!-- IFrame 嵌入 Hermes WebUI -->
    <div class="flex-1 relative">
      <iframe 
        ref="hermesFrame"
        :src="hermesUrl"
        class="w-full h-full border-0"
        @load="onHermesLoad"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      ></iframe>
      
      <!-- 加载状态 -->
      <div v-if="!loaded" class="absolute inset-0 flex items-center justify-center bg-gray-50">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p class="text-gray-500">正在连接 Hermes...</p>
        </div>
      </div>
    </div>
    
    <!-- 执行状态栏 -->
    <div v-if="currentTask" class="p-3 border-t border-gray-200 bg-amber-50">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-amber-700">当前任务：{{ currentTask.name }}</span>
        <span class="text-xs text-amber-600">{{ currentTask.progress }}%</span>
      </div>
      <div class="progress-bar">
        <div 
          class="progress-bar-fill bg-amber-500" 
          :style="{ width: currentTask.progress + '%' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useTaskStore } from '../stores/taskStore'
import { sendWS } from '../api/coordinator'

const taskStore = useTaskStore()

const hermesUrl = ref('http://localhost:8081') // Hermes WebUI 地址
const hermesFrame = ref(null)
const connected = ref(false)
const loaded = ref(false)
const currentTask = ref(null)

// Hermes WebUI 加载完成
const onHermesLoad = () => {
  console.log('✅ Hermes WebUI 已加载')
  loaded.value = true
  connected.value = true
  
  // 监听来自 Hermes 的消息
  window.addEventListener('message', handleHermesMessage)
  
  // 监听任务下发事件
  window.addEventListener('hermes:execute', handleExecuteTask)
}

// 处理 Hermes 消息
const handleHermesMessage = (event) => {
  // 验证来源
  if (!event.origin.includes('localhost:8081')) return
  
  const { type, data } = event.data
  console.log('📨 收到 Hermes 消息:', type, data)
  
  if (type === 'hermes:progress') {
    // 执行进度更新
    if (currentTask.value) {
      currentTask.value.progress = data.progress
    }
    
    // 广播进度更新
    sendWS('task:progress', data)
  }
  
  if (type === 'hermes:complete') {
    // 执行完成
    console.log('✅ Hermes 执行完成:', data)
    
    if (currentTask.value) {
      currentTask.value.status = 'completed'
      currentTask.value.progress = 100
    }
    
    // 触发审查
    window.dispatchEvent(new CustomEvent('hermes:complete', { detail: data }))
    
    // 通知后端
    sendWS('task:complete', data)
  }
  
  if (type === 'hermes:error') {
    // 执行错误
    console.error('❌ Hermes 执行错误:', data)
    
    if (currentTask.value) {
      currentTask.value.status = 'failed'
    }
  }
}

// 处理任务下发
const handleExecuteTask = (event) => {
  const task = event.detail
  console.log('🛠️ Hermes 接收任务:', task)
  
  currentTask.value = {
    id: task.id,
    name: task.plan.goal,
    progress: 0,
    status: 'running'
  }
  
  // 发送任务到 Hermes WebUI
  if (hermesFrame.value) {
    hermesFrame.value.contentWindow.postMessage({
      type: 'hermes:execute',
      task
    }, hermesUrl.value)
  }
}

// 重新连接
const reconnect = () => {
  loaded.value = false
  connected.value = false
  hermesFrame.value.src = hermesUrl.value + '?t=' + Date.now()
}

// 清理
onUnmounted(() => {
  window.removeEventListener('message', handleHermesMessage)
  window.removeEventListener('hermes:execute', handleExecuteTask)
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

.progress-bar {
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  transition: width 0.3s ease;
}
</style>
