import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import factoryArtifact from "./abis/HolacracyFactory.json";
import TransactionPendingOverlay from './TransactionPendingOverlay';
import LaunchOrganizationModal from './LaunchOrganizationModal';
import addresses from './contractAddresses.json';
import ReactDOM from 'react-dom';

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
  },
  input: {
    width: '100%',
    padding: 10,
    borderRadius: 6,
    border: '1px solid #cdd0d4',
    marginBottom: 16,
    fontSize: 16,
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
    padding: 18,
    marginBottom: 18,
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
      setCoords({
        top: rect.bottom + window.scrollY + 2, // 2px marginTop
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }
  }, [visible, anchorRef]);
  if (!visible || !coords) return null;
  return ReactDOM.createPortal(
    <div
      style={{
        ...style,
        position: 'absolute',
        top: coords.top,
        left: coords.left,
        transform: 'translateX(-50%)',
        zIndex: 9999,
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

function App() {
  const [account, setAccount] = useState();
  const [factory, setFactory] = useState();
  const [readFactory, setReadFactory] = useState();
  const [initiatives, setInitiatives] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", purpose: "" });
  const [txPending, setTxPending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [cardStatus, setCardStatus] = useState({}); // { [initiativeId]: { pending, error, success } }
  const [reloadKey, setReloadKey] = useState(0);
  const [expanded, setExpanded] = useState({}); // { [initiativeId]: true/false }
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
  const [createInfoExpanded, setCreateInfoExpanded] = useState(false);
  const [createSectionExpanded, setCreateSectionExpanded] = useState(false);
  const [participateSectionExpanded, setParticipateSectionExpanded] = useState(false);

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
    const readFac = new ethers.Contract(addresses.HOLACRACY_FACTORY_PROXY, factoryArtifact.abi, readProvider);
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
        const fac = new ethers.Contract(addresses.HOLACRACY_FACTORY_PROXY, factoryArtifact.abi, sign);
        setFactory(fac);
      } else {
        setError("MetaMask not detected. Please install MetaMask.");
      }
    } catch (e) {
      setError("Failed to connect wallet: " + (e?.message || e));
    }
    setConnecting(false);
  };

  // Load initiatives (use readFactory if no wallet, factory if wallet connected)
  useEffect(() => {
    const contract = factory || readFactory;
    if (!contract) return;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const count = await contract.getInitiativesCount();
        const arr = [];
        for (let i = 0; i < count; i++) {
          const [name, purpose, creator, partners, launched] = await contract.getInitiative(i);
          arr.push({
            id: i,
            name,
            purpose,
            creator,
            partners,
            launched,
          });
        }
        setInitiatives(arr);
      } catch (e) {
        setError("Failed to load initiatives: " + e.message);
      }
      setLoading(false);
    };
    load();
  }, [factory, readFactory, txPending, reloadKey]);

  // Handlers
  const handleInput = e => setForm({ ...form, [e.target.name]: e.target.value });

  const createInitiative = async e => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setTxPending(true);
    try {
      const tx = await factory.createInitiative(form.name, form.purpose);
      await tx.wait();
      setSuccess("Initiative created!");
      setForm({ name: "", purpose: "" });
      setReloadKey(k => k + 1); // trigger reload
      setTimeout(() => setSuccess("") , 10000); // Clear after 10 seconds
    } catch (e) {
      setError("Failed to create initiative: " + (e?.info?.error?.message || e.message));
    }
    setTxPending(false);
  };

  const joinInitiative = async id => {
    setCardStatus(prev => ({ ...prev, [id]: { pending: true, error: "", success: "" } }));
    setTxPending(true);
    try {
      const tx = await factory.signConstitution(id);
      await tx.wait();
      setCardStatus(prev => ({ ...prev, [id]: { pending: false, error: "", success: "Joined initiative!" } }));
      setReloadKey(k => k + 1); // trigger reload
      setTimeout(() => {
        setCardStatus(prev => ({ ...prev, [id]: { ...prev[id], success: "" } }));
      }, 10000); // Clear after 10 seconds
    } catch (e) {
      setCardStatus(prev => ({ ...prev, [id]: { pending: false, error: "Failed to join initiative: " + (e?.info?.error?.message || e.message), success: "" } }));
    }
    setTxPending(false);
  };

  // Load organizations (launched initiatives)
  useEffect(() => {
    const contract = factory || readFactory;
    if (!contract) return;
    const loadOrgs = async () => {
      setLoading(true);
      setError("");
      try {
        const count = await contract.getInitiativesCount();
        const arr = [];
        for (let i = 0; i < count; i++) {
          const [name, purpose, creator, partners, launched] = await contract.getInitiative(i);
          if (launched) {
            arr.push({
              id: i,
              name,
              purpose,
              partners,
              creator,
            });
          }
        }
        setOrgs(arr);
      } catch (e) {
        if (e.message && e.message.toLowerCase().includes('failed to fetch')) {
          setError("Failed to load organizations: check your connection");
        } else {
          setError("Failed to load organizations: " + e.message);
        }
      }
      setLoading(false);
    };
    loadOrgs();
  }, [factory, readFactory, txPending]);

  // Helper to check if any transaction is pending
  const anyTxPending = txPending || Object.values(cardStatus).some(status => status?.pending);

  // Add a simple chevron SVG for expand/collapse
  const Chevron = ({ down }) => (
    <svg width="18" height="18" style={{ marginLeft: 8, transition: 'transform 0.2s', transform: down ? 'rotate(180deg)' : 'rotate(0deg)' }} viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="#232946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );

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
      <div style={styles.section}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', marginBottom: 18, position: 'relative', gap: 12 }}>
          <button
            onClick={() => setCreateSectionExpanded(e => !e)}
            style={{ background: 'none', border: 'none', color: '#232946', fontWeight: 700, fontSize: 22, cursor: 'pointer', textAlign: 'left', outline: 'none', display: 'flex', alignItems: 'center', gap: 4, margin: 0, padding: 0, lineHeight: 1 }}
            aria-expanded={createSectionExpanded}
            title={createSectionExpanded ? 'Collapse section' : 'Expand section'}
          >
            {createSectionExpanded ? '▼' : '▶'}
          </button>
          <h2 style={{ color: '#232946', marginBottom: 0, marginRight: 8, lineHeight: 1 }}>Create a Holacracy Organization</h2>
          <button
            onClick={() => setCreateInfoExpanded(e => !e)}
            style={{ background: 'none', border: 'none', color: '#4ecdc4', fontWeight: 600, fontSize: 16, cursor: 'pointer', textAlign: 'left', outline: 'none', display: 'flex', alignItems: 'center', gap: 8, margin: 0, padding: 0 }}
            aria-expanded={createInfoExpanded}
          >
            <span style={{ textAlign: 'left', display: 'block' }}>{createInfoExpanded ? '▼' : '▶'} Info</span>
          </button>
        </div>
        {createInfoExpanded && (
          <div style={{ marginTop: 8, marginBottom: 24, color: '#888', fontSize: 15, textAlign: 'justify', lineHeight: 1.6, background: '#f7fafd', border: '1px solid #e3eaf2', borderRadius: 10, boxShadow: '0 1px 4px rgba(44,62,80,0.04)', padding: '22px 28px', maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
            <b>1. Pre-Launch Phase:</b><br/>
            The main goal of this phase is to collect the partners to whom initial roles in the organization will be assigned in the Launch Phase. You start by drafting your organization: define its name and purpose, and invite the initial partners to join. Each partner must review and sign the Holacracy Constitution, ensuring everyone understands the principles and rules that will govern the organization.<br/>
            <br/>
            <i>Technical note: In this phase, the <b>Holacracy Factory (Proxy)</b> contract manages the list of initiatives and tracks which partners have signed the constitution for each draft organization.</i>
            <br/><br/>
            <b>2. Launch Phase:</b><br/>
            Once all initial partners have joined and signed, you define the initial roles for your organization and assign these roles to them. After roles are defined and assigned, you can launch the organization on-chain.<br/>
            <br/>
            <i>Technical note: When you launch, the <b>Holacracy Factory (Proxy)</b> deploys a new <b>Organization</b> contract for your group, using the <b>Organization Implementation</b> and <b>Organization Beacon</b> contracts. This means all organizations can be upgraded together in the future, and your organization benefits from both transparency and upgradeability. The Factory keeps a record of all deployed organizations and their partners.</i>
            <br /><br />
            <b style={{ color: '#888' }}>Contract Addresses:</b>
            <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0 0', fontSize: 15 }}>
              {Object.entries(addresses).map(([name, addr]) => {
                const friendlyLabels = {
                  ORGANIZATION_IMPLEMENTATION: "Organization Implementation",
                  ORGANIZATION_BEACON: "Organization Beacon",
                  HOLACRACY_FACTORY_PROXY: "Holacracy Factory (Proxy)",
                  HOLACRACY_FACTORY_IMPLEMENTATION: "Holacracy Factory (Implementation)",
                  HOLACRACY_FACTORY_PROXY_ADMIN: "Holacracy Factory Proxy Admin",
                };
                return (
                  <li key={name} style={{ marginBottom: 6 }}>
                    <span style={{ color: '#888' }}>{friendlyLabels[name] || name}:</span>{' '}
                    <a
                      href={`https://sepolia.etherscan.io/address/${addr}`}
          target="_blank"
          rel="noopener noreferrer"
                      style={{ fontFamily: 'monospace', color: '#4ecdc4', textDecoration: 'underline', fontSize: 13 }}
                    >
                      {addr}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {createSectionExpanded && (
          <>
            {/* Combined Create a Draft and Existing Drafts Section */}
            <div style={{ marginBottom: 44, background: '#e3eaf2', borderRadius: 10, padding: '26px 30px', boxShadow: '0 2px 8px rgba(44,62,80,0.08)', borderLeft: '6px solid #4ecdc4', position: 'relative' }}>
              <h3 style={{ color: '#232946', fontSize: 20, margin: '10px 0 18px 0', fontWeight: 700, letterSpacing: 0.2 }}>Create a Draft</h3>
              {!account && (
                <button style={styles.button} onClick={connectWallet} disabled={connecting}>
                  {connecting ? 'Connecting...' : 'Connect wallet to create a draft'}
                </button>
              )}
              {account && (
                <form onSubmit={createInitiative}
                  style={{
                    marginBottom: 24,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-end',
                    columnGap: 28,
                    rowGap: 16,
                  }}>
                  <div style={{ flex: 1, minWidth: 220, marginRight: 8 }}>
                    <label style={styles.label}>Organization Name</label>
                    <input style={styles.input} name="name" value={form.name} onChange={handleInput} required disabled={txPending || !account} placeholder="e.g., Regen DAO" />
                  </div>
                  <div style={{ flex: 2, minWidth: 260 }}>
                    <label style={styles.label}>Organization Purpose</label>
                    <input style={styles.input} name="purpose" value={form.purpose} onChange={handleInput} required disabled={txPending || !account} placeholder="e.g., To catalyze regenerative collaboration" />
                  </div>
                  <div style={{ flex: '0 0 100%', display: 'flex', justifyContent: 'flex-start', minWidth: 220 }}>
                    <button style={{ ...styles.button, alignSelf: 'center', marginTop: 0, whiteSpace: 'nowrap', minWidth: 220 }} type="submit" disabled={txPending || !account}>Create Organization Draft</button>
                  </div>
                </form>
              )}
              {error && <div style={{ color: '#e63946', marginTop: 12 }}>{error}</div>}
              {success && <div style={{ color: '#4ecdc4', marginTop: 12 }}>{success}</div>}
              {txPending && <div style={{ color: '#888', marginTop: 12 }}>Transaction pending...</div>}
              <div style={{ height: 0, borderTop: '2px dashed #b8c1ec', margin: '32px 0 32px 0' }} />
              <h3 style={{ color: '#232946', fontSize: 20, margin: '10px 0 18px 0', fontWeight: 700, letterSpacing: 0.2 }}>Join a Draft or Launch a Draft as an On-chain Organization</h3>
              {loading ? <div>Loading...</div> : initiatives.filter(ini => !ini.launched).length === 0 ? <div style={{ color: '#888' }}>No drafts yet.</div> : (
                initiatives.filter(ini => !ini.launched).map(ini => {
                  const isExpanded = expanded[ini.id];
                  const isPartner = ini.partners
                    .map(addr => addr.toLowerCase())
                    .includes(account?.toLowerCase());
                  return (
                    <div key={ini.id} style={styles.initiativeCard}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isExpanded ? 4 : 0, cursor: 'pointer', padding: '2px 0' }}
                        onClick={() => setExpanded(prev => ({ ...prev, [ini.id]: !isExpanded }))}
                      >
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 16 }}>{ini.name}</span>
                          <span style={{ color: '#555', fontSize: 14, marginLeft: 10 }}>{ini.purpose}</span>
                        </div>
                        <Chevron down={isExpanded} />
                      </div>
                      {isExpanded && (
                        <>
                          <div style={{ fontSize: 13, color: '#888', marginBottom: 2, marginTop: 6 }}>
                            Status: {ini.launched ? <span style={{ color: '#4ecdc4' }}>Launched</span> : <span style={{ color: '#f77f00' }}>Draft</span>}
                          </div>
                          <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>
                            Partners ({ini.partners.length}):
                            <ul style={{ margin: '4px 0 0 0', padding: 0, listStyle: 'none', maxHeight: 60, overflowY: 'auto' }}>
                              {ini.partners.map(addr => (
                                <li key={addr} style={{ fontFamily: 'monospace', fontSize: 12, color: '#232946', background: '#e3eaf2', borderRadius: 4, padding: '2px 6px', marginBottom: 2, display: 'inline-block', marginRight: 4 }}>{addr}</li>
                              ))}
                            </ul>
                          </div>
                          <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Creator: {ini.creator}</div>
                          {/* Actions and inline status */}
                          {!ini.launched && (
                            account ? (
                              <div style={{ marginTop: 8 }}>
                                {!isPartner && (
                                  <div style={{ color: '#232946', fontSize: 15, marginBottom: 10, fontWeight: 500, lineHeight: 1.5 }}>
                                    To join this organization as a partner, you declare that you understand that <span style={{ color: '#1a5f7a', fontWeight: 600 }}>In a Holacracy, all authority derives from the Constitution, not from individuals</span>. You confirm your understanding by signing the <a href="https://www.holacracy.org/constitution/5-0/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>Holacracy Constitution</a>.
                                  </div>
                                )}
                                {isPartner ? (
                                  <span style={{ color: '#4ecdc4', fontWeight: 500, fontSize: 14, marginRight: 8 }}>You are a partner</span>
                                ) : (
                                  <button style={styles.button} onClick={e => { e.stopPropagation(); joinInitiative(ini.id); }} disabled={cardStatus[ini.id]?.pending}>Sign the Constitution to Join as a Partner</button>
                                )}
                                {ini.partners.length > 0 && isPartner && (
                                  <button style={{ ...styles.button, marginLeft: 8 }} onClick={e => { e.stopPropagation(); setLaunchModal({ open: true, initiative: ini, partners: ini.partners }); }} disabled={txPending}>Launch as Holacracy Organization</button>
                                )}
                              </div>
                            ) : (
                              <div style={{ marginTop: 8 }}>
                                <button style={styles.button} onClick={e => { e.stopPropagation(); connectWallet(); }}>Connect wallet to join as a partner</button>
                              </div>
                            )
                          )}
                          {/* Inline status for this initiative */}
                          {cardStatus[ini.id]?.pending && <div style={{ color: '#888', marginTop: 6 }}>Transaction pending...</div>}
                          {cardStatus[ini.id]?.error && <div style={{ color: '#e63946', marginTop: 6 }}>{cardStatus[ini.id].error}</div>}
                          {/* Success message for joining initiative removed as requested */}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
        {/* Removed duplicate draft creation and list UI */}
      </div>
      <LaunchOrganizationModal
        open={launchModal.open}
        onClose={() => setLaunchModal({ open: false, initiative: null, partners: [] })}
        initiative={launchModal.initiative}
        partners={launchModal.partners}
        onDeployed={() => {
          setLaunchModal({ open: false, initiative: null, partners: [] });
          setReloadKey(k => k + 1);
        }}
      />
      <div style={styles.section}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', marginBottom: 18, position: 'relative', gap: 12 }}>
          <button
            onClick={() => setParticipateSectionExpanded(e => !e)}
            style={{ background: 'none', border: 'none', color: '#232946', fontWeight: 700, fontSize: 22, cursor: 'pointer', textAlign: 'left', outline: 'none', display: 'flex', alignItems: 'center', gap: 4, margin: 0, padding: 0, lineHeight: 1 }}
            aria-expanded={participateSectionExpanded}
            title={participateSectionExpanded ? 'Collapse section' : 'Expand section'}
          >
            {participateSectionExpanded ? '▼' : '▶'}
          </button>
          <h2 style={{ color: '#232946', marginBottom: 0, marginRight: 8, lineHeight: 1 }}>Participate in a Holacracy Organization</h2>
          <button
            onClick={() => setParticipateInfoExpanded(e => !e)}
            style={{ background: 'none', border: 'none', color: '#4ecdc4', fontWeight: 600, fontSize: 16, cursor: 'pointer', textAlign: 'left', outline: 'none', display: 'flex', alignItems: 'center', gap: 8, margin: 0, padding: 0 }}
            aria-expanded={participateInfoExpanded}
          >
            <span style={{ textAlign: 'left', display: 'block' }}>{participateInfoExpanded ? '▼' : '▶'} Info</span>
          </button>
        </div>
        {participateInfoExpanded && (
          <div style={{ marginTop: 8, marginBottom: 24, color: '#888', fontSize: 15, textAlign: 'justify', lineHeight: 1.6, background: '#f7fafd', border: '1px solid #e3eaf2', borderRadius: 10, boxShadow: '0 1px 4px rgba(44,62,80,0.04)', padding: '22px 28px', maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
            <b>Participating in a Holacracy Organization:</b><br/>
            Once an organization is launched, you can participate as a founder or join as a partner. Founders are those who signed the Constitution and were assigned initial roles at launch. Partners can join later by signing the Constitution and taking on roles as the organization evolves. Participation means you operate under the Holacracy Constitution, with clear roles, accountabilities, and the ability to propose changes through governance.
          </div>
        )}
        {participateSectionExpanded && (
          orgs.length === 0 ? <div style={{ color: '#888' }}>No organizations deployed yet.</div> : (
            orgs.map((org, idx) => {
              const isExpanded = expanded[`org-${org.id}`];
              return (
                <div key={org.id} style={styles.initiativeCard}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isExpanded ? 4 : 0, cursor: 'pointer', padding: '2px 0' }}
                    onClick={() => setExpanded(prev => ({ ...prev, [`org-${org.id}`]: !isExpanded }))}
                  >
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 16 }}>{org.name}</span>
                      <span style={{ color: '#555', fontSize: 14, marginLeft: 10 }}>{org.purpose}</span>
                    </div>
                    <Chevron down={isExpanded} />
                  </div>
                  {isExpanded && (
                    <>
                      <div style={{ fontSize: 13, color: '#888', marginBottom: 2, marginTop: 6 }}>
                        <b>Founders ({org.partners.length}):</b>
                        <ul style={{ margin: '4px 0 0 0', padding: 0, listStyle: 'none', maxHeight: 60, overflowY: 'auto' }}>
                          {org.partners.map(addr => (
                            <li key={addr} style={{ fontFamily: 'monospace', fontSize: 12, color: '#232946', background: '#e3eaf2', borderRadius: 4, padding: '2px 6px', marginBottom: 2, display: 'inline-block', marginRight: 4 }}>{addr}</li>
                          ))}
                        </ul>
                      </div>
                      <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>Creator: {org.creator}</div>
                    </>
                  )}
                </div>
              );
            })
          )
        )}
      </div>
      <div style={styles.footer}>
        This project incorporates and builds upon the Holacracy Constitution and related materials developed by <a href="https://www.holacracy.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>HolacracyOne</a>.<br />
        The Holacracy Constitution is available at <a href="https://www.holacracy.org/constitution/5-0/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>holacracy.org/constitution/5-0/</a> and is licensed under CC BY-SA 4.0.
      </div>
      {/* Overlay for pending blockchain transaction */}
      <TransactionPendingOverlay
        open={anyTxPending}
        message="Processing blockchain transaction..."
      />
    </div>
  );
}

export default App;
