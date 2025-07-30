import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { EthereumProvider } from '@walletconnect/ethereum-provider';

import factoryArtifact from "./abis/HolacracyFactory-optimized.json";
import orgArtifact from "./abis/Organization-optimized.json";
import TransactionPendingOverlay from './TransactionPendingOverlay';
import LaunchOrganizationModal from './LaunchOrganizationModal';
import ConstitutionSigningModal from './ConstitutionSigningModal';
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
    padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '32px 16px 18px 16px' : '32px 0 18px 0',
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
    margin: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '8px 12px 32px 12px' : '16px auto 32px auto',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 12px rgba(44,62,80,0.07)',
    padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '24px 16px 24px 16px' : '32px 32px 32px 32px',
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
    fontSize: 12,
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
function OverlayPortal({ anchorRef, visible, children, style, onMouseEnter, onMouseLeave, alignRight = false }) {
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (visible && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      // Only use element position, not mouse coordinates, to keep infobox stable
      const finalCoords = {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        right: rect.right + window.scrollX,
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
        left: alignRight ? 'auto' : coords.left,
        right: alignRight ? window.innerWidth - coords.right : 'auto',
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
        >
          ×
        </button>

        {/* Organization Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '8px' 
          }}>
            <h2 style={{ 
              margin: '0', 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#232946' 
            }}>
              {org.onChainDetails ? org.onChainDetails.name : org.name}
            </h2>
            {org.archived && (
              <span style={{ 
                background: '#dc2626', 
                color: '#ffffff', 
                padding: '4px 10px', 
                borderRadius: '8px', 
                fontSize: '12px', 
                fontWeight: '700', 
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ⚠️ Archived
              </span>
            )}
          </div>
          <p style={{ 
            margin: '0', 
            fontSize: '16px', 
            color: '#4a5568', 
            lineHeight: '1.5' 
          }}>
            {org.onChainDetails ? org.onChainDetails.purpose : org.purpose}
          </p>
          {org.archived && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '12px',
              color: '#dc2626',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              <strong>📁 This organization is archived.</strong> Archived organizations cannot accept new constitution signings, but existing partners can still view the organization details and history.
            </div>
          )}
        </div>

        {/* Organization Actions */}
        <div style={{ marginBottom: '24px' }}>
          {org.archived && (
            <div style={{
              background: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              color: '#92400e',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              <strong>🔒 Archive Status:</strong> This organization is currently archived. Only the creator can unarchive it. While archived, new partners cannot sign the constitution.
            </div>
          )}
          <OrganizationActionsComponent 
            org={org}
            onUpdate={loadOrgs}
          />
        </div>

        {/* Partners Section */}
        <div style={{ marginBottom: '24px' }}>
          {org.isOldContract && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
              color: '#dc2626',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              <strong>⚠️ Old Contract Version:</strong> This organization was created with an older version of the contract that doesn't support the partners list feature. You may have signed the constitution, but the partners list cannot be displayed.
            </div>
          )}
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
                      background: '#6b7280',
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
            margin: '0 0 8px 0', 
            fontSize: '13px', 
            fontWeight: '600', 
            color: '#232946' 
          }}>
            Organization Details
          </h3>
          <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.4' }}>
            <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong>Creator:</strong> 
              <span>{org.creator}</span>
              {account && org.creator.toLowerCase() === account.toLowerCase() && (
                <span style={{ 
                  fontSize: '9px', 
                  color: '#fff',
                  background: '#6b7280',
                  padding: '1px 4px',
                  borderRadius: '3px'
                }}>
                  You
                </span>
              )}
            </div>
            <div style={{ marginBottom: '4px' }}>
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

// Create Organization Modal Component
function CreateOrganizationModal({ open, onClose, account, connecting, connectWallet, form, handleInput, createInitiative, txPending, error, success, createOrgNameInputRef, createOrgTooltipVisible, showCreateOrgTooltip, hideCreateOrgTooltipImmediately, modalSuccess }) {
  if (!open) return null;
  
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
          maxWidth: '500px',
          width: '100%',
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
        >
          ×
        </button>

        {/* Header */}
        <h2 style={{ 
          margin: '0 0 24px 0', 
          fontSize: '24px', 
          fontWeight: '700', 
          color: '#232946',
          textAlign: 'center'
        }}>
          Create New Organization
        </h2>

        {/* Content */}
        {modalSuccess ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              color: '#4ecdc4', 
              fontSize: '48px', 
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              ✅
            </div>
            <h3 style={{ 
              color: '#232946', 
              fontSize: '20px', 
              fontWeight: '700',
              marginBottom: '16px'
            }}>
              Organization Created!
            </h3>
            <p style={{ 
              color: '#666', 
              marginBottom: '24px',
              fontSize: '14px',
              wordBreak: 'break-all'
            }}>
              {modalSuccess}
            </p>
            <button 
              style={{
                background: '#4ecdc4',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%'
              }} 
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : !account ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Connect your wallet to create a new Holacracy organization
            </p>
            <button 
              style={{
                background: '#4ecdc4',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%'
              }} 
              onClick={connectWallet} 
              disabled={connecting}
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        ) : (
          <form onSubmit={createInitiative}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600', 
                color: '#232946',
                fontSize: '14px'
              }}>
                Organization Name
              </label>
              <input 
                ref={createOrgNameInputRef}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }} 
                name="name" 
                value={form.name} 
                onChange={handleInput} 
                required 
                disabled={txPending} 
                placeholder="e.g., Regen DAO"
                autoComplete="off"
                onMouseEnter={showCreateOrgTooltip}
                onMouseLeave={hideCreateOrgTooltipImmediately}
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600', 
                color: '#232946',
                fontSize: '14px'
              }}>
                Organization Purpose
              </label>
              <input 
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }} 
                name="purpose" 
                value={form.purpose} 
                onChange={handleInput} 
                required 
                disabled={txPending} 
                placeholder="e.g., To catalyze regenerative collaboration"
                autoComplete="off"
              />
            </div>

            {error && <div style={{ color: '#e63946', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                disabled={txPending}
              >
                Cancel
              </button>
              <button 
                type="submit"
                style={{
                  flex: 1,
                  background: '#4ecdc4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }} 
                disabled={txPending}
              >
                {txPending ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </form>
        )}

        {/* Tooltip for name field */}
        <OverlayPortal
          anchorRef={createOrgNameInputRef}
          visible={createOrgTooltipVisible}
          style={{
            ...holacracyInfoboxOverlayStyle,
            minWidth: '280px',
            maxWidth: '320px',
            padding: '12px 16px',
            fontSize: '13px'
          }}
          onMouseEnter={showCreateOrgTooltip}
          onMouseLeave={hideCreateOrgTooltipImmediately}
        >
          Name and purpose can also be changed after the organization is created. Your choices here don't need to be final.
        </OverlayPortal>

      </div>
    </div>,
    document.body
  );
}

// Info Modal Component
function InfoModal({ open, onClose }) {
  if (!open) return null;
  
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
          maxWidth: '700px',
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
        >
          ×
        </button>

        {/* Header */}
        <h2 style={{ 
          margin: '0 0 24px 0', 
          fontSize: '24px', 
          fontWeight: '700', 
          color: '#232946',
          textAlign: 'center'
        }}>
          How This DApp Works
        </h2>

        {/* Content */}
        <div style={{ color: '#888', fontSize: 15, textAlign: 'justify', lineHeight: 1.6 }}>
          <div style={{ marginBottom: '20px' }}>
            <b style={{ color: '#232946', fontSize: '16px' }}>How This DApp Works:</b><br/><br/>
            <b>Creating Organizations:</b> Click the "Create New Organization" button below to define a name and purpose. Organizations are deployed as smart contracts on the Sepolia testnet using upgradeable proxy patterns for security and flexibility.<br/><br/>
            <b>Constitution Signing:</b> Once created, organizations require partners to sign the <a href="https://www.holacracy.org/constitution/5-0/" target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>Holacracy Constitution</a> to become active participants. This creates legally binding agreements and establishes governance structures.<br/><br/>
            <b>Participation:</b> Founders are initial signers who launch the organization. Partners can join later by signing the constitution. All participants operate under clear roles, accountabilities, and governance processes defined by the Holacracy framework.<br/><br/>
            <b>Organization Management:</b> Creators can update organization details, archive/unarchive organizations, and manage the overall structure. All actions are recorded on the blockchain for transparency and auditability.
          </div>
          
          <div style={{ 
            padding: '16px', 
            background: '#f0f9ff', 
            border: '1px solid #0ea5e9', 
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            <b style={{ color: '#0c4a6e', fontSize: '14px' }}>Smart Contract Architecture:</b><br/><br/>
            <strong>Network:</strong> Sepolia Testnet<br/><br/>
            
            <b style={{ color: '#0c4a6e' }}>Core Contracts:</b><br/>
            <div style={{ marginBottom: '16px' }}>
              <strong>Organization Implementation:</strong> <a href={`https://sepolia.etherscan.io/address/${addresses.ORGANIZATION_IMPLEMENTATION}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>{addresses.ORGANIZATION_IMPLEMENTATION.slice(0, 8)}...{addresses.ORGANIZATION_IMPLEMENTATION.slice(-6)}</a><br/>
              <div style={{ marginLeft: '20px', marginTop: '4px' }}>
                <em>Contains the core logic for constitution signing, partner management, and organization operations. Shared by all organizations.</em>
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong>Organization Beacon:</strong> <a href={`https://sepolia.etherscan.io/address/${addresses.ORGANIZATION_BEACON}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>{addresses.ORGANIZATION_BEACON.slice(0, 8)}...{addresses.ORGANIZATION_BEACON.slice(-6)}</a><br/>
              <div style={{ marginLeft: '20px', marginTop: '4px' }}>
                <em>Manages the implementation address for all organization contracts. Each organization gets its own beacon proxy contract.</em>
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong>Factory Proxy:</strong> <a href={`https://sepolia.etherscan.io/address/${addresses.HOLACRACY_FACTORY}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>{addresses.HOLACRACY_FACTORY.slice(0, 8)}...{addresses.HOLACRACY_FACTORY.slice(-6)}</a><br/>
              <div style={{ marginLeft: '20px', marginTop: '4px' }}>
                <em>Entry point for creating new organizations. Uses transparent proxy pattern for upgradeability.</em>
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong>Factory Implementation:</strong> <a href={`https://sepolia.etherscan.io/address/${addresses.HOLACRACY_FACTORY_IMPLEMENTATION}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>{addresses.HOLACRACY_FACTORY_IMPLEMENTATION.slice(0, 8)}...{addresses.HOLACRACY_FACTORY_IMPLEMENTATION.slice(-6)}</a><br/>
              <div style={{ marginLeft: '20px', marginTop: '4px' }}>
                <em>Contains the logic for launching organizations and managing their metadata.</em>
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong>Factory Proxy Admin:</strong> <a href={`https://sepolia.etherscan.io/address/${addresses.HOLACRACY_FACTORY_PROXY_ADMIN}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4ecdc4', textDecoration: 'underline' }}>{addresses.HOLACRACY_FACTORY_PROXY_ADMIN.slice(0, 8)}...{addresses.HOLACRACY_FACTORY_PROXY_ADMIN.slice(-6)}</a><br/>
              <div style={{ marginLeft: '20px', marginTop: '4px' }}>
                <em>Controls factory upgrades and admin functions.</em>
              </div>
            </div>
            
            <b style={{ color: '#0c4a6e' }}>How It Works:</b><br/>
            • <strong>Organization Creation:</strong> Factory proxy deploys beacon proxies for each organization<br/>
            • <strong>Individual Contracts:</strong> Each organization gets its own derived contract (beacon proxy) with unique storage<br/>
            • <strong>Shared Logic:</strong> All organizations share the same implementation contract but have separate data<br/>
            • <strong>Upgradeability:</strong> Beacon pattern allows all organizations to be upgraded simultaneously<br/>
            • <strong>Security:</strong> Transparent proxy pattern separates logic from storage<br/>
            • <strong>Gas Efficiency:</strong> Beacon proxies minimize deployment costs for new organizations
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
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", purpose: "" });
  const [txPending, setTxPending] = useState(false);
  const [txType, setTxType] = useState(""); // Track transaction type
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

  const [showArchived, setShowArchived] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgDetailsOverlayOpen, setOrgDetailsOverlayOpen] = useState(false);
  const [constitutionSigningModal, setConstitutionSigningModal] = useState({ open: false, org: null });
  const [createOrgTooltipVisible, setCreateOrgTooltipVisible] = useState(false);
  const createOrgTooltipTimer = React.useRef();

  const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false);
  const [createOrgModalSuccess, setCreateOrgModalSuccess] = useState("");
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [walletConnectProvider, setWalletConnectProvider] = useState(null);
  const nameInputRef = React.useRef();
  const purposeInputRef = React.useRef();
  const createOrgNameInputRef = React.useRef();

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

  const showCreateOrgTooltip = () => {
    if (createOrgTooltipTimer.current) {
      clearTimeout(createOrgTooltipTimer.current);
      createOrgTooltipTimer.current = null;
    }
    setCreateOrgTooltipVisible(true);
  };

  const hideCreateOrgTooltipImmediately = () => {
    if (createOrgTooltipTimer.current) {
      clearTimeout(createOrgTooltipTimer.current);
      createOrgTooltipTimer.current = null;
    }
    setCreateOrgTooltipVisible(false);
  };

  // Set up a read-only provider and contract for reading initiatives
  useEffect(() => {
    // Use a robust Sepolia RPC endpoint (Infura/Alchemy). Set REACT_APP_SEPOLIA_RPC_URL in your .env file.
    const rpcUrl = process.env.REACT_APP_SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_INFURA_KEY";
    const readProvider = new ethers.JsonRpcProvider(rpcUrl);
    const readFac = new ethers.Contract(addresses.HOLACRACY_FACTORY, getAbiArray(factoryArtifact), readProvider);
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
      // Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // On mobile, prefer WalletConnect for better compatibility
      if (isMobile) {
        try {
          console.log('Mobile detected, using WalletConnect...');
          const provider = await EthereumProvider.init({
            projectId: 'c4f79cc821944d9680842e34466bfbd9', // Public test project ID
            chains: [11155111], // Sepolia chain ID
            showQrModal: true,
            metadata: {
              name: 'Holacracy DApp',
              description: 'Holacracy Organization Creation & Participation DApp',
              url: window.location.host,
              icons: ['https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Logo/Blue%20(Default)/Logo.svg']
            }
          });
          
          await provider.connect();
          setWalletConnectProvider(provider);
          
          const ethersProvider = new ethers.BrowserProvider(provider);
          const accounts = await ethersProvider.listAccounts();
          setAccount(accounts[0].address);
          
          const net = await ethersProvider.getNetwork();
          if (net.chainId.toString() !== SEPOLIA_CHAIN_ID) {
            setError("Please switch to the Sepolia network in your wallet.");
            setConnecting(false);
            return;
          }
          
          const sign = await ethersProvider.getSigner();
          const fac = new ethers.Contract(addresses.HOLACRACY_FACTORY, getAbiArray(factoryArtifact), sign);
          setFactory(fac);
        } catch (wcError) {
          console.error('WalletConnect error:', wcError);
          setError("Failed to connect with WalletConnect. Please try again or use MetaMask.");
        }
      } else {
        // On desktop, try MetaMask first
        if (window.ethereum) {
          const prov = new ethers.BrowserProvider(window.ethereum);
          const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
          setAccount(accs[0]);
          const net = await prov.getNetwork();
          if (net.chainId.toString() !== SEPOLIA_CHAIN_ID) {
            setError("Please switch to the Sepolia network in your wallet.");
            setConnecting(false);
            return;
          }
          const sign = await prov.getSigner();
          const fac = new ethers.Contract(addresses.HOLACRACY_FACTORY, getAbiArray(factoryArtifact), sign);
          setFactory(fac);
        } else {
          // Desktop fallback to WalletConnect
          try {
            const provider = await EthereumProvider.init({
              projectId: 'c4f79cc821944d9680842e34466bfbd9',
              chains: [11155111],
              showQrModal: true,
              metadata: {
                name: 'Holacracy DApp',
                description: 'Holacracy Organization Creation & Participation DApp',
                url: window.location.host,
                icons: ['https://raw.githubusercontent.com/WalletConnect/walletconnect-assets/master/Logo/Blue%20(Default)/Logo.svg']
              }
            });
            
            await provider.connect();
            setWalletConnectProvider(provider);
            
            const ethersProvider = new ethers.BrowserProvider(provider);
            const accounts = await ethersProvider.listAccounts();
            setAccount(accounts[0].address);
            
            const net = await ethersProvider.getNetwork();
            if (net.chainId.toString() !== SEPOLIA_CHAIN_ID) {
              setError("Please switch to the Sepolia network in your wallet.");
              setConnecting(false);
              return;
            }
            
            const sign = await ethersProvider.getSigner();
            const fac = new ethers.Contract(addresses.HOLACRACY_FACTORY, getAbiArray(factoryArtifact), sign);
            setFactory(fac);
          } catch (wcError) {
            console.error('WalletConnect error:', wcError);
            setError("Failed to connect with WalletConnect. Please try again or use MetaMask.");
          }
        }
      }
    } catch (e) {
      console.error('Wallet connection error:', e);
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
    setTxType("create");
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
      setCreateOrgModalSuccess(`Organization launched! Address: ${orgAddress}`);
      setForm({ name: "", purpose: "" });
      setReloadKey(k => k + 1); // trigger reload
    } catch (e) {
      setError("Failed to launch organization: " + (e?.info?.error?.message || e.message));
    }
    setTxPending(false);
    setTxType("");
  };



  // Load organizations (launched initiatives) - OPTIMIZED VERSION
  const loadOrgs = useCallback(async () => {
    const contract = factory || readFactory;
    if (!contract) return;
    setError("");
    setOrgsLoading(true);
    try {
      const count = await contract.getOrganizationListCount();
      
      // Step 1: Get all organization metadata in parallel
      const metadataPromises = [];
      for (let i = 0; i < count; i++) {
        metadataPromises.push(contract.getOrganizationMetadata(i));
      }
      const allMetadata = await Promise.all(metadataPromises);
      
      // Step 2: Process all organizations in parallel
      const orgPromises = allMetadata.map(async ([name, purpose, creator, orgAddress], index) => {
        // Skip invalid addresses
        if (!orgAddress || orgAddress === ethers.ZeroAddress) {
          console.warn(`No organization address found for metadata ${index}`);
          return null;
        }
        
        try {
          const runner = contract.runner;
          const orgContract = new ethers.Contract(orgAddress, getAbiArray(orgArtifact), runner);
          
          // Get all organization data in parallel
          const [orgName, orgPurpose, archived] = await Promise.all([
            orgContract.name(),
            orgContract.purpose(),
            orgContract.archived()
          ]);
          
          // Try to get partners list - handle old contracts that might not have this function
          let currentPartners = [];
          try {
            currentPartners = await orgContract.getPartners();
          } catch (error) {
            // If getPartners doesn't exist, try getConstitutionSigners
            try {
              currentPartners = await orgContract.getConstitutionSigners();
            } catch (error2) {
              // If neither function exists, this is an old contract
              console.warn(`Old contract detected for ${orgAddress}: ${error2.message}`);
              // For old contracts, we'll use an empty array and show a note
              currentPartners = [];
            }
          }
          
          const orgData = {
            id: index,
            name,
            purpose,
            partners: currentPartners,
            creator,
            address: orgAddress,
            onChainDetails: { name: orgName, purpose: orgPurpose },
            archived: archived,
            isOldContract: currentPartners.length === 0 && orgAddress === "0xdb0A7b0966626074F89822307d65382198E6b41B"
          };
          
          // Debug logging for archive status
          if (archived) {
            console.log(`🔍 Organization ${orgName} (${orgAddress}) is archived:`, archived);
          }
          
          return orgData;
        } catch (e) {
          // If we can't load from organization contract, skip this organization
          console.warn(`Could not load organization data for ${orgAddress}:`, e.message);
          return null;
        }
      });
      
      // Step 3: Wait for all organizations to load and filter out nulls
      const orgResults = await Promise.all(orgPromises);
      const arr = orgResults.filter(org => org !== null);
      
      setOrgs(arr);
    } catch (e) {
      if (e.message && e.message.toLowerCase().includes('failed to fetch')) {
        setError("Failed to load organizations: check your connection");
      } else {
        setError("Failed to load organizations: " + e.message);
      }
    } finally {
      setOrgsLoading(false);
    }
  }, [factory, readFactory]);

  useEffect(() => {
    loadOrgs();
  }, [factory, readFactory, txPending, loadOrgs, reloadKey]);

  // Helper to check if any transaction is pending
  const anyTxPending = txPending;

  // Enhanced constitution signing function
  const handleEnhancedConstitutionSigning = async (signature) => {
    setTxPending(true);
    setTxType("sign");
    try {
      // Get the organization contract with proper signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const orgContract = new ethers.Contract(signature.payload.organizationAddress, getAbiArray(orgArtifact), signer);
      
      // Call the enhanced signing function
      const tx = await orgContract.signConstitutionWithDocument(
        signature.payload.documentHash,
        signature.signatureHash,
        signature.payload.constitutionVersion,
        signature.payload.consentStatement
      );
      await tx.wait();
      
      // Refresh the organization data
      loadOrgs();
      
      console.log('Constitution signed successfully with enhanced legal validity');
    } catch (error) {
      console.error('Error signing constitution:', error);
      
      // Provide more specific error messages
      if (error?.reason) {
        throw new Error(error.reason);
      } else if (error?.message) {
        // Check for specific error messages
        if (error.message.includes('Cannot sign constitution of archived organization')) {
          throw new Error('Cannot sign constitution: This organization has been archived. Please contact the organization creator to unarchive it.');
        } else if (error.message.includes('Already signed constitution')) {
          throw new Error('You have already signed the constitution for this organization.');
        } else if (error.message.includes('User rejected')) {
          throw new Error('Transaction was cancelled.');
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    } finally {
      setTxPending(false);
      setTxType("");
    }
  };



  // OrganizationActions component - dropdown menu for all organization interactions
  // ArchiveOrganizationForm component for archive/unarchive functionality
  function ArchiveOrganizationForm({ orgAddress, orgCreator, onUpdate, account }) {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isArchived, setIsArchived] = useState(false);

    // Check if current user is the creator
    const isCreator = account && orgCreator && account.toLowerCase() === orgCreator.toLowerCase();

    // Load current archive status
    useEffect(() => {
      const loadArchiveStatus = async () => {
        if (!orgAddress) return;
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const orgContract = new ethers.Contract(orgAddress, getAbiArray(orgArtifact), provider);
          const archived = await orgContract.archived();
          setIsArchived(archived);
        } catch (e) {
          console.error("Error loading archive status:", e);
        }
      };
      loadArchiveStatus();
    }, [orgAddress]);

    const handleArchive = async () => {
      setPending(true);
      setError("");
      setSuccess("");

      try {
        if (!account) {
          setError("Please connect your wallet first.");
          setPending(false);
          return;
        }

        if (!isCreator) {
          setError("Only the organization creator can archive this organization.");
          setPending(false);
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const orgContract = new ethers.Contract(orgAddress, getAbiArray(orgArtifact), signer);
        
        const tx = await orgContract.archiveOrganization();
        await tx.wait();
        
        setSuccess("Organization archived successfully!");
        setIsArchived(true);
        
        // Add a small delay to ensure the transaction is processed
        setTimeout(() => {
          onUpdate(); // Refresh the parent component
        }, 1000);
      } catch (e) {
        console.error("Archive error:", e);
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

    const handleUnarchive = async () => {
      setPending(true);
      setError("");
      setSuccess("");

      try {
        if (!account) {
          setError("Please connect your wallet first.");
          setPending(false);
          return;
        }

        if (!isCreator) {
          setError("Only the organization creator can unarchive this organization.");
          setPending(false);
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const orgContract = new ethers.Contract(orgAddress, getAbiArray(orgArtifact), signer);
        
        const tx = await orgContract.unarchiveOrganization();
        await tx.wait();
        
        setSuccess("Organization unarchived successfully!");
        setIsArchived(false);
        
        // Add a small delay to ensure the transaction is processed
        setTimeout(() => {
          onUpdate(); // Refresh the parent component
        }, 1000);
      } catch (e) {
        console.error("Unarchive error:", e);
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

    if (!isCreator) {
      return (
        <div style={{ textAlign: 'center', color: '#888', padding: '20px 0' }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>🔒</div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>Archive access restricted</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>
            Only the organization creator can archive/unarchive this organization
          </div>
        </div>
      );
    }

    return (
      <>
        <TransactionPendingOverlay open={pending} message={isArchived ? "Unarchiving organization..." : "Archiving organization..."} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          <div style={{ 
            padding: '16px', 
            background: isArchived ? '#fef3c7' : '#fee2e2', 
            border: `1px solid ${isArchived ? '#f59e0b' : '#f87171'}`, 
            borderRadius: 6,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>
              {isArchived ? '📦' : '⚠️'}
            </div>
            <div style={{ fontSize: 15, marginBottom: 8, fontWeight: 600 }}>
              {isArchived ? 'Organization is Archived' : 'Archive Organization'}
            </div>
            <div style={{ fontSize: 13, color: '#666' }}>
              {isArchived 
                ? 'This organization is currently archived and hidden from the main list. You can unarchive it to make it visible again.'
                : 'Archiving will hide this organization from the main list. The organization data will be preserved and can be restored later.'
              }
            </div>
          </div>
          
          <button 
            style={{ 
              ...styles.button, 
              background: isArchived ? '#4ecdc4' : '#dc2626',
              opacity: pending ? 0.6 : 1
            }} 
            onClick={isArchived ? handleUnarchive : handleArchive}
            disabled={pending}
          >
            {isArchived ? 'Unarchive Organization' : 'Archive Organization'}
          </button>
          
          {error && <div style={{ color: '#e63946', fontSize: 14 }}>{error}</div>}
          {success && <div style={{ color: '#4ecdc4', fontSize: 14 }}>{success}</div>}
        </div>
      </>
    );
  }

  function OrganizationActions({ org, onUpdate }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(null);
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
                              cursor: 'pointer',
                              width: '100%'
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              
                              // Check if wallet is connected
                              if (!account) {
                                alert('Please connect your wallet first before signing the constitution.');
                                return;
                              }
                              
                              // Check if organization is archived (this shouldn't happen but just in case)
                              if (org.archived) {
                                alert('Cannot sign constitution: This organization has been archived. Please contact the organization creator to unarchive it.');
                                return;
                              }
                              
                              // Open constitution signing modal
                              setConstitutionSigningModal({ open: true, org: org });
                              setIsOpen(false);
                              setActiveTab(null);
                            }}
                          >
                            Sign the Constitution to Join as a Partner
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
              <button
                onClick={() => setActiveTab('archive')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: activeTab === 'archive' ? '#4ecdc4' : 'transparent',
                  color: activeTab === 'archive' ? '#fff' : '#232946',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Archive
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
              {activeTab === 'archive' && (
                <ArchiveOrganizationForm 
                  orgAddress={org.address}
                  orgCreator={org.creator}
                  onUpdate={onUpdate}
                  account={account}
                />
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
                        open={txPending} 
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
              ref={nameInputRef}
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
              ref={purposeInputRef}
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



  const handleCloseCreateModal = () => {
    setCreateOrgModalOpen(false);
    setCreateOrgModalSuccess("");
  };

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
                    alignRight={true}
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <button
                  style={{ background: '#4ecdc4', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}
                  onClick={connectWallet}
                >
                  Connect Wallet
                </button>
              </div>
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

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        open={createOrgModalOpen}
        onClose={handleCloseCreateModal}
        account={account}
        connecting={connecting}
        connectWallet={connectWallet}
        form={form}
        handleInput={handleInput}
        createInitiative={createInitiative}
        txPending={txPending}
        error={error}
        success={success}
        createOrgNameInputRef={createOrgNameInputRef}
        createOrgTooltipVisible={createOrgTooltipVisible}
        showCreateOrgTooltip={showCreateOrgTooltip}
        hideCreateOrgTooltipImmediately={hideCreateOrgTooltipImmediately}
        modalSuccess={createOrgModalSuccess}
      />

      {/* Info Modal */}
      <InfoModal
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
      />
      <div style={styles.section}>
        <div style={{ 
          display: 'flex', 
          flexDirection: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'column' : 'row',
          alignItems: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'center' : 'center',
          justifyContent: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'flex-start' : 'space-between',
          marginBottom: 20, 
          marginTop: 8, 
          position: 'relative',
          paddingLeft: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '8px' : '0',
          paddingRight: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '8px' : '0'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            marginBottom: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 12 : 0
          }}>
            <span style={{ 
              color: '#232946', 
              fontSize: 22, 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              height: 22,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>Holacracy Organizations</span>
            <button
              onClick={() => setInfoModalOpen(true)}
              style={{ background: 'none', border: 'none', color: '#4ecdc4', fontWeight: 600, fontSize: 14, cursor: 'pointer', textAlign: 'left', outline: 'none', display: 'flex', alignItems: 'center', gap: 6, margin: 0, padding: 0 }}
            >
              <span style={{ textAlign: 'left', display: 'block', color: '#4ecdc4' }}>▶ Info</span>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4, 
              cursor: 'pointer',
              fontSize: '12px',
              color: '#9ca3af',
              fontWeight: '400',
              whiteSpace: 'nowrap'
            }}>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                style={{
                  width: '12px',
                  height: '12px',
                  cursor: 'pointer'
                }}
              />
              Show archived
            </label>
          </div>
        </div>
        
        {/* Create Organization Button */}
        <div style={{ 
          display: 'flex', 
          justifyContent: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'center' : 'flex-start', 
          marginBottom: '32px',
          marginTop: '16px'
        }}>
          <button
            onClick={() => {
              setCreateOrgModalOpen(true);
              setCreateOrgModalSuccess(""); // Clear any previous success message
              setSuccess(""); // Also clear the general success state
            }}
            style={{
              background: '#4ecdc4',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 3px 8px rgba(78, 205, 196, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(78, 205, 196, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(78, 205, 196, 0.3)';
            }}
          >
            ➕ Create New Organization
          </button>
        </div>
        {/* Organizations List - Always Visible */}
        {orgsLoading ? (
          <div style={{ 
            color: '#888', 
            marginTop: 8, 
            textAlign: 'center',
            padding: '20px',
            fontSize: '14px'
          }}>
            <div 
              className="loading-spinner"
              style={{ 
                display: 'inline-block',
                width: '20px',
                height: '20px',
                border: '2px solid #e3eaf2',
                borderTop: '2px solid #4ecdc4',
                borderRadius: '50%',
                marginRight: '8px'
              }}
            ></div>
            Loading organizations...
          </div>
        ) : orgs.length === 0 ? (
          <div style={{ color: '#888', marginTop: 8 }}>No organizations deployed yet.</div>
        ) : (
          // Filter organizations based on showArchived checkbox
          orgs
            .filter(org => showArchived || !org.archived)
            .map((org, idx) => (
            <div key={org.id} style={{
              ...styles.initiativeCard,
              ...(org.archived && {
                background: '#fef2f2',
                border: '1px solid #fecaca',
                opacity: 0.8
              })
            }}>
              <div
                style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer', padding: '8px 0' }}
                onClick={() => {
                  setSelectedOrg(org);
                  setOrgDetailsOverlayOpen(true);
                }}
              >
                <div style={{ flex: 1, minWidth: 0, paddingLeft: 12 }}>
                  <div style={{ fontSize: 14, color: '#232946' }}>
                    <div style={{ marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600 }}>{org.onChainDetails ? org.onChainDetails.name : org.name}</span>
                      {org.archived && (
                        <span style={{ 
                          background: '#dc2626', 
                          color: '#ffffff', 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontSize: '12px', 
                          fontWeight: '700', 
                          marginLeft: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          ⚠️ Archived
                        </span>
                      )}
                      {org.isOldContract && (
                        <span style={{ 
                          background: '#fee2e2', 
                          color: '#dc2626', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: '600', 
                          marginLeft: '8px' 
                        }}>
                          OLD CONTRACT
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#4a5568', lineHeight: '1.4' }}>
                      {org.onChainDetails ? org.onChainDetails.purpose : org.purpose}
                    </div>
                  </div>
                </div>
                <div style={{ 
                  fontSize: 12, 
                  color: '#4ecdc4', 
                  marginLeft: 8,
                  display: 'flex',
                  alignItems: 'flex-start',
                  paddingTop: '2px'
                }}>
                  <span style={{ marginRight: 4 }}>View Details</span>
                  <span>▶</span>
                </div>
              </div>
            </div>
          ))
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
      
      {/* Constitution Signing Modal */}
      <ConstitutionSigningModal
        org={constitutionSigningModal.org}
        open={constitutionSigningModal.open}
        onClose={() => setConstitutionSigningModal({ open: false, org: null })}
        onSign={handleEnhancedConstitutionSigning}
        account={account}
        signingPending={txPending}
        setSigningPending={setTxPending}
      />
      
      {/* Overlay for pending blockchain transaction */}
      <TransactionPendingOverlay
        open={anyTxPending}
        message={
          txType === "create" 
            ? "Creating and deploying your Holacracy organization on the blockchain..." 
            : txType === "sign"
            ? "Processing your constitution signature on the blockchain..."
            : "Processing your transaction on the blockchain..."
        }
      />

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        open={createOrgModalOpen}
        onClose={handleCloseCreateModal}
        account={account}
        connecting={connecting}
        connectWallet={connectWallet}
        form={form}
        handleInput={handleInput}
        createInitiative={createInitiative}
        txPending={txPending}
        error={error}
        success={success}
        createOrgNameInputRef={createOrgNameInputRef}
        createOrgTooltipVisible={createOrgTooltipVisible}
        showCreateOrgTooltip={showCreateOrgTooltip}
        hideCreateOrgTooltipImmediately={hideCreateOrgTooltipImmediately}
        modalSuccess={createOrgModalSuccess}
      />
    </div>
  );
}

export default App;
