const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing All Organizations for Constitution Signing...");
  
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
    
    console.log("\n🏢 Testing all organizations:");
    const organizations = [];
    for (let i = 0; i < Number(orgCount); i++) {
      const metadata = await factoryContract.getOrganizationMetadata(i);
      const [name, purpose, creator, orgAddress] = metadata;
      organizations.push({ name, purpose, creator, orgAddress });
    }
    
    // Test each organization
    for (let i = 0; i < organizations.length; i++) {
      const org = organizations[i];
      console.log(`\n${i + 1}. Testing: ${org.orgAddress}`);
      console.log(`   Name: "${org.name}"`);
      console.log(`   Purpose: "${org.purpose}"`);
      console.log(`   Creator: ${org.creator}`);
      
      const orgContract = new ethers.Contract(org.orgAddress, [
        "function archived() view returns (bool)",
        "function signConstitutionWithDocument(string,string,string,string)",
        "function hasSignedConstitution(address) view returns (bool)"
      ], provider);
      
      try {
        const archived = await orgContract.archived();
        console.log(`   Archived: ${archived}`);
        
        // Test if signConstitutionWithDocument exists
        try {
          await orgContract.signConstitutionWithDocument.staticCall(
            "test-doc-hash",
            "test-sig-hash", 
            "5.0",
            "test consent"
          );
          console.log("   ✅ signConstitutionWithDocument function exists and is callable");
        } catch (error) {
          console.log("   ❌ signConstitutionWithDocument function is NOT available");
          console.log(`      Error: ${error.message}`);
        }
        
        // Test if hasSignedConstitution exists
        try {
          await orgContract.hasSignedConstitution.staticCall("0x0000000000000000000000000000000000000000");
          console.log("   ✅ hasSignedConstitution function exists and is callable");
        } catch (error) {
          console.log("   ❌ hasSignedConstitution function is NOT available");
          console.log(`      Error: ${error.message}`);
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