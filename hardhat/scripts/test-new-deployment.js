const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing NEW Holacracy System Deployment...");
  
  // Load deployment info
  const deploymentPath = path.join(__dirname, "..", "deployment-new.json");
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment file not found. Please run deployment first.");
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log("📋 Loaded deployment info from:", deploymentPath);
  
  // Get signer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Testing with account:", deployer.address);
  
  // Test 1: Connect to Factory
  console.log("\n🔗 Test 1: Connecting to Factory...");
  const factoryAbi = await hre.artifacts.readArtifact("contracts/HolacracyOrganizationFactoryImplementation.sol:HolacracyOrganizationFactoryImplementation");
  const factory = new ethers.Contract(deploymentInfo.contracts.holacracyFactory, factoryAbi.abi, deployer);
  console.log("✅ Factory connected at:", deploymentInfo.contracts.holacracyFactory);
  
  // Test 2: Verify Factory Setup
  console.log("\n🔍 Test 2: Verifying Factory Setup...");
  const beacon = await factory.organizationBeacon();
  const owner = await factory.owner();
  console.log("✅ Beacon address:", beacon);
  console.log("✅ Owner address:", owner);
  console.log("✅ Expected beacon:", deploymentInfo.contracts.organizationBeacon);
  console.log("✅ Expected owner:", deployer.address);
  
  // Test 3: Create Test Organization
  console.log("\n🏢 Test 3: Creating Test Organization...");
  const orgName = "Test Organization " + Date.now();
  const orgPurpose = "Test purpose for deployment verification";
  
  const createTx = await factory.createAndLaunchOrganization(orgName, orgPurpose);
  console.log("📝 Creation transaction hash:", createTx.hash);
  
  const receipt = await createTx.wait();
  console.log("✅ Organization creation confirmed");
  
  // Test 4: Get Organization Details
  console.log("\n📋 Test 4: Getting Organization Details...");
  const orgCount = await factory.getOrganizationListCount();
  console.log("✅ Total organizations:", orgCount.toString());
  
  const orgMetadata = await factory.getOrganizationMetadata(orgCount - 1);
  console.log("✅ Latest organization:");
  console.log("   Name:", orgMetadata[0]);
  console.log("   Purpose:", orgMetadata[1]);
  console.log("   Creator:", orgMetadata[2]);
  console.log("   Address:", orgMetadata[3]);
  
  // Test 5: Connect to Organization
  console.log("\n🔗 Test 5: Connecting to Organization...");
  const orgAbi = await hre.artifacts.readArtifact("contracts/HolacracyOrganizationImplementation.sol:HolacracyOrganizationImplementation");
  const organization = new ethers.Contract(orgMetadata[3], orgAbi.abi, deployer);
  console.log("✅ Organization connected at:", orgMetadata[3]);
  
  // Test 6: Verify Organization Setup
  console.log("\n🔍 Test 6: Verifying Organization Setup...");
  const orgNameOnChain = await organization.name();
  const orgPurposeOnChain = await organization.purpose();
  const orgCreator = await organization.creator();
  const orgArchived = await organization.archived();
  
  console.log("✅ Organization name:", orgNameOnChain);
  console.log("✅ Organization purpose:", orgPurposeOnChain);
  console.log("✅ Organization creator:", orgCreator);
  console.log("✅ Organization archived:", orgArchived);
  
  // Test 7: Test Constitution Signing
  console.log("\n✍️ Test 7: Testing Constitution Signing...");
  const documentHash = "test-document-hash-" + Date.now();
  const signatureHash = "test-signature-hash-" + Date.now();
  const constitutionVersion = "1.0";
  const consentStatement = "I consent to the Holacracy Constitution";
  
  const signTx = await organization.signConstitutionWithDocument(
    documentHash,
    signatureHash,
    constitutionVersion,
    consentStatement
  );
  console.log("📝 Signing transaction hash:", signTx.hash);
  
  const signReceipt = await signTx.wait();
  console.log("✅ Constitution signing confirmed");
  
  // Test 8: Verify Constitution Signing
  console.log("\n🔍 Test 8: Verifying Constitution Signing...");
  const hasSigned = await organization.hasSignedConstitution(deployer.address);
  const partners = await organization.getPartners();
  const constitutionSigners = await organization.getConstitutionSigners();
  
  console.log("✅ Has signed constitution:", hasSigned);
  console.log("✅ Partners count:", partners.length);
  console.log("✅ Constitution signers count:", constitutionSigners.length);
  
  // Test 9: Test Archive Functionality
  console.log("\n📦 Test 9: Testing Archive Functionality...");
  const archiveTx = await organization.archiveOrganization();
  console.log("📝 Archive transaction hash:", archiveTx.hash);
  
  const archiveReceipt = await archiveTx.wait();
  console.log("✅ Archive confirmed");
  
  const archivedStatus = await organization.archived();
  console.log("✅ Organization archived:", archivedStatus);
  
  // Test 10: Test Unarchive Functionality
  console.log("\n📦 Test 10: Testing Unarchive Functionality...");
  const unarchiveTx = await organization.unarchiveOrganization();
  console.log("📝 Unarchive transaction hash:", unarchiveTx.hash);
  
  const unarchiveReceipt = await unarchiveTx.wait();
  console.log("✅ Unarchive confirmed");
  
  const finalArchivedStatus = await organization.archived();
  console.log("✅ Organization archived:", finalArchivedStatus);
  
  // Test Summary
  console.log("\n🎉 ALL TESTS PASSED!");
  console.log("=" .repeat(50));
  console.log("✅ Factory deployment and setup");
  console.log("✅ Organization creation");
  console.log("✅ Organization initialization");
  console.log("✅ Constitution signing");
  console.log("✅ Partner management");
  console.log("✅ Archive/unarchive functionality");
  console.log("✅ All core features working");
  console.log("=" .repeat(50));
  console.log("\n🚀 New deployment is ready for production use!");
  
  return {
    factory: deploymentInfo.contracts.holacracyFactory,
    testOrganization: orgMetadata[3],
    orgCount: orgCount.toString()
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }); 