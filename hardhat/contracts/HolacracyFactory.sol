// SPDX-License-Identifier: CC-BY-SA-4.0
/**
 * @title HolacracyFactory
 * @notice This contract is based on the Holacracy Constitution and framework by HolacracyOne, LLC (https://www.holacracy.org/)
 * @dev Licensed under CC BY-SA 4.0
 */
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

contract HolacracyFactory is Initializable, OwnableUpgradeable {
    using Clones for address;

    struct Initiative {
        string name;
        string purpose;
        address creator;
        address[] partners;
        bool launched;
    }

    Initiative[] public initiatives;
    mapping(uint256 => mapping(address => bool)) public isPartner;
    address public organizationImplementation;

    event InitiativeCreated(uint256 indexed id, string name, string purpose, address creator);
    event PartnerJoined(uint256 indexed initiativeId, address partner);
    event OrganizationDeployed(uint256 indexed initiativeId, address org, address[] founders);

    /// @notice Initializes the factory contract
    function initialize(address _organizationImplementation, address _owner) public initializer {
        __Ownable_init(_owner);
        organizationImplementation = _organizationImplementation;
    }

    /// @notice Create a new initiative
    function createInitiative(string memory name, string memory purpose) external {
        Initiative storage newInit = initiatives.push();
        newInit.name = name;
        newInit.purpose = purpose;
        newInit.creator = msg.sender;
        newInit.partners.push(msg.sender);
        isPartner[initiatives.length - 1][msg.sender] = true;
        emit InitiativeCreated(initiatives.length - 1, name, purpose, msg.sender);
    }

    /// @notice Join an initiative as a partner
    function joinInitiative(uint256 initiativeId) external {
        require(initiativeId < initiatives.length, "Invalid initiative");
        require(!isPartner[initiativeId][msg.sender], "Already a partner");
        initiatives[initiativeId].partners.push(msg.sender);
        isPartner[initiativeId][msg.sender] = true;
        emit PartnerJoined(initiativeId, msg.sender);
    }

    /// @notice Launch an organization from an initiative
    function launchOrganization(uint256 initiativeId, bytes memory initData) external returns (address org) {
        require(initiativeId < initiatives.length, "Invalid initiative");
        Initiative storage init = initiatives[initiativeId];
        require(!init.launched, "Already launched");
        require(isPartner[initiativeId][msg.sender], "Not a partner");
        org = organizationImplementation.clone();
        (bool success, ) = org.call(initData);
        require(success, "Initialization failed");
        init.launched = true;
        emit OrganizationDeployed(initiativeId, org, init.partners);
    }

    /// @notice Get the number of initiatives
    function getInitiativesCount() external view returns (uint256) {
        return initiatives.length;
    }

    /// @notice Get partners for an initiative
    function getPartners(uint256 initiativeId) external view returns (address[] memory) {
        require(initiativeId < initiatives.length, "Invalid initiative");
        return initiatives[initiativeId].partners;
    }
}
