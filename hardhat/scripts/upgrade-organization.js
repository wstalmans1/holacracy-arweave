const { ethers, upgrades } = require("hardhat");
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const addressesPath = path.resolve(__dirname, '../../frontend/src/contractAddresses.json');
  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  
  console.log('Upgrading Organization implementation...');
  
  // Deploy new implementation
  const Organization = await ethers.getContractFactory("Organization");
  const newImpl = await Organization.deploy();
  await newImpl.waitForDeployment();
  const newImplAddress = await newImpl.getAddress();
  
  // Update the beacon to point to the new implementation
  const beacon = await ethers.getContractAt("LocalUpgradeableBeacon", addresses.ORGANIZATION_BEACON);
  const tx = await beacon.upgradeTo(newImplAddress);
  await tx.wait();
  
  // Update the implementation address in contractAddresses.json
  addresses.ORGANIZATION_IMPLEMENTATION = newImplAddress;
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  
  console.log('Organization implementation upgraded to:', newImplAddress);
  
  // Verify the new implementation on Etherscan
  try {
    console.log('Verifying new implementation on Etherscan...');
    execSync(`npx hardhat verify --network sepolia ${newImplAddress}`, { stdio: 'inherit' });
  } catch (err) {
    console.log('Verification failed:', err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 