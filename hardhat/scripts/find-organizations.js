const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Finding Organizations from Factory...");
  
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
    
    console.log("\n🏢 Organizations found:");
    const organizations = [];
    for (let i = 0; i < Number(orgCount); i++) {
      const metadata = await factoryContract.getOrganizationMetadata(i);
      const [name, purpose, creator, orgAddress] = metadata;
      organizations.push({ name, purpose, creator, orgAddress });
      console.log(`   ${i + 1}. ${orgAddress} - "${name}" (${purpose})`);
    }
    
    // Test the first organization for constitution signing
    if (organizations.length > 0) {
      const firstOrg = organizations[0];
      console.log(`\n🔍 Testing first organization: ${firstOrg.orgAddress}`);
      
      const orgContract = new ethers.Contract(firstOrg.orgAddress, [
        "function name() view returns (string)",
        "function purpose() view returns (string)",
        "function creator() view returns (address)",
        "function archived() view returns (bool)",
        "function signConstitutionWithDocument(string,string,string,string)",
        "function hasSignedConstitution(address) view returns (bool)"
      ], provider);
      
      try {
        const [name, purpose, creator, archived] = await Promise.all([
          orgContract.name(),
          orgContract.purpose(),
          orgContract.creator(),
          orgContract.archived()
        ]);
        
        console.log(`   Name: ${name}`);
        console.log(`   Purpose: ${purpose}`);
        console.log(`   Creator: ${creator}`);
        console.log(`   Archived: ${archived}`);
        
        // Test if signConstitutionWithDocument exists
        try {
          await orgContract.signConstitutionWithDocument.staticCall(
            "test-doc-hash",
            "test-sig-hash", 
            "5.0",
            "test consent"
          );
          console.log("✅ signConstitutionWithDocument function exists and is callable");
        } catch (error) {
          console.log("❌ signConstitutionWithDocument function is NOT available");
          console.log(`   Error: ${error.message}`);
        }
        
      } catch (error) {
        console.log(`❌ Error checking organization: ${error.message}`);
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