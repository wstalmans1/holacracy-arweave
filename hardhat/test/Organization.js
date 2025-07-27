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
    it("Should initialize with name and purpose", async function () {
      const name = "Test Organization";
      const purpose = "To test the organization contract";

      await organization.initialize(name, purpose);

      expect(await organization.name()).to.equal(name);
      expect(await organization.purpose()).to.equal(purpose);
    });

    it("Should reject initialization with empty name", async function () {
      await expect(
        organization.initialize("", "Valid purpose")
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should reject initialization with empty purpose", async function () {
      await expect(
        organization.initialize("Valid name", "")
      ).to.be.revertedWith("Purpose cannot be empty");
    });
  });

  describe("Constitution Signing", function () {
    beforeEach(async function () {
      await organization.initialize("Test Org", "Test Purpose");
    });

    it("Should allow new partners to sign constitution with document", async function () {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
      const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("test-signature"));
      const constitutionVersion = "5.0";
      const consentStatement = "I agree to the constitution";

      await organization.connect(addr1).signConstitutionWithDocument(
        documentHash,
        signatureHash,
        constitutionVersion,
        consentStatement
      );

      expect(await organization.getPartners()).to.include(addr1.address);
      expect(await organization.hasSignedConstitution(addr1.address)).to.be.true;
    });

    it("Should emit ConstitutionSigned event", async function () {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
      const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("test-signature"));
      const constitutionVersion = "5.0";
      const consentStatement = "I agree to the constitution";

      const tx = await organization.connect(addr1).signConstitutionWithDocument(
        documentHash,
        signatureHash,
        constitutionVersion,
        consentStatement
      );
      const receipt = await tx.wait();

      const event = receipt.logs.find(
        log => organization.interface.parseLog(log)?.name === "ConstitutionSigned"
      );
      const args = organization.interface.parseLog(event).args;
      
      expect(args.signer).to.equal(addr1.address);
      expect(args.documentHash).to.equal(documentHash);
      expect(args.signatureHash).to.equal(signatureHash);
    });

    it("Should prevent double signing", async function () {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
      const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("test-signature"));
      const constitutionVersion = "5.0";
      const consentStatement = "I agree to the constitution";

      await organization.connect(addr1).signConstitutionWithDocument(
        documentHash,
        signatureHash,
        constitutionVersion,
        consentStatement
      );

      await expect(
        organization.connect(addr1).signConstitutionWithDocument(
          documentHash,
          signatureHash,
          constitutionVersion,
          consentStatement
        )
      ).to.be.revertedWith("Already signed constitution");
    });

    it("Should reject empty document hash", async function () {
      const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("test-signature"));
      const constitutionVersion = "5.0";
      const consentStatement = "I agree to the constitution";

      await expect(
        organization.connect(addr1).signConstitutionWithDocument(
          "",
          signatureHash,
          constitutionVersion,
          consentStatement
        )
      ).to.be.revertedWith("Document hash cannot be empty");
    });

    it("Should reject empty signature hash", async function () {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
      const constitutionVersion = "5.0";
      const consentStatement = "I agree to the constitution";

      await expect(
        organization.connect(addr1).signConstitutionWithDocument(
          documentHash,
          "",
          constitutionVersion,
          consentStatement
        )
      ).to.be.revertedWith("Signature hash cannot be empty");
    });

    it("Should reject empty constitution version", async function () {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
      const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("test-signature"));
      const consentStatement = "I agree to the constitution";

      await expect(
        organization.connect(addr1).signConstitutionWithDocument(
          documentHash,
          signatureHash,
          "",
          consentStatement
        )
      ).to.be.revertedWith("Constitution version cannot be empty");
    });

    it("Should reject empty consent statement", async function () {
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
      const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("test-signature"));
      const constitutionVersion = "5.0";

      await expect(
        organization.connect(addr1).signConstitutionWithDocument(
          documentHash,
          signatureHash,
          constitutionVersion,
          ""
        )
      ).to.be.revertedWith("Consent statement cannot be empty");
    });
  });

  describe("Name Updates", function () {
    beforeEach(async function () {
      await organization.initialize("Test Org", "Test Purpose");
      // Make addr1 a partner first
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
      const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("test-signature"));
      const constitutionVersion = "5.0";
      const consentStatement = "I agree to the constitution";
      await organization.connect(addr1).signConstitutionWithDocument(
        documentHash,
        signatureHash,
        constitutionVersion,
        consentStatement
      );
    });

    it("Should allow partners to update name", async function () {
      const newName = "Updated Organization Name";
      const tx = await organization.connect(addr1).updateName(newName);
      const receipt = await tx.wait();

      expect(await organization.name()).to.equal(newName);

      const event = receipt.logs.find(
        log => organization.interface.parseLog(log)?.name === "NameUpdated"
      );
      const args = organization.interface.parseLog(event).args;
      
      expect(args.newName).to.equal(newName);
    });

    it("Should prevent non-partners from updating name", async function () {
      await expect(
        organization.connect(addr2).updateName("New Name")
      ).to.be.revertedWith("Must be a partner to update name");
    });

    it("Should reject empty name updates", async function () {
      await expect(
        organization.connect(addr1).updateName("")
      ).to.be.revertedWith("Name cannot be empty");
    });
  });

  describe("Purpose Updates", function () {
    beforeEach(async function () {
      await organization.initialize("Test Org", "Test Purpose");
      // Make addr1 a partner first
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
      const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("test-signature"));
      const constitutionVersion = "5.0";
      const consentStatement = "I agree to the constitution";
      await organization.connect(addr1).signConstitutionWithDocument(
        documentHash,
        signatureHash,
        constitutionVersion,
        consentStatement
      );
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
      
      expect(args.newPurpose).to.equal(newPurpose);
    });

    it("Should prevent non-partners from updating purpose", async function () {
      await expect(
        organization.connect(addr2).updatePurpose("New Purpose")
      ).to.be.revertedWith("Must be a partner to update purpose");
    });

    it("Should reject empty purpose updates", async function () {
      await expect(
        organization.connect(addr1).updatePurpose("")
      ).to.be.revertedWith("Purpose cannot be empty");
    });
  });

  describe("Name and Purpose Updates", function () {
    beforeEach(async function () {
      await organization.initialize("Test Org", "Test Purpose");
      // Make addr1 a partner first
      const documentHash = ethers.keccak256(ethers.toUtf8Bytes("test-document"));
      const signatureHash = ethers.keccak256(ethers.toUtf8Bytes("test-signature"));
      const constitutionVersion = "5.0";
      const consentStatement = "I agree to the constitution";
      await organization.connect(addr1).signConstitutionWithDocument(
        documentHash,
        signatureHash,
        constitutionVersion,
        consentStatement
      );
    });

    it("Should allow partners to update both name and purpose", async function () {
      const newName = "Updated Organization Name";
      const newPurpose = "Updated organization purpose";
      const tx = await organization.connect(addr1).updateNameAndPurpose(newName, newPurpose);
      const receipt = await tx.wait();

      expect(await organization.name()).to.equal(newName);
      expect(await organization.purpose()).to.equal(newPurpose);

      const event = receipt.logs.find(
        log => organization.interface.parseLog(log)?.name === "NameAndPurposeUpdated"
      );
      const args = organization.interface.parseLog(event).args;
      
      expect(args.newName).to.equal(newName);
      expect(args.newPurpose).to.equal(newPurpose);
    });

    it("Should prevent non-partners from updating name and purpose", async function () {
      await expect(
        organization.connect(addr2).updateNameAndPurpose("New Name", "New Purpose")
      ).to.be.revertedWith("Must be a partner to update details");
    });

    it("Should reject empty name in combined update", async function () {
      await expect(
        organization.connect(addr1).updateNameAndPurpose("", "Valid Purpose")
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should reject empty purpose in combined update", async function () {
      await expect(
        organization.connect(addr1).updateNameAndPurpose("Valid Name", "")
      ).to.be.revertedWith("Purpose cannot be empty");
    });
  });
}); 