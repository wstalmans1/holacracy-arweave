const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Contract Verification Status on Etherscan...");
  
  try {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    
    // Get the addresses from the addresses file
    const addresses = require("../../frontend/src/contractAddresses.json");
    
    console.log("📋 Checking verification status for all contracts:");
    
    const contractsToCheck = [
      {
        name: "HOLACRACY_FACTORY",
        address: addresses.HOLACRACY_FACTORY,
        description: "Main factory contract"
      },
      {
        name: "HOLACRACY_FACTORY_IMPLEMENTATION", 
        address: addresses.HOLACRACY_FACTORY_IMPLEMENTATION,
        description: "Factory implementation contract"
      },
      {
        name: "HOLACRACY_FACTORY_PROXY_ADMIN",
        address: addresses.HOLACRACY_FACTORY_PROXY_ADMIN,
        description: "Factory proxy admin"
      },
      {
        name: "ORGANIZATION_IMPLEMENTATION",
        address: addresses.ORGANIZATION_IMPLEMENTATION,
        description: "Organization implementation contract"
      },
      {
        name: "ORGANIZATION_BEACON",
        address: addresses.ORGANIZATION_BEACON,
        description: "Organization beacon contract"
      }
    ];
    
    for (const contract of contractsToCheck) {
      console.log(`\n🔍 Checking ${contract.name}:`);
      console.log(`   Address: ${contract.address}`);
      console.log(`   Description: ${contract.description}`);
      
      try {
        // Check if contract exists
        const code = await provider.getCode(contract.address);
        if (code === "0x") {
          console.log(`   ❌ No contract found at this address`);
          continue;
        }
        
        console.log(`   ✅ Contract exists (bytecode length: ${code.length})`);
        
        // Check if it's a proxy by looking for implementation slot
        const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
        const implementation = await provider.getStorage(contract.address, implementationSlot);
        
        if (implementation !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
          console.log(`   🔗 This is a proxy contract`);
          console.log(`   Implementation: ${implementation}`);
          
          // Check implementation contract too
          const implCode = await provider.getCode(implementation);
          if (implCode !== "0x") {
            console.log(`   ✅ Implementation contract exists`);
          } else {
            console.log(`   ❌ Implementation contract not found`);
          }
        } else {
          console.log(`   📄 This is a direct implementation contract`);
        }
        
        // Note: We can't programmatically check Etherscan verification status
        // But we can provide the Etherscan URLs
        const etherscanUrl = `https://sepolia.etherscan.io/address/${contract.address}`;
        console.log(`   🔗 Etherscan: ${etherscanUrl}`);
        console.log(`   📝 Verification Status: Check manually on Etherscan`);
        
      } catch (error) {
        console.log(`   ❌ Error checking contract: ${error.message}`);
      }
    }
    
    // Also check some organization contracts
    console.log("\n🔍 Checking some organization contracts:");
    
    try {
      const factoryContract = new ethers.Contract(addresses.HOLACRACY_FACTORY, [
        "function getOrganizationListCount() view returns (uint256)",
        "function getOrganizationMetadata(uint256) view returns (string,string,address,address)"
      ], provider);
      
      const orgCount = await factoryContract.getOrganizationListCount();
      console.log(`   Total organizations: ${orgCount}`);
      
      if (orgCount > 0) {
        // Check first few organizations
        const orgsToCheck = Math.min(3, Number(orgCount));
        for (let i = 0; i < orgsToCheck; i++) {
          const metadata = await factoryContract.getOrganizationMetadata(i);
          const [name, purpose, creator, orgAddress] = metadata;
          
          console.log(`\n   Organization ${i + 1}:`);
          console.log(`   Name: "${name}"`);
          console.log(`   Address: ${orgAddress}`);
          
          const code = await provider.getCode(orgAddress);
          if (code === "0x") {
            console.log(`   ❌ No contract found`);
          } else {
            console.log(`   ✅ Contract exists (bytecode length: ${code.length})`);
            const etherscanUrl = `https://sepolia.etherscan.io/address/${orgAddress}`;
            console.log(`   🔗 Etherscan: ${etherscanUrl}`);
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Error checking organizations: ${error.message}`);
    }
    
    console.log("\n📝 Verification Instructions:");
    console.log("1. Go to each Etherscan URL above");
    console.log("2. Look for 'Contract' tab");
    console.log("3. If you see 'Source code not verified', the contract needs verification");
    console.log("4. Use the verification scripts in this project to verify contracts");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 