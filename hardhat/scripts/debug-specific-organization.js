const { ethers } = require("hardhat");

async function main() {
  const orgAddress = "0xF2FeDcb21B9348eB89df3cDBFE279E1f91D322aB";
  const userAddress = "0xD78C12137087D394c0FA49634CAa80D0a1985A8A"; // Your address
  
  console.log("🔍 Debugging Specific Organization...");
  console.log(`Organization Address: ${orgAddress}`);
  console.log(`User Address: ${userAddress}`);
  
  try {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    
    // Check if contract exists
    console.log("\n📋 Step 1: Checking if contract exists...");
    const code = await provider.getCode(orgAddress);
    if (code === "0x") {
      console.log("❌ No contract found at this address");
      return;
    }
    console.log(`✅ Contract exists (bytecode length: ${code.length})`);
    
    // Check if it's a proxy
    console.log("\n📋 Step 2: Checking if this is a proxy contract...");
    const implementationSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const implementation = await provider.getStorage(orgAddress, implementationSlot);
    
    if (implementation !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      console.log(`🔗 This is a proxy contract`);
      console.log(`Implementation: ${implementation}`);
    } else {
      console.log(`📄 This is a direct implementation contract`);
    }
    
    // Try to get organization info
    console.log("\n📋 Step 3: Getting organization information...");
    try {
      const orgContract = new ethers.Contract(orgAddress, [
        "function name() view returns (string)",
        "function purpose() view returns (string)",
        "function creator() view returns (address)",
        "function archived() view returns (bool)",
        "function hasSignedConstitution(address) view returns (bool)",
        "function getPartners() view returns (address[])",
        "function getConstitutionSigners() view returns (address[])",
        "function constitutionSigners(uint256) view returns (address)",
        "function constitutionSignersCount() view returns (uint256)",
        "function partners(uint256) view returns (address)",
        "function partnerCount() view returns (uint256)"
      ], provider);
      
      // Get basic info
      const name = await orgContract.name();
      const purpose = await orgContract.purpose();
      const creator = await orgContract.creator();
      const archived = await orgContract.archived();
      
      console.log(`   Name: "${name}"`);
      console.log(`   Purpose: "${purpose}"`);
      console.log(`   Creator: ${creator}`);
      console.log(`   Archived: ${archived}`);
      
      // Check if user has signed
      const hasSigned = await orgContract.hasSignedConstitution(userAddress);
      console.log(`   User has signed constitution: ${hasSigned}`);
      
      // Try different ways to get partners
      console.log("\n📋 Step 4: Checking partners list...");
      
      // Method 1: getPartners()
      try {
        const partners = await orgContract.getPartners();
        console.log(`   getPartners(): ${partners.length} partners`);
        if (partners.length > 0) {
          console.log(`   Partners: ${partners.join(', ')}`);
        }
      } catch (error) {
        console.log(`   ❌ getPartners() failed: ${error.message}`);
      }
      
      // Method 2: getConstitutionSigners()
      try {
        const signers = await orgContract.getConstitutionSigners();
        console.log(`   getConstitutionSigners(): ${signers.length} signers`);
        if (signers.length > 0) {
          console.log(`   Signers: ${signers.join(', ')}`);
        }
      } catch (error) {
        console.log(`   ❌ getConstitutionSigners() failed: ${error.message}`);
      }
      
      // Method 3: constitutionSignersCount and manual iteration
      try {
        const signerCount = await orgContract.constitutionSignersCount();
        console.log(`   constitutionSignersCount(): ${signerCount}`);
        
        if (signerCount > 0) {
          console.log(`   Individual signers:`);
          for (let i = 0; i < Math.min(Number(signerCount), 10); i++) {
            try {
              const signer = await orgContract.constitutionSigners(i);
              console.log(`     [${i}]: ${signer}`);
            } catch (error) {
              console.log(`     [${i}]: Error - ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ constitutionSignersCount() failed: ${error.message}`);
      }
      
      // Method 4: partnerCount and manual iteration
      try {
        const partnerCount = await orgContract.partnerCount();
        console.log(`   partnerCount(): ${partnerCount}`);
        
        if (partnerCount > 0) {
          console.log(`   Individual partners:`);
          for (let i = 0; i < Math.min(Number(partnerCount), 10); i++) {
            try {
              const partner = await orgContract.partners(i);
              console.log(`     [${i}]: ${partner}`);
            } catch (error) {
              console.log(`     [${i}]: Error - ${error.message}`);
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ partnerCount() failed: ${error.message}`);
      }
      
    } catch (error) {
      console.log(`❌ Error getting organization info: ${error.message}`);
    }
    
    // Check recent transactions
    console.log("\n📋 Step 5: Checking recent transactions...");
    try {
      const latestBlock = await provider.getBlockNumber();
      console.log(`   Latest block: ${latestBlock}`);
      
      // Get the last 10 blocks of transactions
      for (let i = 0; i < 10; i++) {
        const block = await provider.getBlock(latestBlock - i, true);
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            if (tx.to && tx.to.toLowerCase() === orgAddress.toLowerCase()) {
              console.log(`   Recent transaction: ${tx.hash}`);
              console.log(`   From: ${tx.from}`);
              console.log(`   To: ${tx.to}`);
              console.log(`   Block: ${block.number}`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Error checking transactions: ${error.message}`);
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