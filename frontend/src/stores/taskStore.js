import { defineStore } from 'pinia'
import { api } from '../api/coordinator'

export const useTaskStore = defineStore('task', {
  state: () => ({
    tasks: [],
    currentTaskId: null,
    loading: false
  }),
  
  getters: {
    currentTask: (state) => {
      return state.tasks.find(t => t.id === state.currentTaskId)
    },
    runningTasks: (state) => {
      return state.tasks.filter(t => t.status === 'running')
    },
    completedTasks: (state) => {
      return state.tasks.filter(t => t.status === 'completed')
    }
  },
  
  actions: {
    async fetchTasks() {
      this.loading = true
      try {
        const tasks = await api.getTasks()
        this.tasks = tasks
      } catch (error) {
        console.error('Failed to fetch tasks:', error)
      } finally {
        this.loading = false
      }
    },
    
    async createTask(taskData) {
      const task = await api.createTask(taskData)
      this.tasks.unshift(task)
      this.currentTaskId = task.id
      return task
    },
    
    async updateTask(taskId, updates) {
      const task = await api.updateTask(taskId, updates)
      const index = this.tasks.findIndex(t => t.id === taskId)
      if (index !== -1) {
        this.tasks[index] = task
      }
      return task
    },
    
    selectTask(taskId) {
      this.currentTaskId = taskId
    },
    
    // 处理任务状态更新
    handleTaskUpdate(taskUpdate) {
      const index = this.tasks.findIndex(t => t.id === taskUpdate.id)
      if (index !== -1) {
        this.tasks[index] = { ...this.tasks[index], ...taskUpdate }
      }
    }
  }
})
