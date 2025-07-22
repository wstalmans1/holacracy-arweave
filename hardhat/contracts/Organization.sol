// SPDX-License-Identifier: CC-BY-SA-4.0
/**
 * @title Organization
 * @notice This contract is based on the Holacracy Constitution and framework by HolacracyOne, LLC (https://www.holacracy.org/)
 * @dev Licensed under CC BY-SA 4.0
 */
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Organization is Initializable, OwnableUpgradeable {
    address[] public partners;
    mapping(address => bool) public hasSignedConstitution;
    string public constant constitutionURI = "https://www.holacracy.org/constitution/5-0/";
    
    // New storage variables (added at the end to maintain storage layout)
    /// @notice The name of the organization
    string public name;
    /// @notice The purpose that guides the organization's activities and decisions
    string public purpose;

    /// @notice Emitted when the organization is initialized
    /// @param founders The initial set of partners who founded the organization
    /// @param name The name of the organization
    /// @param purpose The purpose of the organization
    event Initialized(address[] founders, string name, string purpose);
    
    /// @notice Emitted when a new partner signs the constitution
    /// @param partner The address of the partner who signed
    event ConstitutionSigned(address indexed partner);

    /// @notice Emitted when the organization name is updated
    /// @param oldName The previous name
    /// @param newName The new name
    event NameUpdated(string oldName, string newName);

    /// @notice Emitted when the organization purpose is updated
    /// @param oldPurpose The previous purpose
    /// @param newPurpose The new purpose
    event PurposeUpdated(string oldPurpose, string newPurpose);

    /// @notice Initializes the organization with its founding partners, name, and purpose
    /// @param _founders Array of addresses that will be the initial partners
    /// @param _name The name of the organization
    /// @param _purpose The purpose that will guide the organization
    /// @dev This function can only be called once due to the initializer modifier
    function initialize(
        address[] memory _founders,
        string memory _name,
        string memory _purpose
    ) public initializer {
        require(_founders.length > 0, "No founders");
        require(bytes(_name).length > 0, "Empty name");
        require(bytes(_purpose).length > 0, "Empty purpose");
        
        for (uint256 i = 0; i < _founders.length; i++) {
            partners.push(_founders[i]);
            hasSignedConstitution[_founders[i]] = true;
        }
        __Ownable_init(_founders[0]);
        
        name = _name;
        purpose = _purpose;
        
        emit Initialized(_founders, _name, _purpose);
    }

    /// @notice Allows anyone to join the organization by signing the constitution
    /// @dev Emits a ConstitutionSigned event
    function signConstitution() external {
        require(!hasSignedConstitution[msg.sender], "Already signed");
        partners.push(msg.sender);
        hasSignedConstitution[msg.sender] = true;
        emit ConstitutionSigned(msg.sender);
    }

    /// @notice Returns the list of all partners in the organization
    /// @return Array of partner addresses
    function getPartners() external view returns (address[] memory) {
        return partners;
    }

    /// @notice Updates the organization's name
    /// @param _newName The new name for the organization
    /// @dev Only partners can update the name
    function updateName(string memory _newName) external {
        require(hasSignedConstitution[msg.sender], "Only partners can update name");
        require(bytes(_newName).length > 0, "Empty name");
        
        string memory oldName = name;
        name = _newName;
        
        emit NameUpdated(oldName, _newName);
    }

    /// @notice Updates the organization's purpose
    /// @param _newPurpose The new purpose for the organization
    /// @dev Only partners can update the purpose
    function updatePurpose(string memory _newPurpose) external {
        require(hasSignedConstitution[msg.sender], "Only partners can update purpose");
        require(bytes(_newPurpose).length > 0, "Empty purpose");
        
        string memory oldPurpose = purpose;
        purpose = _newPurpose;
        
        emit PurposeUpdated(oldPurpose, _newPurpose);
    }

    /// @notice Updates both the organization's name and purpose in a single transaction
    /// @param _newName The new name for the organization
    /// @param _newPurpose The new purpose for the organization
    /// @dev Only partners can update name and purpose
    function updateNameAndPurpose(string memory _newName, string memory _newPurpose) external {
        require(hasSignedConstitution[msg.sender], "Only partners can update name and purpose");
        require(bytes(_newName).length > 0, "Empty name");
        require(bytes(_newPurpose).length > 0, "Empty purpose");
        
        string memory oldName = name;
        string memory oldPurpose = purpose;
        
        name = _newName;
        purpose = _newPurpose;
        
        emit NameUpdated(oldName, _newName);
        emit PurposeUpdated(oldPurpose, _newPurpose);
    }
}
