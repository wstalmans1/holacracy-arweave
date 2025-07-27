const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Optimized Holacracy System...");
  
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

  // Step 3: Deploy HolacracyFactory
  console.log("\n🏭 Step 3: Deploying HolacracyFactory...");
  const HolacracyFactory = await ethers.getContractFactory("contracts/HolacracyOrganizationFactoryImplementation.sol:HolacracyOrganizationFactoryImplementation");
  const factory = await HolacracyFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ HolacracyFactory deployed at:", factoryAddress);

  // Step 4: Initialize Factory
  console.log("\n⚙️ Step 4: Initializing Factory...");
  const initTx = await factory.initialize(beaconAddress, deployer.address);
  await initTx.wait();
  console.log("✅ Factory initialized with beacon and owner");

  // Step 5: Verify beacon reference
  console.log("\n🔍 Step 5: Verifying beacon reference...");
  const factoryBeacon = await factory.organizationBeacon();
  console.log("✅ Factory beacon reference:", factoryBeacon);
  console.log("✅ Beacon matches:", factoryBeacon === beaconAddress);

  // Step 6: Save deployment addresses
  console.log("\n💾 Step 6: Saving deployment addresses...");
  const deploymentInfo = {
    network: "sepolia",
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    contracts: {
      organizationImplementation: organizationImplAddress,
      organizationBeacon: beaconAddress,
      holacracyFactory: factoryAddress
    }
  };

  // Save to hardhat directory
  const hardhatPath = path.join(__dirname, "..", "deployment-optimized.json");
  fs.writeFileSync(hardhatPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Deployment info saved to:", hardhatPath);

  // Save to frontend directory
  const frontendPath = path.join(__dirname, "..", "..", "frontend", "src", "contractAddresses-optimized.json");
  fs.writeFileSync(frontendPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("✅ Deployment info saved to frontend:", frontendPath);

  // Step 7: Copy ABIs to frontend
  console.log("\n📄 Step 7: Copying ABIs to frontend...");
  
  // Copy Organization ABI
  const organizationArtifact = await hre.artifacts.readArtifact("contracts/HolacracyOrganizationImplementation.sol:HolacracyOrganizationImplementation");
  const frontendOrgAbiPath = path.join(__dirname, "..", "..", "frontend", "src", "abis", "Organization-optimized.json");
  fs.writeFileSync(frontendOrgAbiPath, JSON.stringify(organizationArtifact.abi, null, 2));
  console.log("✅ Organization ABI copied to frontend");

  // Copy Factory ABI
  const factoryArtifact = await hre.artifacts.readArtifact("contracts/HolacracyOrganizationFactoryImplementation.sol:HolacracyOrganizationFactoryImplementation");
  const frontendFactoryAbiPath = path.join(__dirname, "..", "..", "frontend", "src", "abis", "HolacracyFactory-optimized.json");
  fs.writeFileSync(frontendFactoryAbiPath, JSON.stringify(factoryArtifact.abi, null, 2));
  console.log("✅ Factory ABI copied to frontend");

  // Step 8: Display deployment summary
  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(50));
  console.log("📋 Contract Addresses:");
  console.log("   Organization Implementation:", organizationImplAddress);
  console.log("   Organization Beacon:", beaconAddress);
  console.log("   HolacracyFactory:", factoryAddress);
  console.log("\n🔗 Next Steps:");
  console.log("   1. Update frontend to use new contract addresses");
  console.log("   2. Test organization creation and constitution signing");
  console.log("   3. Verify all functionality works as expected");
  console.log("=" .repeat(50));

  return {
    organizationImpl: organizationImplAddress,
    beacon: beaconAddress,
    factory: factoryAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 