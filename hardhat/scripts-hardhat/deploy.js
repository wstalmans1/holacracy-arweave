// SPDX-License-Identifier: CC-BY-SA-4.0
/**
 * Deployment script for HolacracyFactory and Organization contracts
 * Uses OpenZeppelin Hardhat Upgrades plugin
 *
 * Steps:
 * 1. Deploy Organization implementation
 * 2. Deploy HolacracyFactory as an upgradeable proxy, passing Organization implementation address
 */

const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Deploying Organization implementation...");
  const Organization = await ethers.getContractFactory("Organization");
  const organizationImpl = await Organization.deploy();
  await organizationImpl.deployed();
  console.log("Organization implementation deployed at:", organizationImpl.address);

  console.log("Deploying HolacracyFactory as an upgradeable proxy...");
  const HolacracyFactory = await ethers.getContractFactory("HolacracyFactory");
  const factoryProxy = await upgrades.deployProxy(HolacracyFactory, [organizationImpl.address], {
    initializer: "initialize",
  });
  await factoryProxy.deployed();
  console.log("HolacracyFactory (proxy) deployed at:", factoryProxy.address);

  console.log("Deployment complete.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 