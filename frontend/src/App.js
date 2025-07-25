import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import factoryArtifact from "./abis/HolacracyFactory.json";
import orgArtifact from "./abis/Organization.json";
import TransactionPendingOverlay from './TransactionPendingOverlay';
import LaunchOrganizationModal from './LaunchOrganizationModal';
import addresses from './contractAddresses.json';
import ReactDOM from 'react-dom';

// Helper function to extract ABI array from different import formats
function getAbiArray(artifact) {
  if (Array.isArray(artifact)) return artifact;
  if (artifact.abi) return artifact.abi;
  if (artifact.default) return getAbiArray(artifact.default);
  throw new Error('Could not extract ABI from artifact');
}

const SEPOLIA_CHAIN_ID = "11155111"; // Sepolia chain ID as string

const styles = {
  container: {
    fontFamily: 'Inter, Arial, sans-serif',
    background: '#f7fafd',
    minHeight: '100vh',
    padding: 0,
    margin: 0,
  },
  header: {
    background: '#232946',
    color: '#fff',
    padding: '32px 0 18px 0',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 32,
    letterSpacing: 1,
    marginBottom: 0,
  },
  note: {
    color: '#555',
    fontSize: 16,
    maxWidth: 700,
    margin: '18px auto 0 auto',
    textAlign: 'left', // Aligned left for better readability
    lineHeight: 1.6, // Improved line spacing
    background: '#e3eaf2',
    borderRadius: 8,
    padding: '16px 24px',
  },
  section: {
    maxWidth: 800,
    margin: '32px auto',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 12px rgba(44,62,80,0.07)',
    padding: 32,
  },
  label: {
    fontWeight: 600,
    color: '#232946',
    marginBottom: 6,
    display: 'block',
    fontSize: 15,
  },
  input: {
    width: '100%',
    padding: 10,
    borderRadius: 6,
    border: '1px solid #cdd0d4',
    marginBottom: 16,
    fontSize: 15,
    fontFamily: 'Inter, Arial, sans-serif',
  },
  button: {
    background: '#4ecdc4',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 28px',
    fontWeight: 600,
    fontSize: 16,
    cursor: 'pointer',
    marginTop: 8,
  },
  initiativeCard: {
    background: '#f3f7fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    boxShadow: '0 1px 4px rgba(44,62,80,0.04)',
  },
  orgTable: {
    width: '100%',
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(44,62,80,0.07)',
    marginBottom: 32,
    borderCollapse: 'collapse',
  },
  orgTh: {
    background: '#e3eaf2',
    padding: '8px 12px',
    textAlign: 'left',
    fontWeight: 600,
  },
  orgTd: {
    padding: '8px 12px',
    wordBreak: 'break-all',
    borderBottom: '1px solid #eee',
  },
  footer: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    margin: '48px 0 12px 0',
  },
  orgInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  orgLabel: {
    fontSize: 13,
    color: '#232946',
    fontWeight: 600,
  },
  orgValue: {
    fontSize: 15,
    color: '#4a5568',
    fontWeight: 500,
  },
  orgCompare: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
};

// Shared infobox overlay style for Holacracy Organization overlays
const holacracyInfoboxOverlayStyle = {
  display: 'block',
  position: 'absolute',
  top: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  marginTop: 2,
  background: '#fffbe6',
  color: '#232946',
  borderRadius: 10,
  boxShadow: '0 4px 24px rgba(44,62,80,0.13)',
  padding: '18px 22px',
  fontSize: 15,
  lineHeight: 1.6,
  zIndex: 100,
  minWidth: 320,
  maxWidth: 400,
  textAlign: 'left',
  fontWeight: 400,
  fontFamily: 'Inter, Arial, sans-serif',
  // pointerEvents intentionally omitted to allow interaction
};

