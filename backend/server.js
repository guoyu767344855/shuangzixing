import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

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

// 内存数据存储 (后续替换为 SQLite)
const tasks = new Map()
const sessions = new Map()
const memories = []

// API 路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 任务相关 API
app.get('/api/tasks', (req, res) => {
  res.json(Array.from(tasks.values()))
})

app.post('/api/tasks', (req, res) => {
  const task = {
    id: uuidv4(),
    name: req.body.name,
    description: req.body.description,
    status: 'pending',
    progress: 0,
    steps: req.body.steps || [],
    created_at: new Date().toISOString()
  }
  tasks.set(task.id, task)
  io.emit('task:created', task)
  res.json(task)
})

app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.get(req.params.id)
  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }
  res.json(task)
})

app.put('/api/tasks/:id', (req, res) => {
  const task = tasks.get(req.params.id)
  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }
  
  Object.assign(task, req.body)
  task.updated_at = new Date().toISOString()
  tasks.set(req.params.id, task)
  
  io.emit('task:updated', task)
  res.json(task)
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
  console.log('Client connected:', socket.id)
  
  socket.on('task:start', (data) => {
    console.log('Task started:', data)
    io.emit('task:status', {
      task_id: data.task_id,
      status: 'running',
      progress: data.progress
    })
  })
  
  socket.on('task:complete', (data) => {
    console.log('Task completed:', data)
    io.emit('task:status', {
      task_id: data.task_id,
      status: 'completed',
      result: data.result
    })
  })
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// 启动服务器
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`🚀 双子星协调服务运行在 http://localhost:${PORT}`)
})
