const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Upgrading Organization Implementation with Archive Functionality...");
  
  // Load current deployment info
  const deploymentInfoPath = path.join(__dirname, "..", "deployment-optimized.json");
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, "utf8"));
  const { contracts } = deploymentInfo;
  
  console.log("📋 Current contracts:");
  console.log(`   Organization Beacon: ${contracts.organizationBeacon}`);
  console.log(`   Organization Implementation: ${contracts.organizationImplementation}`);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying with account: ${deployer.address}`);
  
  // Deploy new organization implementation
  console.log("\n🏗️ Step 1: Deploying new Organization Implementation...");
  const Organization = await ethers.getContractFactory("HolacracyOrganizationImplementation");
  const newOrganizationImpl = await Organization.deploy();
  await newOrganizationImpl.waitForDeployment();
  const newOrganizationImplAddress = await newOrganizationImpl.getAddress();
  console.log(`✅ New Organization Implementation deployed at: ${newOrganizationImplAddress}`);
  
  // Upgrade the beacon to point to the new implementation
  console.log("\n🔗 Step 2: Upgrading Organization Beacon...");
  const beacon = await ethers.getContractAt("HolacracyOrganizationBeacon", contracts.organizationBeacon);
  const upgradeTx = await beacon.upgradeTo(newOrganizationImplAddress);
  await upgradeTx.wait();
  console.log("✅ Organization Beacon upgraded to new implementation");
  
  // Verify the upgrade
  console.log("\n🔍 Step 3: Verifying upgrade...");
  const beaconImpl = await beacon.implementation();
  console.log(`✅ Beacon implementation: ${beaconImpl}`);
  console.log(`✅ New implementation: ${newOrganizationImplAddress}`);
  console.log(`✅ Upgrade successful: ${beaconImpl === newOrganizationImplAddress}`);
  
  // Update deployment info
  console.log("\n💾 Step 4: Updating deployment info...");
  const updatedDeploymentInfo = {
    ...deploymentInfo,
    contracts: {
      ...contracts,
      organizationImplementation: newOrganizationImplAddress
    },
    upgradeInfo: {
      previousImplementation: contracts.organizationImplementation,
      newImplementation: newOrganizationImplAddress,
      upgradeTime: new Date().toISOString(),
      upgradeReason: "Added archive functionality"
    }
  };
  
  // Save updated deployment info
  fs.writeFileSync(deploymentInfoPath, JSON.stringify(updatedDeploymentInfo, null, 2));
  fs.writeFileSync(
    path.join(__dirname, "..", "..", "frontend", "src", "contractAddresses-optimized.json"), 
    JSON.stringify(updatedDeploymentInfo, null, 2)
  );
  console.log("✅ Deployment info updated");
  
  // Copy new ABI to frontend
  console.log("\n📄 Step 5: Copying new ABI to frontend...");
  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "HolacracyOrganizationImplementation.sol", "HolacracyOrganizationImplementation.json");
  const frontendAbiPath = path.join(__dirname, "..", "..", "frontend", "src", "abis", "Organization-optimized.json");
  
  fs.copyFileSync(artifactPath, frontendAbiPath);
  console.log("✅ New ABI copied to frontend");
  
  console.log("\n🎉 UPGRADE COMPLETE!");
  console.log("==================================================");
  console.log("📋 Updated Contract Addresses:");
  console.log(`   Organization Implementation: ${newOrganizationImplAddress}`);
  console.log(`   Organization Beacon: ${contracts.organizationBeacon}`);
  console.log(`   Factory Proxy: ${contracts.holacracyFactoryProxy}`);
  console.log("");
  console.log("🔗 Next Steps:");
  console.log("   1. Update frontend to use new contract addresses");
  console.log("   2. Test archive functionality with existing organizations");
  console.log("   3. Verify all existing functionality still works");
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Upgrade failed:", error);
    process.exit(1);
  }); 