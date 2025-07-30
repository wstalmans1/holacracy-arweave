#!/bin/bash

# Build script for Fleek deployment
echo "🚀 Starting Holacracy DApp build..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the React app
echo "🔨 Building React app..."
npm run build

# Navigate back to root
cd ..

# Create dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

# Copy build files to dist
echo "📋 Copying build files..."
cp -r frontend/build/* dist/

echo "✅ Build completed successfully!"
echo "📊 Files in dist directory:"
ls -la dist/ 