const { ethers, upgrades } = require("hardhat");
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const addressesPath = path.resolve(__dirname, '../../frontend/src/contractAddresses.json');
  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  
  // First compile contracts to ensure we have the latest ABIs
  console.log('1. Compiling contracts...');
  await hre.run('compile');
  
  // Copy the latest ABIs to the frontend
  console.log('\n2. Updating ABIs in frontend...');
  const frontendAbisPath = path.resolve(__dirname, '../../frontend/src/abis');
  
  // Ensure the abis directory exists
  if (!fs.existsSync(frontendAbisPath)) {
    fs.mkdirSync(frontendAbisPath, { recursive: true });
  }
  
  // Copy Organization ABI
  const orgArtifactPath = path.resolve(__dirname, '../artifacts/contracts/Organization.sol/Organization.json');
  const orgAbi = require(orgArtifactPath).abi;
  fs.writeFileSync(
    path.join(frontendAbisPath, 'Organization.json'),
    JSON.stringify(orgAbi, null, 2)
  );
  console.log('Organization ABI updated');
  
  // Copy HolacracyFactory ABI
  const factoryArtifactPath = path.resolve(__dirname, '../artifacts/contracts/HolacracyFactory.sol/HolacracyFactory.json');
  const factoryAbi = require(factoryArtifactPath).abi;
  fs.writeFileSync(
    path.join(frontendAbisPath, 'HolacracyFactory.json'),
    JSON.stringify(factoryAbi, null, 2)
  );
  console.log('HolacracyFactory ABI updated');
  
  console.log('\n3. Upgrading Organization implementation...');
  
  // Deploy new Organization implementation
  const Organization = await ethers.getContractFactory("Organization");
  const newOrgImpl = await Organization.deploy();
  await newOrgImpl.waitForDeployment();
  const newOrgImplAddress = await newOrgImpl.getAddress();
  
  // Update the beacon to point to the new Organization implementation
  const beacon = await ethers.getContractAt("LocalUpgradeableBeacon", addresses.ORGANIZATION_BEACON);
  const tx1 = await beacon.upgradeTo(newOrgImplAddress);
  await tx1.wait();
  
  // Update the Organization implementation address in contractAddresses.json
  addresses.ORGANIZATION_IMPLEMENTATION = newOrgImplAddress;
  
  console.log('Organization implementation upgraded to:', newOrgImplAddress);
  
  console.log('\n4. Upgrading HolacracyFactory implementation...');
  
  // The Hardhat Upgrades plugin handles the upgrade transparently.
  // It will deploy the new implementation and call the upgrade function on the Proxy Admin.
  const HolacracyFactory = await ethers.getContractFactory("HolacracyFactory");
  const upgradedFactory = await upgrades.upgradeProxy(addresses.HOLACRACY_FACTORY_PROXY, HolacracyFactory);
  
  await upgradedFactory.waitForDeployment();
  const newFactoryImplAddress = await upgrades.erc1967.getImplementationAddress(await upgradedFactory.getAddress());
  
  // Update the Factory implementation address in contractAddresses.json
  addresses.HOLACRACY_FACTORY_IMPLEMENTATION = newFactoryImplAddress;
  
  // Save all updated addresses
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  
  console.log('HolacracyFactory implementation upgraded to:', newFactoryImplAddress);
  
  // Verify both new implementations on Etherscan
  try {
    console.log('\n5. Verifying new Organization implementation on Etherscan...');
    execSync(`npx hardhat verify --network sepolia ${newOrgImplAddress}`, { stdio: 'inherit' });
    
    console.log('\n6. Verifying new HolacracyFactory implementation on Etherscan...');
    execSync(`npx hardhat verify --network sepolia ${newFactoryImplAddress}`, { stdio: 'inherit' });
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