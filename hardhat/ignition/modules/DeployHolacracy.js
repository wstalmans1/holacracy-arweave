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

  // Get the deployer address
  const deployer = m.getAccount(0);

  // Deploy the HolacracyFactory as an upgradeable proxy
  // Pass the Organization implementation address and deployer address to the initializer via proxy config
  const factoryProxy = m.contract("HolacracyFactory", [], {
    proxy: {
      kind: "transparent",
      initialize: {
        method: "initialize",
        args: [organizationImpl, deployer],
      },
    },
  });

  return { organizationImpl, factoryProxy };
}); 