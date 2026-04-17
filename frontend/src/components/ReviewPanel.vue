<template>
  <div class="h-full flex flex-col bg-white">
    <!-- 头部 -->
    <div class="p-3 border-b border-gray-200">
      <h2 class="text-lg font-semibold text-gray-700">🔍 审查结果</h2>
    </div>
    
    <!-- 内容区 -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- 空状态 -->
      <div v-if="!currentReview" class="text-center text-gray-400 py-8">
        <p class="text-2xl mb-2">🔍</p>
        <p>等待审查...</p>
        <p class="text-sm mt-2">Hermes 执行完成后自动审查</p>
      </div>
      
      <!-- 审查结果 -->
      <div v-else class="space-y-4">
        <!-- 审查状态卡片 -->
        <div :class="['p-4 rounded-lg border-2', reviewStatusClass]">
          <div class="flex items-center gap-3 mb-3">
            <span class="text-3xl">{{ reviewStatusIcon }}</span>
            <div>
              <h3 class="font-semibold text-lg">{{ reviewStatusText }}</h3>
              <p class="text-sm text-gray-500">审查时间：{{ formatDate(currentReview.reviewed_at) }}</p>
            </div>
          </div>
          
          <!-- 质量评分 -->
          <div class="mb-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm text-gray-600">质量评分</span>
              <span class="text-sm font-semibold">{{ (currentReview.quality_score * 100).toFixed(0) }}%</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-bar-fill" 
                :class="scoreClass"
                :style="{ width: (currentReview.quality_score * 100) + '%' }"
              ></div>
            </div>
          </div>
          
          <!-- 审查意见 -->
          <div v-if="currentReview.comments" class="p-3 bg-gray-50 rounded">
            <div class="text-xs text-gray-500 mb-1">审查意见:</div>
            <p class="text-sm text-gray-700">{{ currentReview.comments }}</p>
          </div>
          
          <!-- 建议 -->
          <div v-if="currentReview.suggestions && currentReview.suggestions.length > 0" class="p-3 bg-blue-50 rounded">
            <div class="text-xs text-blue-600 mb-2 font-semibold">改进建议:</div>
            <ul class="space-y-1">
              <li v-for="(suggestion, index) in currentReview.suggestions" :key="index" class="text-sm text-blue-700 flex items-start gap-2">
                <span>•</span>
                <span>{{ suggestion }}</span>
              </li>
            </ul>
          </div>
        </div>
        
        <!-- 任务信息 -->
        <div class="p-4 bg-gray-50 rounded-lg">
          <h4 class="font-semibold text-sm text-gray-600 mb-2">任务信息</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">任务 ID:</span>
              <span class="font-mono">{{ currentReview.task_id }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">审查者:</span>
              <span>{{ currentReview.reviewer }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">下一步:</span>
              <span :class="nextActionClass">{{ getNextActionText(currentReview.next_action) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="flex gap-2">
          <button 
            v-if="currentReview.next_action === 'modify'"
            @click="retryTask"
            class="flex-1 bg-amber-500 text-white py-2 px-4 rounded hover:bg-amber-600 transition text-sm"
          >
            🔄 重新执行
          </button>
          <button 
            @click="exportReview"
            class="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition text-sm"
          >
            📥 导出报告
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const currentReview = ref(null)

const reviewStatusClass = computed(() => {
  if (!currentReview.value) return ''
  
  const status = currentReview.value.review_status
  return {
    'approved': 'border-green-500 bg-green-50',
    'rejected': 'border-red-500 bg-red-50',
    'modify': 'border-amber-500 bg-amber-50'
  }[status] || 'border-gray-500 bg-gray-50'
})

const reviewStatusIcon = computed(() => {
  if (!currentReview.value) return '🔍'
  
  const status = currentReview.value.review_status
  return {
    'approved': '✅',
    'rejected': '❌',
    'modify': '⚠️'
  }[status] || '📝'
})

const reviewStatusText = computed(() => {
  if (!currentReview.value) return '等待审查'
  
  const status = currentReview.value.review_status
  return {
    'approved': '审查通过',
    'rejected': '审查未通过',
    'modify': '需要修改'
  }[status] || '审查中'
})

const scoreClass = computed(() => {
  if (!currentReview.value) return ''
  
  const score = currentReview.value.quality_score
  if (score >= 0.8) return 'bg-green-500'
  if (score >= 0.6) return 'bg-amber-500'
  return 'bg-red-500'
})

const nextActionClass = computed(() => {
  if (!currentReview.value) return ''
  
  const action = currentReview.value.next_action
  return {
    'complete': 'text-green-600 font-semibold',
    'retry': 'text-amber-600 font-semibold',
    'modify': 'text-red-600 font-semibold'
  }[action] || 'text-gray-600'
})

const getNextActionText = (action) => {
  const texts = {
    'complete': '✅ 任务完成',
    'retry': '🔄 重新执行',
    'modify': '⚠️ 修改后重试'
  }
  return texts[action] || action
}

const formatDate = (dateString) => {
  if (!dateString) return '未知'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const retryTask = () => {
  console.log('🔄 重新执行任务:', currentReview.value.task_id)
  window.dispatchEvent(new CustomEvent('task:retry', {
    detail: { task_id: currentReview.value.task_id }
  }))
}

const exportReview = () => {
  const content = `
审查报告
========

任务 ID: ${currentReview.value.task_id}
审查时间: ${currentReview.value.reviewed_at}
审查结果: ${currentReview.value.review_status}
质量评分: ${(currentReview.value.quality_score * 100).toFixed(1)}%

审查意见:
${currentReview.value.comments}

改进建议:
${currentReview.value.suggestions?.join('\n') || '无'}
  `.trim()
  
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `review-${currentReview.value.task_id}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// 监听审查完成事件
onMounted(() => {
  window.addEventListener('openclaw:review', (event) => {
    currentReview.value = event.detail
    console.log('🔍 收到审查结果:', currentReview.value)
  })
})
</script>

<style scoped>
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
