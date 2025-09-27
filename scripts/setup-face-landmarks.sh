#!/bin/bash

# SafeVision Face Landmark Setup Script
# This script sets up face landmark detection for SafeVision

set -e  # Exit on any error

echo "🚀 SafeVision Face Landmark Setup"
echo "================================="

# Check if we're in the right directory
if [ ! -f "SafeVision/requirements.txt" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Expected to find: SafeVision/requirements.txt"
    exit 1
fi

# Navigate to SafeVision directory
cd SafeVision

echo "📦 Installing Python dependencies..."

# Detect Python and pip executables
PYTHON_CMD=""
PIP_CMD=""

# Try python3 first, then python
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
    echo "✅ Found python3: $(which python3)"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
    echo "✅ Found python: $(which python)"
else
    echo "❌ Error: Neither python3 nor python found in PATH"
    echo "   Please install Python 3.6 or higher"
    echo "   On macOS: brew install python3"
    echo "   On Ubuntu: sudo apt install python3 python3-pip"
    echo "   On CentOS: sudo yum install python3 python3-pip"
    exit 1
fi

# Try pip3 first, then pip
if command -v pip3 >/dev/null 2>&1; then
    PIP_CMD="pip3"
    echo "✅ Found pip3: $(which pip3)"
elif command -v pip >/dev/null 2>&1; then
    PIP_CMD="pip"
    echo "✅ Found pip: $(which pip)"
else
    echo "❌ Error: Neither pip3 nor pip found in PATH"
    echo "   Please install pip for Python"
    echo "   On macOS: python3 -m ensurepip --upgrade"
    echo "   On Ubuntu: sudo apt install python3-pip"
    echo "   On CentOS: sudo yum install python3-pip"
    exit 1
fi

# Verify Python version
echo "🔍 Checking Python version..."
PYTHON_VERSION=$($PYTHON_CMD --version 2>&1)
echo "   $PYTHON_VERSION"

# Check if Python version is 3.6 or higher
PYTHON_MAJOR=$($PYTHON_CMD -c "import sys; print(sys.version_info.major)")
PYTHON_MINOR=$($PYTHON_CMD -c "import sys; print(sys.version_info.minor)")

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 6 ]); then
    echo "❌ Error: Python 3.6 or higher is required"
    echo "   Current version: $PYTHON_VERSION"
    echo "   Please upgrade Python"
    exit 1
fi

echo "✅ Python version is compatible"

# Install requirements using detected pip
echo "📦 Installing requirements with $PIP_CMD..."
$PIP_CMD install -r requirements.txt

echo "🧠 Setting up face landmark detection..."

# Run the landmark setup script using detected Python
$PYTHON_CMD setup_landmarks.py

echo ""
echo "✅ Face landmark detection setup complete!"
echo ""
echo "🎯 What was installed:"
echo "   - dlib library for face landmark detection"
echo "   - shape_predictor_68_face_landmarks.dat model (68MB)"
echo "   - Face landmark detection module"
echo ""
echo "🚀 You can now use face landmark detection in SafeVision!"
echo "   The feature will be automatically enabled in the web interface."
echo ""
echo "📝 To test the setup:"
echo "   cd SafeVision"
echo "   $PYTHON_CMD -c \"from face_landmarks import FaceLandmarkDetector; print('✅ Working!' if FaceLandmarkDetector().is_available() else '❌ Not working')\""
