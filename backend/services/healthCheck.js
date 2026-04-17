import os from 'os'

/**
 * 系统健康检查服务
 */
export class HealthCheckService {
  constructor() {
    this.lastCheck = null
    this.healthHistory = []
  }
  
  // 执行健康检查
  async check() {
    const timestamp = new Date().toISOString()
    
    const health = {
      timestamp,
      status: 'healthy',
      services: {},
      system: this.getSystemInfo(),
      performance: await this.getPerformanceMetrics()
    }
    
    // 检查各项服务
    health.services.memory = await this.checkMemory()
    health.services.database = await this.checkDatabase()
    
    // 确定总体状态
    if (health.services.memory.status === 'critical' || 
        health.services.database.status === 'critical') {
      health.status = 'critical'
    } else if (health.services.memory.status === 'warning' || 
               health.services.database.status === 'warning') {
      health.status = 'warning'
    }
    
    this.lastCheck = health
    this.healthHistory.push(health)
    
    // 保留最近 100 次检查记录
    if (this.healthHistory.length > 100) {
      this.healthHistory.shift()
    }
    
    return health
  }
  
  // 获取系统信息
  getSystemInfo() {
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime()
    }
  }
  
  // 获取性能指标
  async getPerformanceMetrics() {
    const usage = process.memoryUsage()
    
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
      heapUsedPercent: Math.round((usage.heapUsed / usage.heapTotal) * 100)
    }
  }
  
  // 检查内存使用
  async checkMemory() {
    const freeMemory = os.freemem()
    const totalMemory = os.totalmem()
    const usedPercent = ((totalMemory - freeMemory) / totalMemory) * 100
    
    let status = 'healthy'
    if (usedPercent > 90) {
      status = 'critical'
    } else if (usedPercent > 75) {
      status = 'warning'
    }
    
    return {
      status,
      usedPercent: Math.round(usedPercent),
      freeMemory,
      totalMemory,
      message: `内存使用：${Math.round(usedPercent)}%`
    }
  }
  
  // 检查数据库
  async checkDatabase() {
    try {
      // 简单的数据库连接检查
      const { default: Database } = await import('better-sqlite3')
      const db = new Database('./data/memories.db', { fileMustExist: false })
      
      const result = db.prepare('SELECT 1').get()
      db.close()
      
      if (result) {
        return {
          status: 'healthy',
          message: '数据库连接正常'
        }
      } else {
        return {
          status: 'warning',
          message: '数据库查询异常'
        }
      }
    } catch (error) {
      return {
        status: 'critical',
        message: `数据库连接失败：${error.message}`
      }
    }
  }
  
  // 获取最后一次健康检查
  getLastCheck() {
    return this.lastCheck
  }
  
  // 获取健康历史
  getHistory(limit = 10) {
    return this.healthHistory.slice(-limit)
  }
  
  // 获取健康趋势
  getTrend() {
    if (this.healthHistory.length < 2) {
      return { trend: 'insufficient_data' }
    }
    
    const recent = this.healthHistory.slice(-10)
    const criticalCount = recent.filter(h => h.status === 'critical').length
    const warningCount = recent.filter(h => h.status === 'warning').length
    
    if (criticalCount > 0) {
      return { trend: 'degrading', criticalCount, warningCount }
    } else if (warningCount > 3) {
      return { trend: 'warning', criticalCount, warningCount }
    } else {
      return { trend: 'stable', criticalCount, warningCount }
    }
  }
}

export default HealthCheckService
