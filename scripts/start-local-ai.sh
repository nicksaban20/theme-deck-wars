#!/bin/bash

# Ensure we are in the project root
cd "$(dirname "$0")/.."

echo "🚀 Setting up Local AI Server..."

# Check if python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 and try again."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "⬇️ Installing dependencies..."
pip install flask stable-diffusion-cpp-python

# Run the server
echo "✅ Starting SD Turbo Server on port 8080..."
echo "---------------------------------------------------"
echo "Press Ctrl+C to stop the server"
echo "---------------------------------------------------"
python3 scripts/sd_server.py
