const { run } = require("hardhat");

async function main() {
  console.log("🔍 Verifying Factory Proxy Contracts on Etherscan...");
  
  // Load deployment info
  const deploymentInfo = require("../deployment-optimized.json");
  const { contracts } = deploymentInfo;
  
  console.log("📋 Contract Addresses to verify:");
  console.log("   Factory Proxy:", contracts.holacracyFactoryProxy);
  console.log("   Factory Proxy Admin:", contracts.holacracyFactoryProxyAdmin);
  console.log("   Factory Implementation:", contracts.holacracyFactoryImplementation);

  try {
    // Step 1: Verify Factory Implementation
    console.log("\n📋 Step 1: Verifying Factory Implementation...");
    await run("verify:verify", {
      address: contracts.holacracyFactoryImplementation,
      constructorArguments: [],
    });
    console.log("✅ Factory Implementation verified!");

    // Step 2: Verify Factory Proxy
    console.log("\n🏭 Step 2: Verifying Factory Proxy...");
    await run("verify:verify", {
      address: contracts.holacracyFactoryProxy,
      constructorArguments: [],
    });
    console.log("✅ Factory Proxy verified!");

    // Step 3: Verify Proxy Admin
    console.log("\n🔐 Step 3: Verifying Proxy Admin...");
    await run("verify:verify", {
      address: contracts.holacracyFactoryProxyAdmin,
      constructorArguments: [],
    });
    console.log("✅ Proxy Admin verified!");

    console.log("\n🎉 ALL FACTORY PROXY CONTRACTS VERIFIED SUCCESSFULLY!");
    console.log("=" .repeat(60));
    console.log("✅ Factory Implementation: VERIFIED");
    console.log("✅ Factory Proxy: VERIFIED");
    console.log("✅ Proxy Admin: VERIFIED");
    console.log("=" .repeat(60));
    console.log("🔗 View contracts on Etherscan:");
    console.log(`   https://sepolia.etherscan.io/address/${contracts.holacracyFactoryImplementation}`);
    console.log(`   https://sepolia.etherscan.io/address/${contracts.holacracyFactoryProxy}`);
    console.log(`   https://sepolia.etherscan.io/address/${contracts.holacracyFactoryProxyAdmin}`);

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    
    // Check if it's already verified
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️ Contract is already verified on Etherscan");
    } else {
      console.log("❌ Please check your Etherscan API key and try again");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  }); 