const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Upgrading Contracts with Creator Fix...");
  
  // Load current deployment info
  const deploymentInfoPath = path.join(__dirname, "..", "deployment-optimized.json");
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, "utf8"));
  const { contracts } = deploymentInfo;
  
  console.log("📋 Current contracts:");
  console.log(`   Organization Beacon: ${contracts.organizationBeacon}`);
  console.log(`   Organization Implementation: ${contracts.organizationImplementation}`);
  console.log(`   Factory Proxy: ${contracts.holacracyFactoryProxy}`);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying with account: ${deployer.address}`);
  
  // Step 1: Deploy new organization implementation
  console.log("\n🏗️ Step 1: Deploying new Organization Implementation...");
  const Organization = await ethers.getContractFactory("HolacracyOrganizationImplementation");
  const newOrganizationImpl = await Organization.deploy();
  await newOrganizationImpl.waitForDeployment();
  const newOrganizationImplAddress = await newOrganizationImpl.getAddress();
  console.log(`✅ New Organization Implementation deployed at: ${newOrganizationImplAddress}`);
  
  // Step 2: Upgrade the beacon to point to the new implementation
  console.log("\n🔗 Step 2: Upgrading Organization Beacon...");
  const beacon = await ethers.getContractAt("HolacracyOrganizationBeacon", contracts.organizationBeacon);
  const upgradeTx = await beacon.upgradeTo(newOrganizationImplAddress);
  await upgradeTx.wait();
  console.log("✅ Organization Beacon upgraded to new implementation");
  
  // Step 3: Deploy new factory implementation
  console.log("\n🏗️ Step 3: Deploying new Factory Implementation...");
  const Factory = await ethers.getContractFactory("HolacracyOrganizationFactoryImplementation");
  const newFactoryImpl = await Factory.deploy();
  await newFactoryImpl.waitForDeployment();
  const newFactoryImplAddress = await newFactoryImpl.getAddress();
  console.log(`✅ New Factory Implementation deployed at: ${newFactoryImplAddress}`);
  
  // Step 4: Upgrade the factory proxy using OpenZeppelin upgrades
  console.log("\n🔗 Step 4: Upgrading Factory Proxy...");
  const upgradedFactory = await upgrades.upgradeProxy(contracts.holacracyFactoryProxy, Factory);
  await upgradedFactory.waitForDeployment();
  console.log("✅ Factory Proxy upgraded to new implementation");
  

  
  // Step 6: Verify the upgrades
  console.log("\n🔍 Step 6: Verifying upgrades...");
  const beaconImpl = await beacon.implementation();
  
  console.log(`✅ Beacon implementation: ${beaconImpl}`);
  console.log(`✅ New organization implementation: ${newOrganizationImplAddress}`);
  console.log(`✅ Organization upgrade successful: ${beaconImpl === newOrganizationImplAddress}`);
  
  // Step 7: Update deployment info
  console.log("\n💾 Step 7: Updating deployment info...");
  const updatedDeploymentInfo = {
    ...deploymentInfo,
    contracts: {
      ...contracts,
      organizationImplementation: newOrganizationImplAddress
    },
    upgradeInfo: {
      previousOrganizationImplementation: contracts.organizationImplementation,
      newOrganizationImplementation: newOrganizationImplAddress,
      upgradeTime: new Date().toISOString(),
      upgradeReason: "Fixed creator assignment for archive functionality"
    }
  };
  
  // Save updated deployment info
  fs.writeFileSync(deploymentInfoPath, JSON.stringify(updatedDeploymentInfo, null, 2));
  fs.writeFileSync(
    path.join(__dirname, "..", "..", "frontend", "src", "contractAddresses-optimized.json"), 
    JSON.stringify(updatedDeploymentInfo, null, 2)
  );
  console.log("✅ Deployment info updated");
  
  // Step 8: Copy new ABIs to frontend
  console.log("\n📄 Step 8: Copying new ABIs to frontend...");
  const orgArtifactPath = path.join(__dirname, "..", "artifacts", "contracts", "HolacracyOrganizationImplementation.sol", "HolacracyOrganizationImplementation.json");
  const factoryArtifactPath = path.join(__dirname, "..", "artifacts", "contracts", "HolacracyOrganizationFactoryImplementation.sol", "HolacracyOrganizationFactoryImplementation.json");
  const frontendOrgAbiPath = path.join(__dirname, "..", "..", "frontend", "src", "abis", "Organization-optimized.json");
  const frontendFactoryAbiPath = path.join(__dirname, "..", "..", "frontend", "src", "abis", "HolacracyFactory-optimized.json");
  
  fs.copyFileSync(orgArtifactPath, frontendOrgAbiPath);
  fs.copyFileSync(factoryArtifactPath, frontendFactoryAbiPath);
  console.log("✅ New ABIs copied to frontend");
  
  console.log("\n🎉 UPGRADE COMPLETE!");
  console.log("==================================================");
  console.log("📋 Updated Contract Addresses:");
  console.log(`   Organization Implementation: ${newOrganizationImplAddress}`);
  console.log(`   Organization Beacon: ${contracts.organizationBeacon}`);
  console.log(`   Factory Proxy: ${contracts.holacracyFactoryProxy}`);

  console.log("");
  console.log("🔗 Next Steps:");
  console.log("   1. Test archive functionality with existing organizations");
  console.log("   2. Verify all existing functionality still works");
  console.log("   3. Test creating new organizations");
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Upgrade failed:", error);
    process.exit(1);
  }); 