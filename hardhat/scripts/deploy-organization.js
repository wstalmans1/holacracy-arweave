const { ethers } = require("hardhat");

async function main() {
  const Organization = await ethers.getContractFactory("Organization");
  const organizationImpl = await Organization.deploy();
  await organizationImpl.waitForDeployment();
  console.log("Organization implementation deployed to:", await organizationImpl.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});