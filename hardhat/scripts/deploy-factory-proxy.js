const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Deploying Factory Proxy for Upgradeability...");
  
  // Load existing deployment info
  const deploymentInfo = require("../deployment-optimized.json");
  const { contracts } = deploymentInfo;
  
  console.log("📋 Current contracts:");
  console.log("   Organization Implementation:", contracts.organizationImplementation);
  console.log("   Organization Beacon:", contracts.organizationBeacon);
  console.log("   Factory Implementation:", contracts.holacracyFactory);

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  // Step 1: Deploy Factory Proxy
  console.log("\n🏭 Step 1: Deploying Factory Proxy...");
  const HolacracyFactory = await ethers.getContractFactory("contracts/HolacracyOrganizationFactoryImplementation.sol:HolacracyOrganizationFactoryImplementation");
  
  const factoryProxy = await upgrades.deployProxy(HolacracyFactory, [contracts.organizationBeacon, deployer.address], {
    kind: 'transparent',
    initializer: 'initialize'
  });
  
  await factoryProxy.waitForDeployment();
  const factoryProxyAddress = await factoryProxy.getAddress();
  console.log("✅ Factory Proxy deployed at:", factoryProxyAddress);

  // Step 2: Get Proxy Admin address
  console.log("\n🔐 Step 2: Getting Proxy Admin address...");
  const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(factoryProxyAddress);
  console.log("✅ Proxy Admin address:", proxyAdminAddress);

  // Step 3: Get Implementation address
  console.log("\n📋 Step 3: Getting Implementation address...");
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(factoryProxyAddress);
  console.log("✅ Implementation address:", implementationAddress);

  // Step 4: Verify the proxy is working
  console.log("\n🔍 Step 4: Verifying proxy functionality...");
  const beaconAddress = await factoryProxy.organizationBeacon();
  console.log("✅ Factory beacon reference:", beaconAddress);
  console.log("✅ Beacon matches:", beaconAddress === contracts.organizationBeacon);

  // Step 5: Update deployment info
  console.log("\n💾 Step 5: Updating deployment info...");
  const updatedDeploymentInfo = {
    ...deploymentInfo,
    contracts: {
      ...contracts,
      holacracyFactoryProxy: factoryProxyAddress,
      holacracyFactoryProxyAdmin: proxyAdminAddress,
      holacracyFactoryImplementation: implementationAddress
    }
  };

  // Save to hardhat directory
  const hardhatPath = path.join(__dirname, "..", "deployment-optimized.json");
  fs.writeFileSync(hardhatPath, JSON.stringify(updatedDeploymentInfo, null, 2));
  console.log("✅ Updated deployment info saved to:", hardhatPath);

  // Save to frontend directory
  const frontendPath = path.join(__dirname, "..", "..", "frontend", "src", "contractAddresses-optimized.json");
  fs.writeFileSync(frontendPath, JSON.stringify(updatedDeploymentInfo, null, 2));
  console.log("✅ Updated deployment info saved to frontend:", frontendPath);

  // Step 6: Display final summary
  console.log("\n🎉 FACTORY PROXY DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(60));
  console.log("📋 Updated Contract Addresses:");
  console.log("   Organization Implementation:", contracts.organizationImplementation);
  console.log("   Organization Beacon:", contracts.organizationBeacon);
  console.log("   Factory Implementation:", implementationAddress);
  console.log("   Factory Proxy:", factoryProxyAddress);
  console.log("   Factory Proxy Admin:", proxyAdminAddress);
  console.log("\n🔗 Architecture:");
  console.log("   Users interact with: Factory Proxy");
  console.log("   Proxy Admin controls: Factory Proxy");
  console.log("   Factory Proxy delegates to: Factory Implementation");
  console.log("   Factory creates: Organization Proxies (via Beacon)");
  console.log("=" .repeat(60));

  return {
    factoryProxy: factoryProxyAddress,
    proxyAdmin: proxyAdminAddress,
    implementation: implementationAddress
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Factory proxy deployment failed:", error);
    process.exit(1);
  }); 