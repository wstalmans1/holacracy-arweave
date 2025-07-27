// SPDX-License-Identifier: CC-BY-SA-4.0
/**
 * @title HolacracyOrganizationFactoryImplementation
 * @notice This contract is based on the Holacracy Constitution and framework by HolacracyOne, LLC (https://www.holacracy.org/)
 * @dev Licensed under CC-BY-SA 4.0
 */
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./HolacracyOrganizationImplementation.sol";

contract HolacracyOrganizationFactoryImplementation is Initializable, OwnableUpgradeable {
    struct OrganizationMetadata {
        string name;
        string purpose;
        address creator;
        address orgAddress;
    }

    OrganizationMetadata[] public organizationList;
    address public organizationBeacon;

    event OrganizationMetadataCreated(uint256 indexed id, string name, string purpose, address creator);
    event OrganizationDeployed(uint256 indexed metadataId, address org);

    function initialize(address _organizationBeacon, address _owner) public initializer {
        __Ownable_init(_owner);
        organizationBeacon = _organizationBeacon;
    }

    // Create and launch organization directly
    function createAndLaunchOrganization(string memory name, string memory purpose) external returns (address org) {
        // Create organization metadata record
        OrganizationMetadata storage orgRecord = organizationList.push();
        orgRecord.name = name;
        orgRecord.purpose = purpose;
        orgRecord.creator = msg.sender;
        
        // Launch immediately with simplified initialization
        bytes memory initDataWithNameAndPurpose = abi.encodeWithSelector(
            HolacracyOrganizationImplementation.initialize.selector,
            name,
            purpose,
            msg.sender  // Pass the actual creator address
        );
        
        org = address(new BeaconProxy(organizationBeacon, initDataWithNameAndPurpose));
        orgRecord.orgAddress = org;
        
        emit OrganizationMetadataCreated(organizationList.length - 1, name, purpose, msg.sender);
        emit OrganizationDeployed(organizationList.length - 1, org);
    }

    /**
     * @notice Get the total count of all organizations
     * @return Total count of all organizations
     */
    function getOrganizationListCount() external view returns (uint256) {
        return organizationList.length;
    }

    /**
     * @notice Get organization metadata by ID
     * @param i The organization ID
     * @return name The organization name
     * @return purpose The organization purpose
     * @return creator The organization creator address
     * @return orgAddress The organization contract address
     */
    function getOrganizationMetadata(uint256 i) public view returns (
        string memory name,
        string memory purpose,
        address creator,
        address orgAddress
    ) {
        require(i < organizationList.length, "Organization does not exist");
        OrganizationMetadata storage metadata = organizationList[i];
        return (metadata.name, metadata.purpose, metadata.creator, metadata.orgAddress);
    }

    /// @notice Update the organization beacon address (onlyOwner)
    function setOrganizationBeacon(address newBeacon) external onlyOwner {
        require(newBeacon != address(0), "Invalid address");
        organizationBeacon = newBeacon;
    }
}
