import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { ChromaDBService } from './chromaDBService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 记忆同步服务 - 管理共享记忆和向量数据库
 * 支持 SQLite (基础) + ChromaDB (向量搜索)
 */
export class MemorySync {
  constructor(dbPath = '../data/memories.db') {
    // 确保 data 目录存在
    import('node:fs').then(({ mkdirSync, existsSync }) => {
      const dataDir = new URL('../data', import.meta.url)
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true })
      }
    })
    
    this.db = new Database(dbPath)
    this.memories = []
    this.chromaDB = new ChromaDBService()
    this.useChromaDB = false
    this.initDatabase()
  }
  
  // 初始化数据库
  async initDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        type TEXT NOT NULL,
        embedding TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        messages TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // 尝试连接 ChromaDB
    this.useChromaDB = await this.chromaDB.connect()
    
    console.log('✅ 记忆数据库初始化完成')
    console.log(this.useChromaDB ? '✅ ChromaDB 已启用 (向量搜索)' : '⚠️ 仅使用 SQLite (关键词搜索)')
  }
  
  // 连接 ChromaDB
  async connectChromaDB() {
    this.useChromaDB = await this.chromaDB.connect()
    return this.useChromaDB
  }
  
  // 添加记忆
  async addMemory(content, source, type = 'conversation', metadata = {}) {
    const id = uuidv4()
    
    // 保存到 SQLite
    const stmt = this.db.prepare(`
      INSERT INTO memories (id, content, source, type, metadata)
      VALUES (?, ?, ?, ?, ?)
    `)
    
    stmt.run(id, content, source, type, JSON.stringify(metadata))
    
    const memory = {
      id,
      content,
      source,
      type,
      metadata,
      created_at: new Date().toISOString()
    }
    
    this.memories.push(memory)
    
    // 同时保存到 ChromaDB (如果启用)
    if (this.useChromaDB) {
      try {
        await this.chromaDB.addMemory(content, { source, type, ...metadata })
      } catch (error) {
        console.error('⚠️ ChromaDB 保存失败，但 SQLite 已保存')
      }
    }
    
    console.log(`🧠 新记忆：${id} (${source})`)
    
    return memory
  }
  
  // 添加会话消息到记忆
  addSessionMessage(sessionId, message) {
    const session = this.getSession(sessionId)
    
    if (!session) {
      this.createSession(sessionId, message)
    } else {
      const messages = JSON.parse(session.messages)
      messages.push(message)
      
      const stmt = this.db.prepare(`
        UPDATE sessions SET messages = ? WHERE id = ?
      `)
      
      stmt.run(JSON.stringify(messages), sessionId)
      
      // 如果消息重要，添加到长期记忆
      if (message.important) {
        this.addMemory(message.content, message.source, 'important_message', {
          sessionId,
          messageId: message.id
        })
      }
    }
  }
  
  // 创建会话
  createSession(sessionId, initialMessage) {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, type, messages)
      VALUES (?, ?, ?)
    `)
    
    const messages = [initialMessage]
    stmt.run(sessionId, initialMessage.source, JSON.stringify(messages))
  }
  
  // 获取会话
  getSession(sessionId) {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions WHERE id = ?
    `)
    
    return stmt.get(sessionId)
  }
  
  // 搜索记忆
  async searchMemories(query, limit = 10, filter = {}) {
    // 如果 ChromaDB 启用，使用向量搜索
    if (this.useChromaDB) {
      try {
        const results = await this.chromaDB.searchMemories(query, limit, filter)
        console.log(`🔍 ChromaDB 向量搜索：${results.length} 条结果`)
        return results
      } catch (error) {
        console.error('⚠️ ChromaDB 搜索失败，降级到关键词搜索')
      }
    }
    
    // 降级到 SQLite 关键词搜索
    const stmt = this.db.prepare(`
      SELECT * FROM memories 
      WHERE content LIKE ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `)
    
    const searchPattern = `%${query}%`
    const results = stmt.all(searchPattern, limit)
    console.log(`🔍 SQLite 关键词搜索：${results.length} 条结果`)
    
    return results
  }
  
  // 获取最近记忆
  async getRecentMemories(limit = 20) {
    // 如果 ChromaDB 启用，优先从 ChromaDB 获取
    if (this.useChromaDB) {
      try {
        return await this.chromaDB.getRecentMemories(limit)
      } catch (error) {
        console.error('⚠️ ChromaDB 获取失败，降级到 SQLite')
      }
    }
    
    const stmt = this.db.prepare(`
      SELECT * FROM memories 
      ORDER BY created_at DESC 
      LIMIT ?
    `)
    
    return stmt.all(limit)
  }
  
  // 获取统计信息
  async getStats() {
    const sqliteCount = this.db.prepare('SELECT COUNT(*) as count FROM memories').get()
    
    const stats = {
      sqlite_memories: sqliteCount.count,
      chromadb_enabled: this.useChromaDB
    }
    
    if (this.useChromaDB) {
      const chromaStats = await this.chromaDB.getStats()
      if (chromaStats) {
        stats.chromadb_memories = chromaStats.total_memories
      }
    }
    
    return stats
  }
  
  // 获取会话历史
  getSessionHistory(sessionId) {
    const session = this.getSession(sessionId)
    if (!session) return []
    
    return JSON.parse(session.messages)
  }
  
  // 删除记忆
  deleteMemory(memoryId) {
    const stmt = this.db.prepare(`
      DELETE FROM memories WHERE id = ?
    `)
    
    stmt.run(memoryId)
    this.memories = this.memories.filter(m => m.id !== memoryId)
  }
  
  // 导出记忆
  exportMemories() {
    return this.memories.map(m => ({
      ...m,
      metadata: typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata
    }))
  }
  
  // 导入记忆
  importMemories(memories) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memories (id, content, source, type, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    
    const transaction = this.db.transaction((memories) => {
      for (const memory of memories) {
        stmt.run(
          memory.id,
          memory.content,
          memory.source,
          memory.type,
          JSON.stringify(memory.metadata),
          memory.created_at
        )
        this.memories.push(memory)
      }
    })
    
    transaction(memories)
  }
  
  // 关闭数据库
  close() {
    this.db.close()
    console.log('🔒 记忆数据库已关闭')
  }
}

export default MemorySync
