# 🚦 Post-Deployment Testing Checklist

## 1. Frontend/Backend Sync
- [ ] Confirm `frontend/src/contractAddresses.json` contains the new addresses.
- [ ] Confirm `frontend/src/abis/` contains the latest ABIs (check file timestamps or contents).
- [ ] No manual edits have been made to these files after deployment.

## 2. Network Consistency
- [ ] The frontend is connected to the same network (e.g., Sepolia) as the deployed contracts.
- [ ] MetaMask or your wallet is set to the correct network.

## 3. Etherscan Verification
- [ ] All contracts (ProxyAdmin, Factory, Beacon, Organization implementation) are verified on Etherscan.
- [ ] You can view source code and interact with contracts on Etherscan.

## 4. Core DApp Functionality
- [ ] **Create a Draft:** You can create a new organization draft from the frontend.
- [ ] **Join as Partner:** You can join an existing draft as a partner (using a different wallet/account if needed).
- [ ] **Sign Constitution:** The “Sign the Constitution” flow works for new partners.
- [ ] **Launch Organization:** You can launch an organization from a draft (after required partners have joined).
- [ ] **Organization List:** Newly launched organizations appear in the frontend’s organization list.
- [ ] **Role Assignment:** (If implemented) You can assign roles to partners during launch.

## 5. UI/UX Checks
- [ ] All success/error messages display as expected.
- [ ] Transaction pending overlays appear and disappear correctly.
- [ ] Tooltips, modals, and info links work as intended.

## 6. Wallet Integration
- [ ] Wallet connect/disconnect works.
- [ ] The correct account is shown in the UI.
- [ ] Actions requiring a wallet (join, launch, etc.) prompt MetaMask as expected.

## 7. Edge Cases
- [ ] Try to join/launch with an account that is not a partner (should fail gracefully).
- [ ] Try to launch with insufficient partners (should be prevented).
- [ ] Try to interact with an already launched organization (should show correct state).

## 8. Console/Network Errors
- [ ] No errors in the browser console during normal use.
- [ ] No failed network requests in the browser’s network tab.

## 9. Optional: Subgraph/Indexing
- [ ] If you use The Graph, confirm the subgraph is indexing the new contracts and the frontend queries return expected data. 