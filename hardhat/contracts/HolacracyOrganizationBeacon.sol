// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

/**
 * @title HolacracyOrganizationBeacon
 * @notice Beacon contract for Holacracy Organization proxies
 * @dev This contract manages the implementation address for all Holacracy Organization proxy instances
 * @dev Allows for centralized upgrades of all organization contracts
 */
contract HolacracyOrganizationBeacon is UpgradeableBeacon {
    constructor(address impl) UpgradeableBeacon(impl, msg.sender) {}
}