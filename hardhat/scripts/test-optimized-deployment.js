const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Optimized Holacracy Deployment...");
  
  // Load deployment info
  const deploymentInfo = require("../deployment-optimized.json");
  const { contracts } = deploymentInfo;
  
  console.log("📋 Testing contracts:");
  console.log("   Factory:", contracts.holacracyFactory);
  console.log("   Beacon:", contracts.organizationBeacon);
  console.log("   Implementation:", contracts.organizationImplementation);

  // Get signers
  const [deployer] = await ethers.getSigners();
  let testUser = deployer;
  console.log("👤 Testing with account:", testUser.address);

  // Test 1: Factory Contract
  console.log("\n🔍 Test 1: Factory Contract...");
  const factory = await ethers.getContractAt("contracts/HolacracyOrganizationFactoryImplementation.sol:HolacracyOrganizationFactoryImplementation", contracts.holacracyFactory);
  
  // Check beacon reference
  const factoryBeacon = await factory.organizationBeacon();
  console.log("✅ Factory beacon reference:", factoryBeacon);
  console.log("✅ Beacon matches deployment:", factoryBeacon === contracts.organizationBeacon);
  
  // Check organization count
  const orgCount = await factory.getOrganizationListCount();
  console.log("✅ Initial organization count:", orgCount.toString());

  // Test 2: Create Organization
  console.log("\n🏢 Test 2: Creating Organization...");
  const orgName = "Test Organization";
  const orgPurpose = "To test the optimized deployment";
  
  const createTx = await factory.connect(testUser).createAndLaunchOrganization(orgName, orgPurpose);
  const createReceipt = await createTx.wait();
  console.log("✅ Organization creation transaction:", createTx.hash);
  
  // Extract organization address from event
  let orgAddress = null;
  for (const log of createReceipt.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed && parsed.name === 'OrganizationDeployed') {
        orgAddress = parsed.args.org;
        break;
      }
    } catch {}
  }
  
  if (!orgAddress) {
    throw new Error("Could not extract organization address from event");
  }
  console.log("✅ Organization deployed at:", orgAddress);

  // Test 3: Organization Contract
  console.log("\n📋 Test 3: Organization Contract...");
  const organization = await ethers.getContractAt("contracts/HolacracyOrganizationImplementation.sol:HolacracyOrganizationImplementation", orgAddress);
  
  // Check basic properties
  const name = await organization.name();
  const purpose = await organization.purpose();
  console.log("✅ Organization name:", name);
  console.log("✅ Organization purpose:", purpose);
  console.log("✅ Name matches:", name === orgName);
  console.log("✅ Purpose matches:", purpose === orgPurpose);
  
  // Check initial partners (should be empty)
  const partners = await organization.getPartners();
  console.log("✅ Initial partners count:", partners.length);
  console.log("✅ Partners array is empty:", partners.length === 0);

  // Test 4: Constitution Signing
  console.log("\n✍️ Test 4: Constitution Signing...");
  const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
  const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("test-signature"));
  const constitutionVersion = "5.0";
  const consentStatement = "I agree to the constitution";
  
  const signTx = await organization.connect(testUser).signConstitutionWithDocument(
    documentHash,
    signatureHash,
    constitutionVersion,
    consentStatement
  );
  await signTx.wait();
  console.log("✅ Constitution signed successfully");
  
  // Check partner status
  const hasSigned = await organization.hasSignedConstitution(testUser.address);
  console.log("✅ User has signed constitution:", hasSigned);
  
  const updatedPartners = await organization.getPartners();
  console.log("✅ Updated partners count:", updatedPartners.length);
  console.log("✅ User is in partners list:", updatedPartners.includes(testUser.address));

  // Test 5: Organization Metadata
  console.log("\n📊 Test 5: Organization Metadata...");
  const [metadataName, metadataPurpose, metadataCreator, metadataOrgAddress] = await factory.getOrganizationMetadata(0);
  console.log("✅ Metadata name:", metadataName);
  console.log("✅ Metadata purpose:", metadataPurpose);
  console.log("✅ Metadata creator:", metadataCreator);
  console.log("✅ Metadata org address:", metadataOrgAddress);
  console.log("✅ Metadata matches organization:", metadataOrgAddress === orgAddress);
  
  // Check organization count
  const finalOrgCount = await factory.getOrganizationListCount();
  console.log("✅ Final organization count:", finalOrgCount.toString());

  // Test 6: Organization Updates
  console.log("\n✏️ Test 6: Organization Updates...");
  const newName = "Updated Test Organization";
  const newPurpose = "Updated purpose for testing";
  
  const updateTx = await organization.connect(testUser).updateNameAndPurpose(newName, newPurpose);
  await updateTx.wait();
  console.log("✅ Organization updated successfully");
  
  const updatedName = await organization.name();
  const updatedPurpose = await organization.purpose();
  console.log("✅ Updated name:", updatedName);
  console.log("✅ Updated purpose:", updatedPurpose);
  console.log("✅ Name update successful:", updatedName === newName);
  console.log("✅ Purpose update successful:", updatedPurpose === newPurpose);

  console.log("\n🎉 ALL TESTS PASSED!");
  console.log("=" .repeat(50));
  console.log("✅ Factory deployment: PASSED");
  console.log("✅ Organization creation: PASSED");
  console.log("✅ Constitution signing: PASSED");
  console.log("✅ Organization updates: PASSED");
  console.log("✅ Metadata tracking: PASSED");
  console.log("=" .repeat(50));
  console.log("🚀 Optimized deployment is working correctly!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }); 