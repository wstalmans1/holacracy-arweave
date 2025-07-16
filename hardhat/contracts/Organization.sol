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

    event Initialized(address[] founders);
    event ConstitutionSigned(address indexed partner);

    function initialize(address[] memory _founders) public initializer {
        require(_founders.length > 0, "No founders");
        for (uint256 i = 0; i < _founders.length; i++) {
            partners.push(_founders[i]);
            hasSignedConstitution[_founders[i]] = true;
        }
        __Ownable_init(_founders[0]);
        emit Initialized(_founders);
    }

    // Anyone can join by signing the constitution
    function signConstitution() external {
        require(!hasSignedConstitution[msg.sender], "Already signed");
        partners.push(msg.sender);
        hasSignedConstitution[msg.sender] = true;
        emit ConstitutionSigned(msg.sender);
    }

    function getPartners() external view returns (address[] memory) {
        return partners;
    }
}
