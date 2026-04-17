<template>
  <div class="h-full flex flex-col bg-white">
    <!-- 头部 -->
    <div class="p-3 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-700 mb-2">🧠 共享记忆</h2>
      
      <!-- 搜索框 -->
      <div class="relative">
        <input 
          v-model="searchQuery"
          @keyup.enter="searchMemories"
          type="text"
          placeholder="🔍 搜索记忆..."
          class="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
        />
        <span class="absolute left-3 top-2.5 text-gray-400">🔍</span>
      </div>
      
      <!-- 统计信息 -->
      <div v-if="stats" class="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>SQLite: {{ stats.sqlite_memories }} 条</span>
        <span v-if="stats.chromadb_enabled" class="text-green-600">
          🧠 ChromaDB: {{ stats.chromadb_memories }} 条
        </span>
      </div>
    </div>
    
    <!-- 记忆列表 -->
    <div class="flex-1 overflow-y-auto p-3">
      <!-- 加载状态 -->
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
        <p class="text-gray-500 text-sm">加载记忆中...</p>
      </div>
      
      <!-- 空状态 -->
      <div v-else-if="memories.length === 0" class="text-center text-gray-400 py-8">
        <p class="text-2xl mb-2">🧠</p>
        <p>记忆库为空</p>
        <p class="text-sm mt-2">会话内容将自动存储</p>
      </div>
      
      <!-- 记忆列表 -->
      <div v-else class="space-y-2">
        <div 
          v-for="memory in memories" 
          :key="memory.id"
          class="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition cursor-pointer"
          @click="viewMemoryDetail(memory)"
        >
          <div class="flex items-start justify-between mb-2">
            <span :class="['text-xs px-2 py-1 rounded', getSourceClass(memory.source)]">
              {{ getSourceIcon(memory.source) }} {{ memory.source }}
            </span>
            <span class="text-xs text-gray-400">{{ formatDate(memory.created_at) }}</span>
          </div>
          <p class="text-sm text-gray-700 line-clamp-2">{{ memory.content }}</p>
          <div v-if="memory.metadata && memory.metadata.task_id" class="mt-2 text-xs text-blue-600">
            📋 任务：{{ memory.metadata.task_id }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部操作 -->
    <div class="p-3 border-t border-gray-200 flex gap-2">
      <button 
        @click="refreshMemories"
        class="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition text-sm"
      >
        🔄 刷新
      </button>
      <button 
        @click="clearMemories"
        class="flex-1 bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition text-sm"
      >
        🗑️ 清空
      </button>
    </div>
    
    <!-- 记忆详情弹窗 -->
    <div v-if="selectedMemory" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeMemoryDetail">
      <div class="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden" @click.stop>
        <div class="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 class="font-semibold text-lg">记忆详情</h3>
          <button @click="closeMemoryDetail" class="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div class="p-4 overflow-y-auto max-h-[60vh]">
          <div class="mb-4">
            <span :class="['text-xs px-2 py-1 rounded', getSourceClass(selectedMemory.source)]">
              {{ getSourceIcon(selectedMemory.source) }} {{ selectedMemory.source }}
            </span>
            <span class="text-xs text-gray-400 ml-2">{{ formatDate(selectedMemory.created_at) }}</span>
          </div>
          <p class="text-gray-700 whitespace-pre-wrap">{{ selectedMemory.content }}</p>
          <div v-if="selectedMemory.metadata" class="mt-4 p-3 bg-gray-50 rounded text-xs font-mono">
            <div class="font-semibold mb-2">元数据:</div>
            <pre>{{ JSON.stringify(selectedMemory.metadata, null, 2) }}</pre>
          </div>
          <div v-if="selectedMemory.distance" class="mt-2 text-xs text-green-600">
            相似度：{{ (1 - selectedMemory.distance).toFixed(4) }}
          </div>
        </div>
        <div class="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button @click="deleteMemory(selectedMemory.id)" class="text-red-500 hover:text-red-600 text-sm">
            🗑️ 删除
          </button>
          <button @click="closeMemoryDetail" class="bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition text-sm">
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api/coordinator'

const memories = ref([])
const searchQuery = ref('')
const loading = ref(false)
const selectedMemory = ref(null)
const stats = ref(null)

// 加载记忆
const loadMemories = async () => {
  loading.value = true
  try {
    memories.value = await api.getMemories()
    stats.value = await api.getMemoryStats()
  } catch (error) {
    console.error('加载记忆失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索记忆
const searchMemories = async () => {
  if (!searchQuery.value.trim()) {
    await loadMemories()
    return
  }
  
  loading.value = true
  try {
    memories.value = await api.searchMemories(searchQuery.value, 20)
  } catch (error) {
    console.error('搜索记忆失败:', error)
  } finally {
    loading.value = false
  }
}

// 刷新记忆
const refreshMemories = () => {
  searchQuery.value = ''
  loadMemories()
}

// 清空记忆
const clearMemories = async () => {
  if (!confirm('确定要清空所有记忆吗？此操作不可恢复！')) return
  
  try {
    await api.clearMemories()
    await loadMemories()
  } catch (error) {
    console.error('清空记忆失败:', error)
    alert('清空失败：' + error.message)
  }
}

// 查看记忆详情
const viewMemoryDetail = (memory) => {
  selectedMemory.value = memory
}

// 关闭详情
const closeMemoryDetail = () => {
  selectedMemory.value = null
}

// 删除记忆
const deleteMemory = async (memoryId) => {
  if (!confirm('确定要删除这条记忆吗？')) return
  
  try {
    await api.deleteMemory(memoryId)
    await loadMemories()
    selectedMemory.value = null
  } catch (error) {
    console.error('删除记忆失败:', error)
    alert('删除失败：' + error.message)
  }
}

// 工具函数
const getSourceClass = (source) => {
  const classes = {
    openclaw: 'bg-purple-100 text-purple-700',
    hermes: 'bg-amber-100 text-amber-700',
    user: 'bg-blue-100 text-blue-700',
    system: 'bg-gray-100 text-gray-700'
  }
  return classes[source] || classes.system
}

const getSourceIcon = (source) => {
  const icons = {
    openclaw: '🧠',
    hermes: '🛠️',
    user: '👤',
    system: '⚙️'
  }
  return icons[source] || '📝'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  
  return date.toLocaleDateString('zh-CN')
}

onMounted(() => {
  loadMemories()
})
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
