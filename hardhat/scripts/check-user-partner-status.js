const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking User Partner Status Across All Organizations...");
  
  // You can change this address to check different users
  const userAddress = "0xD78C12137087D394c0FA49634CAa80D0a1985A8A"; // Change this to your address
  
  console.log(`👤 Checking user: ${userAddress}`);
  
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
      
      const orgContract = new ethers.Contract(orgAddress, [
        "function archived() view returns (bool)",
        "function getPartners() view returns (address[])",
        "function getConstitutionSigners() view returns (address[])",
        "function hasSignedConstitution(address) view returns (bool)",
        "function getConstitutionSignatureCount() view returns (uint256)"
      ], provider);
      
      try {
        const [archived, hasSigned, signatureCount] = await Promise.all([
          orgContract.archived(),
          orgContract.hasSignedConstitution(userAddress),
          orgContract.getConstitutionSignatureCount()
        ]);
        
        // Try to get partners list - try both functions
        let partners = [];
        try {
          partners = await orgContract.getPartners();
        } catch (error) {
          try {
            partners = await orgContract.getConstitutionSigners();
          } catch (error2) {
            console.log(`   Could not get partners list: ${error2.message}`);
          }
        }
        
        console.log(`   Archived: ${archived}`);
        console.log(`   Total partners: ${partners.length}`);
        console.log(`   User has signed: ${hasSigned}`);
        console.log(`   Total signatures: ${signatureCount}`);
        
        // Check if user is in partners list
        const isPartner = partners.map(p => p.toLowerCase()).includes(userAddress.toLowerCase());
        console.log(`   User is partner: ${isPartner}`);
        
        // Analysis for this organization
        if (hasSigned && !isPartner) {
          console.log(`   ❌ ISSUE: User has signed but is not in partners list`);
        } else if (!hasSigned && isPartner) {
          console.log(`   ❌ ISSUE: User is partner but hasn't signed`);
        } else if (hasSigned && isPartner) {
          console.log(`   ✅ User has signed and is partner - correct`);
        } else {
          console.log(`   ✅ User hasn't signed and is not partner - correct`);
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