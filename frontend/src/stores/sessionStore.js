import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', {
  state: () => ({
    openclaw: {
      sessionId: null,
      messages: [],
      connected: false,
      currentPlan: null
    },
    hermes: {
      sessionId: null,
      messages: [],
      connected: false,
      executing: false
    }
  }),
  
  actions: {
    addMessage(type, message) {
      const session = type === 'openclaw' ? this.openclaw : this.hermes
      session.messages.push({
        id: Date.now().toString(),
        role: message.role,
        content: message.content,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      })
    },
    
    setConnected(type, connected) {
      const session = type === 'openclaw' ? this.openclaw : this.hermes
      session.connected = connected
    },
    
    setCurrentPlan(plan) {
      this.openclaw.currentPlan = plan
    },
    
    clearMessages(type) {
      const session = type === 'openclaw' ? this.openclaw : this.hermes
      session.messages = []
    }
  }
})
