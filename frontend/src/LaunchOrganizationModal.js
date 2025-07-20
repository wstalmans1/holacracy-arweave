import React, { useState } from 'react';
import TransactionPendingOverlay from './TransactionPendingOverlay';
import factoryAbi from './abis/HolacracyFactory.json';
import orgAbi from './abis/Organization.json';
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

  if (!open) return null;

  const handleDeploy = async () => {
    setDeploying(true);
    setDeployError('');
    try {
      const { ethers } = await import('ethers');
      const FACTORY_ADDRESS = addresses.HOLACRACY_FACTORY_PROXY;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new ethers.Contract(FACTORY_ADDRESS, getAbiArray(factoryAbi), signer);
      // Prepare roles and assignments
      const roleInputs = roles.map(r => ({
        name: r.name,
        purpose: r.purpose,
        domains: r.domains.filter(Boolean),
        accountabilities: r.accountabilities.filter(Boolean)
      }));
      const assignmentInputs = assignments.map((a, i) => a ? { roleIndex: i, assignedTo: a } : null).filter(Boolean);
      // Prepare initData for Organization.initialize(address[])
      const iface = new ethers.Interface(getAbiArray(orgAbi));
      const initData = iface.encodeFunctionData('initialize', [partners]);
      const tx = await factory.launchOrganization(initiative.id, initData);
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
                    <label style={{ fontSize: 14, color: '#888' }}>Domains:</label>
                    {role.domains.map((domain, dIdx) => (
                      <div key={dIdx} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                        <input type="text" value={domain} onChange={e => setRoles(r => r.map((ro, i) => i === idx ? { ...ro, domains: ro.domains.map((d, j) => j === dIdx ? e.target.value : d) } : ro))} placeholder="Domain" style={{ flex: 1, padding: 6, border: '1px solid #ccc', borderRadius: 6, fontSize: 14 }} />
                        {role.domains.length > 1 && (
                          <button onClick={() => setRoles(r => r.map((ro, i) => i === idx ? { ...ro, domains: ro.domains.filter((_, j) => j !== dIdx) } : ro))} style={{ marginLeft: 6, background: 'none', border: 'none', color: '#ee6c4d', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>×</button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setRoles(r => r.map((ro, i) => i === idx ? { ...ro, domains: [...ro.domains, ''] } : ro))} style={{ marginTop: 2, background: '#e0e0e0', color: '#232946', border: 'none', borderRadius: 6, padding: '3px 10px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Domain</button>
                  </div>
                  <div>
                    <label style={{ fontSize: 14, color: '#888' }}>Accountabilities:</label>
                    {role.accountabilities.map((acc, aIdx) => (
                      <div key={aIdx} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                        <input type="text" value={acc} onChange={e => setRoles(r => r.map((ro, i) => i === idx ? { ...ro, accountabilities: ro.accountabilities.map((a, j) => j === aIdx ? e.target.value : a) } : ro))} placeholder="Accountability" style={{ flex: 1, padding: 6, border: '1px solid #ccc', borderRadius: 6, fontSize: 14 }} />
                        {role.accountabilities.length > 1 && (
                          <button onClick={() => setRoles(r => r.map((ro, i) => i === idx ? { ...ro, accountabilities: ro.accountabilities.filter((_, j) => j !== aIdx) } : ro))} style={{ marginLeft: 6, background: 'none', border: 'none', color: '#ee6c4d', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>×</button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setRoles(r => r.map((ro, i) => i === idx ? { ...ro, accountabilities: [...ro.accountabilities, ''] } : ro))} style={{ marginTop: 2, background: '#e0e0e0', color: '#232946', border: 'none', borderRadius: 6, padding: '3px 10px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>+ Accountability</button>
                  </div>
                  {roles.length > 1 && (
                    <button onClick={() => setRoles(r => r.filter((_, i) => i !== idx))} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: '#ee6c4d', fontWeight: 700, fontSize: 18, cursor: 'pointer', marginTop: 4 }}>× Remove Role</button>
                  )}
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
                <ul style={{ textAlign: 'left', margin: '8px 0 12px 18px', padding: 0 }}>
                  {partners.map((f, i) => <li key={i} style={{ fontSize: 14 }}>{f}</li>)}
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