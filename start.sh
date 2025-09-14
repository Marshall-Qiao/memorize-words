#!/bin/bash

echo "🧠 Starting Word Memorization Trainer..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MySQL is running
if ! pgrep -x "mysqld" > /dev/null; then
    echo "❌ MySQL is not running. Please start MySQL first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd client
    npm install
    cd ..
fi

# Initialize database if not exists
echo "🗄️ Initializing database..."
npm run init-db

# Start the application
echo "🚀 Starting the application..."
echo "Backend will run on http://localhost:3000"
echo "Frontend will run on http://localhost:4200"
echo ""
echo "Press Ctrl+C to stop both servers"

# Start backend in background
npm run dev &
BACKEND_PID=$!

# Start frontend
cd client
npx ng serve --port 4200 &
FRONTEND_PID=$!

# Wait for user to stop
wait

# Cleanup on exit
echo ""
echo "🛑 Stopping servers..."
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null
echo "✅ Servers stopped."
