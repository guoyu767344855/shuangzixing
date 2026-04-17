import { v4 as uuidv4 } from 'uuid'

/**
 * ChromaDB 记忆服务 - 向量数据库集成
 * 
 * 注意：需要安装 chromadb
 * npm install chromadb
 */
export class ChromaDBService {
  constructor(config = {}) {
    this.collectionName = config.collectionName || 'shuangzixing_memories'
    this.client = null
    this.collection = null
    this.connected = false
  }
  
  // 连接 ChromaDB
  async connect() {
    try {
      // 动态导入 ChromaDB
      const { ChromaClient } = await import('chromadb')
      
      this.client = new ChromaClient({
        path: 'http://localhost:8000' // ChromaDB 服务地址
      })
      
      // 获取或创建集合
      try {
        this.collection = await this.client.getCollection({ name: this.collectionName })
        console.log('✅ 已连接到 ChromaDB 集合:', this.collectionName)
      } catch (error) {
        // 集合不存在，创建新集合
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: {
            description: '双子星共享记忆',
            type: 'conversation_and_tasks'
          }
        })
        console.log('✅ 已创建 ChromaDB 集合:', this.collectionName)
      }
      
      this.connected = true
      return true
      
    } catch (error) {
      console.error('❌ ChromaDB 连接失败:', error)
      console.log('⚠️ 将使用 SQLite 作为备用存储')
      this.connected = false
      return false
    }
  }
  
  // 添加记忆 (自动向量化)
  async addMemory(content, metadata = {}) {
    if (!this.connected || !this.collection) {
      console.warn('⚠️ ChromaDB 未连接，跳过向量化')
      return null
    }
    
    try {
      const id = uuidv4()
      const timestamp = new Date().toISOString()
      
      // ChromaDB 会自动处理向量化
      await this.collection.add({
        id,
        documents: [content],
        metadatas: [{
          content,
          source: metadata.source || 'unknown',
          type: metadata.type || 'conversation',
          task_id: metadata.task_id || null,
          session_id: metadata.session_id || null,
          timestamp,
          ...metadata
        }]
      })
      
      console.log(`🧠 记忆已添加：${id} (${metadata.source})`)
      
      return {
        id,
        content,
        metadata,
        timestamp
      }
      
    } catch (error) {
      console.error('❌ 添加记忆失败:', error)
      throw error
    }
  }
  
  // 批量添加记忆
  async addMemories(memories) {
    if (!this.connected || !this.collection) {
      return []
    }
    
    try {
      const ids = []
      const documents = []
      const metadatas = []
      
      memories.forEach(memory => {
        const id = uuidv4()
        ids.push(id)
        documents.push(memory.content)
        metadatas.push({
          ...memory.metadata,
          timestamp: new Date().toISOString()
        })
      })
      
      await this.collection.add({
        ids,
        documents,
        metadatas
      })
      
      console.log(`🧠 批量添加 ${memories.length} 条记忆`)
      
      return ids.map((id, index) => ({
        id,
        content: memories[index].content,
        metadata: memories[index].metadata
      }))
      
    } catch (error) {
      console.error('❌ 批量添加记忆失败:', error)
      throw error
    }
  }
  
  // 搜索相似记忆
  async searchMemories(query, limit = 10, filter = {}) {
    if (!this.connected || !this.collection) {
      return []
    }
    
    try {
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit,
        where: filter
      })
      
      // 格式化结果
      const memories = results.documents[0].map((content, index) => ({
        id: results.ids[0][index],
        content,
        metadata: results.metadatas[0][index],
        distance: results.distances ? results.distances[0][index] : null
      }))
      
      console.log(`🔍 搜索到 ${memories.length} 条相关记忆`)
      
      return memories
      
    } catch (error) {
      console.error('❌ 搜索记忆失败:', error)
      return []
    }
  }
  
  // 按条件获取记忆
  async getMemories(where = {}, limit = 20) {
    if (!this.connected || !this.collection) {
      return []
    }
    
    try {
      const results = await this.collection.get({
        where,
        limit
      })
      
      return results.documents.map((content, index) => ({
        id: results.ids[index],
        content,
        metadata: results.metadatas[index]
      }))
      
    } catch (error) {
      console.error('❌ 获取记忆失败:', error)
      return []
    }
  }
  
  // 获取最近记忆
  async getRecentMemories(limit = 20) {
    return this.getMemories({}, limit)
  }
  
  // 删除记忆
  async deleteMemory(memoryId) {
    if (!this.connected || !this.collection) {
      return false
    }
    
    try {
      await this.collection.delete({
        ids: [memoryId]
      })
      
      console.log(`🗑️ 记忆已删除：${memoryId}`)
      return true
      
    } catch (error) {
      console.error('❌ 删除记忆失败:', error)
      return false
    }
  }
  
  // 清空所有记忆
  async clearMemories() {
    if (!this.connected || !this.collection) {
      return false
    }
    
    try {
      await this.collection.delete({
        where: {}
      })
      
      console.log('🗑️ 已清空所有记忆')
      return true
      
    } catch (error) {
      console.error('❌ 清空记忆失败:', error)
      return false
    }
  }
  
  // 获取集合统计信息
  async getStats() {
    if (!this.connected || !this.collection) {
      return null
    }
    
    try {
      const count = await this.collection.count()
      
      return {
        total_memories: count,
        collection_name: this.collectionName,
        connected: this.connected
      }
      
    } catch (error) {
      console.error('❌ 获取统计失败:', error)
      return null
    }
  }
  
  // 断开连接
  disconnect() {
    this.client = null
    this.collection = null
    this.connected = false
    console.log('🔌 ChromaDB 已断开')
  }
}

export default ChromaDBService
