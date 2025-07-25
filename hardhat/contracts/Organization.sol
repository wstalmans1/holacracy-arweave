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
    string public name;
    string public purpose;
    address[] public partners;
    mapping(address => bool) public hasSignedConstitution;

    /// @notice Emitted when the organization is initialized
    /// @param name The name of the organization
    /// @param purpose The purpose that will guide the organization
    event Initialized(string name, string purpose);

    /// @notice Emitted when a partner signs the constitution
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

    /// @notice Initializes the organization with its name and purpose
    /// @param _name The name of the organization
    /// @param _purpose The purpose that will guide the organization
    /// @param _creator The address of the organization creator
    /// @dev This function can only be called once due to the initializer modifier
    function initialize(
        string memory _name,
        string memory _purpose,
        address _creator
    ) public initializer {
        require(bytes(_name).length > 0, "Empty name");
        require(bytes(_purpose).length > 0, "Empty purpose");
        require(_creator != address(0), "Invalid creator address");
        
        name = _name;
        purpose = _purpose;
        
        // Set the creator as the owner
        __Ownable_init(_creator);
        
        emit Initialized(_name, _purpose);
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
