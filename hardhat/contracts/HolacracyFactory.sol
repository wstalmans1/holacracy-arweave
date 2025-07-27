// SPDX-License-Identifier: CC-BY-SA-4.0
/**
 * @title HolacracyFactory
 * @notice This contract is based on the Holacracy Constitution and framework by HolacracyOne, LLC (https://www.holacracy.org/)
 * @dev Licensed under CC BY-SA 4.0
 */
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./Organization.sol";

contract HolacracyFactory is Initializable, OwnableUpgradeable {
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
            Organization.initialize.selector,
            name,
            purpose
        );
        
        org = address(new BeaconProxy(organizationBeacon, initDataWithNameAndPurpose));
        orgRecord.orgAddress = org;
        
        emit OrganizationMetadataCreated(organizationList.length - 1, name, purpose, msg.sender);
        emit OrganizationDeployed(organizationList.length - 1, org);
    }

    function getOrganizationListCount() external view returns (uint256) {
        return organizationList.length;
    }

    function getOrganizationMetadata(uint256 i) public view returns (
        string memory name,
        string memory purpose,
        address creator,
        address orgAddress
    ) {
        OrganizationMetadata storage metadata = organizationList[i];
        return (metadata.name, metadata.purpose, metadata.creator, metadata.orgAddress);
    }

    /// @notice Update the organization beacon address (onlyOwner)
    function setOrganizationBeacon(address newBeacon) external onlyOwner {
        require(newBeacon != address(0), "Invalid address");
        organizationBeacon = newBeacon;
    }
}
