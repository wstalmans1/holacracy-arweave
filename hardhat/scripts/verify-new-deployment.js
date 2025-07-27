const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Verifying NEW Holacracy System on Etherscan...");
  
  // Load deployment info
  const deploymentPath = path.join(__dirname, "..", "deployment-new.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment file not found. Please run deployment first.");
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log("📋 Loaded deployment info from:", deploymentPath);
  
  // Verify Organization Implementation
  console.log("\n📋 Step 1: Verifying Organization Implementation...");
  try {
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.organizationImplementation,
      constructorArguments: [],
    });
    console.log("✅ Organization Implementation verified");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Organization Implementation already verified");
    } else {
      console.log("⚠️ Organization Implementation verification failed:", error.message);
    }
  }
  
  // Verify Beacon
  console.log("\n🔗 Step 2: Verifying Organization Beacon...");
  try {
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.organizationBeacon,
      constructorArguments: [deploymentInfo.contracts.organizationImplementation],
    });
    console.log("✅ Organization Beacon verified");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Organization Beacon already verified");
    } else {
      console.log("⚠️ Organization Beacon verification failed:", error.message);
    }
  }
  
  // Verify Factory Implementation
  console.log("\n🏭 Step 3: Verifying Factory Implementation...");
  try {
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.holacracyFactoryImplementation,
      constructorArguments: [],
    });
    console.log("✅ Factory Implementation verified");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Factory Implementation already verified");
    } else {
      console.log("⚠️ Factory Implementation verification failed:", error.message);
    }
  }
  
  // Verify Proxy Admin
  console.log("\n🔧 Step 4: Verifying Proxy Admin...");
  try {
    await hre.run("verify:verify", {
      address: deploymentInfo.contracts.holacracyFactoryProxyAdmin,
      constructorArguments: [],
    });
    console.log("✅ Proxy Admin verified");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Proxy Admin already verified");
    } else {
      console.log("⚠️ Proxy Admin verification failed:", error.message);
    }
  }
  
  // Display verification summary
  console.log("\n🎉 VERIFICATION COMPLETE!");
  console.log("=" .repeat(50));
  console.log("📋 Contract Addresses:");
  console.log("   Organization Implementation:", deploymentInfo.contracts.organizationImplementation);
  console.log("   Organization Beacon:", deploymentInfo.contracts.organizationBeacon);
  console.log("   Factory Implementation:", deploymentInfo.contracts.holacracyFactoryImplementation);
  console.log("   Factory Proxy:", deploymentInfo.contracts.holacracyFactory);
  console.log("   Proxy Admin:", deploymentInfo.contracts.holacracyFactoryProxyAdmin);
  console.log("\n🔗 Etherscan Links:");
  console.log("   Organization Implementation: https://sepolia.etherscan.io/address/" + deploymentInfo.contracts.organizationImplementation);
  console.log("   Organization Beacon: https://sepolia.etherscan.io/address/" + deploymentInfo.contracts.organizationBeacon);
  console.log("   Factory Implementation: https://sepolia.etherscan.io/address/" + deploymentInfo.contracts.holacracyFactoryImplementation);
  console.log("   Factory Proxy: https://sepolia.etherscan.io/address/" + deploymentInfo.contracts.holacracyFactory);
  console.log("   Proxy Admin: https://sepolia.etherscan.io/address/" + deploymentInfo.contracts.holacracyFactoryProxyAdmin);
  console.log("=" .repeat(50));
  
  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  }); 