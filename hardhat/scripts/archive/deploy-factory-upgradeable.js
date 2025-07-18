const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Deploy the Organization implementation contract
  const Organization = await ethers.getContractFactory("Organization");
  const organizationImpl = await Organization.deploy();
  await organizationImpl.waitForDeployment();
  console.log("Organization implementation deployed to:", await organizationImpl.getAddress());

  // Deploy the HolacracyFactory as an upgradeable proxy
  const HolacracyFactory = await ethers.getContractFactory("HolacracyFactory");
  const [deployer] = await ethers.getSigners();
  const factoryProxy = await upgrades.deployProxy(
    HolacracyFactory,
    [await organizationImpl.getAddress(), deployer.address],
    { initializer: "initialize" }
  );
  await factoryProxy.waitForDeployment();
  const proxyAddress = await factoryProxy.getAddress();
  console.log("HolacracyFactory proxy deployed to:", proxyAddress);

  // Get the implementation address
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("HolacracyFactory implementation deployed to:", implAddress);

  // Write addresses to frontend/src/contractAddresses.json
  const addresses = {
    HOLACRACY_FACTORY_PROXY: proxyAddress,
    HOLACRACY_FACTORY_IMPLEMENTATION: implAddress,
    ORGANIZATION_IMPLEMENTATION: await organizationImpl.getAddress(),
  };
  const frontendPath = path.resolve(__dirname, "../../frontend/src/contractAddresses.json");
  fs.writeFileSync(frontendPath, JSON.stringify(addresses, null, 2));
  console.log("Addresses written to frontend/src/contractAddresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});