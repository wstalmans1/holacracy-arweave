const { ethers } = require("hardhat");

async function main() {
  // Replace with your proxy address
  const proxyAddress = "0x52594CF269aA1cA7b9e262c3ffD1A99fBcDF1EE8";
  // Get the new implementation address from environment variable
  const newImpl = process.env.NEW_IMPL;
  if (!newImpl) {
    throw new Error("Please provide the new implementation address using: NEW_IMPL=0x... npx hardhat run scripts/set-organization-implementation.js --network <network>");
  }

  const HolacracyFactory = await ethers.getContractFactory("HolacracyFactory");
  const factory = await HolacracyFactory.attach(proxyAddress);
  const tx = await factory.setOrganizationImplementation(newImpl);
  await tx.wait();
  console.log("organizationImplementation updated to:", newImpl);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 