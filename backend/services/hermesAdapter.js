/**
 * Hermes 适配器 - 与 Hermes 系统通信
 */
export class HermesAdapter {
  constructor(config = {}) {
    this.config = config
    this.baseUrl = config.baseUrl || 'http://localhost:8081'
    this.connected = false
    this.executingTasks = new Map()
  }
  
  // 连接到 Hermes
  async connect() {
    try {
      // TODO: 实现 Hermes WebUI 连接
      console.log('🔗 尝试连接 Hermes...')
      this.connected = true
      console.log('✅ Hermes 已连接')
      return true
    } catch (error) {
      console.error('❌ Hermes 连接失败:', error)
      this.connected = false
      return false
    }
  }
  
  // 执行任务
  async executeTask(task) {
    if (!this.connected) {
      throw new Error('Hermes 未连接')
    }
    
    console.log('🛠️ Hermes 开始执行任务:', task.id)
    
    this.executingTasks.set(task.id, {
      task,
      status: 'running',
      started_at: new Date().toISOString()
    })
    
    // TODO: 调用 Hermes API 执行任务
    // 这里模拟执行过程
    this.simulateExecution(task.id)
    
    return {
      task_id: task.id,
      status: 'executing'
    }
  }
  
  // 模拟执行过程 (后续替换为真实调用)
  async simulateExecution(taskId) {
    const executing = this.executingTasks.get(taskId)
    if (!executing) return
    
    const task = executing.task
    const steps = task.plan.steps
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      
      console.log(`⏳ 执行步骤 ${i + 1}/${steps.length}: ${step.action}`)
      
      // 模拟步骤执行
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      executing.task.stepResults.push({
        step_id: step.step_id,
        status: 'success',
        output: { result: '模拟结果' },
        completed_at: new Date().toISOString()
      })
      
      console.log(`✅ 步骤 ${i + 1} 完成`)
    }
    
    // 任务完成
    executing.status = 'completed'
    executing.completed_at = new Date().toISOString()
    
    console.log('🎉 任务执行完成:', taskId)
    
    // 通知任务路由器
    if (this.onTaskComplete) {
      this.onTaskComplete(taskId, executing.task)
    }
  }
  
  // 取消任务
  async cancelTask(taskId) {
    const executing = this.executingTasks.get(taskId)
    if (executing) {
      executing.status = 'cancelled'
      executing.cancelled_at = new Date().toISOString()
      console.log('⏹️ 任务已取消:', taskId)
    }
  }
  
  // 获取任务状态
  getTaskStatus(taskId) {
    return this.executingTasks.get(taskId)
  }
  
  // 设置任务完成回调
  setTaskCompleteCallback(callback) {
    this.onTaskComplete = callback
  }
  
  // 断开连接
  disconnect() {
    this.connected = false
    this.executingTasks.clear()
    console.log('🔌 Hermes 已断开')
  }
}

export default HermesAdapter
