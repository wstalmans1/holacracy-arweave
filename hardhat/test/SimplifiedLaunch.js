const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Simplified Organization Launch", function () {
  let factory, organizationImpl, beacon, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy Organization implementation
    const Organization = await ethers.getContractFactory("Organization");
    organizationImpl = await Organization.deploy();

    // Deploy Beacon
    const Beacon = await ethers.getContractFactory("UpgradeableBeacon");
    beacon = await Beacon.deploy(organizationImpl);

    // Deploy Factory
    const HolacracyFactory = await ethers.getContractFactory("HolacracyFactory");
    factory = await HolacracyFactory.deploy();
    await factory.initialize(beacon, owner);
  });

  describe("createAndLaunchOrganization", function () {
    it("Should create and launch organization immediately", async function () {
      const name = "Test Organization";
      const purpose = "To test simplified launch";

      // Launch organization directly
      const tx = await factory.connect(addr1).createAndLaunchOrganization(name, purpose);
      const receipt = await tx.wait();

      // Get the organization address from the event
      const event = receipt.logs.find(
        log => factory.interface.parseLog(log)?.name === "OrganizationDeployed"
      );
      const orgAddress = factory.interface.parseLog(event).args.org;

      // Verify the organization was created
      expect(orgAddress).to.not.equal(ethers.ZeroAddress);

      // Check the organization details
      const org = await ethers.getContractAt("Organization", orgAddress);
      expect(await org.name()).to.equal(name);
      expect(await org.purpose()).to.equal(purpose);

      // Verify no initial partners (empty array)
      const partners = await org.getPartners();
      expect(partners.length).to.equal(0);

      // Verify organization metadata was created
      const [metadataName, metadataPurpose, metadataCreator, metadataOrgAddress] = 
        await factory.getOrganizationMetadata(0);
      
      expect(metadataName).to.equal(name);
      expect(metadataPurpose).to.equal(purpose);
      expect(metadataCreator).to.equal(addr1.address);
      expect(metadataOrgAddress).to.equal(orgAddress);
    });

    it("Should emit correct events", async function () {
      const name = "Test Organization";
      const purpose = "To test events";

      await expect(factory.connect(addr1).createAndLaunchOrganization(name, purpose))
        .to.emit(factory, "OrganizationMetadataCreated")
        .and.to.emit(factory, "OrganizationDeployed");
    });

    it("Should allow creator to sign constitution after launch", async function () {
      const name = "Test Organization";
      const purpose = "To test post-launch signing";

      // Launch organization
      const tx = await factory.connect(addr1).createAndLaunchOrganization(name, purpose);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => factory.interface.parseLog(log)?.name === "OrganizationDeployed"
      );
      const orgAddress = factory.interface.parseLog(event).args.org;
      const org = await ethers.getContractAt("Organization", orgAddress);

      // Creator should be able to sign constitution
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
      const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("test-signature"));
      const constitutionVersion = "5.0";
      const consentStatement = "I agree to the constitution";

      await expect(org.connect(addr1).signConstitutionWithDocument(
        documentHash,
        signatureHash,
        constitutionVersion,
        consentStatement
      )).to.not.be.reverted;

      // Verify creator is now a partner
      const partners = await org.getPartners();
      expect(partners).to.include(addr1.address);
    });

    it("Should allow others to sign constitution after launch", async function () {
      const name = "Test Organization";
      const purpose = "To test others signing";

      // Launch organization
      const tx = await factory.connect(addr1).createAndLaunchOrganization(name, purpose);
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => factory.interface.parseLog(log)?.name === "OrganizationDeployed"
      );
      const orgAddress = factory.interface.parseLog(event).args.org;
      const org = await ethers.getContractAt("Organization", orgAddress);

      // Others should be able to sign constitution
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
      const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("test-signature"));
      const constitutionVersion = "5.0";
      const consentStatement = "I agree to the constitution";

      await expect(org.connect(addr2).signConstitutionWithDocument(
        documentHash,
        signatureHash,
        constitutionVersion,
        consentStatement
      )).to.not.be.reverted;

      // Verify they are now partners
      const partners = await org.getPartners();
      expect(partners).to.include(addr2.address);
    });
  });
}); 