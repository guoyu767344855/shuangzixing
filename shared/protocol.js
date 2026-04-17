/**
 * 双子星通信协议定义
 */

// OpenClaw → Hermes (任务下发)
export const TaskPlan = {
  task_id: 'uuid-v4',
  created_at: 'ISO-8601',
  planner: 'openclaw',
  executor: 'hermes',
  priority: 'high|normal|low',
  
  plan: {
    goal: '任务目标描述',
    steps: [
      {
        step_id: 1,
        action: '动作名称',
        params: {},
        expected_output: '预期输出'
      }
    ]
  },
  
  context: {
    session_id: '会话 ID',
    user_id: '用户 ID',
    related_memories: ['记忆 ID 列表']
  },
  
  timeout_seconds: 300,
  retry_policy: {
    max_retries: 3,
    retry_delay_seconds: 10
  }
}

// Hermes → OpenClaw (执行反馈)
export const TaskExecution = {
  task_id: 'uuid-v4',
  executor: 'hermes',
  status: 'running|completed|failed|cancelled',
  
  current_step: 2,
  step_results: [
    {
      step_id: 1,
      status: 'success|failed',
      output: {},
      logs: ['日志'],
      completed_at: 'ISO-8601'
    }
  ],
  
  logs: ['执行日志'],
  started_at: 'ISO-8601',
  updated_at: 'ISO-8601'
}

// OpenClaw → Hermes (审查结果)
export const TaskReview = {
  task_id: 'uuid-v4',
  reviewer: 'openclaw',
  review_status: 'approved|rejected|modify',
  
  feedback: {
    quality_score: 0.9,
    comments: '审查意见',
    suggestions: ['建议']
  },
  
  next_action: 'complete|retry|modify',
  reviewed_at: 'ISO-8601'
}

// WebSocket 事件
export const WSEvents = {
  // 任务状态更新
  'task:update': {
    task_id: 'uuid',
    status: 'running|completed|failed',
    progress: 0.6
  },
  
  // 新任务创建
  'task:created': { /* 任务详情 */ },
  
  // 任务完成
  'task:completed': {
    task_id: 'uuid',
    status: 'completed',
    result: { /* 执行结果 */ }
  },
  
  // 记忆更新
  'memory:updated': {
    memory_id: 'uuid',
    content: '记忆内容',
    source: 'openclaw|hermes'
  }
}
