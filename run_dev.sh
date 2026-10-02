#!/usr/bin/env bash
# FloodTrace Prachin Buri - All-in-One Local Runner

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "=================================================="
echo "🌊 Starting FloodTrace Prachin Buri Development"
echo "=================================================="

# Function to clean up background processes on Ctrl+C
cleanup() {
  echo ""
  echo "🛑 Stopping all FloodTrace processes..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start FastAPI Backend (Port 8001)
echo "🚀 [1/2] Starting Backend API at http://localhost:8001 ..."
.venv/bin/python -m uvicorn apps.api.app.main:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!

# Give backend a moment to bind
sleep 2

# 2. Start Vite Frontend (Port 5173)
echo "💻 [2/2] Starting Frontend Web at http://localhost:5173 ..."
npm --prefix apps/web run dev &
FRONTEND_PID=$!

echo ""
echo "=================================================="
echo "✅ ระบบ FloodTrace พร้อมใช้งานแล้ว!"
echo "👉 ประชาชน (Citizen Portal):     http://localhost:5173/"
echo "👉 เจ้าหน้าที่ (Staff Console):   http://localhost:5173/admin/reports"
echo "👉 เอกสาร API (Swagger Docs):    http://localhost:8001/docs"
echo "=================================================="
echo "💡 กด Ctrl + C เพื่อหยุดการทำงานของระบบทั้งหมด"
echo ""

wait
