import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import factoryAbi from "./abis/HolacracyFactory.json";
import orgAbi from "./abis/Organization.json";
import TransactionPendingOverlay from './TransactionPendingOverlay';
import LaunchOrganizationModal from './LaunchOrganizationModal';
import addresses from './contractAddresses.json';

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

function App() {
  const [provider, setProvider] = useState();
  const [signer, setSigner] = useState();
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
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [holacracyInfoVisible, setHolacracyInfoVisible] = useState(false);
  const holacracyInfoHideTimer = React.useRef();
  const [dappInfoVisible, setDappInfoVisible] = useState(false);
  const dappInfoHideTimer = React.useRef();

  const showHolacracyInfo = () => {
    if (holacracyInfoHideTimer.current) {
      clearTimeout(holacracyInfoHideTimer.current);
      holacracyInfoHideTimer.current = null;
    }
    setHolacracyInfoVisible(true);
  };

  const hideHolacracyInfo = () => {
    holacracyInfoHideTimer.current = setTimeout(() => {
      setHolacracyInfoVisible(false);
    }, 180); // 180ms grace period
  };

  const showDappInfo = () => {
    if (dappInfoHideTimer.current) {
      clearTimeout(dappInfoHideTimer.current);
      dappInfoHideTimer.current = null;
    }
    setDappInfoVisible(true);
  };

  const hideDappInfo = () => {
    dappInfoHideTimer.current = setTimeout(() => {
      setDappInfoVisible(false);
    }, 180);
  };

  // Set up a read-only provider and contract for reading initiatives
  useEffect(() => {
    // Use a robust Sepolia RPC endpoint (Infura/Alchemy). Set REACT_APP_SEPOLIA_RPC_URL in your .env file.
    const rpcUrl = process.env.REACT_APP_SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
    const readProvider = new ethers.JsonRpcProvider(rpcUrl);
    const readFac = new ethers.Contract(addresses.HOLACRACY_FACTORY_PROXY, factoryAbi, readProvider);
    setReadFactory(readFac);
  }, []);

  // Listen for MetaMask account changes and disconnection
  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // Disconnected
        setAccount(undefined);
        setSigner(undefined);
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
        setProvider(prov);
        setSigner(sign);
        const fac = new ethers.Contract(addresses.HOLACRACY_FACTORY_PROXY, factoryAbi, sign);
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

  const launchOrganization = async (id, partners) => {
    setError("");
    setSuccess("");
    setTxPending(true);
    try {
      // Prepare initData for Organization.initialize(address[])
      const iface = new ethers.Interface(orgAbi);
      const initData = iface.encodeFunctionData("initialize", [partners]);
      const tx = await factory.launchOrganization(id, initData);
      await tx.wait();
      setSuccess("Organization launched!");
    } catch (e) {
      setError("Failed to launch organization: " + (e?.info?.error?.message || e.message));
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
      <div style={styles.header}>
        Holacracy Organization Creation{' '}
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span
            style={{
              cursor: 'pointer',
              color: '#fff',
              fontWeight: 700,
              position: 'relative',
            }}
            onMouseEnter={e => {
              const tooltip = document.getElementById('dapp-tooltip');
              if (tooltip) tooltip.style.display = 'block';
            }}
            onMouseLeave={e => {
              const tooltip = document.getElementById('dapp-tooltip');
              if (tooltip) tooltip.style.display = 'none';
            }}
          >
            DApp
            <span
              id="dapp-tooltip"
              style={{
                display: 'none',
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                bottom: '120%',
                background: '#f3f3f3', // light grey for visibility
                color: '#232946',
                padding: '8px 16px',
                borderRadius: 8,
                boxShadow: '0 2px 12px rgba(44,62,80,0.13)',
                fontSize: 15,
                whiteSpace: 'nowrap',
                zIndex: 100,
                fontWeight: 400,
                pointerEvents: 'none',
              }}
            >
              Decentralised Application
            </span>
          </span>
        </span>
        <div style={{ fontWeight: 400, fontSize: 17, color: '#b8c1ec', marginTop: 8 }}>
          In a Holacracy, all authority derives from the <a href="https://www.holacracy.org/constitution/5-0/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>Constitution</a>, not from individuals.
        </div>
      </div>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(44,62,80,0.07)',
        padding: 32,
        maxWidth: 800,
        margin: '32px auto 0 auto',
        marginBottom: 24,
      }}>
        <div style={{ color: '#232946', fontWeight: 700, fontSize: 20, marginBottom: 10, textAlign: 'left' }}>
          About this DApp
        </div>
        <div style={{ color: '#888', fontSize: 16, textAlign: 'justify', lineHeight: 1.6 }}>
          This <span style={{ position: 'relative', display: 'inline-block' }}>
            <span
              style={{ cursor: 'pointer', color: '#4ecdc4', fontWeight: 700, position: 'relative' }}
              onMouseEnter={showDappInfo}
              onMouseLeave={hideDappInfo}
              tabIndex={0}
              aria-label="Info about DApp"
            >
              DApp
            </span>
            {dappInfoVisible && (
              <span
                onMouseEnter={showDappInfo}
                onMouseLeave={hideDappInfo}
                style={{
                  display: 'block',
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  top: '100%',
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
                  pointerEvents: 'none',
                }}
              >
                Decentralised Application
              </span>
            )}
          </span> allows anyone to create on-chain
          <span style={{ position: 'relative', display: 'inline-block', marginLeft: 4, marginRight: 4 }}>
            <span
              style={{ cursor: 'pointer', color: '#4ecdc4', fontWeight: 700 }}
              onMouseEnter={showHolacracyInfo}
              onMouseLeave={hideHolacracyInfo}
              tabIndex={0}
              aria-label="Info about Holacracy organizations"
            >
              Holacracy organizations
            </span>
            {holacracyInfoVisible && (
              <span
                onMouseEnter={showHolacracyInfo}
                onMouseLeave={hideHolacracyInfo}
                style={{
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
                }}
              >
                A Holacracy organization is a self-organizing structure where authority and decision-making are distributed through clear roles, not traditional management hierarchies. All partners operate under the <a href="https://www.holacracy.org/constitution/5-0/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline', fontWeight: 400 }}>Holacracy Constitution</a>, which defines the rules and processes for governance and collaboration.
              </span>
            )}
          </span>
          in two clear phases:
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%', marginTop: 24 }}>
          <button
            onClick={() => setAboutExpanded(e => !e)}
            style={{
              background: 'none',
              border: 'none',
              color: '#4ecdc4',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
              textAlign: 'left',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              margin: 0,
              padding: 0,
            }}
            aria-expanded={aboutExpanded}
          >
            <span style={{ textAlign: 'left', display: 'block' }}>{aboutExpanded ? '▼' : '▶'} More</span>
          </button>
        </div>
        {aboutExpanded && (
          <div style={{
            marginTop: 16,
            color: '#888',
            fontSize: 15,
            textAlign: 'justify',
            lineHeight: 1.6,
            background: '#f7fafd',
            border: '1px solid #e3eaf2',
            borderRadius: 10,
            boxShadow: '0 1px 4px rgba(44,62,80,0.04)',
            padding: '22px 28px',
            maxWidth: 700,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <b>1. Pre-Launch Phase:</b><br/>
            Start by drafting your organization. Define its name and purpose, and invite co-founding partners to join. Each partner must review and sign the Holacracy Constitution, ensuring everyone understands the principles and rules that will govern the organization. The only purpose of joining as a co-founder in this phase is to be eligible for assignment to one of the initial roles in the next phase.<br/>
            <br/>
            <i>Technical note: In this phase, the <b>Holacracy Factory (Proxy)</b> contract (see below) manages the list of initiatives and tracks which partners have signed the constitution for each draft organization.</i>
            <br/><br/>
            <b>2. Launch Phase:</b><br/>
            Once all co-founders have joined and signed, you define the initial roles for your organization and assign them to the co-founders. After roles are defined and assigned, you can launch the organization on-chain.<br/>
            <br/>
            <i>Technical note: When you launch, the <b>Holacracy Factory (Proxy)</b> deploys a new <b>Organization</b> contract for your group, using the <b>Organization Implementation</b> and <b>Organization Beacon</b> contracts (see Contract Addresses below). This means all organizations can be upgraded together in the future, and your organization benefits from both transparency and upgradeability. The Factory keeps a record of all deployed organizations and their founders.</i>
            <br /><br />
            <b style={{ color: '#888' }}>Contract Addresses:</b>
            <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0 0', fontSize: 15 }}>
              {Object.entries(addresses).map(([name, addr]) => {
                const friendlyLabels = {
                  ORGANIZATION_IMPLEMENTATION: "Organization Implementation",
                  ORGANIZATION_BEACON: "Organization Beacon",
                  HOLACRACY_FACTORY_PROXY: "Holacracy Factory (Proxy)",
                  HOLACRACY_FACTORY_IMPLEMENTATION: "Holacracy Factory (Implementation)",
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
      </div>
      <div style={styles.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h2 style={{ color: '#232946', marginBottom: 0, marginRight: 8, lineHeight: 1 }}>Pre-Launch Organization Drafts</h2>
            <InfoOverlay />
          </div>
        </div>
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
              <div style={{ flex: '0 0 100%', display: 'flex', justifyContent: 'flex-end', minWidth: 220 }}>
                <button style={{ ...styles.button, alignSelf: 'center', marginTop: 0, whiteSpace: 'nowrap', minWidth: 220 }} type="submit" disabled={txPending || !account}>Create Organization Draft</button>
              </div>
            </form>
          )}
          {error && <div style={{ color: '#e63946', marginTop: 12 }}>{error}</div>}
          {success && <div style={{ color: '#4ecdc4', marginTop: 12 }}>{success}</div>}
          {txPending && <div style={{ color: '#888', marginTop: 12 }}>Transaction pending...</div>}
          <div style={{ height: 0, borderTop: '2px dashed #b8c1ec', margin: '32px 0 32px 0' }} />
          <h3 style={{ color: '#232946', fontSize: 20, margin: '10px 0 18px 0', fontWeight: 700, letterSpacing: 0.2 }}>Existing Drafts</h3>
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
                        Status: {ini.launched ? <span style={{ color: '#4ecdc4' }}>Launched</span> : <span style={{ color: '#f77f00' }}>Draft (Pre-Launch)</span>}
                      </div>
                      <div style={{ fontSize: 13, color: '#888', marginBottom: 2 }}>
                        Co-Founders ({ini.partners.length}):
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
                              <div style={{ color: '#232946', fontSize: 15, marginBottom: 10, fontWeight: 500 }}>
                                To join as a co-founding partner for this organization, you declare that you understand that <span style={{ color: '#1a5f7a', fontWeight: 600 }}>In a Holacracy, all authority derives from the Constitution, not from individuals</span>. You confirm your understanding by signing the <a href="https://www.holacracy.org/constitution/5-0/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>Holacracy Constitution</a>.
                              </div>
                            )}
                            {isPartner ? (
                              <span style={{ color: '#4ecdc4', fontWeight: 500, fontSize: 14, marginRight: 8 }}>You are a co-founder</span>
                            ) : (
                              <button style={styles.button} onClick={e => { e.stopPropagation(); joinInitiative(ini.id); }} disabled={cardStatus[ini.id]?.pending}>Sign the Constitution to Join as Co-Founder</button>
                            )}
                            {ini.partners.length > 0 && isPartner && (
                              <button style={{ ...styles.button, marginLeft: 8 }} onClick={e => { e.stopPropagation(); setLaunchModal({ open: true, initiative: ini, partners: ini.partners }); }} disabled={txPending}>Launch as Holacracy Organization</button>
                            )}
                          </div>
                        ) : (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ color: '#232946', fontSize: 15, marginBottom: 10, fontWeight: 500 }}>
                              Connect your wallet to join this organization as a co-founding partner.
                            </div>
                            <button style={styles.button} onClick={e => { e.stopPropagation(); connectWallet(); }}>Connect to Join</button>
                          </div>
                        )
                      )}
                      {/* Inline status for this initiative */}
                      {cardStatus[ini.id]?.pending && <div style={{ color: '#888', marginTop: 6 }}>Transaction pending...</div>}
                      {cardStatus[ini.id]?.error && <div style={{ color: '#e63946', marginTop: 6 }}>{cardStatus[ini.id].error}</div>}
                      {cardStatus[ini.id]?.success && <div style={{ color: '#4ecdc4', marginTop: 6 }}>{cardStatus[ini.id].success}</div>}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
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
        <h2 style={{ color: '#232946', marginBottom: 18 }}>On-chain Holacracy Organizations</h2>
        {orgs.length === 0 ? <div style={{ color: '#888' }}>No organizations deployed yet.</div> : (
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

function InfoOverlay() {
  const [show, setShow] = useState(false);
  const hideTimer = React.useRef();

  const showInfo = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setShow(true);
  };

  const hideInfo = () => {
    hideTimer.current = setTimeout(() => {
      setShow(false);
    }, 180);
  };

  return (
    <span style={{ position: 'relative', display: 'inline-block', marginTop: 2 }}>
      <span
        onMouseEnter={showInfo}
        onMouseLeave={hideInfo}
        onClick={() => setShow(s => !s)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#e3eaf2',
          color: '#232946',
          fontWeight: 700,
          fontSize: 16,
          cursor: 'pointer',
          marginLeft: 2,
          border: '1px solid #cdd0d4',
          boxShadow: '0 1px 4px rgba(44,62,80,0.04)',
          marginTop: 2,
        }}
        tabIndex={0}
        aria-label="Info about pre-launch drafts"
      >
        i
      </span>
      {show && (
        <div
          onMouseEnter={showInfo}
          onMouseLeave={hideInfo}
          style={{
            position: 'absolute',
            top: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fffbe6', // light yellow for better visibility
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
          }}
        >
          A pre-launch draft of a Holacracy Organization includes its name, purpose, co-founding partners (who sign the constitution), and initial roles and assignments. Once all co-founders have joined and signed the constitution, you can launch the organization on-chain.
        </div>
      )}
    </span>
  );
}

export default App;
