<template>
  <div class="app flex h-screen bg-gray-100">
    <!-- 左侧任务栏 -->
    <TaskSidebar />
    
    <!-- 主内容区 -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- 顶部工具栏 -->
      <header class="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <h1 class="text-lg font-semibold">🧠 双子星协同平台</h1>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500">布局:</span>
          <button 
            @click="setLayout('left-right')"
            :class="['px-3 py-1 rounded text-sm', layout === 'left-right' ? 'bg-blue-500 text-white' : 'bg-gray-200']"
          >
            ◫ 左右
          </button>
          <button 
            @click="setLayout('top-bottom')"
            :class="['px-3 py-1 rounded text-sm', layout === 'top-bottom' ? 'bg-blue-500 text-white' : 'bg-gray-200']"
          >
            ◪ 上下
          </button>
          <button 
            @click="setLayout('tabs')"
            :class="['px-3 py-1 rounded text-sm', layout === 'tabs' ? 'bg-blue-500 text-white' : 'bg-gray-200']"
          >
            📑 标签
          </button>
        </div>
      </header>
      
      <!-- 内容区 -->
      <main class="flex-1 overflow-hidden">
        <!-- 左右分屏 -->
        <div v-if="layout === 'left-right'" class="flex h-full">
          <div :style="{ width: leftSize + '%' }" class="overflow-hidden">
            <OpenClawPanel />
          </div>
          <div 
            class="splitter horizontal w-1 cursor-col-resize bg-gray-300 hover:bg-blue-500"
            @mousedown="startResize"
          ></div>
          <div :style="{ width: (100 - leftSize) + '%' }" class="overflow-hidden">
            <HermesPanel />
          </div>
        </div>
        
        <!-- 上下分屏 -->
        <div v-else-if="layout === 'top-bottom'" class="flex flex-col h-full">
          <div :style="{ height: topSize + '%' }" class="overflow-hidden">
            <OpenClawPanel />
          </div>
          <div 
            class="splitter vertical h-1 cursor-row-resize bg-gray-300 hover:bg-blue-500"
            @mousedown="startResizeVertical"
          ></div>
          <div :style="{ height: (100 - topSize) + '%' }" class="overflow-hidden">
            <HermesPanel />
          </div>
        </div>
        
        <!-- 标签页 -->
        <div v-else-if="layout === 'tabs'" class="h-full flex flex-col">
          <div class="flex border-b border-gray-200 bg-white">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="['tab-button', activeTab === tab.id ? 'active' : '']"
            >
              {{ tab.icon }} {{ tab.name }}
            </button>
          </div>
          <div class="flex-1 overflow-hidden p-4">
            <OpenClawPanel v-if="activeTab === 'plan'" />
            <HermesPanel v-else-if="activeTab === 'execute'" />
            <ReviewPanel v-else-if="activeTab === 'review'" />
            <MemoryPanel v-else-if="activeTab === 'memory'" />
            <LogPanel v-else-if="activeTab === 'log'" />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import TaskSidebar from './components/TaskSidebar.vue'
import OpenClawPanel from './components/OpenClawPanel.vue'
import HermesPanel from './components/HermesPanel.vue'
import ReviewPanel from './components/ReviewPanel.vue'
import MemoryPanel from './components/MemoryPanel.vue'
import LogPanel from './components/LogPanel.vue'

const layout = ref('left-right')
const leftSize = ref(50)
const topSize = ref(50)
const activeTab = ref('plan')

const tabs = [
  { id: 'plan', name: '规划', icon: '📋' },
  { id: 'execute', name: '执行', icon: '🛠️' },
  { id: 'review', name: '审查', icon: '🔍' },
  { id: 'memory', name: '记忆', icon: '🧠' },
  { id: 'log', name: '日志', icon: '📝' }
]

const setLayout = (newLayout) => {
  layout.value = newLayout
  localStorage.setItem('preferredLayout', newLayout)
}

// 左右分屏拖拽
const startResize = (e) => {
  const startX = e.clientX
  const startSize = leftSize.value
  
  const onMouseMove = (e) => {
    const deltaX = e.clientX - startX
    const deltaPercent = (deltaX / window.innerWidth) * 100
    leftSize.value = Math.min(Math.max(20, startSize + deltaPercent), 80)
  }
  
  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// 上下分屏拖拽
const startResizeVertical = (e) => {
  const startY = e.clientY
  const startSize = topSize.value
  
  const onMouseMove = (e) => {
    const deltaY = e.clientY - startY
    const deltaPercent = (deltaY / window.innerHeight) * 100
    topSize.value = Math.min(Math.max(20, startSize + deltaPercent), 80)
  }
  
  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

onMounted(() => {
  const savedLayout = localStorage.getItem('preferredLayout')
  if (savedLayout) {
    layout.value = savedLayout
  }
})
</script>

<style scoped>
.app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
