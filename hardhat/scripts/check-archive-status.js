const { ethers } = require("hardhat");

async function main() {
  // You can change this to any organization address you want to check
  const orgAddress = process.argv[3] || "0xF2FeDcb21B9348eB89df3cDBFE279E1f91D322aB";
  
  console.log("🔍 Checking Archive Status...");
  console.log(`Organization Address: ${orgAddress}`);
  
  try {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    
    // Check if contract exists
    const code = await provider.getCode(orgAddress);
    if (code === "0x") {
      console.log("❌ No contract found at this address");
      return;
    }
    console.log(`✅ Contract exists (bytecode length: ${code.length})`);
    
    // Get organization info
    const orgContract = new ethers.Contract(orgAddress, [
      "function name() view returns (string)",
      "function purpose() view returns (string)",
      "function creator() view returns (address)",
      "function archived() view returns (bool)",
      "function hasSignedConstitution(address) view returns (bool)",
      "function getPartners() view returns (address[])",
      "function getConstitutionSigners() view returns (address[])"
    ], provider);
    
    const [name, purpose, creator, archived, partners, signers] = await Promise.all([
      orgContract.name(),
      orgContract.purpose(),
      orgContract.creator(),
      orgContract.archived(),
      orgContract.getPartners().catch(() => []),
      orgContract.getConstitutionSigners().catch(() => [])
    ]);
    
    console.log("\n📋 Organization Details:");
    console.log(`   Name: "${name}"`);
    console.log(`   Purpose: "${purpose}"`);
    console.log(`   Creator: ${creator}`);
    console.log(`   Archived: ${archived ? "YES" : "NO"}`);
    console.log(`   Partners: ${partners.length}`);
    console.log(`   Constitution Signers: ${signers.length}`);
    
    if (partners.length > 0) {
      console.log(`   Partner Addresses: ${partners.join(', ')}`);
    }
    
    if (signers.length > 0) {
      console.log(`   Signer Addresses: ${signers.join(', ')}`);
    }
    
    // Check recent transactions for archive events
    console.log("\n📋 Recent Archive-Related Transactions:");
    try {
      const latestBlock = await provider.getBlockNumber();
      console.log(`   Latest block: ${latestBlock}`);
      
      // Get the last 20 blocks of transactions
      for (let i = 0; i < 20; i++) {
        const block = await provider.getBlock(latestBlock - i, true);
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            if (tx.to && tx.to.toLowerCase() === orgAddress.toLowerCase()) {
              console.log(`   Block ${block.number}: ${tx.hash}`);
              console.log(`   From: ${tx.from}`);
              console.log(`   Data: ${tx.data.substring(0, 10)}...`);
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