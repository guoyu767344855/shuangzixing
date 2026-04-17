# 🚀 双子星平台 - 本地运行指南

## ✅ 服务状态

**前端**: http://localhost:5173 ✅ 运行中  
**后端**: http://localhost:3000 ✅ 运行中

---

## 📋 快速启动

### 方式 1: 使用启动脚本 (推荐)

```bash
cd /Users/guomin/.openclaw/workspace/shuangzixing
./start.sh
```

### 方式 2: 手动启动

```bash
# 终端 1 - 启动后端
cd backend
npm run dev

# 终端 2 - 启动前端
cd frontend
npm run dev
```

---

## 🧪 测试步骤

### 1. 访问平台

打开浏览器访问：http://localhost:5173

### 2. 检查连接状态

查看页面右上角的连接状态：
- 🟢 OpenClaw: 已连接
- 🟢 Hermes: 已连接
- 🟢 WebSocket: 已连接

### 3. 测试任务流

1. **在 OpenClaw 面板输入**:
   ```
   帮我分析这个 Excel 文件
   ```

2. **观察规划生成**:
   - OpenClaw 会生成执行计划
   - 自动下发给 Hermes

3. **观察 Hermes 执行**:
   - 查看执行进度
   - 查看步骤日志

4. **观察审查结果**:
   - 切换到"审查"标签页
   - 查看审查结果和质量评分

### 4. 测试记忆功能

1. **切换到"记忆"标签页**
2. **搜索记忆**: 输入关键词
3. **查看统计**: SQLite 记忆数量

### 5. 测试日志功能

1. **切换到"日志"标签页**
2. **过滤日志**: 点击不同类型的按钮
3. **导出日志**: 点击"导出"按钮

---

## 🔧 配置说明

### OpenClaw 地址

编辑 `frontend/src/components/OpenClawPanel.vue`:
```javascript
const openclawUrl = ref('http://localhost:8080') // 修改为实际地址
```

### Hermes 地址

编辑 `frontend/src/components/HermesPanel.vue`:
```javascript
const hermesUrl = ref('http://localhost:8081') // 修改为实际地址
```

### 后端端口

编辑 `backend/server.js`:
```javascript
const PORT = process.env.PORT || 3000
```

---

## 🐛 故障排查

### 后端启动失败

**错误**: `Cannot open database because the directory does not exist`

**解决**:
```bash
mkdir -p /Users/guomin/.openclaw/workspace/shuangzixing/data
```

### 前端无法连接后端

**检查**:
1. 后端是否运行：`curl http://localhost:3000/api/health`
2. 防火墙是否阻止
3. 端口是否被占用

### WebSocket 连接失败

**检查**:
1. 后端日志是否有错误
2. 浏览器控制台是否有错误
3. 重启后端服务

---

## 📊 API 测试

### 健康检查

```bash
curl http://localhost:3000/api/health
```

### 获取任务列表

```bash
curl http://localhost:3000/api/tasks
```

### 获取记忆统计

```bash
curl http://localhost:3000/api/memories/stats
```

### 创建测试任务

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "测试任务",
    "steps": [
      {"action": "step1"},
      {"action": "step2"}
    ]
  }'
```

---

## 🛑 停止服务

### 方式 1: Ctrl+C

在启动脚本的终端按 `Ctrl+C`

### 方式 2: 杀死进程

```bash
# 查找 Node 进程
ps aux | grep node

# 杀死进程
kill <PID>
```

---

## 📝 注意事项

1. **ChromaDB**: 未安装，自动降级到 SQLite
   - 如需向量搜索：`npm install chromadb` (后端)

2. **OpenClaw/Hermes**: 当前为模拟连接
   - 实际使用需要注入集成脚本

3. **数据持久化**: 
   - SQLite 数据：`./data/memories.db`
   - 定期备份重要数据

---

## 🎯 下一步

1. **集成 OpenClaw**: 注入 `integrations/openclaw-integration.js`
2. **集成 Hermes**: 注入 `integrations/hermes-integration.js`
3. **测试完整任务流**: 规划→执行→审查

---

**祝测试顺利！** 🎉

如有问题，请查看日志或联系开发团队。
