/**
 * Hermes WebUI 集成脚本
 * 
 * 此脚本需要注入到 Hermes WebUI 中，用于与双子星平台通信
 * 
 * 使用方法:
 * 1. 在 Hermes WebUI 的 index.html 中添加:
 *    <script src="shuangzixing-integration.js"></script>
 * 
 * 2. 或者通过浏览器控制台手动执行此脚本
 */

(function() {
  console.log('🛠️ Hermes 双子星集成已加载')
  
  const ZHISHUANG_ORIGIN = 'http://localhost:5173'
  
  // 监听来自双子星的消息
  window.addEventListener('message', (event) => {
    if (event.origin !== ZHISHUANG_ORIGIN) return
    
    const { type, data } = event.data
    console.log('📨 收到双子星消息:', type)
    
    if (type === 'hermes:execute') {
      // 执行任务
      handleExecuteTask(data)
    }
    
    if (type === 'hermes:cancel') {
      // 取消任务
      handleCancelTask(data)
    }
  })
  
  // 执行任务
  async function handleExecuteTask(task) {
    console.log('🛠️ 开始执行任务:', task.id)
    
    // TODO: 调用 Hermes 的原生任务执行方法
    // 这里需要根据 Hermes 的实际 API 调整
    
    const steps = task.plan.steps
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      
      console.log(`⏳ 执行步骤 ${i + 1}/${steps.length}: ${step.action}`)
      
      // 发送进度更新
      sendToZhishuang('hermes:progress', {
        task_id: task.id,
        current_step: i + 1,
        total_steps: steps.length,
        progress: Math.round(((i + 1) / steps.length) * 100)
      })
      
      // TODO: 实际执行步骤
      // 这里是模拟执行
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      task.stepResults.push({
        step_id: step.step_id,
        status: 'success',
        output: { result: '模拟结果' },
        completed_at: new Date().toISOString()
      })
    }
    
    // 任务完成
    console.log('✅ 任务执行完成:', task.id)
    
    sendToZhishuang('hermes:complete', {
      task_id: task.id,
      status: 'completed',
      stepResults: task.stepResults,
      completed_at: new Date().toISOString()
    })
  }
  
  // 取消任务
  function handleCancelTask(data) {
    console.log('⏹️ 取消任务:', data.task_id)
    
    // TODO: 调用 Hermes 的原生任务取消方法
    
    sendToZhishuang('hermes:cancelled', {
      task_id: data.task_id,
      cancelled_at: new Date().toISOString()
    })
  }
  
  // 发送消息到双子星
  function sendToZhishuang(type, data) {
    console.log('📤 发送到双子星:', type)
    
    // 查找双子星的 IFrame
    const zhishuangFrame = document.querySelector('iframe[src*="5173"]')
    if (zhishuangFrame) {
      zhishuangFrame.contentWindow.postMessage({ type, data }, ZHISHUANG_ORIGIN)
    } else {
      // 如果没有找到 IFrame，发送到父窗口
      window.parent.postMessage({ type, data }, ZHISHUANG_ORIGIN)
    }
  }
  
  // 监听 Hermes 的原生事件
  // TODO: 这里需要根据 Hermes 的实际事件系统调整
  function setupNativeListeners() {
    // 示例：如果 Hermes 有全局事件总线
    if (window.Hermes && window.Hermes.onProgress) {
      window.Hermes.onProgress((progress) => {
        console.log('📊 Hermes 进度更新:', progress)
        sendToZhishuang('hermes:progress', progress)
      })
    }
    
    if (window.Hermes && window.Hermes.onComplete) {
      window.Hermes.onComplete((result) => {
        console.log('✅ Hermes 执行完成:', result)
        sendToZhishuang('hermes:complete', result)
      })
    }
  }
  
  // 初始化
  setupNativeListeners()
  
  console.log('✅ Hermes 双子星集成初始化完成')
})()
