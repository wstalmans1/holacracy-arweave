// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol";

// This contract is just to force Hardhat to compile UpgradeableBeacon
contract LocalUpgradeableBeacon is UpgradeableBeacon {
    constructor(address impl) UpgradeableBeacon(impl, msg.sender) {}
}