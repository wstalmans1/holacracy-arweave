const fs = require('fs');
const path = require('path');
const Arweave = require('arweave');

// Initialize Arweave
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https'
});

async function deployToArweave() {
  try {
    console.log('🚀 Starting Arweave deployment...');
    
    // Check if build directory exists
    const buildPath = path.join(__dirname, 'frontend', 'build');
    if (!fs.existsSync(buildPath)) {
      throw new Error('Build directory not found. Please run "npm run build" in the frontend directory first.');
    }
    
    console.log('📁 Reading build files...');
    
    // Read all files from build directory
    const files = [];
    function readDirectory(dir, basePath = '') {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.join(basePath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          readDirectory(fullPath, relativePath);
        } else {
          const content = fs.readFileSync(fullPath);
          files.push({
            path: relativePath,
            content: content,
            size: stat.size
          });
        }
      }
    }
    
    readDirectory(buildPath);
    
    console.log(`📊 Found ${files.length} files to upload`);
    
    // Create a wallet (you'll need to fund this wallet with AR tokens)
    console.log('🔑 Creating wallet...');
    const wallet = await arweave.wallets.generate();
    const address = await arweave.wallets.getAddress(wallet);
    
    console.log(`📍 Wallet address: ${address}`);
    console.log('⚠️  IMPORTANT: You need to fund this wallet with AR tokens to deploy!');
    console.log('   You can get testnet AR from: https://faucet.arweave.net/');
    
    // For now, let's create a deployment manifest
    const manifest = {
      manifest: 'arweave/paths',
      version: '0.1.0',
      index: {
        path: 'index.html'
      },
      paths: {}
    };
    
    // Add files to manifest
    for (const file of files) {
      manifest.paths[`/${file.path}`] = {
        id: 'placeholder', // Will be filled after upload
        size: file.size
      };
    }
    
    // Save wallet and manifest for later use
    fs.writeFileSync('arweave-wallet.json', JSON.stringify(wallet, null, 2));
    fs.writeFileSync('arweave-manifest.json', JSON.stringify(manifest, null, 2));
    
    console.log('✅ Deployment preparation complete!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Fund your wallet with AR tokens');
    console.log('2. Run: node deploy-to-arweave.js --upload');
    console.log('');
    console.log('💰 Get testnet AR from: https://faucet.arweave.net/');
    console.log('🔗 Your wallet address:', address);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Check if --upload flag is provided
if (process.argv.includes('--upload')) {
  console.log('🔄 Upload mode - this will actually upload to Arweave');
  // TODO: Implement actual upload logic
} else {
  deployToArweave();
} 