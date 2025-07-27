const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying NEW Holacracy System with Full Proxy Setup...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Step 1: Deploy Organization Implementation
  console.log("\n📋 Step 1: Deploying Organization Implementation...");
  const Organization = await ethers.getContractFactory("contracts/HolacracyOrganizationImplementation.sol:HolacracyOrganizationImplementation");
  const organizationImpl = await Organization.deploy();
  await organizationImpl.waitForDeployment();
  const organizationImplAddress = await organizationImpl.getAddress();
  console.log("✅ Organization Implementation deployed at:", organizationImplAddress);

  // Step 2: Deploy Beacon
  console.log("\n🔗 Step 2: Deploying Organization Beacon...");
  const Beacon = await ethers.getContractFactory("HolacracyOrganizationBeacon");
  const beacon = await Beacon.deploy(organizationImplAddress);
  await beacon.waitForDeployment();
  const beaconAddress = await beacon.getAddress();
  console.log("✅ Organization Beacon deployed at:", beaconAddress);

  // Step 3: Deploy Factory with Transparent Proxy
  console.log("\n🏭 Step 3: Deploying Factory with Transparent Proxy...");
  const HolacracyFactory = await ethers.getContractFactory("contracts/HolacracyOrganizationFactoryImplementation.sol:HolacracyOrganizationFactoryImplementation");
  
  // Deploy with transparent proxy
  const factoryProxy = await upgrades.deployProxy(HolacracyFactory, [beaconAddress, deployer.address], {
    kind: 'transparent',
    initializer: 'initialize'
  });
  await factoryProxy.waitForDeployment();
  const factoryProxyAddress = await factoryProxy.getAddress();
  console.log("✅ Factory with Transparent Proxy deployed at:", factoryProxyAddress);

  // Step 4: Get implementation and admin addresses
  console.log("\n🔍 Step 4: Getting proxy details...");
  const factoryImplAddress = await upgrades.erc1967.getImplementationAddress(factoryProxyAddress);
  const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(factoryProxyAddress);
  console.log("✅ Factory Implementation:", factoryImplAddress);
  console.log("✅ Proxy Admin:", proxyAdminAddress);

  // Step 5: Verify proxy setup
  console.log("\n🔍 Step 5: Verifying proxy setup...");
  const factoryBeacon = await factoryProxy.organizationBeacon();
  const factoryOwner = await factoryProxy.owner();
  console.log("✅ Factory beacon reference:", factoryBeacon);
  console.log("✅ Factory owner:", factoryOwner);
  console.log("✅ Beacon matches:", factoryBeacon === beaconAddress);
  console.log("✅ Owner matches:", factoryOwner === deployer.address);

  // Step 6: Save deployment addresses
  console.log("\n💾 Step 6: Saving deployment addresses...");
  const deploymentInfo = {
    network: "sepolia",
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    contracts: {
      organizationImplementation: organizationImplAddress,
      organizationBeacon: beaconAddress,
      holacracyFactory: factoryProxyAddress,
      holacracyFactoryProxy: factoryProxyAddress,
      holacracyFactoryProxyAdmin: proxyAdminAddress,
      holacracyFactoryImplementation: factoryImplAddress
    }
  };

  // Save to hardhat directory
  const hardhatPath = path.join(__dirname, "..", "deployment-new.json");
  fs.writeFileSync(hardhatPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Deployment info saved to:", hardhatPath);

  // Step 7: Update frontend contract addresses
  console.log("\n🌐 Step 7: Updating frontend contract addresses...");
  const frontendContractAddresses = {
    "ORGANIZATION_IMPLEMENTATION": organizationImplAddress,
    "ORGANIZATION_BEACON": beaconAddress,
    "HOLACRACY_FACTORY": factoryProxyAddress,
    "HOLACRACY_FACTORY_IMPLEMENTATION": factoryImplAddress,
    "HOLACRACY_FACTORY_PROXY_ADMIN": proxyAdminAddress
  };
  
  const frontendPath = path.join(__dirname, "..", "..", "frontend", "src", "contractAddresses.json");
  fs.writeFileSync(frontendPath, JSON.stringify(frontendContractAddresses, null, 2));
  console.log("✅ Frontend contract addresses updated:", frontendPath);

  // Step 8: Copy ABIs to frontend
  console.log("\n📄 Step 8: Copying ABIs to frontend...");
  
  // Copy Organization ABI
  const organizationArtifact = await hre.artifacts.readArtifact("contracts/HolacracyOrganizationImplementation.sol:HolacracyOrganizationImplementation");
  const frontendOrgAbiPath = path.join(__dirname, "..", "..", "frontend", "src", "abis", "Organization.json");
  fs.writeFileSync(frontendOrgAbiPath, JSON.stringify(organizationArtifact.abi, null, 2));
  console.log("✅ Organization ABI copied to frontend");

  // Copy Factory ABI
  const factoryArtifact = await hre.artifacts.readArtifact("contracts/HolacracyOrganizationFactoryImplementation.sol:HolacracyOrganizationFactoryImplementation");
  const frontendFactoryAbiPath = path.join(__dirname, "..", "..", "frontend", "src", "abis", "HolacracyFactory.json");
  fs.writeFileSync(frontendFactoryAbiPath, JSON.stringify(factoryArtifact.abi, null, 2));
  console.log("✅ Factory ABI copied to frontend");

  // Step 9: Display deployment summary
  console.log("\n🎉 NEW DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(60));
  console.log("📋 Contract Addresses:");
  console.log("   Organization Implementation:", organizationImplAddress);
  console.log("   Organization Beacon:", beaconAddress);
  console.log("   Factory Implementation:", factoryImplAddress);
  console.log("   Factory Proxy:", factoryProxyAddress);
  console.log("   Proxy Admin:", proxyAdminAddress);
  console.log("\n🔗 Proxy Setup:");
  console.log("   ✅ Beacon Proxy Pattern for Organizations");
  console.log("   ✅ Transparent Proxy Pattern for Factory");
  console.log("   ✅ Full upgradeability support");
  console.log("\n🌐 Frontend Integration:");
  console.log("   ✅ Contract addresses updated");
  console.log("   ✅ ABIs copied to frontend");
  console.log("   ✅ Ready for testing");
  console.log("\n🔗 Next Steps:");
  console.log("   1. Test organization creation");
  console.log("   2. Test constitution signing");
  console.log("   3. Test archive functionality");
  console.log("   4. Verify all frontend features work");
  console.log("=" .repeat(60));

  return {
    organizationImpl: organizationImplAddress,
    beacon: beaconAddress,
    factoryImpl: factoryImplAddress,
    factoryProxy: factoryProxyAddress,
    proxyAdmin: proxyAdminAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 