import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { TaskRouter } from './services/taskRouter.js'
import { OpenClawAdapter } from './services/openclawAdapter.js'
import { HermesAdapter } from './services/hermesAdapter.js'
import { MemorySync } from './services/memorySync.js'
import { HealthCheckService } from './services/healthCheck.js'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

app.use(cors())
app.use(express.json())

// 初始化服务
const taskRouter = new TaskRouter(io)
const openclawAdapter = new OpenClawAdapter()
const hermesAdapter = new HermesAdapter()
const memorySync = new MemorySync()
const healthCheck = new HealthCheckService()

// 设置适配器
taskRouter.setAdapters(openclawAdapter, hermesAdapter)

// Hermes 任务完成回调
hermesAdapter.setTaskCompleteCallback(async (taskId, task) => {
  await taskRouter.updateTaskStatus(taskId, 'completed', task.stepResults)
})

// 连接外部系统
async function connectExternalServices() {
  console.log('🔗 正在连接外部服务...')
  
  const [openclawConnected, hermesConnected] = await Promise.all([
    openclawAdapter.connect(),
    hermesAdapter.connect()
  ])
  
  if (openclawConnected) {
    console.log('✅ OpenClaw 已连接')
  } else {
    console.log('⚠️ OpenClaw 未连接 (将在需要时重试)')
  }
  
  if (hermesConnected) {
    console.log('✅ Hermes 已连接')
  } else {
    console.log('⚠️ Hermes 未连接 (将在需要时重试)')
  }
}

// 启动时连接
connectExternalServices()

// 定期健康检查 (每 5 分钟)
setInterval(async () => {
  const health = await healthCheck.check()
  if (health.status !== 'healthy') {
    console.warn('⚠️ 健康检查异常:', health)
    io.emit('health:warning', health)
  }
}, 300000)

// API 路由
app.get('/api/health', async (req, res) => {
  const health = await healthCheck.check()
  res.json(health)
})

app.get('/api/health/status', (req, res) => {
  const lastCheck = healthCheck.getLastCheck()
  const trend = healthCheck.getTrend()
  res.json({
    lastCheck,
    trend,
    history: healthCheck.getHistory(10)
  })
})

// 任务相关 API
app.get('/api/tasks', (req, res) => {
  res.json(taskRouter.getAllTasks())
})

app.post('/api/tasks', async (req, res) => {
  try {
    const plan = {
      task_id: uuidv4(),
      goal: req.body.goal,
      steps: req.body.steps || [],
      context: req.body.context || {}
    }
    
    const task = await taskRouter.createTask(plan)
    res.json(task)
  } catch (error) {
    console.error('创建任务失败:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/tasks/:id', (req, res) => {
  const task = taskRouter.getTask(req.params.id)
  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }
  res.json(task)
})

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { action } = req.body
    
    if (action === 'cancel') {
      const task = await taskRouter.cancelTask(req.params.id)
      return res.json(task)
    }
    
    if (action === 'retry') {
      const task = await taskRouter.retryTask(req.params.id)
      return res.json(task)
    }
    
    // 默认更新
    const task = await taskRouter.updateTaskStatus(req.params.id, req.body.status, req.body.stepResults)
    res.json(task)
  } catch (error) {
    console.error('更新任务失败:', error)
    res.status(500).json({ error: error.message })
  }
})

// 会话相关 API
app.get('/api/sessions', (req, res) => {
  res.json(Array.from(sessions.values()))
})

app.post('/api/sessions', (req, res) => {
  const session = {
    id: uuidv4(),
    type: req.body.type, // 'openclaw' or 'hermes'
    messages: [],
    created_at: new Date().toISOString()
  }
  sessions.set(session.id, session)
  res.json(session)
})

// 记忆相关 API
app.get('/api/memories', async (req, res) => {
  try {
    const memories = await memorySync.getRecentMemories(50)
    res.json(memories)
  } catch (error) {
    console.error('获取记忆失败:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/memories', async (req, res) => {
  try {
    const memory = await memorySync.addMemory(
      req.body.content,
      req.body.source,
      req.body.type || 'conversation',
      req.body.metadata || {}
    )
    io.emit('memory:created', memory)
    res.json(memory)
  } catch (error) {
    console.error('添加记忆失败:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/memories/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query
    if (!q) {
      return res.status(400).json({ error: '缺少搜索参数 q' })
    }
    
    const memories = await memorySync.searchMemories(q, parseInt(limit))
    res.json(memories)
  } catch (error) {
    console.error('搜索记忆失败:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/memories/stats', async (req, res) => {
  try {
    const stats = await memorySync.getStats()
    res.json(stats)
  } catch (error) {
    console.error('获取统计失败:', error)
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/memories/:id', async (req, res) => {
  try {
    const deleted = await memorySync.deleteMemory(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: '记忆未找到' })
    }
    res.json({ success: true })
  } catch (error) {
    console.error('删除记忆失败:', error)
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/memories', async (req, res) => {
  try {
    const cleared = await memorySync.clearMemories()
    if (!cleared) {
      return res.status(500).json({ error: '清空失败' })
    }
    res.json({ success: true })
  } catch (error) {
    console.error('清空记忆失败:', error)
    res.status(500).json({ error: error.message })
  }
})

// WebSocket 连接
io.on('connection', (socket) => {
  console.log('🔌 客户端连接:', socket.id)
  
  // 客户端发送任务开始
  socket.on('task:start', (data) => {
    console.log('▶️ 任务开始:', data)
    io.emit('task:status', {
      task_id: data.task_id,
      status: 'running',
      progress: data.progress
    })
  })
  
  // 客户端发送任务完成
  socket.on('task:complete', async (data) => {
    console.log('✅ 任务完成:', data)
    try {
      await taskRouter.updateTaskStatus(data.task_id, 'completed', data.stepResults)
    } catch (error) {
      console.error('更新任务状态失败:', error)
    }
  })
  
  // 客户端请求重新连接外部服务
  socket.on('reconnect:services', async () => {
    console.log('🔄 重新连接外部服务...')
    await connectExternalServices()
    socket.emit('services:status', {
      openclaw: openclawAdapter.connected,
      hermes: hermesAdapter.connected
    })
  })
  
  socket.on('disconnect', () => {
    console.log('🔌 客户端断开:', socket.id)
  })
})

// 启动服务器
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`🚀 双子星协调服务运行在 http://localhost:${PORT}`)
})
