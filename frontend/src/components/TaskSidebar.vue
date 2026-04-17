<template>
  <aside class="w-64 bg-white border-r border-gray-200 flex flex-col">
    <!-- 头部 -->
    <div class="p-4 border-b border-gray-200">
      <h2 class="font-semibold text-gray-700">📋 任务列表</h2>
      <button 
        @click="createNewTask"
        class="mt-2 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
      >
        + 新建任务
      </button>
    </div>
    
    <!-- 任务列表 -->
    <div class="flex-1 overflow-y-auto p-2">
      <div 
        v-for="task in tasks" 
        :key="task.id"
        @click="selectTask(task)"
        :class="['task-card', currentTaskId === task.id ? 'active' : '']"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-sm">{{ task.name }}</span>
          <span :class="['status-indicator', task.status]"></span>
        </div>
        <div class="text-xs text-gray-500 mb-2">{{ task.description }}</div>
        <div class="progress-bar">
          <div 
            class="progress-bar-fill" 
            :style="{ width: task.progress + '%' }"
            :class="{
              'bg-green-500': task.status === 'completed',
              'bg-red-500': task.status === 'failed',
              'bg-blue-500': task.status === 'running'
            }"
          ></div>
        </div>
        <div class="text-xs text-gray-400 mt-1">{{ task.progress }}%</div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="tasks.length === 0" class="text-center text-gray-400 py-8">
        <p>暂无任务</p>
        <p class="text-sm mt-2">点击"新建任务"开始</p>
      </div>
    </div>
    
    <!-- 底部信息 -->
    <div class="p-3 border-t border-gray-200 text-xs text-gray-500">
      <div class="flex justify-between">
        <span>运行中: {{ runningCount }}</span>
        <span>已完成: {{ completedCount }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'

const currentTaskId = ref(null)
const tasks = ref([
  {
    id: '1',
    name: '分析 Excel 文件',
    description: '读取并分析销售数据',
    status: 'running',
    progress: 60
  },
  {
    id: '2',
    name: '生成周报',
    description: '根据数据生成周报',
    status: 'pending',
    progress: 0
  }
])

const runningCount = computed(() => {
  return tasks.value.filter(t => t.status === 'running').length
})

const completedCount = computed(() => {
  return tasks.value.filter(t => t.status === 'completed').length
})

const selectTask = (task) => {
  currentTaskId.value = task.id
  // 触发任务选择事件
}

const createNewTask = () => {
  // 打开新建任务对话框
  console.log('创建新任务')
}
</script>

<style scoped>
.task-card {
  padding: 12px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.task-card:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.task-card.active {
  border-left: 3px solid #3B82F6;
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

.status-indicator.pending {
  background-color: #F59E0B;
}

.status-indicator.completed {
  background-color: #3B82F6;
}

.status-indicator.failed {
  background-color: #EF4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
