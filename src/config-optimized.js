// Configuration for Optimized Holacracy Deployment
// This file contains the contract addresses and ABIs for the optimized system

import factoryAbi from './abis/HolacracyFactory-optimized.json';
import organizationAbi from './abis/Organization-optimized.json';
import deploymentInfo from './contractAddresses-optimized.json';

export const OPTIMIZED_CONFIG = {
  // Contract addresses
  HOLACRACY_FACTORY: deploymentInfo.contracts.holacracyFactoryProxy,
  ORGANIZATION_BEACON: deploymentInfo.contracts.organizationBeacon,
  ORGANIZATION_IMPLEMENTATION: deploymentInfo.contracts.organizationImplementation,
  
  // ABIs
  FACTORY_ABI: factoryAbi,
  ORGANIZATION_ABI: organizationAbi,
  
  // Network info
  NETWORK: deploymentInfo.network,
  DEPLOYMENT_TIME: deploymentInfo.deploymentTime,
  DEPLOYER: deploymentInfo.deployer,
  
  // Features enabled in optimized version
  FEATURES: {
    OPTIMIZED_STORAGE: true,        // Single constitutionSigners array
    REMOVED_REDUNDANT_GETTER: true, // No getConstitutionSignature function
    SIMPLIFIED_FACTORY: true,       // Direct create and launch
    LEGAL_SIGNATURES: true,         // Enhanced constitution signing
  }
};

// Helper function to get contract instance
export const getOptimizedFactory = (signer) => {
  const { ethers } = require('ethers');
  return new ethers.Contract(
    OPTIMIZED_CONFIG.HOLACRACY_FACTORY,
    OPTIMIZED_CONFIG.FACTORY_ABI,
    signer
  );
};

// Helper function to get organization contract instance
export const getOptimizedOrganization = (address, signer) => {
  const { ethers } = require('ethers');
  return new ethers.Contract(
    address,
    OPTIMIZED_CONFIG.ORGANIZATION_ABI,
    signer
  );
};

// Helper function to check if optimized deployment is available
export const isOptimizedDeploymentAvailable = () => {
  try {
    return !!deploymentInfo.contracts.holacracyFactory;
  } catch (error) {
    console.warn('Optimized deployment not available:', error);
    return false;
  }
};

export default OPTIMIZED_CONFIG; 