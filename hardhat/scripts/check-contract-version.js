const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Contract Implementation Version...");
  
  const orgAddress = "0xdb0A7b0966626074F89822307d65382198E6b41B"; // The organization where user signed
  
  console.log(`📋 Checking organization: ${orgAddress}`);
  
  try {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    
    // Check if it's a proxy contract
    console.log("\n🔍 Checking if this is a proxy contract...");
    const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const implementation = await provider.getStorage(orgAddress, implementationSlot);
    
    if (implementation !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      console.log(`🔗 This is a proxy contract`);
      console.log(`   Implementation: ${implementation}`);
      
      // Check the implementation contract
      const implCode = await provider.getCode(implementation);
      console.log(`   Implementation bytecode length: ${implCode.length}`);
      
      // Try to get the implementation contract name
      const implContract = new ethers.Contract(implementation, [
        "function name() view returns (string)",
        "function purpose() view returns (string)"
      ], provider);
      
      try {
        const [implName, implPurpose] = await Promise.all([
          implContract.name(),
          implContract.purpose()
        ]);
        console.log(`   Implementation contract works: ${implName} - ${implPurpose}`);
      } catch (error) {
        console.log(`   Implementation contract error: ${error.message}`);
      }
    } else {
      console.log(`📄 This appears to be a direct implementation contract`);
    }
    
    // Check the current organization contract
    console.log("\n🔍 Checking current organization contract...");
    const orgContract = new ethers.Contract(orgAddress, [
      "function name() view returns (string)",
      "function purpose() view returns (string)",
      "function creator() view returns (address)",
      "function archived() view returns (bool)",
      "function hasSignedConstitution(address) view returns (bool)",
      "function getPartners() view returns (address[])",
      "function getConstitutionSigners() view returns (address[])",
      "function getConstitutionSignatureCount() view returns (uint256)"
    ], provider);
    
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
    
    // Check user's signing status
    const userAddress = "0xD78C12137087D394c0FA49634CAa80D0a1985A8A";
    const hasSigned = await orgContract.hasSignedConstitution(userAddress);
    console.log(`   User has signed: ${hasSigned}`);
    
    // Check partners list
    const partners = await orgContract.getPartners();
    const signers = await orgContract.getConstitutionSigners();
    const signatureCount = await orgContract.getConstitutionSignatureCount();
    
    console.log(`   Partners list length: ${partners.length}`);
    console.log(`   Signers list length: ${signers.length}`);
    console.log(`   Signature count: ${signatureCount}`);
    
    if (partners.length > 0) {
      console.log(`   Partners: ${partners.join(', ')}`);
    }
    if (signers.length > 0) {
      console.log(`   Signers: ${signers.join(', ')}`);
    }
    
    // Check if user is in either list
    const isInPartners = partners.map(p => p.toLowerCase()).includes(userAddress.toLowerCase());
    const isInSigners = signers.map(s => s.toLowerCase()).includes(userAddress.toLowerCase());
    
    console.log(`   User in partners list: ${isInPartners}`);
    console.log(`   User in signers list: ${isInSigners}`);
    
    // Analysis
    console.log("\n🔍 Analysis:");
    if (hasSigned && !isInPartners && !isInSigners) {
      console.log("❌ ISSUE: User has signed but is not in any list");
      console.log("   This suggests the contract logic is not working correctly");
    } else if (hasSigned && (isInPartners || isInSigners)) {
      console.log("✅ User has signed and is in the list - this is correct");
    } else if (!hasSigned) {
      console.log("✅ User hasn't signed - this is correct");
    }
    
  } catch (error) {
    console.error("❌ Error checking contract version:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 