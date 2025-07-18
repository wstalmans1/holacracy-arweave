const fs = require('fs');
const path = require('path');

const abisToCopy = [
  {
    artifact: path.resolve(__dirname, '../artifacts/contracts/HolacracyFactory.sol/HolacracyFactory.json'),
    frontend: path.resolve(__dirname, '../../frontend/src/abis/HolacracyFactory.json'),
  },
  {
    artifact: path.resolve(__dirname, '../artifacts/contracts/Organization.sol/Organization.json'),
    frontend: path.resolve(__dirname, '../../frontend/src/abis/Organization.json'),
  },
];

for (const { artifact, frontend } of abisToCopy) {
  fs.copyFileSync(artifact, frontend);
  console.log(`ABI copied to ${frontend}`);
} 