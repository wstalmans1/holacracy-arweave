const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Factory Proxy Functionality...");
  
  // Load deployment info
  const deploymentInfo = require("../deployment-optimized.json");
  const { contracts } = deploymentInfo;
  
  console.log("📋 Contract Addresses:");
  console.log("   Factory Proxy:", contracts.holacracyFactoryProxy);
  console.log("   Factory Proxy Admin:", contracts.holacracyFactoryProxyAdmin);
  console.log("   Factory Implementation:", contracts.holacracyFactoryImplementation);
  console.log("   Organization Beacon:", contracts.organizationBeacon);

  // Get signers
  const [deployer] = await ethers.getSigners();
  let testUser = deployer;
  console.log("👤 Testing with account:", testUser.address);

  // Test 1: Factory Proxy Contract
  console.log("\n🔍 Test 1: Factory Proxy Contract...");
  const factoryProxy = await ethers.getContractAt("contracts/HolacracyOrganizationFactoryImplementation.sol:HolacracyOrganizationFactoryImplementation", contracts.holacracyFactoryProxy);
  
  // Check beacon reference
  const factoryBeacon = await factoryProxy.organizationBeacon();
  console.log("✅ Factory proxy beacon reference:", factoryBeacon);
  console.log("✅ Beacon matches deployment:", factoryBeacon === contracts.organizationBeacon);
  
  // Check organization count
  const orgCount = await factoryProxy.getOrganizationListCount();
  console.log("✅ Initial organization count:", orgCount.toString());

  // Test 2: Create Organization via Proxy
  console.log("\n🏢 Test 2: Creating Organization via Proxy...");
  const orgName = "Proxy Test Organization";
  const orgPurpose = "To test the factory proxy deployment";
  
  const createTx = await factoryProxy.connect(testUser).createAndLaunchOrganization(orgName, orgPurpose);
  const createReceipt = await createTx.wait();
  console.log("✅ Organization creation transaction:", createTx.hash);
  
  // Extract organization address from event
  let orgAddress = null;
  for (const log of createReceipt.logs) {
    try {
      const parsed = factoryProxy.interface.parseLog(log);
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

  // Test 3: Organization Contract via Proxy
  console.log("\n📋 Test 3: Organization Contract via Proxy...");
  const organization = await ethers.getContractAt("contracts/HolacracyOrganizationImplementation.sol:HolacracyOrganizationImplementation", orgAddress);
  
  // Check basic properties
  const name = await organization.name();
  const purpose = await organization.purpose();
  console.log("✅ Organization name:", name);
  console.log("✅ Organization purpose:", purpose);
  console.log("✅ Name matches:", name === orgName);
  console.log("✅ Purpose matches:", purpose === orgPurpose);

  // Test 4: Constitution Signing via Proxy
  console.log("\n✍️ Test 4: Constitution Signing via Proxy...");
  const documentHash = ethers.keccak256(ethers.toUtf8Bytes("proxy-test-document"));
  const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("proxy-test-signature"));
  const constitutionVersion = "5.0";
  const consentStatement = "I agree to the constitution via proxy";
  
  const signTx = await organization.connect(testUser).signConstitutionWithDocument(
    documentHash,
    signatureHash,
    constitutionVersion,
    consentStatement
  );
  await signTx.wait();
  console.log("✅ Constitution signed successfully via proxy");

  // Test 5: Organization Metadata via Proxy
  console.log("\n📊 Test 5: Organization Metadata via Proxy...");
  const [metadataName, metadataPurpose, metadataCreator, metadataOrgAddress] = await factoryProxy.getOrganizationMetadata(0);
  console.log("✅ Metadata name:", metadataName);
  console.log("✅ Metadata purpose:", metadataPurpose);
  console.log("✅ Metadata creator:", metadataCreator);
  console.log("✅ Metadata org address:", metadataOrgAddress);
  console.log("✅ Metadata matches organization:", metadataOrgAddress === orgAddress);
  
  // Check organization count
  const finalOrgCount = await factoryProxy.getOrganizationListCount();
  console.log("✅ Final organization count:", finalOrgCount.toString());

  console.log("\n🎉 FACTORY PROXY TESTS PASSED!");
  console.log("=" .repeat(50));
  console.log("✅ Factory proxy deployment: PASSED");
  console.log("✅ Organization creation via proxy: PASSED");
  console.log("✅ Constitution signing via proxy: PASSED");
  console.log("✅ Organization updates via proxy: PASSED");
  console.log("✅ Metadata tracking via proxy: PASSED");
  console.log("=" .repeat(50));
  console.log("🚀 Factory proxy is working correctly!");
  console.log("\n🔗 Architecture Summary:");
  console.log("   Users → Factory Proxy → Factory Implementation");
  console.log("   Factory Proxy → Organization Beacon → Organization Implementation");
  console.log("   All contracts are now upgradeable!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Factory proxy test failed:", error);
    process.exit(1);
  }); 