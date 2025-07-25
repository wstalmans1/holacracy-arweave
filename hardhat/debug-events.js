const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking OrganizationDeployed events...");
  
  const factoryAddress = "0xaA4aFFC12cFbb976280f44aeE6C24Ee805da88a4";
  
  try {
    const factory = await ethers.getContractAt("contracts/HolacracyFactory.sol:HolacracyFactory", factoryAddress);
    console.log("📋 Factory address:", factoryAddress);
    
    // Get the current block number
    const provider = ethers.provider;
    const currentBlock = await provider.getBlockNumber();
    console.log("📊 Current block:", currentBlock);
    
    // Look for OrganizationDeployed events from the last 500 blocks
    const fromBlock = Math.max(0, currentBlock - 500);
    console.log("🔍 Searching from block:", fromBlock);
    
    const filter = factory.filters.OrganizationDeployed();
    const events = await factory.queryFilter(filter, fromBlock, currentBlock);
    
    console.log(`📋 Found ${events.length} OrganizationDeployed events:`);
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      console.log(`\n🎯 Event ${i + 1}:`);
      console.log("  Block:", event.blockNumber);
      console.log("  Initiative ID:", event.args.initiativeId.toString());
      console.log("  Organization Address:", event.args.org);
      console.log("  Founders:", event.args.founders ? event.args.founders.length : "N/A");
    }
    
    // Also check if there are any events with the new signature (no founders parameter)
    console.log("\n🔍 Checking for events with new signature...");
    const newFilter = {
      address: factoryAddress,
      topics: [
        ethers.id("OrganizationDeployed(uint256,address)")
      ]
    };
    
    const newEvents = await provider.getLogs({
      ...newFilter,
      fromBlock,
      toBlock: currentBlock
    });
    
    console.log(`📋 Found ${newEvents.length} events with new signature:`);
    for (let i = 0; i < newEvents.length; i++) {
      const event = newEvents[i];
      const decoded = factory.interface.parseLog(event);
      console.log(`\n🎯 New Event ${i + 1}:`);
      console.log("  Block:", event.blockNumber);
      console.log("  Initiative ID:", decoded.args.initiativeId.toString());
      console.log("  Organization Address:", decoded.args.org);
    }
    
  } catch (e) {
    console.log("❌ Error:", e.message);
  }
}

main().then(() => process.exit(0)).catch((error) => { 
  console.error(error); 
  process.exit(1); 
}); 