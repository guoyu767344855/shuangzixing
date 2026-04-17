#!/bin/bash

echo "🚀 启动双子星协同平台..."
echo ""

# 检查 data 目录
if [ ! -d "./data" ]; then
  echo "📁 创建 data 目录..."
  mkdir -p ./data
fi

# 启动后端
echo "🔧 启动后端服务..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端
echo "🎨 启动前端服务..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ 双子星平台已启动！"
echo ""
echo "📱 前端：http://localhost:5173"
echo "🔌 后端：http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 等待进程
wait $BACKEND_PID $FRONTEND_PID
