const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Current Contract Verification Status...");
  
  // Load deployment info
  const deploymentInfo = require("../deployment-optimized.json");
  const { contracts } = deploymentInfo;
  
  console.log("📋 Contract Verification Status:");
  console.log("=" .repeat(60));
  
  const contractsToCheck = [
    {
      name: "Organization Implementation",
      address: contracts.organizationImplementation,
      description: "Main organization contract implementation"
    },
    {
      name: "Organization Beacon", 
      address: contracts.organizationBeacon,
      description: "Beacon contract for organization upgrades"
    },
    {
      name: "Factory Implementation",
      address: contracts.holacracyFactoryImplementation,
      description: "Factory contract implementation"
    },
    {
      name: "Factory Proxy",
      address: contracts.holacracyFactoryProxy,
      description: "Main factory proxy contract"
    },
    {
      name: "Factory Proxy Admin",
      address: contracts.holacracyFactoryProxyAdmin,
      description: "Factory proxy admin contract"
    }
  ];
  
  for (const contract of contractsToCheck) {
    console.log(`\n🔍 ${contract.name}:`);
    console.log(`   Address: ${contract.address}`);
    console.log(`   Description: ${contract.description}`);
    console.log(`   Etherscan: https://sepolia.etherscan.io/address/${contract.address}`);
    console.log(`   📝 Status: Check manually on Etherscan (Contract tab)`);
  }
  
  console.log("\n" + "=" .repeat(60));
  console.log("📝 Verification Instructions:");
  console.log("1. Click each Etherscan URL above");
  console.log("2. Look for the 'Contract' tab");
  console.log("3. If you see 'Source code not verified', run verification scripts");
  console.log("4. If you see source code, the contract is already verified");
  
  console.log("\n🚀 To verify contracts, run:");
  console.log("   npx hardhat run scripts/verify-all-contracts.js --network sepolia");
  
  console.log("\n⚠️ Note: Etherscan has rate limits (2 calls/sec for API v1)");
  console.log("   If you hit rate limits, wait a few minutes and try again");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 