const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Holacracy DApp - Arweave Deployment Script');
console.log('==============================================');
console.log('');

// Check if build exists
const buildPath = path.join(__dirname, 'frontend', 'build');
if (!fs.existsSync(buildPath)) {
  console.log('❌ Build directory not found!');
  console.log('Please run: cd frontend && npm run build');
  process.exit(1);
}

console.log('✅ Build directory found');
console.log('📁 Location:', buildPath);
console.log('');

// Create a deployment package
console.log('📦 Creating deployment package...');

// Create a simple deployment manifest
const manifest = {
  manifest: 'arweave/paths',
  version: '0.1.0',
  index: {
    path: 'index.html'
  },
  paths: {}
};

// Read all files and create manifest
function processDirectory(dir, basePath = '') {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.join(basePath, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath, relativePath);
    } else {
      const content = fs.readFileSync(fullPath);
      const contentType = getContentType(item);
      
      manifest.paths[`/${relativePath}`] = {
        id: 'placeholder', // Will be filled after upload
        size: stat.size,
        contentType: contentType
      };
    }
  }
}

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

processDirectory(buildPath);

console.log(`📊 Found ${Object.keys(manifest.paths).length} files`);
console.log('');

// Save manifest
fs.writeFileSync('arweave-manifest.json', JSON.stringify(manifest, null, 2));

console.log('✅ Deployment package created!');
console.log('');

console.log('🎯 DEPLOYMENT OPTIONS:');
console.log('');

console.log('Option 1: Use Arweave.app (Recommended)');
console.log('1. Go to: https://arweave.app/');
console.log('2. Go to "Send" tab');
console.log('3. Click the folder icon in Data section');
console.log('4. Select your "frontend/build" folder');
console.log('5. Click Submit');
console.log('');

console.log('Option 2: Use Arweave CLI');
console.log('1. Fund your wallet with AR tokens');
console.log('2. Run: arweave deploy-dir frontend/build');
console.log('');

console.log('Option 3: Use Fleek (Easiest)');
console.log('1. Go to: https://fleek.co/');
console.log('2. Connect your GitHub repo');
console.log('3. Deploy automatically');
console.log('');

console.log('📋 Files to be deployed:');
Object.keys(manifest.paths).forEach(file => {
  const size = manifest.paths[file].size;
  const sizeKB = (size / 1024).toFixed(1);
  console.log(`   📄 ${file} (${sizeKB}KB)`);
});

console.log('');
console.log('💰 Estimated cost: ~0.001-0.005 AR (very low)');
console.log('🌐 Your DApp will be permanently accessible on Arweave!');
console.log('');

console.log('🎯 RECOMMENDED: Use Option 1 (Arweave.app) with your existing wallet');
console.log('   You already have 3.786 AR, which is more than enough!'); 