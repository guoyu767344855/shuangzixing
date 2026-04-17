import io from 'socket.io-client'

const API_BASE = 'http://localhost:3000'

// HTTP API 客户端
export const api = {
  // 任务相关
  async getTasks() {
    const res = await fetch(`${API_BASE}/api/tasks`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  
  async createTask(taskData) {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  
  async updateTask(taskId, updates) {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  
  // 会话相关
  async createSession(type) {
    const res = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  
  async getSessions() {
    const res = await fetch(`${API_BASE}/api/sessions`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  
  // 记忆相关
  async getMemories() {
    const res = await fetch(`${API_BASE}/api/memories`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  
  async createMemory(memoryData) {
    const res = await fetch(`${API_BASE}/api/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memoryData)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  
  async searchMemories(query, limit = 10) {
    const res = await fetch(`${API_BASE}/api/memories/search?q=${encodeURIComponent(query)}&limit=${limit}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  
  async getMemoryStats() {
    const res = await fetch(`${API_BASE}/api/memories/stats`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  
  async deleteMemory(memoryId) {
    const res = await fetch(`${API_BASE}/api/memories/${memoryId}`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  
  async clearMemories() {
    const res = await fetch(`${API_BASE}/api/memories`, {
      method: 'DELETE'
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }
}

// WebSocket 连接管理器
let socket = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 3000

export const connectWebSocket = (callbacks = {}) => {
  if (socket && socket.connected) {
    console.log('✅ WebSocket 已连接')
    return socket
  }
  
  socket = io(API_BASE, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: RECONNECT_DELAY
  })
  
  socket.on('connect', () => {
    console.log('✅ WebSocket 已连接')
    reconnectAttempts = 0
    callbacks.onConnect?.()
    
    // 发送连接日志
    window.dispatchEvent(new CustomEvent('log:add', {
      detail: { type: 'success', message: 'WebSocket 已连接' }
    }))
  })
  
  socket.on('disconnect', (reason) => {
    console.log('❌ WebSocket 已断开:', reason)
    callbacks.onDisconnect?.(reason)
    
    // 发送断开日志
    window.dispatchEvent(new CustomEvent('log:add', {
      detail: { type: 'warning', message: `WebSocket 已断开：${reason}` }
    }))
  })
  
  socket.on('connect_error', (error) => {
    console.error('❌ WebSocket 连接错误:', error)
    reconnectAttempts++
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('❌ WebSocket 重连次数已达上限')
      window.dispatchEvent(new CustomEvent('log:add', {
        detail: { type: 'error', message: 'WebSocket 重连失败，请检查后端服务' }
      }))
    }
    
    callbacks.onError?.(error)
  })
  
  socket.on('task:created', (task) => {
    console.log('📋 新任务创建:', task)
    callbacks.onTaskCreated?.(task)
    
    window.dispatchEvent(new CustomEvent('log:add', {
      detail: { type: 'info', message: `新任务创建：${task.id}` }
    }))
  })
  
  socket.on('task:updated', (task) => {
    console.log('📝 任务更新:', task)
    callbacks.onTaskUpdated?.(task)
  })
  
  socket.on('task:status', (status) => {
    console.log('🔄 任务状态:', status)
    callbacks.onTaskStatus?.(status)
  })
  
  socket.on('memory:created', (memory) => {
    console.log('🧠 新记忆:', memory)
    callbacks.onMemoryCreated?.(memory)
  })
  
  return socket
}

export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
    console.log('🔌 WebSocket 已断开')
  }
}

// 发送 WebSocket 事件
export const sendWS = (event, data) => {
  if (socket && socket.connected) {
    socket.emit(event, data)
    return true
  } else {
    console.warn('⚠️ WebSocket 未连接，无法发送:', event)
    return false
  }
}

// 检查 WebSocket 连接状态
export const isWebSocketConnected = () => {
  return socket && socket.connected
}

// 获取 WebSocket 连接状态
export const getWebSocketStatus = () => {
  if (!socket) return { connected: false, status: '未初始化' }
  if (socket.connected) return { connected: true, status: '已连接' }
  return { connected: false, status: '重连中', attempts: reconnectAttempts }
}
