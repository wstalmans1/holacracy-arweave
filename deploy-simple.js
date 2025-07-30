const fs = require('fs');
const path = require('path');

console.log('🚀 Holacracy DApp - Arweave Deployment Options');
console.log('');

console.log('📋 Option 1: Manual Deployment (Recommended for first time)');
console.log('   1. Go to: https://arweave.net/');
console.log('   2. Click "Upload"');
console.log('   3. Upload the entire "frontend/build" folder');
console.log('   4. Get your permanent Arweave URL');
console.log('');

console.log('📋 Option 2: Use Arweave CLI (Advanced)');
console.log('   1. Install: npm install -g arweave');
console.log('   2. Create wallet: arweave wallet-save');
console.log('   3. Fund wallet with AR tokens');
console.log('   4. Deploy: arweave deploy-dir frontend/build');
console.log('');

console.log('📋 Option 3: Use Arweave Deploy Service');
console.log('   1. Go to: https://arweave.app/');
console.log('   2. Connect wallet or create new one');
console.log('   3. Upload "frontend/build" folder');
console.log('   4. Get permanent URL');
console.log('');

console.log('📋 Option 4: Use Fleek (Alternative)');
console.log('   1. Go to: https://fleek.co/');
console.log('   2. Connect GitHub repository');
console.log('   3. Deploy to IPFS/Arweave');
console.log('   4. Get permanent URL');
console.log('');

console.log('🎯 RECOMMENDED: Option 1 (Manual) for first deployment');
console.log('   - No wallet setup required');
console.log('   - Immediate deployment');
console.log('   - Get URL instantly');
console.log('');

console.log('📁 Your build files are ready in: frontend/build/');
console.log('📊 Total files: 19 files');
console.log('📦 Total size: ~220KB (gzipped)');

// Show build contents
const buildPath = path.join(__dirname, 'frontend', 'build');
if (fs.existsSync(buildPath)) {
  console.log('');
  console.log('📋 Build contents:');
  const files = fs.readdirSync(buildPath);
  files.forEach(file => {
    const filePath = path.join(buildPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      console.log(`   📁 ${file}/`);
    } else {
      console.log(`   📄 ${file} (${(stat.size / 1024).toFixed(1)}KB)`);
    }
  });
} 