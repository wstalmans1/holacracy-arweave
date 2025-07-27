const { run } = require("hardhat");

async function main() {
  console.log("🔍 Verifying All Holacracy Contracts on Etherscan...");
  
  // Load deployment info
  const deploymentInfo = require("../deployment-optimized.json");
  const { contracts } = deploymentInfo;
  
  console.log("📋 Contract Addresses to verify:");
  console.log("   Organization Implementation:", contracts.organizationImplementation);
  console.log("   Organization Beacon:", contracts.organizationBeacon);
  console.log("   Factory Implementation:", contracts.holacracyFactoryImplementation);
  console.log("   Factory Proxy:", contracts.holacracyFactoryProxy);
  console.log("   Factory Proxy Admin:", contracts.holacracyFactoryProxyAdmin);

  const verificationResults = [];

  // Helper function to verify with delay
  const verifyWithDelay = async (name, address, constructorArgs = [], delay = 2000) => {
    console.log(`\n📋 Verifying ${name}...`);
    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: constructorArgs,
      });
      console.log(`✅ ${name} verified successfully!`);
      verificationResults.push({ name, address, status: 'VERIFIED', url: `https://sepolia.etherscan.io/address/${address}` });
      return true;
    } catch (error) {
      if (error.message.includes("Already Verified") || error.message.includes("already been verified")) {
        console.log(`ℹ️ ${name} is already verified`);
        verificationResults.push({ name, address, status: 'ALREADY_VERIFIED', url: `https://sepolia.etherscan.io/address/${address}` });
        return true;
      } else if (error.message.includes("rate limit") || error.message.includes("Max calls per sec")) {
        console.log(`⏳ Rate limit hit for ${name}, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return false; // Retry later
      } else {
        console.log(`❌ Failed to verify ${name}: ${error.message}`);
        verificationResults.push({ name, address, status: 'FAILED', error: error.message });
        return false;
      }
    }
  };

  try {
    // Step 1: Verify Organization Implementation
    await verifyWithDelay("Organization Implementation", contracts.organizationImplementation);

    // Step 2: Verify Organization Beacon
    await verifyWithDelay("Organization Beacon", contracts.organizationBeacon, [contracts.organizationImplementation]);

    // Step 3: Verify Factory Implementation
    await verifyWithDelay("Factory Implementation", contracts.holacracyFactoryImplementation);

    // Step 4: Verify Factory Proxy Admin
    await verifyWithDelay("Factory Proxy Admin", contracts.holacracyFactoryProxyAdmin);

    // Step 5: Verify Factory Proxy (this might need special handling)
    console.log("\n📋 Verifying Factory Proxy...");
    try {
      await run("verify:verify", {
        address: contracts.holacracyFactoryProxy,
        constructorArguments: [],
        contract: "contracts/proxy/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
      });
      console.log("✅ Factory Proxy verified successfully!");
      verificationResults.push({ 
        name: "Factory Proxy", 
        address: contracts.holacracyFactoryProxy, 
        status: 'VERIFIED', 
        url: `https://sepolia.etherscan.io/address/${contracts.holacracyFactoryProxy}` 
      });
    } catch (error) {
      if (error.message.includes("Already Verified") || error.message.includes("already been verified")) {
        console.log("ℹ️ Factory Proxy is already verified");
        verificationResults.push({ 
          name: "Factory Proxy", 
          address: contracts.holacracyFactoryProxy, 
          status: 'ALREADY_VERIFIED', 
          url: `https://sepolia.etherscan.io/address/${contracts.holacracyFactoryProxy}` 
        });
      } else {
        console.log(`❌ Failed to verify Factory Proxy: ${error.message}`);
        verificationResults.push({ 
          name: "Factory Proxy", 
          address: contracts.holacracyFactoryProxy, 
          status: 'FAILED', 
          error: error.message 
        });
      }
    }

    // Summary
    console.log("\n🎉 VERIFICATION SUMMARY:");
    console.log("=" .repeat(60));
    
    let verifiedCount = 0;
    let alreadyVerifiedCount = 0;
    let failedCount = 0;
    
    for (const result of verificationResults) {
      if (result.status === 'VERIFIED') {
        console.log(`✅ ${result.name}: VERIFIED`);
        verifiedCount++;
      } else if (result.status === 'ALREADY_VERIFIED') {
        console.log(`ℹ️ ${result.name}: ALREADY VERIFIED`);
        alreadyVerifiedCount++;
      } else {
        console.log(`❌ ${result.name}: FAILED - ${result.error}`);
        failedCount++;
      }
    }
    
    console.log("=" .repeat(60));
    console.log(`📊 Results: ${verifiedCount} newly verified, ${alreadyVerifiedCount} already verified, ${failedCount} failed`);
    
    console.log("\n🔗 View contracts on Etherscan:");
    for (const result of verificationResults) {
      console.log(`   ${result.name}: ${result.url}`);
    }
    
    if (failedCount > 0) {
      console.log("\n⚠️ Some contracts failed verification. This might be due to:");
      console.log("   - Rate limiting (try again later)");
      console.log("   - Contract already verified");
      console.log("   - Network issues");
      console.log("   - Check the error messages above for specific issues");
    }

  } catch (error) {
    console.error("❌ Verification script failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 