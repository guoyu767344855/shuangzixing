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
        <span :class="['status-indicator', connected ? 'running' : 'failed']"></span>
        <span class="text-xs text-gray-500">{{ connected ? '已连接' : '未连接' }}</span>
      </div>
    </div>
    
    <!-- 执行状态 -->
    <div class="p-3 border-b border-gray-200 bg-amber-50">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-amber-700">当前任务</span>
        <span class="text-xs text-amber-600">60%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill bg-amber-500" style="width: 60%"></div>
      </div>
    </div>
    
    <!-- 步骤列表 -->
    <div class="flex-1 overflow-y-auto p-4">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">📋 执行步骤</h3>
      
      <div class="space-y-3">
        <div 
          v-for="(step, index) in steps" 
          :key="index"
          :class="['p-3 rounded-lg border', 
            step.status === 'completed' ? 'bg-green-50 border-green-200' : 
            step.status === 'running' ? 'bg-blue-50 border-blue-200' : 
            'bg-gray-50 border-gray-200']"
        >
          <div class="flex items-center gap-2 mb-2">
            <span :class="['w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium',
              step.status === 'completed' ? 'bg-green-500 text-white' : 
              step.status === 'running' ? 'bg-blue-500 text-white' : 
              'bg-gray-300 text-gray-600']">
              {{ step.status === 'completed' ? '✓' : step.status === 'running' ? '⏳' : index + 1 }}
            </span>
            <span class="text-sm font-medium" :class="step.status === 'completed' ? 'text-green-700' : 'text-gray-700'">
              {{ step.name }}
            </span>
          </div>
          <div v-if="step.description" class="text-xs text-gray-500 ml-8">
            {{ step.description }}
          </div>
          <div v-if="step.logs && step.logs.length > 0" class="mt-2 ml-8 text-xs text-gray-400 font-mono">
            <div v-for="(log, i) in step.logs" :key="i">
              &gt; {{ log }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 控制按钮 -->
      <div class="mt-6 flex gap-2">
        <button class="flex-1 bg-amber-500 text-white py-2 px-4 rounded hover:bg-amber-600 transition text-sm">
          ⏸️ 暂停
        </button>
        <button class="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition text-sm">
          🔄 重试
        </button>
        <button class="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition text-sm">
          ⏭️ 跳过
        </button>
      </div>
    </div>
    
    <!-- 执行日志 -->
    <div class="h-32 border-t border-gray-200 p-3 overflow-y-auto bg-gray-50">
      <h4 class="text-xs font-semibold text-gray-500 mb-2">📝 执行日志</h4>
      <div class="space-y-1">
        <div 
          v-for="(log, index) in logs" 
          :key="index"
          class="text-xs font-mono"
          :class="log.type === 'error' ? 'text-red-600' : log.type === 'success' ? 'text-green-600' : 'text-gray-600'"
        >
          <span class="text-gray-400">[{{ log.time }}]</span> {{ log.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const connected = ref(true)

const steps = ref([
  {
    name: '读取文件',
    description: '加载 Excel 文件内容',
    status: 'completed',
    logs: ['文件路径：/Users/guomin/data.xlsx', '文件大小：2.3MB', '读取成功']
  },
  {
    name: '提取数据',
    description: '分析关键指标和数据',
    status: 'running',
    logs: ['正在提取列：姓名，部门，入职日期']
  },
  {
    name: '生成报告',
    description: '输出 Markdown 格式分析报告',
    status: 'pending',
    logs: []
  }
])

const logs = ref([
  { time: '14:52:30', message: '任务开始执行', type: 'info' },
  { time: '14:52:35', message: '步骤 1: 读取文件 - 开始', type: 'info' },
  { time: '14:53:00', message: '步骤 1: 读取文件 - 完成', type: 'success' },
  { time: '14:53:05', message: '步骤 2: 提取数据 - 开始', type: 'info' },
  { time: '14:54:00', message: '正在处理数据...', type: 'info' }
])
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
