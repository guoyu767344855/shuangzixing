import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import { TaskRouter } from './services/taskRouter.js'
import { OpenClawAdapter } from './services/openclawAdapter.js'
import { HermesAdapter } from './services/hermesAdapter.js'

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

// API 路由
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      openclaw: openclawAdapter.connected,
      hermes: hermesAdapter.connected
    }
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
app.get('/api/memories', (req, res) => {
  res.json(memories)
})

app.post('/api/memories', (req, res) => {
  const memory = {
    id: uuidv4(),
    content: req.body.content,
    source: req.body.source,
    embedding: req.body.embedding,
    created_at: new Date().toISOString()
  }
  memories.push(memory)
  io.emit('memory:created', memory)
  res.json(memory)
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
