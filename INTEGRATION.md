# 🧠 双子星 - OpenClaw + Hermes 集成指南

## 集成架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      双子星 WebUI                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  OpenClaw   │  │   Hermes    │  │     协调服务             │  │
│  │  面板 (IFrame)│  │  面板 (IFrame)│  │   (Node.js + Socket.IO) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## OpenClaw 集成

### 1. 配置 OpenClaw WebUI

在 `OpenClawPanel.vue` 中嵌入 OpenClaw WebUI:

```vue
<template>
  <div class="h-full flex flex-col">
    <!-- 头部 -->
    <div class="p-3 border-b">
      <h2 class="font-semibold">🧠 OpenClaw</h2>
    </div>
    
    <!-- IFrame 嵌入 -->
    <iframe 
      :src="openclawUrl"
      class="flex-1 w-full border-0"
      @load="onOpenClawLoad"
    ></iframe>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const openclawUrl = ref('http://localhost:8080') // OpenClaw WebUI 地址

const onOpenClawLoad = () => {
  console.log('✅ OpenClaw WebUI 已加载')
  // 可以通过 postMessage 与 OpenClaw 通信
}
</script>
```

### 2. OpenClaw 消息处理

监听来自 OpenClaw 的消息:

```javascript
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://localhost:8080') return
  
  const { type, data } = event.data
  
  if (type === 'openclaw:plan') {
    // OpenClaw 生成了规划
    console.log('📋 收到规划:', data)
    // 下发给 Hermes
  }
  
  if (type === 'openclaw:review') {
    // OpenClaw 审查完成
    console.log('🔍 审查完成:', data)
  }
})
```

---

## Hermes 集成

### 1. 配置 Hermes WebUI

在 `HermesPanel.vue` 中嵌入 Hermes WebUI:

```vue
<template>
  <div class="h-full flex flex-col">
    <!-- 头部 -->
    <div class="p-3 border-b">
      <h2 class="font-semibold">🛠️ Hermes</h2>
    </div>
    
    <!-- IFrame 嵌入 -->
    <iframe 
      :src="hermesUrl"
      class="flex-1 w-full border-0"
      @load="onHermesLoad"
    ></iframe>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const hermesUrl = ref('http://localhost:8081') // Hermes WebUI 地址

const onHermesLoad = () => {
  console.log('✅ Hermes WebUI 已加载')
}
</script>
```

### 2. Hermes 任务执行

发送任务给 Hermes:

```javascript
// 发送任务到 Hermes
function sendTaskToHermes(task) {
  const iframe = document.querySelector('iframe')
  iframe.contentWindow.postMessage({
    type: 'hermes:execute',
    task
  }, 'http://localhost:8081')
}

// 监听执行结果
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://localhost:8081') return
  
  const { type, data } = event.data
  
  if (type === 'hermes:progress') {
    // 执行进度更新
    console.log('⏳ 进度:', data)
  }
  
  if (type === 'hermes:complete') {
    // 执行完成
    console.log('✅ 完成:', data)
    // 通知 OpenClaw 审查
  }
})
```

---

## 任务流集成

### 完整流程

```
1. 用户在 OpenClaw 输入目标
   ↓
2. OpenClaw 生成规划
   ↓
3. 双子星捕获规划，创建任务
   ↓
4. 下发任务给 Hermes
   ↓
5. Hermes 执行任务
   ↓
6. Hermes 返回执行结果
   ↓
7. 双子星转发给 OpenClaw 审查
   ↓
8. OpenClaw 输出审查结果
   ↓
9. 任务完成
```

### 代码示例

```javascript
// 任务流管理
class TaskFlowManager {
  constructor() {
    this.currentTask = null
  }
  
  // 收到 OpenClaw 规划
  async onOpenClawPlan(plan) {
    console.log('📋 收到规划:', plan)
    
    // 创建任务
    const task = await api.createTask({
      goal: plan.goal,
      steps: plan.steps
    })
    
    this.currentTask = task
    
    // 下发给 Hermes
    this.sendToHermes(task)
  }
  
  // 发送任务给 Hermes
  sendToHermes(task) {
    const hermesFrame = document.getElementById('hermes-frame')
    hermesFrame.contentWindow.postMessage({
      type: 'hermes:execute',
      task
    }, '*')
  }
  
  // 收到 Hermes 完成通知
  async onHermesComplete(result) {
    console.log('✅ Hermes 完成:', result)
    
    // 更新任务状态
    await api.updateTask(this.currentTask.id, {
      status: 'completed',
      stepResults: result.stepResults
    })
    
    // 发送给 OpenClaw 审查
    this.sendToOpenClawReview(result)
  }
  
  // 发送审查请求给 OpenClaw
  sendToOpenClawReview(result) {
    const openclawFrame = document.getElementById('openclaw-frame')
    openclawFrame.contentWindow.postMessage({
      type: 'openclaw:review',
      taskResult: result
    }, '*')
  }
}
```

---

## 跨域通信配置

### OpenClaw WebUI 配置

在 OpenClaw 的 WebUI 中添加:

```javascript
// 允许双子星访问
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://localhost:5173') return
  
  const { type, data } = event.data
  
  if (type === 'openclaw:plan') {
    // 发送规划给双子星
    event.source.postMessage({
      type: 'openclaw:plan',
      data: plan
    }, 'http://localhost:5173')
  }
})
```

### Hermes WebUI 配置

在 Hermes 的 WebUI 中添加:

```javascript
// 允许双子星访问
window.addEventListener('message', (event) => {
  if (event.origin !== 'http://localhost:5173') return
  
  const { type, data } = event.data
  
  if (type === 'hermes:execute') {
    // 执行任务
    executeTask(data.task).then(result => {
      event.source.postMessage({
        type: 'hermes:complete',
        data: result
      }, 'http://localhost:5173')
    })
  }
})
```

---

## 测试步骤

### 1. 启动所有服务

```bash
# 终端 1 - OpenClaw
openclaw gateway start

# 终端 2 - Hermes
hermes start

# 终端 3 - 双子星后端
cd backend
npm run dev

# 终端 4 - 双子星前端
cd frontend
npm run dev
```

### 2. 测试任务流

1. 访问 http://localhost:5173
2. 在 OpenClaw 面板输入："帮我分析这个 Excel 文件"
3. 观察 OpenClaw 生成规划
4. 观察规划自动下发给 Hermes
5. 观察 Hermes 执行进度
6. 观察 OpenClaw 审查结果

---

## 故障排查

### OpenClaw 未连接

```
症状：OpenClaw 面板显示"未连接"
解决:
1. 检查 OpenClaw 是否启动：openclaw gateway status
2. 检查 WebUI 地址是否正确
3. 检查浏览器控制台是否有跨域错误
```

### Hermes 未连接

```
症状：Hermes 面板显示"未连接"
解决:
1. 检查 Hermes 是否启动
2. 检查 WebUI 地址是否正确
3. 检查浏览器控制台是否有跨域错误
```

### 任务未下发

```
症状：OpenClaw 生成规划后，Hermes 未开始执行
解决:
1. 检查协调服务日志
2. 检查 WebSocket 连接状态
3. 检查 postMessage 是否成功发送
```

---

## 下一步

- [ ] 实现 OpenClaw WebUI 嵌入
- [ ] 实现 Hermes WebUI 嵌入
- [ ] 实现跨域 postMessage 通信
- [ ] 实现任务流自动化
- [ ] 添加错误处理和重试机制
