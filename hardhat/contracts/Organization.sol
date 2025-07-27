// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title Organization
 * @notice This contract implements a Holacracy-based organization with legally binding constitution signing
 * @dev This contract allows partners to sign the Holacracy Constitution and participate in organization governance
 * @dev All constitution signatures are legally binding with comprehensive audit trails
 * @dev This contract is deployed via BeaconProxy and can be upgraded through the beacon
 * @dev Governance is based on partnership rather than ownership, following Holacracy principles
 */
contract Organization is Initializable {
    string public name;
    string public purpose;
    mapping(address => bool) public hasSignedConstitution;
    
    /**
     * @notice Structure for storing comprehensive constitution signature data
     * @dev This structure provides legal validity and audit trail for constitution signatures
     */
    struct ConstitutionSignature {
        string documentHash;        /// @dev Hash of constitution + user + organization
        string signatureHash;       /// @dev Hash of the complete signature payload
        uint256 timestamp;          /// @dev Exact signing time for legal validity
        string constitutionVersion; /// @dev Version of constitution being signed
        string consentStatement;    /// @dev Explicit legal consent statement
        address signer;             /// @dev Address of the signer
    }
    
    mapping(address => ConstitutionSignature) public constitutionSignatures;
    address[] public constitutionSigners;
    
    /// @notice Emitted when a new partner is added to the organization
    /// @param partner The address of the newly added partner
    event PartnerAdded(address indexed partner);
    
    /// @notice Emitted when a partner is removed from the organization
    /// @param partner The address of the removed partner
    event PartnerRemoved(address indexed partner);
    
    /// @notice Emitted when a partner signs the constitution with legal data
    /// @param signer The address of the signer
    /// @param documentHash Hash of the constitution document
    /// @param signatureHash Hash of the signature payload
    /// @param timestamp When the signature was created
    event ConstitutionSigned(address indexed signer, string documentHash, string signatureHash, uint256 timestamp);
    
    /// @notice Emitted when the organization name is updated
    /// @param newName The new name of the organization
    event NameUpdated(string newName);
    
    /// @notice Emitted when the organization purpose is updated
    /// @param newPurpose The new purpose of the organization
    event PurposeUpdated(string newPurpose);
    
    /// @notice Emitted when both name and purpose are updated together
    /// @param newName The new name of the organization
    /// @param newPurpose The new purpose of the organization
    event NameAndPurposeUpdated(string newName, string newPurpose);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the organization with its name and purpose
     * @param _name The name of the organization
     * @param _purpose The purpose that will guide the organization
     * @dev This function can only be called once due to the initializer modifier
     * @dev The organization is governed by partners who sign the constitution, not by a single owner
     */
    function initialize(string memory _name, string memory _purpose) public initializer {
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_purpose).length > 0, "Purpose cannot be empty");
        
        name = _name;
        purpose = _purpose;
    }

    /**
     * @notice Signs the constitution with comprehensive legal data for legally binding agreement
     * @param documentHash Hash of the constitution document + user address + organization address
     * @param signatureHash Hash of the complete signature payload including consent statement
     * @param constitutionVersion Version of the Holacracy Constitution being signed (e.g., "5.0")
     * @param consentStatement Explicit legal consent statement provided by the signer
     * @dev This function creates a legally binding electronic signature with full audit trail
     * @dev The signature data is stored on-chain for legal compliance and dispute resolution
     * @dev Only one signature per address is allowed
     */
    function signConstitutionWithDocument(
        string memory documentHash,
        string memory signatureHash,
        string memory constitutionVersion,
        string memory consentStatement
    ) external {
        require(!hasSignedConstitution[msg.sender], "Already signed constitution");
        require(bytes(documentHash).length > 0, "Document hash cannot be empty");
        require(bytes(signatureHash).length > 0, "Signature hash cannot be empty");
        require(bytes(constitutionVersion).length > 0, "Constitution version cannot be empty");
        require(bytes(consentStatement).length > 0, "Consent statement cannot be empty");
        
        // Store comprehensive signature data for legal validity
        constitutionSignatures[msg.sender] = ConstitutionSignature({
            documentHash: documentHash,
            signatureHash: signatureHash,
            timestamp: block.timestamp,
            constitutionVersion: constitutionVersion,
            consentStatement: consentStatement,
            signer: msg.sender
        });
        
        // Add to signers list for audit trail
        constitutionSigners.push(msg.sender);
        
        // Mark as signed
        hasSignedConstitution[msg.sender] = true;
        
        emit ConstitutionSigned(msg.sender, documentHash, signatureHash, block.timestamp);
        emit PartnerAdded(msg.sender);
    }

    /**
     * @notice Returns the list of all partners in the organization
     * @return Array of partner addresses who have signed the constitution
     * @dev This function returns the same data as getConstitutionSigners() for backward compatibility
     */
    function getPartners() external view returns (address[] memory) {
        return constitutionSigners;
    }

    /**
     * @notice Returns the list of all constitution signers
     * @return Array of addresses who have signed the constitution
     * @dev This is the primary function for getting the list of partners
     */
    function getConstitutionSigners() external view returns (address[] memory) {
        return constitutionSigners;
    }

    /**
     * @notice Returns detailed signature data for a specific signer
     * @param signer The address of the signer to query
     * @return documentHash Hash of the signed constitution document
     * @return signatureHash Hash of the signature payload
     * @return timestamp When the signature was created (block timestamp)
     * @return constitutionVersion Version of constitution that was signed
     * @return consentStatement The explicit consent statement provided
     * @return signerAddress The address of the signer
     * @dev This function provides complete audit trail for legal purposes
     */
    function getConstitutionSignature(address signer) external view returns (
        string memory documentHash,
        string memory signatureHash,
        uint256 timestamp,
        string memory constitutionVersion,
        string memory consentStatement,
        address signerAddress
    ) {
        ConstitutionSignature memory sig = constitutionSignatures[signer];
        return (
            sig.documentHash,
            sig.signatureHash,
            sig.timestamp,
            sig.constitutionVersion,
            sig.consentStatement,
            sig.signer
        );
    }

    /**
     * @notice Updates the organization's name
     * @param newName The new name for the organization
     * @dev Only partners can update the organization name
     * @dev Name cannot be empty
     */
    function updateName(string memory newName) external {
        require(hasSignedConstitution[msg.sender], "Must be a partner to update name");
        require(bytes(newName).length > 0, "Name cannot be empty");
        name = newName;
        emit NameUpdated(newName);
    }

    /**
     * @notice Updates the organization's purpose
     * @param newPurpose The new purpose for the organization
     * @dev Only partners can update the organization purpose
     * @dev Purpose cannot be empty
     */
    function updatePurpose(string memory newPurpose) external {
        require(hasSignedConstitution[msg.sender], "Must be a partner to update purpose");
        require(bytes(newPurpose).length > 0, "Purpose cannot be empty");
        purpose = newPurpose;
        emit PurposeUpdated(newPurpose);
    }

    /**
     * @notice Updates both the organization's name and purpose in a single transaction
     * @param newName The new name for the organization
     * @param newPurpose The new purpose for the organization
     * @dev Only partners can update organization details
     * @dev Both name and purpose cannot be empty
     * @dev This is more gas efficient than updating name and purpose separately
     */
    function updateNameAndPurpose(string memory newName, string memory newPurpose) external {
        require(hasSignedConstitution[msg.sender], "Must be a partner to update details");
        require(bytes(newName).length > 0, "Name cannot be empty");
        require(bytes(newPurpose).length > 0, "Purpose cannot be empty");
        name = newName;
        purpose = newPurpose;
        emit NameAndPurposeUpdated(newName, newPurpose);
    }
}
