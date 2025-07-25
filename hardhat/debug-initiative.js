const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging initiative state...");
  
  // Get the factory contract
  const factoryAddress = "0x187EcD6766de920a4583762f26cA6e558Be9B70E"; // Factory proxy address
  const factory = await ethers.getContractAt("HolacracyFactory", factoryAddress);
  
  console.log("📋 Factory address:", factoryAddress);
  
  // Get the total number of initiatives
  const count = await factory.getInitiativesCount();
  console.log("📊 Total initiatives:", count.toString());
  
  // Check each initiative
  for (let i = 0; i < count; i++) {
    console.log(`\n🔍 Initiative ${i}:`);
    
    const [name, purpose, creator, partners, launched, orgAddress] = await factory.getInitiative(i);
    
    console.log("  Name:", name);
    console.log("  Purpose:", purpose);
    console.log("  Creator:", creator);
    console.log("  Partners count:", partners.length);
    console.log("  Launched:", launched);
    console.log("  Organization address:", orgAddress);
    
    if (launched && orgAddress !== ethers.ZeroAddress) {
      console.log("  ✅ This initiative has been launched!");
      
      // Try to get organization details
      try {
        const org = await ethers.getContractAt("Organization", orgAddress);
        const orgName = await org.name();
        const orgPurpose = await org.purpose();
        const orgPartners = await org.getPartners();
        
        console.log("  📋 Organization details:");
        console.log("    Name:", orgName);
        console.log("    Purpose:", orgPurpose);
        console.log("    Partners count:", orgPartners.length);
      } catch (e) {
        console.log("  ❌ Could not load organization details:", e.message);
      }
    } else {
      console.log("  ⏳ This initiative is still a draft");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 