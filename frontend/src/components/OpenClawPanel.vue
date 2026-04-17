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
        <span :class="['status-indicator', connected ? 'running' : 'failed']"></span>
        <span class="text-xs text-gray-500">{{ connected ? '已连接' : '未连接' }}</span>
      </div>
    </div>
    
    <!-- 消息列表 -->
    <div class="flex-1 overflow-y-auto p-4" ref="messageContainer">
      <div v-if="messages.length === 0" class="text-center text-gray-400 py-8">
        <p>💬 开始对话吧</p>
        <p class="text-sm mt-2">告诉 OpenClaw 你的目标</p>
      </div>
      
      <div 
        v-for="message in messages" 
        :key="message.id"
        :class="['message', message.role]"
      >
        <div class="text-xs text-gray-400 mb-1">
          {{ message.role === 'user' ? '你' : '🧠 OpenClaw' }} · {{ message.time }}
        </div>
        <div class="text-sm" v-html="renderMarkdown(message.content)"></div>
      </div>
      
      <!-- 规划展示 -->
      <div v-if="currentPlan" class="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
        <h3 class="font-semibold text-purple-700 mb-2">📋 执行计划</h3>
        <div class="space-y-2">
          <div 
            v-for="(step, index) in currentPlan.steps" 
            :key="index"
            class="flex items-center gap-2 text-sm"
          >
            <span :class="['w-5 h-5 rounded-full flex items-center justify-center text-xs', 
              step.status === 'completed' ? 'bg-green-500 text-white' : 
              step.status === 'running' ? 'bg-blue-500 text-white' : 
              'bg-gray-300']">
              {{ step.status === 'completed' ? '✓' : step.status === 'running' ? '⏳' : index + 1 }}
            </span>
            <span :class="step.status === 'completed' ? 'text-green-700' : 'text-gray-700'">
              {{ step.description }}
            </span>
          </div>
        </div>
        <div class="mt-3 text-xs text-purple-600">
          → 已下发给 Hermes 执行
        </div>
      </div>
    </div>
    
    <!-- 输入区 -->
    <div class="p-3 border-t border-gray-200">
      <div class="flex gap-2">
        <input 
          v-model="inputMessage"
          @keyup.enter="sendMessage"
          type="text"
          placeholder="输入你的目标..."
          class="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
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
import { ref, nextTick } from 'vue'
import { marked } from 'marked'

const connected = ref(true)
const messages = ref([
  {
    id: '1',
    role: 'user',
    content: '帮我分析这个 Excel 文件',
    time: '14:52'
  },
  {
    id: '2',
    role: 'openclaw',
    content: '好的，我来规划一下这个任务。\n\n我建议分为 3 步执行：\n1. **读取文件** - 加载 Excel 内容\n2. **提取数据** - 分析关键指标\n3. **生成报告** - 输出分析结果\n\n现在开始执行...',
    time: '14:52'
  }
])

const currentPlan = ref({
  steps: [
    { description: '读取文件', status: 'completed' },
    { description: '提取数据', status: 'running' },
    { description: '生成报告', status: 'pending' }
  ]
})

const inputMessage = ref('')
const messageContainer = ref(null)

const renderMarkdown = (text) => {
  return marked.parse(text)
}

const sendMessage = async () => {
  if (!inputMessage.value.trim()) return
  
  const message = {
    id: Date.now().toString(),
    role: 'user',
    content: inputMessage.value,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  messages.value.push(message)
  inputMessage.value = ''
  
  await nextTick()
  scrollToBottom()
  
  // TODO: 发送到 OpenClaw
}

const scrollToBottom = () => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}
</script>

<style scoped>
.message {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  max-width: 85%;
}

.message.user {
  background-color: #3B82F6;
  color: white;
  margin-left: auto;
}

.message.openclaw {
  background-color: #f0f0f0;
  border-left: 3px solid #8B5CF6;
}

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
