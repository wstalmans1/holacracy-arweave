const { ethers, upgrades, run } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function verifyWithLog(address, constructorArguments = [], contract = undefined) {
  try {
    const params = { address, constructorArguments };
    if (contract) params.contract = contract;
    await run("verify:verify", params);
    console.log(`Verified: ${address}`);
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes("already verified")) {
      console.log(`Already verified: ${address}`);
    } else {
      console.warn(`Verification failed for ${address}:`, err.message || err);
    }
  }
}

async function main() {
  // 1. Deploy Organization implementation
  const Organization = await ethers.getContractFactory("contracts/Organization.sol:Organization");
  const organizationImpl = await Organization.deploy();
  await organizationImpl.waitForDeployment();
  const orgImplAddress = await organizationImpl.getAddress();
  console.log("Organization implementation deployed to:", orgImplAddress);

  // 2. Deploy UpgradeableBeacon for Organization contracts
  const LocalUpgradeableBeacon = await ethers.getContractFactory("LocalUpgradeableBeacon");
  const beacon = await LocalUpgradeableBeacon.deploy(orgImplAddress);
  await beacon.waitForDeployment();
  const beaconAddress = await beacon.getAddress();
  console.log("UpgradeableBeacon deployed to:", beaconAddress);

  // 3. Deploy HolacracyFactory as a transparent proxy (NOT a beacon proxy)
  //    The factory manages Organization deployments via the beacon.
  const HolacracyFactory = await ethers.getContractFactory("contracts/HolacracyFactory.sol:HolacracyFactory");
  const [deployer] = await ethers.getSigners();
  const factoryProxy = await upgrades.deployProxy(
    HolacracyFactory,
    [beaconAddress, deployer.address],
    { initializer: "initialize" }
  );
  await factoryProxy.waitForDeployment();
  const proxyAddress = await factoryProxy.getAddress();
  console.log("HolacracyFactory proxy deployed to:", proxyAddress);

  // 4. Get implementation and ProxyAdmin addresses
  const factoryImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);
  console.log("ProxyAdmin address:", adminAddress);

  // 5. Write all addresses to frontend/src/contractAddresses.json
  const addressesPath = path.resolve(__dirname, "../../frontend/src/contractAddresses.json");
  const addresses = {
    ORGANIZATION_IMPLEMENTATION: orgImplAddress,
    ORGANIZATION_BEACON: beaconAddress,
    HOLACRACY_FACTORY_PROXY: proxyAddress,
    HOLACRACY_FACTORY_IMPLEMENTATION: factoryImpl,
    HOLACRACY_FACTORY_PROXY_ADMIN: adminAddress
  };
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("Addresses written to frontend/src/contractAddresses.json");
  console.log(addresses);

  // 6. AUTOMATIC VERIFICATION (no manual step needed for implementation and beacon)
  console.log("Verifying contracts on Etherscan...");
  await verifyWithLog(orgImplAddress); // Organization implementation
  // Specify contract path for LocalUpgradeableBeacon to avoid ambiguity
  await verifyWithLog(beaconAddress, [orgImplAddress], "contracts/LocalUpgradeableBeacon.sol:LocalUpgradeableBeacon");
  await verifyWithLog(factoryImpl); // HolacracyFactory implementation
  // ProxyAdmin verification may fail if Solidity version does not match deployment
  await verifyWithLog(adminAddress); // ProxyAdmin
  // NOTE: Organization proxies (BeaconProxy instances) cannot be automatically verified via Etherscan API.
  // To verify a deployed organization proxy, use the Etherscan UI and select 'Beacon Proxy' as the proxy type.
  // This is a limitation of Etherscan's API as of 2024.

  // 7. Copy ABIs to frontend/src/abis
  const abisToCopy = [
    {
      artifact: path.resolve(__dirname, '../artifacts/contracts/HolacracyFactory.sol/HolacracyFactory.json'),
      frontend: path.resolve(__dirname, '../../frontend/src/abis/HolacracyFactory.json'),
    },
    {
      artifact: path.resolve(__dirname, '../artifacts/contracts/Organization.sol/Organization.json'),
      frontend: path.resolve(__dirname, '../../frontend/src/abis/Organization.json'),
    },
  ];
  for (const { artifact, frontend } of abisToCopy) {
    fs.copyFileSync(artifact, frontend);
    console.log(`ABI copied to ${frontend}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 