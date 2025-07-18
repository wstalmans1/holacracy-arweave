# Holacracy Arweave Monorepo

- hardhat/ (contracts, config, scripts-hardhat, ignition, etc.)
- frontend/ (React app)
- subgraph/ (The Graph)
- scripts-root/ (monorepo automation)
- test/ (monorepo-level tests)

## 🚀 Unified Deployment & Frontend Sync

This project uses a **single deployment script** to deploy all core contracts and keep the frontend in sync with the latest addresses.

### **How to Deploy Everything**

1. **Configure your Etherscan API key**  
   In your `hardhat.config.js`:
   ```js
   require("@nomiclabs/hardhat-etherscan");
   // ...
   module.exports = {
     // ...
     etherscan: {
       apiKey: process.env.ETHERSCAN_API_KEY, // or your actual key
     },
   };
   ```
   And set your API key in your environment:
   ```sh
   export ETHERSCAN_API_KEY=your_etherscan_key
   ```

2. **Run the unified deployment script**
   ```sh
   npx hardhat run scripts/deploy-holacracy-setup.js --network sepolia
   ```

   This will:
   - Deploy the Organization implementation contract
   - Deploy the Organization UpgradeableBeacon
   - Deploy the HolacracyFactory as a transparent proxy (upgradeable)
   - Fetch and automatically verify the ProxyAdmin contract on Etherscan
   - Write all contract addresses (including ProxyAdmin) to `frontend/src/contractAddresses.json`

3. **Frontend always up to date**
   - The frontend reads `frontend/src/contractAddresses.json` for all contract addresses.
   - No manual copying or updating of addresses is needed.

### **What gets deployed and written to the frontend?**

| Key in contractAddresses.json         | Description                                 |
|---------------------------------------|---------------------------------------------|
| ORGANIZATION_IMPLEMENTATION           | Organization logic contract                 |
| ORGANIZATION_BEACON                   | UpgradeableBeacon for Organization proxies  |
| HOLACRACY_FACTORY_PROXY               | HolacracyFactory proxy address              |
| HOLACRACY_FACTORY_IMPLEMENTATION      | HolacracyFactory logic contract             |
| HOLACRACY_FACTORY_PROXY_ADMIN         | ProxyAdmin (controls upgrades for Factory)  |

### **ProxyAdmin Verification**

- The script will automatically verify the ProxyAdmin contract on Etherscan.
- If already verified, it will log a friendly message.
- If verification fails for another reason, a warning will be shown.

---

**Tip:**  
If you redeploy, the addresses in the frontend will be automatically updated to match the new backend contracts.