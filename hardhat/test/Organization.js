const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Organization", function () {
  let Organization;
  let organization;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    Organization = await ethers.getContractFactory("Organization");
    organization = await Organization.deploy();
  });

  describe("Initialization", function () {
    it("Should initialize with founders, name, and purpose", async function () {
      const founders = [owner.address, addr1.address];
      const name = "Test Organization";
      const purpose = "To test the organization contract";

      await organization.initialize(founders, name, purpose);

      expect(await organization.name()).to.equal(name);
      expect(await organization.purpose()).to.equal(purpose);
      expect(await organization.getPartners()).to.deep.equal(founders);
    });

    it("Should emit Initialized event with name and purpose", async function () {
      const founders = [owner.address];
      const name = "Test Organization";
      const purpose = "To test the organization contract";

      const tx = await organization.initialize(founders, name, purpose);
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => organization.interface.parseLog(log)?.name === "Initialized"
      );
      const args = organization.interface.parseLog(event).args;
      
      expect(args.founders).to.deep.equal(founders);
      expect(args.name).to.equal(name);
      expect(args.purpose).to.equal(purpose);
    });

    it("Should reject initialization with empty name", async function () {
      const founders = [owner.address];
      await expect(
        organization.initialize(founders, "", "Valid purpose")
      ).to.be.revertedWith("Empty name");
    });

    it("Should reject initialization with empty purpose", async function () {
      const founders = [owner.address];
      await expect(
        organization.initialize(founders, "Valid name", "")
      ).to.be.revertedWith("Empty purpose");
    });
  });

  describe("Constitution Signing", function () {
    beforeEach(async function () {
      await organization.initialize([owner.address], "Test Org", "Test Purpose");
    });

    it("Should allow new partners to sign constitution", async function () {
      await organization.connect(addr1).signConstitution();
      expect(await organization.getPartners()).to.include(addr1.address);
      expect(await organization.hasSignedConstitution(addr1.address)).to.be.true;
    });

    it("Should emit ConstitutionSigned event", async function () {
      const tx = await organization.connect(addr1).signConstitution();
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => organization.interface.parseLog(log)?.name === "ConstitutionSigned"
      );
      const args = organization.interface.parseLog(event).args;
      
      expect(args.partner).to.equal(addr1.address);
    });

    it("Should prevent double signing", async function () {
      await organization.connect(addr1).signConstitution();
      await expect(
        organization.connect(addr1).signConstitution()
      ).to.be.revertedWith("Already signed");
    });
  });

  describe("Name Updates", function () {
    beforeEach(async function () {
      await organization.initialize([owner.address, addr1.address], "Test Org", "Test Purpose");
    });

    it("Should allow partners to update name", async function () {
      const newName = "Updated Organization Name";
      const tx = await organization.connect(owner).updateName(newName);
      const receipt = await tx.wait();

      expect(await organization.name()).to.equal(newName);

      const event = receipt.logs.find(
        log => organization.interface.parseLog(log)?.name === "NameUpdated"
      );
      const args = organization.interface.parseLog(event).args;
      
      expect(args.oldName).to.equal("Test Org");
      expect(args.newName).to.equal(newName);
    });

    it("Should prevent non-partners from updating name", async function () {
      await expect(
        organization.connect(addr2).updateName("New Name")
      ).to.be.revertedWith("Only partners can update name");
    });

    it("Should reject empty name updates", async function () {
      await expect(
        organization.connect(owner).updateName("")
      ).to.be.revertedWith("Empty name");
    });
  });

  describe("Purpose Updates", function () {
    beforeEach(async function () {
      await organization.initialize([owner.address, addr1.address], "Test Org", "Test Purpose");
    });

    it("Should allow partners to update purpose", async function () {
      const newPurpose = "Updated organization purpose for better alignment";
      const tx = await organization.connect(addr1).updatePurpose(newPurpose);
      const receipt = await tx.wait();

      expect(await organization.purpose()).to.equal(newPurpose);

      const event = receipt.logs.find(
        log => organization.interface.parseLog(log)?.name === "PurposeUpdated"
      );
      const args = organization.interface.parseLog(event).args;
      
      expect(args.oldPurpose).to.equal("Test Purpose");
      expect(args.newPurpose).to.equal(newPurpose);
    });

    it("Should prevent non-partners from updating purpose", async function () {
      await expect(
        organization.connect(addr2).updatePurpose("New Purpose")
      ).to.be.revertedWith("Only partners can update purpose");
    });

    it("Should reject empty purpose updates", async function () {
      await expect(
        organization.connect(owner).updatePurpose("")
      ).to.be.revertedWith("Empty purpose");
    });
  });
}); 