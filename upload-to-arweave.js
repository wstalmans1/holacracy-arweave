const fs = require('fs');
const path = require('path');

console.log('🚀 Holacracy DApp - Arweave Upload Helper');
console.log('');

console.log('📋 The issue: Files uploaded as generic types instead of proper structure');
console.log('');

console.log('🔧 Solution Options:');
console.log('');

console.log('Option 1: Re-upload with Arweave.app');
console.log('1. Go back to "Send" tab in Arweave.app');
console.log('2. Look for "Bundle" or "Folder" upload option');
console.log('3. Upload entire frontend/build folder as one bundle');
console.log('');

console.log('Option 2: Use Arweave CLI (More Control)');
console.log('1. Install: npm install -g arweave');
console.log('2. Create wallet: arweave wallet-save');
console.log('3. Deploy: arweave deploy-dir frontend/build');
console.log('');

console.log('Option 3: Use Fleek (Easiest Alternative)');
console.log('1. Go to: https://fleek.co/');
console.log('2. Connect your GitHub repo');
console.log('3. Deploy automatically with proper structure');
console.log('');

console.log('Option 4: Create a ZIP and Upload');
console.log('1. Zip your frontend/build folder');
console.log('2. Upload the ZIP to Arweave.app');
console.log('3. Extract on Arweave (if supported)');
console.log('');

console.log('🎯 RECOMMENDED: Try Option 1 first (re-upload as bundle)');
console.log('   If that doesn\'t work, use Option 3 (Fleek)');
console.log('');

console.log('📁 Your build files are still ready in: frontend/build/');
console.log('📊 Files to upload: 19 files');
console.log('📦 Total size: ~220KB');

// Show what should be uploaded
const buildPath = path.join(__dirname, 'frontend', 'build');
if (fs.existsSync(buildPath)) {
  console.log('');
  console.log('📋 Files that should be uploaded:');
  const files = fs.readdirSync(buildPath);
  files.forEach(file => {
    const filePath = path.join(buildPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      console.log(`   📁 ${file}/`);
      const subFiles = fs.readdirSync(filePath);
      subFiles.forEach(subFile => {
        console.log(`      📄 ${subFile}`);
      });
    } else {
      console.log(`   📄 ${file}`);
    }
  });
} 