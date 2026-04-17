<template>
  <div class="h-full flex flex-col bg-white">
    <!-- 头部 -->
    <div class="p-3 border-b border-gray-200 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-700">📝 执行日志</h2>
      <div class="flex gap-2">
        <button 
          @click="clearLogs"
          class="text-xs text-red-500 hover:text-red-600"
        >
          🗑️ 清空
        </button>
        <button 
          @click="exportLogs"
          class="text-xs text-blue-500 hover:text-blue-600"
        >
          📥 导出
        </button>
      </div>
    </div>
    
    <!-- 日志过滤器 -->
    <div class="p-3 border-b border-gray-200 bg-gray-50">
      <div class="flex gap-2 flex-wrap">
        <button 
          @click="filter = 'all'"
          :class="['text-xs px-2 py-1 rounded', filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200']"
        >
          全部
        </button>
        <button 
          @click="filter = 'info'"
          :class="['text-xs px-2 py-1 rounded', filter === 'info' ? 'bg-blue-500 text-white' : 'bg-gray-200']"
        >
          ℹ️ 信息
        </button>
        <button 
          @click="filter = 'success'"
          :class="['text-xs px-2 py-1 rounded', filter === 'success' ? 'bg-green-500 text-white' : 'bg-gray-200']"
        >
          ✅ 成功
        </button>
        <button 
          @click="filter = 'warning'"
          :class="['text-xs px-2 py-1 rounded', filter === 'warning' ? 'bg-amber-500 text-white' : 'bg-gray-200']"
        >
          ⚠️ 警告
        </button>
        <button 
          @click="filter = 'error'"
          :class="['text-xs px-2 py-1 rounded', filter === 'error' ? 'bg-red-500 text-white' : 'bg-gray-200']"
        >
          ❌ 错误
        </button>
      </div>
    </div>
    
    <!-- 日志列表 -->
    <div class="flex-1 overflow-y-auto p-3 font-mono text-xs">
      <!-- 空状态 -->
      <div v-if="filteredLogs.length === 0" class="text-center text-gray-400 py-8">
        <p>暂无日志</p>
      </div>
      
      <!-- 日志条目 -->
      <div v-else class="space-y-1">
        <div 
          v-for="(log, index) in filteredLogs" 
          :key="index"
          :class="['p-2 rounded', getLogClass(log.type)]"
        >
          <span class="text-gray-400">[{{ log.time }}]</span>
          <span :class="getLogTypeIcon(log.type)"></span>
          <span class="ml-2">{{ log.message }}</span>
        </div>
      </div>
      
      <!-- 自动滚动到底部 -->
      <div ref="logEnd"></div>
    </div>
    
    <!-- 底部状态 -->
    <div class="p-2 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
      <span>共 {{ logs.length }} 条</span>
      <span>显示 {{ filteredLogs.length }} 条</span>
      <label class="flex items-center gap-2 cursor-pointer">
        <input 
          v-model="autoScroll"
          type="checkbox"
          class="rounded"
        />
        <span>自动滚动</span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'

const logs = ref([
  { time: '14:52:30', type: 'info', message: '系统启动' },
  { time: '14:52:35', type: 'success', message: 'OpenClaw 已连接' },
  { time: '14:52:36', type: 'success', message: 'Hermes 已连接' },
  { time: '14:52:40', type: 'info', message: 'WebSocket 已连接' },
  { time: '14:53:00', type: 'info', message: '收到 OpenClaw 规划' },
  { time: '14:53:01', type: 'info', message: '创建任务：task-001' },
  { time: '14:53:02', type: 'info', message: '下发任务给 Hermes' },
  { time: '14:53:05', type: 'info', message: 'Hermes 开始执行' },
  { time: '14:53:10', type: 'info', message: '步骤 1: 读取文件 - 开始' },
  { time: '14:53:15', type: 'success', message: '步骤 1: 读取文件 - 完成' },
  { time: '14:53:16', type: 'info', message: '步骤 2: 提取数据 - 开始' },
  { time: '14:53:30', type: 'info', message: '步骤 2: 提取数据 - 完成' },
  { time: '14:53:31', type: 'info', message: '步骤 3: 生成报告 - 开始' },
  { time: '14:53:45', type: 'success', message: '步骤 3: 生成报告 - 完成' },
  { time: '14:53:46', type: 'success', message: 'Hermes 执行完成' },
  { time: '14:53:47', type: 'info', message: '请求 OpenClaw 审查' },
  { time: '14:53:50', type: 'success', message: '审查通过 - 质量评分 90%' },
  { time: '14:53:51', type: 'success', message: '任务流完成' }
])

const filter = ref('all')
const autoScroll = ref(true)
const logEnd = ref(null)

const filteredLogs = computed(() => {
  if (filter.value === 'all') return logs.value
  return logs.value.filter(log => log.type === filter.value)
})

const getLogClass = (type) => {
  const classes = {
    info: 'bg-blue-50 text-blue-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-700',
    error: 'bg-red-50 text-red-700'
  }
  return classes[type] || classes.info
}

const getLogTypeIcon = (type) => {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }
  return icons[type] || ''
}

const clearLogs = () => {
  if (!confirm('确定要清空所有日志吗？')) return
  logs.value = []
}

const exportLogs = () => {
  const content = logs.value.map(log => 
    `[${log.time}] [${log.type.toUpperCase()}] ${log.message}`
  ).join('\n')
  
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `logs-${new Date().toISOString().slice(0, 19)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// 自动滚动到底部
watch(() => logs.value.length, async () => {
  if (autoScroll.value) {
    await nextTick()
    logEnd.value?.scrollIntoView({ behavior: 'smooth' })
  }
})

// 监听全局日志事件
onMounted(() => {
  window.addEventListener('log:add', (event) => {
    const log = event.detail
    logs.value.push({
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ...log
    })
    
    // 限制日志数量
    if (logs.value.length > 1000) {
      logs.value = logs.value.slice(-500)
    }
  })
})

// 添加日志的辅助函数
window.addLog = (type, message) => {
  window.dispatchEvent(new CustomEvent('log:add', {
    detail: { type, message }
  }))
}
</script>

<style scoped>
.font-mono {
  font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
}
</style>