// Portal component for overlays with mouse enter/leave support
function OverlayPortal({ anchorRef, visible, children, style, onMouseEnter, onMouseLeave }) {
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (visible && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      // Only use element position, not mouse coordinates, to keep infobox stable
      const finalCoords = {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      };
      setCoords(finalCoords);
    }
  }, [visible, anchorRef]);



  if (!visible || !coords) return null;
  
  // Check if the infobox would go off screen at the top
  const infoboxHeight = 100; // Approximate height of infobox
  const shouldShowBelow = coords.top < infoboxHeight;
  
  return ReactDOM.createPortal(
    <div
      style={{
        ...style,
        position: 'absolute',
        top: coords.top,
        left: coords.left,
        transform: shouldShowBelow ? 'translateY(20px)' : 'translateY(-100%)',
        zIndex: 9999,
        pointerEvents: 'auto', // Ensure clicks work
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      tabIndex={0}
      onFocus={onMouseEnter}
      onBlur={onMouseLeave}
    >{children}</div>,
    document.body
  );
}

// Organization Details Overlay Component
function OrganizationDetailsOverlay({ org, open, onClose, account, loadOrgs, OrganizationActionsComponent }) {
  if (!open || !org) return null;
  
  return ReactDOM.createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '32px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#888',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px'
          }}
          title="Close"
        >
          ×
        </button>

        {/* Organization Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '24px', 
            fontWeight: '700', 
            color: '#232946' 
          }}>
            {org.onChainDetails ? org.onChainDetails.name : org.name}
          </h2>
          <p style={{ 
            margin: '0', 
            fontSize: '16px', 
            color: '#4a5568', 
            lineHeight: '1.5' 
          }}>
            {org.onChainDetails ? org.onChainDetails.purpose : org.purpose}
          </p>
        </div>

        {/* Organization Actions */}
        <div style={{ marginBottom: '24px' }}>
          <OrganizationActionsComponent 
            org={org}
            onUpdate={loadOrgs}
          />
        </div>

        {/* Partners Section */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#232946' 
          }}>
            Partners ({org.partners.length})
          </h3>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '8px',
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '12px',
            background: '#f7fafd',
            borderRadius: '8px',
            border: '1px solid #e3eaf2'
          }}>
            {org.partners.length === 0 ? (
              <div style={{ color: '#888', fontStyle: 'italic' }}>No partners yet</div>
            ) : (
              org.partners.map(addr => (
                <div key={addr} style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '13px', 
                  color: '#232946', 
                  background: addr.toLowerCase() === account?.toLowerCase() ? '#4ecdc4' : '#e3eaf2', 
                  borderRadius: '6px', 
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>{addr}</span>
                  {addr.toLowerCase() === account?.toLowerCase() && (
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#fff',
                      background: '#232946',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      You
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Organization Details */}
        <div style={{ 
          padding: '16px',
          background: '#f7fafd',
          borderRadius: '8px',
          border: '1px solid #e3eaf2'
        }}>
          <h3 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '16px', 
            fontWeight: '600', 
            color: '#232946' 
          }}>
            Organization Details
          </h3>
          <div style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>Creator:</strong> {org.creator}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Contract Address:</strong> 
              <a 
                href={`https://sepolia.etherscan.io/address/${org.address}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ 
                  color: '#4ecdc4', 
                  textDecoration: 'underline',
                  marginLeft: '4px'
                }}
              >
                {org.address}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function App() {
  const [account, setAccount] = useState();
  const [factory, setFactory] = useState();
  const [readFactory, setReadFactory] = useState();
  const [orgs, setOrgs] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", purpose: "" });
  const [txPending, setTxPending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [launchModal, setLaunchModal] = useState({ open: false, initiative: null, partners: [] });
  const [dappTopInfoVisible, setDappTopInfoVisible] = useState(false);
  const dappTopInfoTimer = React.useRef();
  const [walletTooltipVisible, setWalletTooltipVisible] = useState(false);
  const walletTooltipTimer = React.useRef();
  const [ensName, setEnsName] = useState(null);
  const [balance, setBalance] = useState(null);
  const [networkName, setNetworkName] = useState(null);
  const [holacracyTopInfoVisible, setHolacracyTopInfoVisible] = useState(false);
  const holacracyTopInfoTimer = React.useRef();
  // Add refs for the anchors
  const holacracyTopInfoAnchor = React.useRef();
  const dappTopInfoAnchor = React.useRef();
  const [participateInfoExpanded, setParticipateInfoExpanded] = useState(false);
  const [participateSectionExpanded, setParticipateSectionExpanded] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgDetailsOverlayOpen, setOrgDetailsOverlayOpen] = useState(false);
  const [expanded, setExpanded] = useState({}); // For create organization card

  useEffect(() => {
    async function fetchEnsAndBalanceAndNetwork() {
      if (account && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const ens = await provider.lookupAddress(account);
          setEnsName(ens);
          const bal = await provider.getBalance(account);
          setBalance(ethers.formatEther(bal));
          const net = await provider.getNetwork();
          setNetworkName(net && net.name ? net.name.charAt(0).toUpperCase() + net.name.slice(1) : net.chainId);
        } catch (e) {
          setEnsName(null);
          setBalance(null);
          setNetworkName(null);
        }
      } else {
        setEnsName(null);
        setBalance(null);
        setNetworkName(null);
      }
    }
    fetchEnsAndBalanceAndNetwork();
  }, [account]);

  const showWalletTooltip = () => {
    if (walletTooltipTimer.current) {
      clearTimeout(walletTooltipTimer.current);
      walletTooltipTimer.current = null;
    }
    setWalletTooltipVisible(true);
  };

  const hideWalletTooltip = () => {
    walletTooltipTimer.current = setTimeout(() => {
      setWalletTooltipVisible(false);
    }, 180);
  };

  const showHolacracyTopInfo = () => {
    if (holacracyTopInfoTimer.current) {
      clearTimeout(holacracyTopInfoTimer.current);
      holacracyTopInfoTimer.current = null;
    }
    setHolacracyTopInfoVisible(true);
  };

  const hideHolacracyTopInfo = () => {
    holacracyTopInfoTimer.current = setTimeout(() => {
      setHolacracyTopInfoVisible(false);
    }, 180);
  };

  const showDappTopInfo = () => {
    if (dappTopInfoTimer.current) {
      clearTimeout(dappTopInfoTimer.current);
      dappTopInfoTimer.current = null;
    }
    setDappTopInfoVisible(true);
  };

  const hideDappTopInfo = () => {
    dappTopInfoTimer.current = setTimeout(() => {
      setDappTopInfoVisible(false);
    }, 180);
  };

  // Set up a read-only provider and contract for reading initiatives
  useEffect(() => {
    // Use a robust Sepolia RPC endpoint (Infura/Alchemy). Set REACT_APP_SEPOLIA_RPC_URL in your .env file.
    const rpcUrl = process.env.REACT_APP_SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
    const readProvider = new ethers.JsonRpcProvider(rpcUrl);
    const readFac = new ethers.Contract(addresses.HOLACRACY_FACTORY_PROXY, getAbiArray(factoryArtifact), readProvider);
    setReadFactory(readFac);
  }, []);

  // Listen for MetaMask account changes and disconnection
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // Disconnected
        setAccount(undefined);
        setFactory(undefined);
      } else {
        setAccount(accounts[0]);
      }
    };
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    // Optionally handle chainChanged as well
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  // Connect wallet handler
  const connectWallet = async () => {
    setError("");
    setConnecting(true);
    try {
      if (window.ethereum) {
        const prov = new ethers.BrowserProvider(window.ethereum);
        const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accs[0]);
        const net = await prov.getNetwork();
        if (net.chainId.toString() !== SEPOLIA_CHAIN_ID) {
          setError("Please switch to the Sepolia network in MetaMask.");
          setConnecting(false);
          return;
        }
        const sign = await prov.getSigner();
        const fac = new ethers.Contract(addresses.HOLACRACY_FACTORY_PROXY, getAbiArray(factoryArtifact), sign);
        setFactory(fac);
      } else {
        setError("MetaMask not detected. Please install MetaMask.");
      }
    } catch (e) {
      setError("Failed to connect wallet: " + (e?.message || e));
    }
    setConnecting(false);
  };



  // Handlers
  const handleInput = e => setForm({ ...form, [e.target.name]: e.target.value });

  const createInitiative = async e => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setTxPending(true);
    try {
      const tx = await factory.createAndLaunchOrganization(form.name, form.purpose);
      const receipt = await tx.wait();
      
      // Get the organization address from the event
      let orgAddress = '';
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed && parsed.name === 'OrganizationDeployed') {
            orgAddress = parsed.args.org;
            break;
          }
        } catch {}
      }
      
      setSuccess(`Organization launched! Address: ${orgAddress}`);
      setForm({ name: "", purpose: "" });
      setReloadKey(k => k + 1); // trigger reload
      setTimeout(() => setSuccess("") , 10000); // Clear after 10 seconds
    } catch (e) {
      setError("Failed to launch organization: " + (e?.info?.error?.message || e.message));
    }
    setTxPending(false);
  };



  // Load organizations (launched initiatives)
  const loadOrgs = useCallback(async () => {
    const contract = factory || readFactory;
    if (!contract) return;
    setError("");
    try {
      const count = await contract.getOrganizationListCount();
      const arr = [];
      for (let i = 0; i < count; i++) {
                const [name, purpose, creator, orgAddress] = await contract.getOrganizationMetadata(i);
        // Load on-chain organization details and current partners
        let onChainDetails = null;
        let currentPartners = [];
        if (orgAddress && orgAddress !== ethers.ZeroAddress) {
          try {
            const runner = contract.runner;
            const orgContract = new ethers.Contract(orgAddress, getAbiArray(orgArtifact), runner);
            const [orgName, orgPurpose, orgPartners] = await Promise.all([
              orgContract.name(),
              orgContract.purpose(),
              orgContract.getPartners()
            ]);
            onChainDetails = { name: orgName, purpose: orgPurpose };
            currentPartners = orgPartners; // use current partners from organization contract
          } catch (e) {
            // If we can't load from organization contract, skip this organization
            console.warn(`Could not load organization data for ${orgAddress}:`, e.message);
            continue; // Skip this organization entirely
          }
        } else {
          // If no organization address, skip this organization
          console.warn(`No organization address found for metadata ${i}`);
          continue; // Skip this organization entirely
        }
        
        arr.push({
          id: i,
          name,
          purpose,
          partners: currentPartners, // ONLY from organization contract
          creator,
          address: orgAddress,
          onChainDetails
        });
      }
      setOrgs(arr);
    } catch (e) {
      if (e.message && e.message.toLowerCase().includes('failed to fetch')) {
        setError("Failed to load organizations: check your connection");
      } else {
        setError("Failed to load organizations: " + e.message);
      }
    }
  }, [factory, readFactory]);

  useEffect(() => {
    loadOrgs();
  }, [factory, readFactory, txPending, loadOrgs, reloadKey]);

  // Helper to check if any transaction is pending
  const anyTxPending = txPending;



  // OrganizationActions component - dropdown menu for all organization interactions
  function OrganizationActions({ org, onUpdate }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(null);
    const [signingPending, setSigningPending] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
      function handleClickOutside(event) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      }
      
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    const isPartner = account && org.partners.some(addr => addr.toLowerCase() === account.toLowerCase());

    return (
      <div style={{ position: 'relative' }} ref={dropdownRef}>
                              {/* Main Actions Button */}
                      <button
                        onClick={() => setIsOpen(!isOpen)}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          background: '#4ecdc4',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontSize: 12, transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', marginRight: 8, color: '#fff' }}>
                          ▶
                        </span>
                        <span>Organization Actions</span>
                      </button>
                      
                      {/* Partner Status Alert */}
                      {!isPartner && (
                        <div style={{ 
                          marginTop: 8, 
                          padding: '12px 16px',
                          background: '#fee2e2',
                          border: '1px solid #fecaca',
                          borderRadius: 6,
                          color: '#dc2626',
                          fontSize: 13,
                          lineHeight: 1.5
                        }}>
                          <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 15 }}>
                            ⚠ You must be a partner to perform organization actions
                          </div>
                          <div style={{ color: '#232946', fontSize: 14, marginBottom: 8, lineHeight: 1.5 }}>
                            To join this organization as a partner, you declare that you understand that <span style={{ color: '#1a5f7a', fontWeight: 600 }}>In a Holacracy, all authority derives from the Constitution, not from individuals</span>. You confirm your understanding by signing the <a href="https://www.holacracy.org/constitution/5-0/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>Holacracy Constitution</a>.
                          </div>
                          <button 
                            style={{
                              background: '#4ecdc4',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              padding: '10px 16px',
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: signingPending ? 'not-allowed' : 'pointer',
                              width: '100%',
                              opacity: signingPending ? 0.7 : 1
                            }}
                            disabled={signingPending}
                            onClick={async (e) => {
                              e.preventDefault();
                              if (signingPending) return;
                              
                              // Check if wallet is connected
                              if (!account) {
                                alert('Please connect your wallet first before signing the constitution.');
                                return;
                              }
                              
                              setSigningPending(true);
                              try {
                                // Get the organization contract with proper signer
                                const provider = new ethers.BrowserProvider(window.ethereum);
                                const signer = await provider.getSigner();
                                const orgContract = new ethers.Contract(org.address, getAbiArray(orgArtifact), signer);
                                
                                // Call the signConstitution function
                                const tx = await orgContract.signConstitution();
                                await tx.wait();
                                
                                // Refresh the organization data
                                onUpdate();
                                
                                // Close the dropdown after successful signing
                                setIsOpen(false);
                                setActiveTab(null);
                              } catch (error) {
                                console.error('Error signing constitution:', error);
                                if (error?.reason) {
                                  alert(`Failed to join: ${error.reason}`);
                                } else {
                                  alert('Failed to join as partner. Please try again.');
                                }
                              } finally {
                                setSigningPending(false);
                              }
                            }}
                          >
                            {signingPending ? 'Signing Constitution...' : 'Sign the Constitution to Join as a Partner'}
                          </button>
                        </div>
                      )}

        {/* Dropdown Menu */}
        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #e3eaf2',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000,
            marginTop: 4
          }}>
            {/* Action Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e3eaf2' }}>
                             <button
                 onClick={() => setActiveTab('details')}
                 style={{
                   flex: 1,
                   padding: '12px 16px',
                   background: activeTab === 'details' ? '#4ecdc4' : 'transparent',
                   color: activeTab === 'details' ? '#fff' : '#232946',
                   border: 'none',
                   fontSize: 14,
                   fontWeight: 600,
                   cursor: 'pointer'
                 }}
               >
                 Edit
               </button>
              <button
                onClick={() => setActiveTab('roles')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: activeTab === 'roles' ? '#4ecdc4' : 'transparent',
                  color: activeTab === 'roles' ? '#fff' : '#232946',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Roles
              </button>
            </div>

            {/* Tab Content */}
            <div style={{ padding: 16 }}>
              {activeTab === 'details' && org.onChainDetails && (
                <UpdateOrganizationForm 
                  orgAddress={org.address} 
                  currentName={org.onChainDetails.name}
                  currentPurpose={org.onChainDetails.purpose}
                  onUpdate={onUpdate}
                  account={account}
                />
              )}
              {activeTab === 'roles' && (
                <div style={{ textAlign: 'center', color: '#888', padding: '20px 0' }}>
                  <div style={{ fontSize: 16, marginBottom: 8 }}>🎭</div>
                  <div style={{ fontSize: 15, marginBottom: 8 }}>Role management coming soon...</div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>
                    Create, assign, and manage organization roles
                  </div>
                </div>
              )}
              {!activeTab && (
                <div style={{ textAlign: 'center', color: '#888', padding: '20px 0', fontSize: 15 }}>
                  Select an action above to get started
                </div>
              )}
            </div>
                                  </div>
                      )}
                      
                      {/* Transaction Pending Overlay */}
                      <TransactionPendingOverlay 
                        open={signingPending} 
                        message="Signing Constitution..." 
                      />
                    </div>
                  );
                }

  // UpdateOrganizationForm component defined inside App to access loadOrgs
  function UpdateOrganizationForm({ orgAddress, currentName, currentPurpose, onUpdate, account }) {
    const [newName, setNewName] = useState(currentName);
    const [newPurpose, setNewPurpose] = useState(currentPurpose);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleUpdate = async (e) => {
      e.preventDefault();
      setPending(true);
      setError("");
      setSuccess("");

      try {
        // Check if wallet is connected
        if (!account) {
          setError("Please connect your wallet first before updating organization details.");
          setPending(false);
          return;
        }

        // Get the organization contract with proper signer
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const orgContract = new ethers.Contract(orgAddress, getAbiArray(orgArtifact), signer);
        
        // Check if the user is a partner in this organization
        const userAddress = await signer.getAddress();
        const isPartner = await orgContract.hasSignedConstitution(userAddress);
        
        if (!isPartner) {
          setError("You must be a partner in this organization to update its details. Please sign the constitution first.");
          setPending(false);
          return;
        }
        
        // Validate inputs
        if (newName.trim() === "") {
          setError("Organization name cannot be empty");
          setPending(false);
          return;
        }
        
        if (newPurpose.trim() === "") {
          setError("Organization purpose cannot be empty");
          setPending(false);
          return;
        }

        // Check if both name and purpose are being changed
        const nameChanged = newName !== currentName;
        const purposeChanged = newPurpose !== currentPurpose;
        
        if (nameChanged && purposeChanged) {
          // Use combined function for both changes
          console.log("Updating both name and purpose");
          const combinedTx = await orgContract.updateNameAndPurpose(newName, newPurpose);
          console.log("Combined update transaction:", combinedTx.hash);
          await combinedTx.wait();
          console.log("Combined update confirmed");
        } else if (nameChanged) {
          // Update only name
          console.log("Updating name from", currentName, "to", newName);
          const nameTx = await orgContract.updateName(newName);
          console.log("Name update transaction:", nameTx.hash);
          await nameTx.wait();
          console.log("Name update confirmed");
        } else if (purposeChanged) {
          // Update only purpose
          console.log("Updating purpose from", currentPurpose, "to", newPurpose);
          const purposeTx = await orgContract.updatePurpose(newPurpose);
          console.log("Purpose update transaction:", purposeTx.hash);
          await purposeTx.wait();
          console.log("Purpose update confirmed");
        }

        setSuccess("Organization details updated successfully!");
        onUpdate(); // Refresh the parent component
      } catch (e) {
        console.error("Update organization error:", e);
        if (e?.info?.error?.message) {
          setError(e.info.error.message);
        } else if (e?.reason) {
          setError(e.reason);
        } else if (e?.message) {
          setError(e.message);
        } else {
          setError("Unknown error occurred");
        }
      }
      setPending(false);
    };

    const hasChanges = newName !== currentName || newPurpose !== currentPurpose;

    return (
      <>
        <TransactionPendingOverlay open={pending} message="Updating organization details..." />
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          <div style={{ width: '100%' }}>
            <label style={styles.label}>Name:</label>
            <input 
              style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }} 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              placeholder="Organization name"
              disabled={pending}
            />
          </div>
          <div style={{ width: '100%' }}>
            <label style={styles.label}>Purpose:</label>
            <textarea 
              style={{ ...styles.input, width: '100%', boxSizing: 'border-box', minHeight: 60, resize: 'vertical' }} 
              value={newPurpose} 
              onChange={e => setNewPurpose(e.target.value)} 
              placeholder="Organization purpose"
              disabled={pending}
            />
          </div>
          <button 
            style={{ ...styles.button, opacity: hasChanges ? 1 : 0.6 }} 
            type="submit" 
            disabled={pending || !hasChanges}
          >
            Update Details
          </button>
          {error && <div style={{ color: '#e63946', fontSize: 14 }}>{error}</div>}
          {success && <div style={{ color: '#4ecdc4', fontSize: 14 }}>{success}</div>}
        </form>
      </>
    );
  }

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.header,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        paddingRight: 0,
      }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 0, marginBottom: 0, position: 'relative' }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0, color: '#fff', letterSpacing: '-1px', display: 'inline-block', position: 'relative' }}>
              <span>
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <span
                    ref={holacracyTopInfoAnchor}
                    style={{ color: '#4ecdc4', cursor: 'pointer', transition: 'color 0.2s', borderRadius: 4, padding: '0 2px' }}
                    onMouseEnter={showHolacracyTopInfo}
                    onMouseLeave={hideHolacracyTopInfo}
                    onFocus={showHolacracyTopInfo}
                    onBlur={hideHolacracyTopInfo}
                    tabIndex={0}
                    aria-label="Info about Holacracy organizations"
                  >
                    Holacracy Organization
                  </span>
                  <OverlayPortal
                    anchorRef={holacracyTopInfoAnchor}
                    visible={holacracyTopInfoVisible}
                    style={holacracyInfoboxOverlayStyle}
                    onMouseEnter={showHolacracyTopInfo}
                    onMouseLeave={hideHolacracyTopInfo}
                  >
                    A <a href="https://www.holacracy.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline', fontWeight: 500 }}>Holacracy Organization</a> is a self-organizing structure where authority and decision-making are distributed through clear roles, not traditional management hierarchies. All partners operate under the <a href="https://www.holacracy.org/constitution/5-0/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline', fontWeight: 500 }}>Holacracy Constitution</a>, which defines the rules and processes for governance and collaboration.
                  </OverlayPortal>
                </span>
                {' '}Creation & Participation
                <span style={{ position: 'relative', display: 'inline-block', marginLeft: 4 }}>
                  <span
                    ref={dappTopInfoAnchor}
                    style={{ color: '#4ecdc4', cursor: 'pointer', transition: 'color 0.2s', borderRadius: 4, padding: '0 2px' }}
                    onMouseEnter={showDappTopInfo}
                    onMouseLeave={hideDappTopInfo}
                    onFocus={showDappTopInfo}
                    onBlur={hideDappTopInfo}
                    tabIndex={0}
                    aria-label="Info about DApp"
                  >
                    DApp
                  </span>
                  <OverlayPortal
                    anchorRef={dappTopInfoAnchor}
                    visible={dappTopInfoVisible}
                    style={holacracyInfoboxOverlayStyle}
                    onMouseEnter={showDappTopInfo}
                    onMouseLeave={hideDappTopInfo}
                  >
                    A DApp (Decentralized Application) is an application that runs on a blockchain or decentralized network, rather than being hosted on a single centralized server. DApps are open, transparent, and censorship-resistant by design.
                  </OverlayPortal>
                </span>
              </span>
            </h1>
          </div>
          <div style={{ fontWeight: 400, fontSize: 17, color: '#b8c1ec', marginTop: 10, textAlign: 'center' }}>
            In a Holacracy, all authority derives from the <a href="https://www.holacracy.org/constitution/5-0/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>Constitution</a>, not from individuals.
          </div>
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
            {account ? (
              <span
                style={{ color: '#4ecdc4', background: '#232946', border: '1px solid #4ecdc4', borderRadius: 8, padding: '6px 14px', fontWeight: 600, fontSize: 15, fontFamily: 'monospace', position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
                onMouseEnter={showWalletTooltip}
                onMouseLeave={hideWalletTooltip}
                tabIndex={0}
                aria-label="Wallet address"
              >
                Connected wallet:
                {ensName ? (
                  <span style={{ color: '#fff', fontWeight: 600, marginLeft: 6 }}>{ensName}</span>
                ) : (
                  <span style={{ color: '#fff', fontWeight: 600, marginLeft: 6 }}>{account.slice(0, 6)}...{account.slice(-4)}</span>
                )}
                {balance !== null && (
                  <span style={{ color: '#b8c1ec', fontWeight: 400, marginLeft: 8, fontSize: 14 }}>
                    {parseFloat(balance).toFixed(4)} ETH
                  </span>
                )}
                {networkName && (
                  <span style={{ color: '#b8c1ec', fontWeight: 400, marginLeft: 8, fontSize: 14 }}>
                    {networkName}
                  </span>
                )}
                {walletTooltipVisible && (
                  <span
                    style={{
                      display: 'block',
                      position: 'absolute',
                      top: '110%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#fffbe6',
                      color: '#232946',
                      borderRadius: 10,
                      boxShadow: '0 4px 24px rgba(44,62,80,0.13)',
                      padding: '12px 18px',
                      fontSize: 15,
                      lineHeight: 1.5,
                      zIndex: 200,
                      minWidth: 220,
                      maxWidth: 320,
                      textAlign: 'center',
                      fontWeight: 400,
                      pointerEvents: 'none',
                    }}
                  >
                    To disconnect, use MetaMask.
                  </span>
                )}
              </span>
            ) : (
              <button
                style={{ background: '#4ecdc4', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                onClick={connectWallet}
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
      {/* About this DApp section removed as requested */}
      
      <LaunchOrganizationModal
        open={launchModal.open}
        onClose={() => setLaunchModal({ open: false, initiative: null, partners: [] })}
        initiative={launchModal.initiative}
        partners={launchModal.partners}
        onDeployed={() => {
          setLaunchModal({ open: false, initiative: null, partners: [] });
          // Immediate refresh
          setReloadKey(k => k + 1);
          // Delayed refresh to ensure blockchain state is fully updated
          setTimeout(() => {
            setReloadKey(k => k + 1);
          }, 3000);
        }}
      />
      <div style={styles.section}>
        {/* Create Organization Card - Always Visible */}
        <div style={styles.initiativeCard}>
          <div
            style={{ display: 'flex', alignItems: 'center', marginBottom: expanded['create-org'] ? 2 : 0, cursor: 'pointer', padding: '1px 0' }}
            onClick={() => setExpanded(prev => ({ ...prev, 'create-org': !prev['create-org'] }))}
          >
            <span style={{ fontSize: 12, transition: 'transform 0.2s', transform: expanded['create-org'] ? 'rotate(90deg)' : 'rotate(0deg)', marginRight: 6, color: '#4ecdc4' }}>
              ▶
            </span>
            <div style={{ fontWeight: 600, fontSize: 16, color: '#232946' }}>
              Create New Organization
            </div>
          </div>
          {expanded['create-org'] && (
            <>
              {!account && (
                <button style={styles.button} onClick={connectWallet} disabled={connecting}>
                  {connecting ? 'Connecting...' : 'Connect wallet to create organization'}
                </button>
              )}
              {account && (
                <form onSubmit={createInitiative}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    columnGap: 28,
                    rowGap: 8,
                    paddingLeft: 20,
                  }}>
                  <div style={{ flex: 1, minWidth: 220, maxWidth: '45%', marginRight: 8 }}>
                    <label style={{ ...styles.label, marginTop: 8 }}>
                      Organization Name
                    </label>
                    <input style={styles.input} name="name" value={form.name} onChange={handleInput} required disabled={txPending || !account} placeholder="e.g., Regen DAO" />
                  </div>
                  <div style={{ flex: 1, minWidth: 260, maxWidth: '45%' }}>
                    <label style={{ ...styles.label, marginTop: 8 }}>
                      Organization Purpose
                    </label>
                    <input style={styles.input} name="purpose" value={form.purpose} onChange={handleInput} required disabled={txPending || !account} placeholder="e.g., To catalyze regenerative collaboration" />
                  </div>
                  <div style={{ flex: '0 0 100%', display: 'flex', justifyContent: 'flex-start', minWidth: 220 }}>
                    <button style={{ ...styles.button, alignSelf: 'center', marginTop: 0 }} type="submit" disabled={txPending || !account}>Create Organization</button>
                  </div>
                </form>
              )}
              {error && <div style={{ color: '#e63946', marginTop: 8 }}>{error}</div>}
              {success && <div style={{ color: '#4ecdc4', marginTop: 8 }}>{success}</div>}
              {txPending && <div style={{ color: '#888', marginTop: 8 }}>Transaction pending...</div>}
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', minHeight: 24, justifyContent: 'flex-start', marginBottom: 20, marginTop: 32, position: 'relative', gap: 6 }}>
          <button
            onClick={() => setParticipateSectionExpanded(e => !e)}
            style={{ background: 'none', border: 'none', color: '#232946', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', margin: 0, padding: 0, lineHeight: 1, minHeight: 22 }}
            aria-expanded={participateSectionExpanded}
            title={participateSectionExpanded ? 'Collapse section' : 'Expand section'}
          >
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 16, color: '#4ecdc4' }}>{participateSectionExpanded ? '▼' : '▶'}</span>
          </button>
          <span style={{ color: '#232946', fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', height: 22 }}>Holacracy Organizations</span>
          <button
            onClick={() => setParticipateInfoExpanded(e => !e)}
            style={{ background: 'none', border: 'none', color: '#4ecdc4', fontWeight: 600, fontSize: 16, cursor: 'pointer', textAlign: 'left', outline: 'none', display: 'flex', alignItems: 'center', gap: 8, margin: 0, padding: 0 }}
            aria-expanded={participateInfoExpanded}
          >
            <span style={{ textAlign: 'left', display: 'block', color: '#4ecdc4' }}>{participateInfoExpanded ? '▼' : '▶'} Info</span>
          </button>
        </div>
        {participateInfoExpanded && (
          <div style={{ marginTop: 4, marginBottom: 16, color: '#888', fontSize: 15, textAlign: 'justify', lineHeight: 1.6, background: '#f7fafd', border: '1px solid #e3eaf2', borderRadius: 10, boxShadow: '0 1px 4px rgba(44,62,80,0.04)', padding: '16px 20px', maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
            <b>Participating in a Holacracy Organization:</b><br/>
            Once an organization is launched, you can participate as a founder or join as a partner. Founders are those who signed the Constitution and were assigned initial roles at launch. Partners can join later by signing the Constitution and taking on roles as the organization evolves. Participation means you operate under the Holacracy Constitution, with clear roles, accountabilities, and the ability to propose changes through governance.
          </div>
        )}
        {participateSectionExpanded && (
          <>
            {/* Organizations List */}
            {orgs.length === 0 ? <div style={{ color: '#888', marginTop: 8 }}>No organizations deployed yet.</div> : (
              orgs.map((org, idx) => (
                <div key={org.id} style={styles.initiativeCard}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px 0' }}
                    onClick={() => {
                      setSelectedOrg(org);
                      setOrgDetailsOverlayOpen(true);
                    }}
                  >
                                          <div style={{ flex: 1, minWidth: 0, paddingLeft: 12 }}>
                        <div style={{ fontSize: 14, color: '#232946', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600 }}>{org.onChainDetails ? org.onChainDetails.name : org.name}</span>
                          <span style={{ color: '#888', margin: '0 8px' }}>—</span>
                          <span style={{ color: '#4a5568' }}>{org.onChainDetails ? org.onChainDetails.purpose : org.purpose}</span>
                        </div>
                      </div>
                    <div style={{ 
                      fontSize: 12, 
                      color: '#4ecdc4', 
                      marginLeft: 8,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <span style={{ marginRight: 4 }}>View Details</span>
                      <span>▶</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
      {/* The test section for setUpgradeTestMessage has been removed */}
      <div style={styles.footer}>
        This project incorporates and builds upon the Holacracy Constitution and related materials developed by <a href="https://www.holacracy.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>HolacracyOne</a>.<br />
        The Holacracy Constitution is available at <a href="https://www.holacracy.org/constitution/5-0/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>holacracy.org/constitution/5-0/</a> and is licensed under CC BY-SA 4.0.
      </div>
      {/* Organization Details Overlay */}
      <OrganizationDetailsOverlay
        org={selectedOrg ? orgs.find(o => o.id === selectedOrg.id) || selectedOrg : null}
        open={orgDetailsOverlayOpen}
        onClose={() => {
          setOrgDetailsOverlayOpen(false);
          setSelectedOrg(null);
        }}
        account={account}
        loadOrgs={loadOrgs}
        OrganizationActionsComponent={OrganizationActions}
      />
      
      {/* Overlay for pending blockchain transaction */}
      <TransactionPendingOverlay
        open={anyTxPending}
        message="Creating and deploying your Holacracy organization on the blockchain..."
      />
    </div>
  );
}

export default App;
