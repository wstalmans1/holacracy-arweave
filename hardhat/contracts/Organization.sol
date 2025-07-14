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
    address[] public founders;
    mapping(address => bool) public isFounder;

    event Initialized(address[] founders);

    /// @notice Initialize the organization with founders
    function initialize(address[] memory _founders) public initializer {
        require(_founders.length > 0, "No founders");
        for (uint256 i = 0; i < _founders.length; i++) {
            founders.push(_founders[i]);
            isFounder[_founders[i]] = true;
        }
        __Ownable_init(_founders[0]);
        emit Initialized(_founders);
    }

    /// @notice Check if an address is a founder
    function checkFounder(address user) external view returns (bool) {
        return isFounder[user];
    }

    /// @notice Get all founders
    function getFounders() external view returns (address[] memory) {
        return founders;
    }
}
