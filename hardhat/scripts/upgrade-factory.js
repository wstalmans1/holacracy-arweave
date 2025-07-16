// scripts/upgrade-factory.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  // Replace with your proxy address
  const proxyAddress = "0x52594CF269aA1cA7b9e262c3ffD1A99fBcDF1EE8";

  // Print current implementation address
  const currentImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("Current implementation address:", currentImpl);

  // Deploy the new implementation and upgrade the proxy
  const HolacracyFactory = await ethers.getContractFactory("HolacracyFactory");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, HolacracyFactory);
  await upgraded.waitForDeployment();
  console.log("Proxy upgraded!");

  // Get the new implementation address
  const newImplAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("New implementation address:", newImplAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 