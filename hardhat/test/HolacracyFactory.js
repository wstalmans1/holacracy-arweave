const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HolacracyFactory", function () {
  let HolacracyFactory;
  let Organization;
  let factory;
  let organization;
  let organizationBeacon;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy Organization implementation
    Organization = await ethers.getContractFactory("Organization");
    organization = await Organization.deploy();
    await organization.waitForDeployment();
    
    // Deploy and setup beacon
    const LocalUpgradeableBeacon = await ethers.getContractFactory("LocalUpgradeableBeacon");
    organizationBeacon = await LocalUpgradeableBeacon.deploy(await organization.getAddress());
    await organizationBeacon.waitForDeployment();
    
    // Deploy factory
    HolacracyFactory = await ethers.getContractFactory("HolacracyFactory");
    factory = await HolacracyFactory.deploy();
    await factory.waitForDeployment();
    await factory.initialize(await organizationBeacon.getAddress(), owner.address);
  });

  describe("Organization Creation and Launch", function () {
    const testName = "Test Organization";
    const testPurpose = "To test the factory contract";

    it("Should create and launch organization with correct name and purpose", async function () {
      const tx = await factory.connect(addr1).createAndLaunchOrganization(testName, testPurpose);
      const receipt = await tx.wait();
      
      // Get the organization address from the event
      const event = receipt.logs.find(
        log => factory.interface.parseLog(log)?.name === "OrganizationDeployed"
      );
      const orgAddress = factory.interface.parseLog(event).args.org;
      
      // Check the deployed organization
      const deployedOrg = await ethers.getContractAt("Organization", orgAddress);
      expect(await deployedOrg.name()).to.equal(testName);
      expect(await deployedOrg.purpose()).to.equal(testPurpose);
    });

    it("Should emit OrganizationMetadataCreated event", async function () {
      await expect(factory.connect(addr1).createAndLaunchOrganization(testName, testPurpose))
        .to.emit(factory, "OrganizationMetadataCreated")
        .withArgs(0, testName, testPurpose, addr1.address);
    });

    it("Should emit OrganizationDeployed event", async function () {
      await expect(factory.connect(addr1).createAndLaunchOrganization(testName, testPurpose))
        .to.emit(factory, "OrganizationDeployed");
    });

    it("Should increment organization count", async function () {
      expect(await factory.getOrganizationListCount()).to.equal(0);
      
      await factory.connect(addr1).createAndLaunchOrganization(testName, testPurpose);
      
      expect(await factory.getOrganizationListCount()).to.equal(1);
    });

    it("Should store organization metadata correctly", async function () {
      await factory.connect(addr1).createAndLaunchOrganization(testName, testPurpose);
      
      const [name, purpose, creator, orgAddress] = await factory.getOrganizationMetadata(0);
      
      expect(name).to.equal(testName);
      expect(purpose).to.equal(testPurpose);
      expect(creator).to.equal(addr1.address);
      expect(orgAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should allow multiple organizations to be created", async function () {
      const name1 = "First Organization";
      const purpose1 = "First purpose";
      const name2 = "Second Organization";
      const purpose2 = "Second purpose";

      await factory.connect(addr1).createAndLaunchOrganization(name1, purpose1);
      await factory.connect(addr2).createAndLaunchOrganization(name2, purpose2);

      expect(await factory.getOrganizationListCount()).to.equal(2);

      const [name1Retrieved, purpose1Retrieved, creator1, orgAddress1] = await factory.getOrganizationMetadata(0);
      const [name2Retrieved, purpose2Retrieved, creator2, orgAddress2] = await factory.getOrganizationMetadata(1);

      expect(name1Retrieved).to.equal(name1);
      expect(purpose1Retrieved).to.equal(purpose1);
      expect(creator1).to.equal(addr1.address);

      expect(name2Retrieved).to.equal(name2);
      expect(purpose2Retrieved).to.equal(purpose2);
      expect(creator2).to.equal(addr2.address);
    });
  });

  describe("Factory Management", function () {
    it("Should allow owner to update organization beacon", async function () {
      const newBeacon = addr2.address; // Using addr2 as a mock beacon address
      
      await factory.connect(owner).setOrganizationBeacon(newBeacon);
      
      expect(await factory.organizationBeacon()).to.equal(newBeacon);
    });

    it("Should prevent non-owner from updating organization beacon", async function () {
      const newBeacon = addr2.address;
      
      await expect(
        factory.connect(addr1).setOrganizationBeacon(newBeacon)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should reject zero address as beacon", async function () {
      await expect(
        factory.connect(owner).setOrganizationBeacon(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid address");
    });
  });

  describe("Organization Interaction", function () {
    let orgAddress;

    beforeEach(async function () {
      const tx = await factory.connect(addr1).createAndLaunchOrganization(testName, testPurpose);
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(
        log => factory.interface.parseLog(log)?.name === "OrganizationDeployed"
      );
      orgAddress = factory.interface.parseLog(event).args.org;
    });

    it("Should allow partners to sign constitution after organization creation", async function () {
      const deployedOrg = await ethers.getContractAt("Organization", orgAddress);
      
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
      const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("test-signature"));
      const constitutionVersion = "5.0";
      const consentStatement = "I agree to the constitution";

      await deployedOrg.connect(addr2).signConstitutionWithDocument(
        documentHash,
        signatureHash,
        constitutionVersion,
        consentStatement
      );

      expect(await deployedOrg.getPartners()).to.include(addr2.address);
      expect(await deployedOrg.hasSignedConstitution(addr2.address)).to.be.true;
    });
  });
}); 