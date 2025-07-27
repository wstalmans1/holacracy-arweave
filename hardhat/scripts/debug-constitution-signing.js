const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging Constitution Signing Issue...");
  
  // Get the organization address from the user (you'll need to provide this)
  const orgAddress = process.argv[2];
  
  if (!orgAddress) {
    console.log("❌ Please provide an organization address as an argument");
    console.log("Usage: npx hardhat run scripts/debug-constitution-signing.js --network sepolia <org_address>");
    return;
  }
  
  console.log(`📋 Checking organization: ${orgAddress}`);
  
  try {
    // Try to get the contract with the current implementation
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const orgContract = new ethers.Contract(orgAddress, [
      "function name() view returns (string)",
      "function purpose() view returns (string)",
      "function creator() view returns (address)",
      "function archived() view returns (bool)",
      "function signConstitutionWithDocument(string,string,string,string)",
      "function hasSignedConstitution(address) view returns (bool)"
    ], provider);
    
    // Check basic properties
    console.log("\n🔍 Checking organization properties...");
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
    
    // Check if the signConstitutionWithDocument function exists
    console.log("\n🔍 Checking if signConstitutionWithDocument function exists...");
    try {
      // This will fail if the function doesn't exist
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
      
      // Check if it's a different function name
      console.log("\n🔍 Checking for alternative function names...");
      try {
        await orgContract.signConstitution.staticCall();
        console.log("✅ Found signConstitution function (legacy)");
      } catch (error2) {
        console.log("❌ No signConstitution function found either");
      }
    }
    
    // Check the contract bytecode to see what functions are available
    console.log("\n🔍 Checking contract bytecode...");
    const code = await provider.getCode(orgAddress);
    if (code === "0x") {
      console.log("❌ No contract found at this address");
    } else {
      console.log(`✅ Contract found (bytecode length: ${code.length})`);
      
      // Check if it's a proxy
      const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
      const implementation = await provider.getStorage(orgAddress, implementationSlot);
      if (implementation !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
        console.log(`🔗 This appears to be a proxy contract`);
        console.log(`   Implementation: ${implementation}`);
      } else {
        console.log(`📄 This appears to be a direct implementation contract`);
      }
    }
    
  } catch (error) {
    console.error("❌ Error checking organization:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 