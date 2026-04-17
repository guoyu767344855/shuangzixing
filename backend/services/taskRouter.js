import { v4 as uuidv4 } from 'uuid'

/**
 * 任务路由器 - 负责 OpenClaw 和 Hermes 之间的任务流转
 */
export class TaskRouter {
  constructor(io) {
    this.io = io
    this.tasks = new Map()
    this.openclawAdapter = null
    this.hermesAdapter = null
  }
  
  // 设置适配器
  setAdapters(openclawAdapter, hermesAdapter) {
    this.openclawAdapter = openclawAdapter
    this.hermesAdapter = hermesAdapter
  }
  
  // 创建新任务
  async createTask(plan) {
    const taskId = uuidv4()
    
    const task = {
      id: taskId,
      plan,
      status: 'pending',
      currentStep: 0,
      stepResults: [],
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null
    }
    
    this.tasks.set(taskId, task)
    
    // 通知 Hermes 执行
    if (this.hermesAdapter) {
      await this.hermesAdapter.executeTask(task)
    }
    
    // 广播任务创建
    this.io.emit('task:created', task)
    
    return task
  }
  
  // 更新任务状态
  async updateTaskStatus(taskId, status, stepResults = []) {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }
    
    task.status = status
    task.stepResults = stepResults
    task.updated_at = new Date().toISOString()
    
    // 计算进度
    task.progress = Math.round((stepResults.filter(s => s.status === 'success').length / task.plan.steps.length) * 100)
    
    // 如果完成，通知 OpenClaw 审查
    if (status === 'completed' && this.openclawAdapter) {
      await this.openclawAdapter.reviewTask(task)
    }
    
    // 广播任务更新
    this.io.emit('task:updated', task)
    
    return task
  }
  
  // 获取任务
  getTask(taskId) {
    return this.tasks.get(taskId)
  }
  
  // 获取所有任务
  getAllTasks() {
    return Array.from(this.tasks.values())
  }
  
  // 取消任务
  async cancelTask(taskId) {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }
    
    task.status = 'cancelled'
    task.cancelled_at = new Date().toISOString()
    
    // 通知 Hermes 停止执行
    if (this.hermesAdapter) {
      await this.hermesAdapter.cancelTask(taskId)
    }
    
    this.io.emit('task:cancelled', task)
    
    return task
  }
  
  // 重试任务
  async retryTask(taskId) {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }
    
    task.status = 'pending'
    task.stepResults = []
    task.progress = 0
    task.retried_at = new Date().toISOString()
    
    // 重新下发给 Hermes
    if (this.hermesAdapter) {
      await this.hermesAdapter.executeTask(task)
    }
    
    this.io.emit('task:retried', task)
    
    return task
  }
}

export default TaskRouter
