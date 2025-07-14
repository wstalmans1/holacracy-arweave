// SPDX-License-Identifier: CC-BY-SA-4.0
/**
 * Ignition deployment module for HolacracyFactory and Organization contracts
 *
 * Steps:
 * 1. Deploy Organization implementation
 * 2. Deploy HolacracyFactory as an upgradeable proxy, passing Organization implementation address
 */

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("DeployHolacracy", (m) => {
  // Deploy the Organization implementation contract
  const organizationImpl = m.contract("Organization");

  // Deploy the HolacracyFactory as an upgradeable proxy
  // Pass the Organization implementation address to the initializer
  const factoryProxy = m.contract("HolacracyFactory", [organizationImpl], {
    proxy: {
      kind: "transparent",
      initialize: "initialize",
    },
  });

  return { organizationImpl, factoryProxy };
}); 