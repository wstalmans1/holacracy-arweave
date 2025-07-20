const { ethers, upgrades } = require('hardhat');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function main() {
  // Read proxy address from contractAddresses.json
  const addressesPath = path.resolve(__dirname, '../../frontend/src/contractAddresses.json');
  let addresses = {};
  if (fs.existsSync(addressesPath)) {
    addresses = JSON.parse(fs.readFileSync(addressesPath));
  } else {
    throw new Error('contractAddresses.json not found at ' + addressesPath);
  }
  const proxyAddress = addresses.HOLACRACY_FACTORY_PROXY;
  if (!proxyAddress) {
    throw new Error('HOLACRACY_FACTORY_PROXY not found in contractAddresses.json');
  }

  const HolacracyFactoryV2 = await ethers.getContractFactory('HolacracyFactory');

  console.log('Upgrading HolacracyFactory...');
  await upgrades.upgradeProxy(proxyAddress, HolacracyFactoryV2);
  console.log('HolacracyFactory upgraded!');

  // Sync ABIs after upgrade
  try {
    execSync('node scripts/sync-abis.js', { stdio: 'inherit' });
    console.log('ABIs synced to frontend.');
  } catch (err) {
    console.error('Failed to sync ABIs:', err);
  }

  // Update contractAddresses.json with new implementation and admin addresses
  const factoryImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
  addresses.HOLACRACY_FACTORY_IMPLEMENTATION = factoryImpl;
  addresses.HOLACRACY_FACTORY_PROXY_ADMIN = adminAddress;
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log('Updated frontend/src/contractAddresses.json with new implementation and admin addresses.');

  // Verify the new implementation contract on Etherscan
  try {
    console.log('Verifying new implementation contract on Etherscan...');
    execSync(`npx hardhat verify --network sepolia ${factoryImpl}`, { stdio: 'inherit' });
    console.log('Implementation contract verified on Etherscan.');
  } catch (err) {
    console.error('Etherscan verification failed:', err);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});