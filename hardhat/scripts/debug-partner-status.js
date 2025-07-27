const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging Partner Status Issue...");
  
  // Get the organization address and user address from command line
  const orgAddress = process.argv[3];
  const userAddress = process.argv[4];
  
  if (!orgAddress || !userAddress) {
    console.log("❌ Please provide both organization address and user address as arguments");
    console.log("Usage: npx hardhat run scripts/debug-partner-status.js --network sepolia <org_address> <user_address>");
    return;
  }
  
  console.log(`📋 Checking organization: ${orgAddress}`);
  console.log(`👤 Checking user: ${userAddress}`);
  
  try {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    
    // Create organization contract instance
    const orgContract = new ethers.Contract(orgAddress, [
      "function name() view returns (string)",
      "function purpose() view returns (string)",
      "function creator() view returns (address)",
      "function archived() view returns (bool)",
      "function getPartners() view returns (address[])",
      "function hasSignedConstitution(address) view returns (bool)",
      "function getConstitutionSignatures() view returns (tuple(address signer, string documentHash, string signatureHash, string constitutionVersion, string consentStatement, uint256 timestamp)[])",
      "function getConstitutionSignatureCount() view returns (uint256)"
    ], provider);
    
    // Check basic organization properties
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
    
    // Check if user has signed constitution
    console.log("\n🔍 Checking user's constitution signing status...");
    const hasSigned = await orgContract.hasSignedConstitution(userAddress);
    console.log(`   Has signed constitution: ${hasSigned}`);
    
    // Get all partners
    console.log("\n🔍 Checking partners list...");
    const partners = await orgContract.getPartners();
    console.log(`   Total partners: ${partners.length}`);
    console.log(`   Partners: ${partners.join(', ')}`);
    
    // Check if user is in partners list
    const isPartner = partners.map(p => p.toLowerCase()).includes(userAddress.toLowerCase());
    console.log(`   Is user in partners list: ${isPartner}`);
    
    // Get constitution signatures
    console.log("\n🔍 Checking constitution signatures...");
    const signatureCount = await orgContract.getConstitutionSignatureCount();
    console.log(`   Total signatures: ${signatureCount}`);
    
    if (signatureCount > 0) {
      const signatures = await orgContract.getConstitutionSignatures();
      console.log(`   Signatures found: ${signatures.length}`);
      
      for (let i = 0; i < signatures.length; i++) {
        const sig = signatures[i];
        console.log(`   Signature ${i + 1}:`);
        console.log(`     Signer: ${sig.signer}`);
        console.log(`     Document Hash: ${sig.documentHash}`);
        console.log(`     Signature Hash: ${sig.signatureHash}`);
        console.log(`     Constitution Version: ${sig.constitutionVersion}`);
        console.log(`     Consent Statement: ${sig.consentStatement}`);
        console.log(`     Timestamp: ${new Date(Number(sig.timestamp) * 1000).toISOString()}`);
        
        // Check if this signature is from our user
        if (sig.signer.toLowerCase() === userAddress.toLowerCase()) {
          console.log(`     ✅ This is the user's signature!`);
        }
      }
    }
    
    // Analysis
    console.log("\n🔍 Analysis:");
    if (hasSigned && !isPartner) {
      console.log("❌ ISSUE FOUND: User has signed constitution but is not in partners list");
      console.log("   This suggests a bug in the contract logic or a timing issue");
    } else if (!hasSigned && isPartner) {
      console.log("❌ ISSUE FOUND: User is in partners list but hasn't signed constitution");
      console.log("   This suggests the user was added as a partner without signing");
    } else if (hasSigned && isPartner) {
      console.log("✅ User has signed constitution and is in partners list - everything is correct");
    } else {
      console.log("✅ User hasn't signed constitution and is not in partners list - everything is correct");
    }
    
  } catch (error) {
    console.error("❌ Error checking partner status:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  }); 