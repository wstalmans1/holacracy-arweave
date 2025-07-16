const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Deploy Organization implementation
  const Organization = await ethers.getContractFactory("Organization");
  const organizationImpl = await Organization.deploy();
  await organizationImpl.waitForDeployment();
  const orgImplAddress = await organizationImpl.getAddress();
  console.log("Organization implementation deployed to:", orgImplAddress);

  // Deploy LocalUpgradeableBeacon
  const LocalUpgradeableBeacon = await ethers.getContractFactory("LocalUpgradeableBeacon");
  const beacon = await LocalUpgradeableBeacon.deploy(orgImplAddress);
  await beacon.waitForDeployment();
  const beaconAddress = await beacon.getAddress();
  console.log("UpgradeableBeacon deployed to:", beaconAddress);

  // Update frontend addresses
  const addressesPath = path.resolve(__dirname, "../../frontend/src/contractAddresses.json");
  let addresses = {};
  if (fs.existsSync(addressesPath)) {
    addresses = JSON.parse(fs.readFileSync(addressesPath));
  }
  addresses.ORGANIZATION_IMPLEMENTATION = orgImplAddress;
  addresses.ORGANIZATION_BEACON = beaconAddress;
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("Updated frontend/src/contractAddresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 