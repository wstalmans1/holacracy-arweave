const { run } = require("hardhat");

async function main() {
  console.log("🔍 Verifying Optimized Holacracy Contracts on Etherscan...");
  
  // Load deployment info
  const deploymentInfo = require("../deployment-optimized.json");
  const { contracts } = deploymentInfo;
  
  console.log("📋 Contract Addresses to verify:");
  console.log("   Organization Implementation:", contracts.organizationImplementation);
  console.log("   Organization Beacon:", contracts.organizationBeacon);
  console.log("   HolacracyFactory:", contracts.holacracyFactory);

  try {
    // Step 1: Verify Organization Implementation
    console.log("\n📋 Step 1: Verifying Organization Implementation...");
    await run("verify:verify", {
      address: contracts.organizationImplementation,
      constructorArguments: [],
    });
    console.log("✅ Organization Implementation verified!");

    // Step 2: Verify Organization Beacon
    console.log("\n🔗 Step 2: Verifying Organization Beacon...");
    await run("verify:verify", {
      address: contracts.organizationBeacon,
      constructorArguments: [contracts.organizationImplementation],
    });
    console.log("✅ Organization Beacon verified!");

    // Step 3: Verify HolacracyFactory
    console.log("\n🏭 Step 3: Verifying HolacracyFactory...");
    await run("verify:verify", {
      address: contracts.holacracyFactory,
      constructorArguments: [],
    });
    console.log("✅ HolacracyFactory verified!");

    console.log("\n🎉 ALL CONTRACTS VERIFIED SUCCESSFULLY!");
    console.log("=" .repeat(50));
    console.log("✅ Organization Implementation: VERIFIED");
    console.log("✅ Organization Beacon: VERIFIED");
    console.log("✅ HolacracyFactory: VERIFIED");
    console.log("=" .repeat(50));
    console.log("🔗 View contracts on Etherscan:");
    console.log(`   https://sepolia.etherscan.io/address/${contracts.organizationImplementation}`);
    console.log(`   https://sepolia.etherscan.io/address/${contracts.organizationBeacon}`);
    console.log(`   https://sepolia.etherscan.io/address/${contracts.holacracyFactory}`);

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