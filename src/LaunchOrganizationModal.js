import React, { useState, useEffect } from 'react';
import TransactionPendingOverlay from './TransactionPendingOverlay';
import factoryAbi from './abis/HolacracyFactory-optimized.json';
import addresses from './contractAddresses.json';

// Helper to get ABI array regardless of import style
function getAbiArray(abiImport) {
  if (Array.isArray(abiImport)) return abiImport;
  if (abiImport && Array.isArray(abiImport.abi)) return abiImport.abi;
  if (abiImport && Array.isArray(abiImport.default)) return abiImport.default;
  return abiImport;
}

function LaunchOrganizationModal({ open, onClose, initiative, partners, onDeployed }) {
  const [step, setStep] = useState(0);
  const [roles, setRoles] = useState([
    { name: '', purpose: '', domains: [''], accountabilities: [''] }
  ]);
  const [assignments, setAssignments] = useState([]);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState('');
  const [orgAddress, setOrgAddress] = useState('');

  // Reset modal state when initiative changes or modal opens
  useEffect(() => {
    if (open && initiative) {
      setStep(0);
      setRoles([{ name: '', purpose: '', domains: [''], accountabilities: [''] }]);
      setAssignments([]);
      setDeploying(false);
      setDeployError('');
      setOrgAddress('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initiative?.id]);

  if (!open) return null;

  const handleDeploy = async () => {
    setDeploying(true);
    setDeployError('');
    try {
      const { ethers } = await import('ethers');
      const FACTORY_ADDRESS = addresses.HOLACRACY_FACTORY;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new ethers.Contract(FACTORY_ADDRESS, getAbiArray(factoryAbi), signer);
      
      // Launch the organization - the factory will handle initialization data
      const tx = await factory.launchOrganization(initiative.id);
      const receipt = await tx.wait();
      let orgAddr = '';
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          if (parsed && parsed.name === 'OrganizationDeployed') {
            orgAddr = parsed.args.org;
            break;
          }
        } catch {}
      }
      setOrgAddress(orgAddr || 'Deployed (address not found in logs)');
      if (onDeployed) onDeployed(orgAddr);
    } catch (e) {
      setDeployError(e?.message || 'An error occurred. Please reconnect your wallet.');
    }
    setDeploying(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(44,62,80,0.25)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(44,62,80,0.18)', padding: 0, minWidth: 340, maxWidth: 420, width: '90%', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ padding: 36, overflowY: 'auto', flex: 1, minHeight: 120 }}>
          {deploying && <TransactionPendingOverlay open message="Deploying organization..." />}
          <h2 style={{ color: '#232946', marginBottom: 18 }}>Launch Holacracy Organization</h2>
          {step === 0 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Define Initial Roles</div>
              {roles.map((role, idx) => (
                <div key={idx} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, marginBottom: 18, background: '#f8f9fa', position: 'relative', zIndex: 1 }}>
                  <input type="text" value={role.name} onChange={e => setRoles(r => r.map((ro, i) => i === idx ? { ...ro, name: e.target.value } : ro))} placeholder="Role name" style={{ width: '100%', padding: 7, border: '1px solid #ccc', borderRadius: 6, fontSize: 15, boxSizing: 'border-box', marginBottom: 6 }} />
                  <input type="text" value={role.purpose} onChange={e => setRoles(r => r.map((ro, i) => i === idx ? { ...ro, purpose: e.target.value } : ro))} placeholder="Purpose" style={{ width: '100%', padding: 7, border: '1px solid #ccc', borderRadius: 6, fontSize: 15, boxSizing: 'border-box', marginBottom: 6 }} />
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>Domains:</div>
                    {role.domains.map((domain, dIdx) => (
                      <div key={dIdx} style={{ marginBottom: 4, display: 'flex', gap: 6 }}>
                        <input
                          type="text"
                          value={domain}
                          onChange={e => setRoles(r => r.map((ro, i) => i === idx ? {
                            ...ro,
                            domains: ro.domains.map((d, di) => di === dIdx ? e.target.value : d)
                          } : ro))}
                          placeholder={`Domain ${dIdx + 1}`}
                          style={{ flex: 1, padding: 7, border: '1px solid #ccc', borderRadius: 6, fontSize: 15 }}
                        />
                        {dIdx === role.domains.length - 1 && domain && (
                          <button
                            onClick={() => setRoles(r => r.map((ro, i) => i === idx ? { ...ro, domains: [...ro.domains, ''] } : ro))}
                            style={{ padding: '4px 8px', background: '#4ecdc4', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                          >+</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, color: '#555', marginBottom: 4 }}>Accountabilities:</div>
                    {role.accountabilities.map((accountability, aIdx) => (
                      <div key={aIdx} style={{ marginBottom: 4, display: 'flex', gap: 6 }}>
                        <input
                          type="text"
                          value={accountability}
                          onChange={e => setRoles(r => r.map((ro, i) => i === idx ? {
                            ...ro,
                            accountabilities: ro.accountabilities.map((a, ai) => ai === aIdx ? e.target.value : a)
                          } : ro))}
                          placeholder={`Accountability ${aIdx + 1}`}
                          style={{ flex: 1, padding: 7, border: '1px solid #ccc', borderRadius: 6, fontSize: 15 }}
                        />
                        {aIdx === role.accountabilities.length - 1 && accountability && (
                          <button
                            onClick={() => setRoles(r => r.map((ro, i) => i === idx ? { ...ro, accountabilities: [...ro.accountabilities, ''] } : ro))}
                            style={{ padding: '4px 8px', background: '#4ecdc4', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                          >+</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => setRoles(r => [...r, { name: '', purpose: '', domains: [''], accountabilities: [''] }])} style={{ background: '#4ecdc4', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer', marginBottom: 8 }}>+ Add Role</button>
              <div style={{ color: '#ee6c4d', fontSize: 13, minHeight: 18 }}>
                {roles.length === 0 || roles.some(r => !r.name || !r.purpose) ? 'Each role must have a name and purpose.' : ''}
              </div>
            </div>
          )}
          {step === 1 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Assign Founders to Roles</div>
              {roles.map((role, idx) => (
                <div key={idx} style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12, marginBottom: 18, background: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: 1 }}>
                  <div style={{ fontWeight: 500, color: '#232946', marginBottom: 2 }}>{role.name || `Role ${idx + 1}`}</div>
                  <select value={assignments[idx] || ''} onChange={e => setAssignments(a => { const copy = [...a]; copy[idx] = e.target.value; return copy; })} style={{ width: '100%', padding: 7, border: '1px solid #ccc', borderRadius: 6, fontSize: 15 }}>
                    <option value="">Unassigned</option>
                    {partners.map((f, fIdx) => (
                      <option key={fIdx} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
          {step === 2 && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 10 }}>Review & Deploy</div>
              <div style={{ fontSize: 15, color: '#555', marginBottom: 16 }}>
                <b>Founders:</b>
                <ul style={{ textAlign: 'left', margin: '8px 0 0 0', padding: 0, listStyle: 'none', maxHeight: 60, overflowY: 'auto' }}>
                  {partners.map(addr => (
                    <li key={addr} style={{ fontFamily: 'monospace', fontSize: 12, color: '#232946', background: '#e3eaf2', borderRadius: 4, padding: '2px 6px', marginBottom: 2, display: 'inline-block', marginRight: 4 }}>{addr}</li>
                  ))}
                </ul>
                <b>Organization Purpose:</b>
                <div style={{ fontSize: 14, margin: '6px 0 12px 0' }}>{initiative.purpose}</div>
                <b>Roles:</b>
                <ul style={{ textAlign: 'left', margin: '8px 0 12px 18px', padding: 0 }}>
                  {roles.map((r, i) => (
                    <li key={i} style={{ fontSize: 14 }}>
                      <b>{r.name}</b> — {r.purpose}
                      {assignments[i] && <span style={{ color: '#4ecdc4' }}> (Assigned: {assignments[i]})</span>}
                      {r.domains.filter(Boolean).length > 0 && <div style={{ fontSize: 13, color: '#888' }}>Domains: {r.domains.filter(Boolean).join(', ')}</div>}
                      {r.accountabilities.filter(Boolean).length > 0 && <div style={{ fontSize: 13, color: '#888' }}>Accountabilities: {r.accountabilities.filter(Boolean).join(', ')}</div>}
                    </li>
                  ))}
                </ul>
              </div>
              {deployError && <div style={{ color: '#ee6c4d', fontSize: 14, marginBottom: 10 }}>{deployError}</div>}
              {orgAddress && !deploying ? (
                <div style={{ color: '#4ecdc4', fontWeight: 700, fontSize: 17, marginTop: 18, wordBreak: 'break-all', maxWidth: '100%' }}>
                  🎉 Organization deployed!<br/>
                  Address: <a href={`https://sepolia.etherscan.io/address/${orgAddress}`} target="_blank" rel="noopener noreferrer" style={{ color: '#3a86ff', wordBreak: 'break-all', display: 'inline-block', maxWidth: '100%' }}>{orgAddress}</a>
                  <button onClick={() => navigator.clipboard.writeText(orgAddress)} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#4ecdc4', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>Copy</button>
                </div>
              ) : (
                <button onClick={handleDeploy} disabled={deploying} style={{ background: '#4ecdc4', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginTop: 8 }}>
                  {deploying ? 'Deploying...' : 'Deploy Organization'}
                </button>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 36px', borderTop: '1px solid #eee', background: '#fff', position: 'sticky', bottom: 0, zIndex: 2, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          {/* Exit button, only show if not deploying and not after deployment */}
          {!(deploying || (step === 2 && orgAddress && !deploying)) && (
            <button onClick={onClose} style={{ background: 'none', color: '#ee6c4d', border: '1px solid #ee6c4d', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 15, cursor: 'pointer', marginRight: 12 }}>Exit</button>
          )}
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>Back</button>
          {step < 2 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={step === 0 && (roles.length === 0 || roles.some(r => !r.name || !r.purpose))}>Next</button>
          ) : (
            <button onClick={onClose}>Close</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LaunchOrganizationModal; 