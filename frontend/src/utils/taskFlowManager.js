import { useTaskStore } from '../stores/taskStore'
import { useSessionStore } from '../stores/sessionStore'
import { api, sendWS } from '../api/coordinator'

/**
 * 任务流管理器 - 协调 OpenClaw → Hermes → OpenClaw 的完整流程
 */
export class TaskFlowManager {
  constructor() {
    this.taskStore = useTaskStore()
    this.sessionStore = useSessionStore()
    this.currentTask = null
    
    // 绑定事件监听
    this.bindEvents()
  }
  
  // 绑定全局事件
  bindEvents() {
    // OpenClaw 生成规划
    window.addEventListener('openclaw:plan', this.handleOpenClawPlan.bind(this))
    
    // Hermes 执行完成
    window.addEventListener('hermes:complete', this.handleHermesComplete.bind(this))
    
    // OpenClaw 审查完成
    window.addEventListener('openclaw:review', this.handleOpenClawReview.bind(this))
    
    console.log('✅ 任务流管理器已初始化')
  }
  
  // 处理 OpenClaw 规划
  async handleOpenClawPlan(event) {
    const plan = event.detail
    console.log('📋 收到 OpenClaw 规划:', plan)
    
    try {
      // 创建任务
      const task = await this.taskStore.createTask({
        goal: plan.goal,
        steps: plan.steps,
        context: plan.context
      })
      
      this.currentTask = task
      console.log('✅ 任务创建成功:', task.id)
      
      // 下发给 Hermes
      this.dispatchToHermes(task)
      
    } catch (error) {
      console.error('❌ 创建任务失败:', error)
    }
  }
  
  // 下发任务给 Hermes
  dispatchToHermes(task) {
    console.log('🛠️ 下发任务给 Hermes:', task.id)
    
    // 触发 Hermes 执行事件
    window.dispatchEvent(new CustomEvent('hermes:execute', {
      detail: task
    }))
    
    // 更新任务状态
    this.taskStore.updateTask(task.id, {
      status: 'running',
      started_at: new Date().toISOString()
    })
  }
  
  // 处理 Hermes 完成
  async handleHermesComplete(event) {
    const result = event.detail
    console.log('✅ Hermes 执行完成:', result)
    
    try {
      // 更新任务状态
      await this.taskStore.updateTask(this.currentTask.id, {
        status: 'completed',
        stepResults: result.stepResults,
        completed_at: new Date().toISOString()
      })
      
      // 触发 OpenClaw 审查
      this.requestOpenClawReview(result)
      
    } catch (error) {
      console.error('❌ 更新任务状态失败:', error)
    }
  }
  
  // 请求 OpenClaw 审查
  requestOpenClawReview(result) {
    console.log('🔍 请求 OpenClaw 审查')
    
    // 发送审查请求到 OpenClaw WebUI
    const openclawFrame = document.querySelector('iframe[src*="8080"]')
    if (openclawFrame) {
      openclawFrame.contentWindow.postMessage({
        type: 'openclaw:review_request',
        taskResult: result
      }, 'http://localhost:8080')
    }
  }
  
  // 处理 OpenClaw 审查结果
  handleOpenClawReview(event) {
    const review = event.detail
    console.log('🔍 OpenClaw 审查完成:', review)
    
    // 记录审查结果
    this.sessionStore.addMessage('openclaw', {
      role: 'openclaw',
      content: `审查完成：${review.review_status === 'approved' ? '✅ 通过' : '❌ 需修改'}\n\n评分：${review.quality_score}\n意见：${review.comments}`
    })
    
    // 任务最终完成
    console.log('🎉 任务流完成:', this.currentTask.id)
    this.currentTask = null
  }
  
  // 手动创建任务
  async createManualTask(goal, steps) {
    const task = await this.taskStore.createTask({
      goal,
      steps,
      context: {}
    })
    
    this.currentTask = task
    this.dispatchToHermes(task)
    
    return task
  }
  
  // 取消当前任务
  async cancelCurrentTask() {
    if (!this.currentTask) return
    
    console.log('⏹️ 取消任务:', this.currentTask.id)
    
    await this.taskStore.updateTask(this.currentTask.id, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString()
    })
    
    // 通知 Hermes 停止
    const hermesFrame = document.querySelector('iframe[src*="8081"]')
    if (hermesFrame) {
      hermesFrame.contentWindow.postMessage({
        type: 'hermes:cancel',
        task_id: this.currentTask.id
      }, 'http://localhost:8081')
    }
    
    this.currentTask = null
  }
  
  // 重试任务
  async retryTask(taskId) {
    console.log('🔄 重试任务:', taskId)
    
    const task = await this.taskStore.updateTask(taskId, {
      status: 'pending',
      retried_at: new Date().toISOString()
    })
    
    this.currentTask = task
    this.dispatchToHermes(task)
  }
  
  // 清理
  destroy() {
    window.removeEventListener('openclaw:plan', this.handleOpenClawPlan)
    window.removeEventListener('hermes:complete', this.handleHermesComplete)
    window.removeEventListener('openclaw:review', this.handleOpenClawReview)
    
    console.log('🔌 任务流管理器已销毁')
  }
}

export default TaskFlowManager
