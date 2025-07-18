const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Read beacon address from frontend addresses file
  const addressesPath = path.resolve(__dirname, "../../frontend/src/contractAddresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath));
  const beaconAddress = addresses.ORGANIZATION_BEACON;
  if (!beaconAddress) throw new Error("ORGANIZATION_BEACON not found in contractAddresses.json");

  // Deploy HolacracyFactory as an upgradeable proxy
  const HolacracyFactory = await ethers.getContractFactory("HolacracyFactory");
  const [deployer] = await ethers.getSigners();
  const factoryProxy = await upgrades.deployProxy(
    HolacracyFactory,
    [beaconAddress, deployer.address],
    { initializer: "initialize" }
  );
  await factoryProxy.waitForDeployment();
  const proxyAddress = await factoryProxy.getAddress();
  console.log("HolacracyFactory proxy deployed to:", proxyAddress);

  // Get the implementation address
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("HolacracyFactory implementation deployed to:", implAddress);

  // Update frontend addresses
  addresses.HOLACRACY_FACTORY_PROXY = proxyAddress;
  addresses.HOLACRACY_FACTORY_IMPLEMENTATION = implAddress;
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("Updated frontend/src/contractAddresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 