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

  describe("Organization Creation", function () {
    const testName = "Test Organization";
    const testPurpose = "To test the factory contract";
    let initiativeId;

    beforeEach(async function () {
      const tx = await factory.createInitiative(testName, testPurpose);
      await tx.wait();
      initiativeId = 0; // First initiative
      
      // Sign constitution
      await factory.connect(addr1).signConstitution(initiativeId);
      await factory.connect(addr2).signConstitution(initiativeId);
    });

    it("Should create organization with correct name and purpose", async function () {
      const tx = await factory.connect(addr1).launchOrganization(initiativeId, "0x");
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

    it("Should emit OrganizationDeployed event", async function () {
      await expect(factory.connect(addr1).launchOrganization(initiativeId, "0x"))
        .to.emit(factory, "OrganizationDeployed");
    });
  });
}); 