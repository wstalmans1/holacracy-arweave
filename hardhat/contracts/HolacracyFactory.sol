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
    struct Initiative {
        string name;
        string purpose;
        address creator;
        address[] partners;
        bool launched;
        address orgAddress;
    }

    Initiative[] public initiatives;
    mapping(uint256 => mapping(address => bool)) public isPartner; // initiativeId => signer => signed
    address public organizationBeacon;
    string public constant constitutionURI = "https://www.holacracy.org/constitution/5-0/";

    event InitiativeCreated(uint256 indexed id, string name, string purpose, address creator);
    event ConstitutionSigned(uint256 indexed initiativeId, address partner);
    event OrganizationDeployed(uint256 indexed initiativeId, address org, address[] founders);

    function initialize(address _organizationBeacon, address _owner) public initializer {
        __Ownable_init(_owner);
        organizationBeacon = _organizationBeacon;
    }

    function createInitiative(string memory name, string memory purpose) external {
        Initiative storage newInit = initiatives.push();
        newInit.name = name;
        newInit.purpose = purpose;
        newInit.creator = msg.sender;
        emit InitiativeCreated(initiatives.length - 1, name, purpose, msg.sender);
    }

    // Join and sign the constitution for an initiative
    function signConstitution(uint256 initiativeId) external {
        require(initiativeId < initiatives.length, "Invalid initiative");
        Initiative storage ini = initiatives[initiativeId];
        require(!ini.launched, "Already launched");
        require(!isPartner[initiativeId][msg.sender], "Already signed");
        ini.partners.push(msg.sender);
        isPartner[initiativeId][msg.sender] = true;
        emit ConstitutionSigned(initiativeId, msg.sender);
    }

    // Deploy a new Organization as a BeaconProxy
    function launchOrganization(uint256 initiativeId, bytes memory initData) external returns (address org) {
        require(initiativeId < initiatives.length, "Invalid initiative");
        Initiative storage init = initiatives[initiativeId];
        require(!init.launched, "Already launched");
        require(isPartner[initiativeId][msg.sender], "You must sign the constitution to launch");
        require(init.partners.length > 0, "No partners signed");
        
        // Encode the initialization data with name and purpose
        bytes memory initDataWithNameAndPurpose = abi.encodeWithSelector(
            Organization.initialize.selector,
            init.partners,
            init.name,
            init.purpose
        );
        
        org = address(new BeaconProxy(organizationBeacon, initDataWithNameAndPurpose));
        init.launched = true;
        init.orgAddress = org;
        emit OrganizationDeployed(initiativeId, org, init.partners);
    }

    function getInitiativesCount() external view returns (uint256) {
        return initiatives.length;
    }

    function getPartners(uint256 initiativeId) external view returns (address[] memory) {
        require(initiativeId < initiatives.length, "Invalid initiative");
        return initiatives[initiativeId].partners;
    }

    function getInitiative(uint256 i) public view returns (
        string memory name,
        string memory purpose,
        address creator,
        address[] memory partners,
        bool launched,
        address orgAddress
    ) {
        Initiative storage ini = initiatives[i];
        return (ini.name, ini.purpose, ini.creator, ini.partners, ini.launched, ini.orgAddress);
    }

    /// @notice Update the organization beacon address (onlyOwner)
    function setOrganizationBeacon(address newBeacon) external onlyOwner {
        require(newBeacon != address(0), "Invalid address");
        organizationBeacon = newBeacon;
    }

    function version() public pure returns (string memory) {
        return "HolacracyFactory (Beacon) v1";
    }

    // 20 July 2025 - Upgrade test
    string public upgradeTestMessage;

    function setUpgradeTestMessage(string calldata message) external {
        upgradeTestMessage = message;
    }
}
