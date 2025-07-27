const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Old Contract Functions...");
  
  try {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    
    // Get the factory address from the addresses file
    const addresses = require("../../frontend/src/contractAddresses.json");
    const factoryAddress = addresses.HOLACRACY_FACTORY;
    
    console.log(`🏭 Factory Address: ${factoryAddress}`);
    
    // Create factory contract instance
    const factoryContract = new ethers.Contract(factoryAddress, [
      "function getOrganizationListCount() view returns (uint256)",
      "function getOrganizationMetadata(uint256) view returns (string,string,address,address)"
    ], provider);
    
    // Get all organizations
    console.log("\n📋 Getting all organizations...");
    const orgCount = await factoryContract.getOrganizationListCount();
    
    console.log(`📊 Total organizations: ${orgCount}`);
    
    if (orgCount === 0n) {
      console.log("❌ No organizations found");
      return;
    }
    
    // Check each organization
    for (let i = 0; i < Number(orgCount); i++) {
      const metadata = await factoryContract.getOrganizationMetadata(i);
      const [name, purpose, creator, orgAddress] = metadata;
      
      console.log(`\n${i + 1}. Checking: ${orgAddress}`);
      console.log(`   Name: "${name}"`);
      console.log(`   Purpose: "${purpose}"`);
      
      // Try basic functions that should exist on all versions
      const orgContract = new ethers.Contract(orgAddress, [
        "function name() view returns (string)",
        "function purpose() view returns (string)",
        "function creator() view returns (address)",
        "function archived() view returns (bool)",
        "function hasSignedConstitution(address) view returns (bool)"
      ], provider);
      
      try {
        const [orgName, orgPurpose, orgCreator, archived] = await Promise.all([
          orgContract.name(),
          orgContract.purpose(),
          orgContract.creator(),
          orgContract.archived()
        ]);
        
        console.log(`   ✅ Basic functions work:`);
        console.log(`      Name: ${orgName}`);
        console.log(`      Purpose: ${orgPurpose}`);
        console.log(`      Creator: ${orgCreator}`);
        console.log(`      Archived: ${archived}`);
        
        // Try to get constitution signing status
        const userAddress = "0xD78C12137087D394c0FA49634CAa80D0a1985A8A";
        try {
          const hasSigned = await orgContract.hasSignedConstitution(userAddress);
          console.log(`      User has signed: ${hasSigned}`);
        } catch (error) {
          console.log(`      ❌ hasSignedConstitution failed: ${error.message}`);
        }
        
        // Try different partner list functions
        console.log(`   🔍 Testing partner list functions:`);
        
        const partnerFunctions = [
          "function getPartners() view returns (address[])",
          "function getConstitutionSigners() view returns (address[])",
          "function partners(uint256) view returns (address)",
          "function partnerCount() view returns (uint256)",
          "function getAllPartners() view returns (address[])"
        ];
        
        for (const funcSig of partnerFunctions) {
          try {
            const testContract = new ethers.Contract(orgAddress, [funcSig], provider);
            const funcName = funcSig.split('(')[0].split(' ').pop();
            
            if (funcName === 'partners') {
              // Try to get first partner
              await testContract.partners(0);
              console.log(`      ✅ ${funcName}(uint256) exists`);
            } else if (funcName === 'partnerCount') {
              const count = await testContract.partnerCount();
              console.log(`      ✅ ${funcName}() exists, count: ${count}`);
            } else {
              const result = await testContract[funcName]();
              console.log(`      ✅ ${funcName}() exists, result length: ${result.length}`);
            }
          } catch (error) {
            console.log(`      ❌ ${funcSig.split('(')[0].split(' ').pop()}() failed: ${error.message}`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error checking organization: ${error.message}`);
      }
    }
    
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