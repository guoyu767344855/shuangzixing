/**
 * 错误处理与重试机制
 */

// 错误类型定义
export const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
}

// 自定义错误类
export class AppError extends Error {
  constructor(type, message, details = {}) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

// 重试配置
export const RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 秒
  maxDelay: 10000, // 10 秒
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorTypes.NETWORK_ERROR,
    ErrorTypes.TIMEOUT_ERROR,
    'ECONNRESET',
    'ETIMEDOUT'
  ]
}

/**
 * 带重试的异步函数执行
 * @param {Function} fn - 要执行的异步函数
 * @param {Object} options - 配置选项
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = RetryConfig.maxRetries,
    initialDelay = RetryConfig.initialDelay,
    onRetry = null,
    onError = null
  } = options
  
  let lastError
  let attempt = 0
  let delay = initialDelay
  
  while (attempt <= maxRetries) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      attempt++
      
      // 检查是否可重试
      const isRetryable = RetryConfig.retryableErrors.includes(error.type) ||
                          RetryConfig.retryableErrors.includes(error.code) ||
                          error.message.includes('network') ||
                          error.message.includes('timeout')
      
      if (!isRetryable || attempt > maxRetries) {
        console.error(`❌ 执行失败 (尝试 ${attempt}/${maxRetries + 1}):`, error)
        if (onError) onError(error, attempt)
        throw error
      }
      
      // 等待后重试
      console.warn(`⚠️ 重试中 (尝试 ${attempt}/${maxRetries + 1}), ${delay}ms 后重试...`)
      if (onRetry) onRetry(error, attempt, delay)
      
      await sleep(delay)
      delay = Math.min(delay * RetryConfig.backoffMultiplier, RetryConfig.maxDelay)
    }
  }
  
  throw lastError
}

/**
 * 带超时的异步函数执行
 * @param {Function} fn - 要执行的异步函数
 * @param {number} timeout - 超时时间 (毫秒)
 */
export async function withTimeout(fn, timeout = 30000) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => 
      setTimeout(() => {
        reject(new AppError(
          ErrorTypes.TIMEOUT_ERROR,
          `操作超时 (${timeout}ms)`,
          { timeout }
        ))
      }, timeout)
    )
  ])
}

/**
 * 带重试和超时的异步函数执行
 * @param {Function} fn - 要执行的异步函数
 * @param {Object} options - 配置选项
 */
export async function withRetryAndTimeout(fn, options = {}) {
  const { timeout = 30000, ...retryOptions } = options
  
  return withRetry(
    () => withTimeout(fn, timeout),
    retryOptions
  )
}

// 辅助函数：休眠
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 辅助函数：格式化错误信息
export function formatError(error) {
  if (error instanceof AppError) {
    return {
      type: error.type,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp
    }
  }
  
  return {
    type: ErrorTypes.UNKNOWN_ERROR,
    message: error.message || '未知错误',
    stack: error.stack,
    timestamp: new Date().toISOString()
  }
}

// 辅助函数：记录错误日志
export function logError(error, context = {}) {
  const formatted = formatError(error)
  console.error('❌ 错误:', {
    ...formatted,
    context
  })
  
  // 发送到日志面板
  window.dispatchEvent(new CustomEvent('log:add', {
    detail: {
      type: 'error',
      message: `${formatted.type}: ${formatted.message}`
    }
  }))
}

// 辅助函数：记录警告日志
export function logWarning(message, context = {}) {
  console.warn('⚠️ 警告:', { message, context })
  
  window.dispatchEvent(new CustomEvent('log:add', {
    detail: {
      type: 'warning',
      message
    }
  }))
}

// 辅助函数：记录信息日志
export function logInfo(message, context = {}) {
  console.log('ℹ️ 信息:', { message, context })
  
  window.dispatchEvent(new CustomEvent('log:add', {
    detail: {
      type: 'info',
      message
    }
  }))
}

export default {
  ErrorTypes,
  AppError,
  RetryConfig,
  withRetry,
  withTimeout,
  withRetryAndTimeout,
  formatError,
  logError,
  logWarning,
  logInfo
}
