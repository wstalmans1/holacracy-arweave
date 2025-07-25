const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging current Factory state...");
  
  // Use the proxy address from contractAddresses.json
  const factoryAddress = "0xaA4aFFC12cFbb976280f44aeE6C24Ee805da88a4";
  
  try {
    const factory = await ethers.getContractAt("contracts/HolacracyFactory.sol:HolacracyFactory", factoryAddress);
    console.log("📋 Factory address:", factoryAddress);
    
    const count = await factory.getInitiativesCount();
    console.log("📊 Total initiatives:", count.toString());
    
    if (count.toString() === "0") {
      console.log("❌ No initiatives found - this explains why no organizations are showing!");
      return;
    }
    
    for (let i = 0; i < count; i++) {
      console.log(`\n🔍 Initiative ${i}:`);
      try {
        const [name, purpose, creator, launched, orgAddress] = await factory.getInitiative(i);
        console.log("  Name:", name);
        console.log("  Purpose:", purpose);
        console.log("  Creator:", creator);
        console.log("  Launched:", launched);
        console.log("  Organization address:", orgAddress);
        
        if (launched && orgAddress !== ethers.ZeroAddress) {
          console.log("  ✅ This initiative has been launched!");
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
      } catch (e) {
        console.log("  ❌ Error loading initiative:", e.message);
      }
    }
  } catch (e) {
    console.log("❌ Error connecting to Factory:", e.message);
  }
}

main().then(() => process.exit(0)).catch((error) => { 
  console.error(error); 
  process.exit(1); 
}); 