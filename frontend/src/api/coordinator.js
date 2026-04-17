import io from 'socket.io-client'

const API_BASE = 'http://localhost:3000'

// HTTP API 客户端
export const api = {
  // 任务相关
  async getTasks() {
    const res = await fetch(`${API_BASE}/api/tasks`)
    return res.json()
  },
  
  async createTask(taskData) {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    })
    return res.json()
  },
  
  async updateTask(taskId, updates) {
    const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    return res.json()
  },
  
  // 会话相关
  async createSession(type) {
    const res = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    })
    return res.json()
  },
  
  async getSessions() {
    const res = await fetch(`${API_BASE}/api/sessions`)
    return res.json()
  },
  
  // 记忆相关
  async getMemories() {
    const res = await fetch(`${API_BASE}/api/memories`)
    return res.json()
  },
  
  async createMemory(memoryData) {
    const res = await fetch(`${API_BASE}/api/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memoryData)
    })
    return res.json()
  }
}

// WebSocket 连接
let socket = null

export const connectWebSocket = (callbacks = {}) => {
  if (socket) return socket
  
  socket = io(API_BASE, {
    transports: ['websocket', 'polling']
  })
  
  socket.on('connect', () => {
    console.log('✅ WebSocket 已连接')
    callbacks.onConnect?.()
  })
  
  socket.on('disconnect', () => {
    console.log('❌ WebSocket 已断开')
    callbacks.onDisconnect?.()
  })
  
  socket.on('task:created', (task) => {
    console.log('📋 新任务创建:', task)
    callbacks.onTaskCreated?.(task)
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
  }
}

// 发送 WebSocket 事件
export const sendWS = (event, data) => {
  if (socket && socket.connected) {
    socket.emit(event, data)
  }
}
