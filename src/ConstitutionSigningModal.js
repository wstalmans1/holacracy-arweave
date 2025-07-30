import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { constitutionText } from './constitutionText';

const ConstitutionSigningModal = ({ 
  org, 
  open, 
  onClose, 
  onSign, 
  account, 
  signingPending, 
  setSigningPending 
}) => {
  const [hasReadConstitution, setHasReadConstitution] = useState(false);
  const [explicitConsent, setExplicitConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setHasReadConstitution(false);
      setExplicitConsent(false);
      setScrollPosition(0);
      setLoading(false);
    }
  }, [open]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setScrollPosition(scrollPercentage);
  };

  const createDigitalSignature = async () => {
    try {
      // Create a comprehensive signature payload
      const signaturePayload = {
        constitutionVersion: "5.0",
        organizationAddress: org.address,
        organizationName: org.onChainDetails ? org.onChainDetails.name : org.name,
        signerAddress: account,
        timestamp: Date.now(),
        consentStatement: "I have read and agree to be bound by the Holacracy Constitution v5.0",
        documentHash: ethers.keccak256(ethers.toUtf8Bytes(constitutionText + account + org.address))
      };

      // Create the signature hash
      const signatureHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(signaturePayload)));
      
      return {
        signatureHash,
        payload: signaturePayload
      };
    } catch (error) {
      console.error('Error creating digital signature:', error);
      throw error;
    }
  };

  const handleSignConstitution = async () => {
    if (!hasReadConstitution || !explicitConsent) {
      alert('You must read the constitution and provide explicit consent before signing.');
      return;
    }

    // Check if organization is archived before attempting to sign
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const orgContract = new ethers.Contract(org.address, [
        "function archived() view returns (bool)"
      ], provider);
      const isArchived = await orgContract.archived();
      
      if (isArchived) {
        alert('Cannot sign constitution: This organization has been archived. Please contact the organization creator to unarchive it.');
        return;
      }
    } catch (error) {
      console.error('Error checking archive status:', error);
      // Continue anyway, the contract will handle the error
    }

    // Use the main txPending state instead of local signingPending
    setSigningPending(true);
    try {
      // Create digital signature
      const signature = await createDigitalSignature();
      
      // Call the enhanced signing function
      await onSign(signature);
      
      // Close modal on success
      onClose();
    } catch (error) {
      console.error('Error signing constitution:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to sign constitution. Please try again.';
      
      if (error?.reason) {
        errorMessage = error.reason;
      } else if (error?.message) {
        // Check for specific error messages
        if (error.message.includes('Cannot sign constitution of archived organization')) {
          errorMessage = 'Cannot sign constitution: This organization has been archived. Please contact the organization creator to unarchive it.';
        } else if (error.message.includes('Already signed constitution')) {
          errorMessage = 'You have already signed the constitution for this organization.';
        } else if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction was cancelled.';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setSigningPending(false);
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '8px' : '0'
    }}>
      <div style={{
        backgroundColor: '#232946',
        borderRadius: 12,
        border: '2px solid #4ecdc4',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        width: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '100%' : '90%',
        maxWidth: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'none' : '800px',
        height: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '100%' : '90vh',
        maxHeight: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '100%' : '90vh',
        margin: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '0' : '0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '16px 12px 8px 12px' : '24px 32px 16px 32px',
          borderBottom: '1px solid #4ecdc4',
          backgroundColor: '#232946',
          flexShrink: 0
        }}>
          <h2 style={{
            margin: 0,
            color: '#4ecdc4',
            fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '20px' : '24px',
            fontWeight: 600,
            textAlign: 'center'
          }}>
            Sign Holacracy Constitution
          </h2>
        </div>

        {/* Main content area - Full height scrolling container */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          {/* Constitution text area - Takes full available space */}
          <div style={{
            flex: 1,
            padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '12px' : '24px 32px',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <div style={{
              fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '13px' : '14px',
              lineHeight: 1.6,
              color: '#b8c1ec',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit'
            }}>
              {constitutionText}
            </div>

            {/* Signing section - At the end of the constitution text */}
            <div style={{
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid #4ecdc4',
              backgroundColor: '#232946'
            }}>
              {/* Consent Section */}
              <div style={{
                marginBottom: '24px'
              }}>
                <h3 style={{
                  color: '#4ecdc4',
                  fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '16px' : '18px',
                  marginBottom: '16px',
                  fontWeight: 600
                }}>
                  Consent to Constitution
                </h3>

                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '16px',
                  cursor: 'pointer',
                  fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '13px' : '14px',
                  lineHeight: 1.5,
                  color: '#b8c1ec'
                }}>
                  <input
                    type="checkbox"
                    checked={hasReadConstitution}
                    onChange={(e) => setHasReadConstitution(e.target.checked)}
                    style={{
                      marginTop: '2px',
                      transform: 'scale(1.2)',
                      accentColor: '#4ecdc4'
                    }}
                  />
                  <span>
                    I confirm that I have read and understood the complete Holacracy Constitution v5.0 above.
                  </span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '16px',
                  cursor: 'pointer',
                  fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '13px' : '14px',
                  lineHeight: 1.5,
                  color: '#b8c1ec'
                }}>
                  <input
                    type="checkbox"
                    checked={explicitConsent}
                    onChange={(e) => setExplicitConsent(e.target.checked)}
                    style={{
                      marginTop: '2px',
                      transform: 'scale(1.2)',
                      accentColor: '#4ecdc4'
                    }}
                  />
                  <span>
                    <strong>I explicitly consent to be bound by the Holacracy Constitution v5.0</strong> 
                    and agree to operate within this governance framework as a partner in this organization, with contract address{' '}
                    <a 
                      href={`https://sepolia.etherscan.io/address/${org?.address}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        color: '#4ecdc4', 
                        textDecoration: 'underline',
                        fontFamily: 'monospace',
                        fontSize: '11px'
                      }}
                    >
                      {org?.address || 'Loading...'}
                    </a>. 
                    I understand that in a Holacracy, all authority derives from the Constitution, not from individuals.
                  </span>
                </label>
              </div>

              {/* Legal Notice */}
              <div style={{
                padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '10px' : '12px',
                fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '12px' : '13px',
                backgroundColor: '#1a1f2e',
                borderRadius: 8,
                border: '1px solid #4a5568',
                color: '#a0aec0',
                marginBottom: '24px'
              }}>
                <strong>Legal Notice:</strong> By signing this constitution, you are entering into a binding agreement to operate within the Holacracy governance framework. This signature is recorded on the blockchain and is legally enforceable.
              </div>
            </div>
          </div>
        </div>

        {/* Footer with buttons */}
        <div style={{
          padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '12px' : '24px 32px',
          borderTop: '1px solid #4ecdc4',
          backgroundColor: '#232946',
          flexShrink: 0,
          gap: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '8px' : '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '10px 16px' : '12px 24px',
              fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '13px' : '14px',
              backgroundColor: 'transparent',
              color: '#4ecdc4',
              border: '1px solid #4ecdc4',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#4ecdc4';
              e.target.style.color = '#232946';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#4ecdc4';
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSignConstitution}
            disabled={!hasReadConstitution || !explicitConsent || signingPending}
            style={{
              padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '10px 16px' : '12px 24px',
              fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '13px' : '14px',
              backgroundColor: hasReadConstitution && explicitConsent && !signingPending ? '#4ecdc4' : '#4a5568',
              color: hasReadConstitution && explicitConsent && !signingPending ? '#232946' : '#a0aec0',
              border: 'none',
              borderRadius: 8,
              cursor: hasReadConstitution && explicitConsent && !signingPending ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              minWidth: '120px'
            }}
            onMouseEnter={(e) => {
              if (hasReadConstitution && explicitConsent && !signingPending) {
                e.target.style.backgroundColor = '#45b7aa';
              }
            }}
            onMouseLeave={(e) => {
              if (hasReadConstitution && explicitConsent && !signingPending) {
                e.target.style.backgroundColor = '#4ecdc4';
              }
            }}
          >
            {signingPending ? 'Signing...' : 'Sign Constitution'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConstitutionSigningModal; 