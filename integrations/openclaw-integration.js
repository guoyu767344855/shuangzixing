/**
 * OpenClaw WebUI 集成脚本
 * 
 * 此脚本需要注入到 OpenClaw WebUI 中，用于与双子星平台通信
 * 
 * 使用方法:
 * 1. 在 OpenClaw WebUI 的 index.html 中添加:
 *    <script src="shuangzixing-integration.js"></script>
 * 
 * 2. 或者通过浏览器控制台手动执行此脚本
 */

(function() {
  console.log('🧠 OpenClaw 双子星集成已加载')
  
  const ZHISHUANG_ORIGIN = 'http://localhost:5173'
  
  // 监听来自双子星的消息
  window.addEventListener('message', (event) => {
    if (event.origin !== ZHISHUANG_ORIGIN) return
    
    const { type, data } = event.data
    console.log('📨 收到双子星消息:', type)
    
    if (type === 'user:message') {
      // 用户发送消息到 OpenClaw
      handleUserMessage(data)
    }
    
    if (type === 'openclaw:review_request') {
      // 请求 OpenClaw 审查
      handleReviewRequest(data)
    }
  })
  
  // 处理用户消息
  function handleUserMessage(message) {
    console.log('💬 用户消息:', message)
    
    // TODO: 调用 OpenClaw 的原生消息处理方法
    // 这里需要根据 OpenClaw 的实际 API 调整
    
    // 示例：如果 OpenClaw 有全局的 sendMessage 方法
    if (window.OpenClaw && window.OpenClaw.sendMessage) {
      window.OpenClaw.sendMessage(message.content)
    }
  }
  
  // 处理审查请求
  function handleReviewRequest(taskResult) {
    console.log('🔍 审查请求:', taskResult)
    
    // TODO: 调用 OpenClaw 的审查方法
    // 这里需要根据 OpenClaw 的实际 API 调整
    
    // 示例：生成审查结果
    const review = {
      task_id: taskResult.task_id,
      review_status: 'approved',
      quality_score: 0.9,
      comments: '执行质量良好，符合预期',
      suggestions: []
    }
    
    // 发送审查结果回双子星
    sendToZhishuang('openclaw:review', review)
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
  
  // 监听 OpenClaw 的规划生成事件
  // TODO: 这里需要根据 OpenClaw 的实际事件系统调整
  function setupPlanListener() {
    // 示例：如果 OpenClaw 有全局事件总线
    if (window.OpenClaw && window.OpenClaw.onPlan) {
      window.OpenClaw.onPlan((plan) => {
        console.log('📋 OpenClaw 生成规划:', plan)
        
        // 发送规划到双子星
        sendToZhishuang('openclaw:plan', plan)
      })
    }
  }
  
  // 初始化
  setupPlanListener()
  
  console.log('✅ OpenClaw 双子星集成初始化完成')
})()
