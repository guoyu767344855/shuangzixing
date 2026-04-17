import { useTaskStore } from '../stores/taskStore'
import { withRetryAndTimeout, logError, logInfo } from './errorHandler'

/**
 * 任务重试管理器
 */
export class TaskRetryManager {
  constructor() {
    this.taskStore = useTaskStore()
    this.retryQueue = new Map()
    this.maxRetries = 3
    this.retryDelay = 5000 // 5 秒
  }
  
  // 添加任务到重试队列
  async addToRetryQueue(taskId, taskData, reason) {
    logInfo(`任务加入重试队列：${taskId}`, { reason })
    
    const retryInfo = {
      taskId,
      taskData,
      reason,
      attempts: 0,
      lastAttempt: null,
      nextAttempt: Date.now() + this.retryDelay
    }
    
    this.retryQueue.set(taskId, retryInfo)
    
    // 调度重试
    setTimeout(() => {
      this.retryTask(taskId)
    }, this.retryDelay)
  }
  
  // 重试任务
  async retryTask(taskId) {
    const retryInfo = this.retryQueue.get(taskId)
    if (!retryInfo) {
      logError(`重试任务不存在：${taskId}`)
      return
    }
    
    if (retryInfo.attempts >= this.maxRetries) {
      logError(`任务重试次数已达上限：${taskId}`)
      this.removeFromRetryQueue(taskId)
      
      // 更新任务状态为失败
      await this.taskStore.updateTask(taskId, {
        status: 'failed',
        error: `重试次数已达上限 (${this.maxRetries})`
      })
      
      return
    }
    
    retryInfo.attempts++
    retryInfo.lastAttempt = new Date().toISOString()
    
    logInfo(`重试任务：${taskId} (尝试 ${retryInfo.attempts}/${this.maxRetries})`)
    
    try {
      // 使用带重试和超时的执行
      await withRetryAndTimeout(
        async () => {
          // 重新下发任务给 Hermes
          window.dispatchEvent(new CustomEvent('hermes:execute', {
            detail: retryInfo.taskData
          }))
        },
        {
          timeout: 60000, // 60 秒超时
          maxRetries: 2,
          onRetry: (error, attempt) => {
            logInfo(`任务重试中：${taskId}, 尝试 ${attempt}/2`, { error: error.message })
          }
        }
      )
      
      // 重试成功，从队列移除
      this.removeFromRetryQueue(taskId)
      logInfo(`任务重试成功：${taskId}`)
      
    } catch (error) {
      logError(`任务重试失败：${taskId}`, { error: error.message })
      
      // 更新任务状态
      await this.taskStore.updateTask(taskId, {
        status: 'failed',
        error: error.message
      })
      
      // 从队列移除
      this.removeFromRetryQueue(taskId)
    }
  }
  
  // 从重试队列移除
  removeFromRetryQueue(taskId) {
    this.retryQueue.delete(taskId)
  }
  
  // 获取重试队列状态
  getRetryQueueStatus() {
    return {
      total: this.retryQueue.size,
      tasks: Array.from(this.retryQueue.values()).map(info => ({
        taskId: info.taskId,
        attempts: info.attempts,
        nextAttempt: new Date(info.nextAttempt).toLocaleString()
      }))
    }
  }
  
  // 清空重试队列
  clearRetryQueue() {
    this.retryQueue.clear()
    logInfo('重试队列已清空')
  }
}

export default TaskRetryManager
