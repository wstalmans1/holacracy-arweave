const { ethers, upgrades } = require("hardhat");

async function main() {
  const proxyAddress = '0xaA4aFFC12cFbb976280f44aeE6C24Ee805da88a4';
  
  console.log('Debugging upgrade process...\n');
  
  // Check current implementation
  const currentImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log('1. Current implementation address:', currentImpl);
  
  // Check if this matches what we expect
  const expectedImpl = '0x187EcD6766de920a4583762f26cA6e558Be9B70E';
  console.log('2. Expected implementation address:', expectedImpl);
  console.log('3. Match:', currentImpl === expectedImpl ? '✅ YES' : '❌ NO');
  
  // Check what the upgrade script would report
  console.log('\n4. Testing what upgrade script would report...');
  const HolacracyFactory = await ethers.getContractFactory("HolacracyFactory");
  const upgradedFactory = await upgrades.upgradeProxy(proxyAddress, HolacracyFactory);
  await upgradedFactory.waitForDeployment();
  const reportedImpl = await upgrades.erc1967.getImplementationAddress(await upgradedFactory.getAddress());
  console.log('5. Address reported by upgrade script:', reportedImpl);
  console.log('6. Match with current:', reportedImpl === currentImpl ? '✅ YES' : '❌ NO');
  
  // Check if the proxy was actually upgraded
  const newImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log('7. Implementation after upgrade attempt:', newImpl);
  console.log('8. Changed:', newImpl !== currentImpl ? '✅ YES' : '❌ NO (no change)');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 