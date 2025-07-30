import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

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
  const [constitutionText, setConstitutionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showFullConstitution, setShowFullConstitution] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setHasReadConstitution(false);
      setExplicitConsent(false);
      setScrollPosition(0);
      setShowFullConstitution(false);
      loadConstitutionText();
    }
  }, [open]);

  const loadConstitutionText = async () => {
    setLoading(true);
    try {
      // Note: We're using hardcoded constitution text instead of fetching from the API
      // In production, you'd want to use a proper API or store the text locally
      // const response = await fetch('https://www.holacracy.org/constitution/5-0/');
      // const html = await response.text();
      
      // Extract the main content (this is a simplified approach)
      // In production, you'd want to use a proper API or store the text locally
      const constitutionContent = `
HOLACRACY CONSTITUTION v5.0

PREAMBLE
The Ratifiers of this Constitution are adopting it as the formal authority structure for the Organization, and they are doing so with the following intentions and understandings:

1.1 PURPOSE
This Constitution defines the rules and processes for the Organization's governance and operations. The Organization will be run by the authority structure defined in this Constitution, and no other authority structure has power over the Organization's governance or operations, except as specifically defined in this Constitution.

1.2 CORE AUTHORITY
The Organization's Partners have the authority to take any action or make any decision to pursue the Organization's Purpose, as long as they don't break the rules defined in this Constitution or any Policy.

1.3 ROLES AND ACCOUNTABILITIES
The Organization's work is divided into Roles, which are defined by their Purpose, Domains, and Accountabilities. Each Role has the authority to take any action to express its Purpose or Accountabilities, as long as it doesn't break the rules defined in this Constitution or any Policy.

1.4 GOVERNANCE PROCESS
The Organization's governance is processed through a structured governance process that allows Partners to propose changes to the Organization's structure and processes.

1.5 OPERATIONAL PROCESS
The Organization's day-to-day operations are processed through a structured operational process that allows Partners to coordinate their work and make decisions.

1.6 PARTNER AUTHORITY
Partners have the authority to:
- Take any action to express the Organization's Purpose
- Make any decision within their Roles
- Propose changes to governance
- Object to governance proposals that would cause harm
- Request information needed to fulfill their Roles

1.7 CONSTITUTION AMENDMENTS
This Constitution can only be amended through a formal amendment process that requires broad consensus among Partners.

By signing this Constitution, I acknowledge that I have read and understood its contents, and I agree to be bound by its terms and conditions in my participation in this Organization.
      `;
      
      setConstitutionText(constitutionContent);
    } catch (error) {
      console.error('Error loading constitution:', error);
      // Fallback to basic constitution text
      setConstitutionText(`
HOLACRACY CONSTITUTION v5.0

By signing this Constitution, I acknowledge that I have read and understood the Holacracy Constitution v5.0, and I agree to be bound by its terms and conditions in my participation in this Organization.

I understand that in a Holacracy, all authority derives from the Constitution, not from individuals, and I commit to operating within this framework.
      `);
    }
    setLoading(false);
  };

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
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        maxWidth: '800px',
        width: '100%',
        maxHeight: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '95vh' : '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        margin: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '8px' : '0'
      }}>
        {/* Header */}
        <div style={{
          padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '16px 12px 8px 12px' : '24px 32px 16px 32px',
          borderBottom: '1px solid #e3eaf2',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '20px' : '24px',
            fontWeight: '700',
            color: '#232946'
          }}>
            Sign Holacracy Constitution
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#888',
              padding: '4px',
              borderRadius: '4px'
            }}
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          {loading ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#888'
            }}>
              Loading constitution...
            </div>
          ) : (
            <>
              {/* Constitution Display */}
              <div style={{
                flex: 1,
                padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '12px' : '24px 32px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0
              }}>
                <div style={{
                  marginBottom: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '12px' : '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'wrap' : 'nowrap',
                  gap: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '8px' : '0'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '16px' : '18px',
                    fontWeight: '600',
                    color: '#232946'
                  }}>
                    Constitution Text
                  </h3>
                  <button
                    onClick={() => setShowFullConstitution(!showFullConstitution)}
                    style={{
                      background: '#4ecdc4',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '6px 12px' : '8px 16px',
                      fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '12px' : '14px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {showFullConstitution ? 'Summary' : 'Full Text'}
                  </button>
                </div>

                <div style={{
                  height: showFullConstitution ? (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '350px' : '400px') : (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '200px' : '200px'),
                  overflow: 'auto',
                  overflowY: 'scroll',
                  WebkitOverflowScrolling: 'touch',
                  border: '1px solid #e3eaf2',
                  borderRadius: '8px',
                  padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '10px' : '16px',
                  background: '#f7fafd',
                  fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '13px' : '14px',
                  lineHeight: '1.6',
                  color: '#232946'
                }} onScroll={handleScroll}>
                  <pre style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit'
                  }}>
                    {constitutionText}
                  </pre>
                </div>

                {!showFullConstitution && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#888',
                    textAlign: 'center'
                  }}>
                    Scroll to read full constitution • {Math.round(scrollPosition)}% read
                  </div>
                )}
              </div>

              {/* Consent Section */}
              <div style={{
                padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '10px 12px' : '16px 32px',
                borderTop: '1px solid #e3eaf2',
                background: '#f7fafd'
              }}>
                <div style={{
                  marginBottom: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '12px' : '16px'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    cursor: 'pointer',
                    fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '13px' : '14px',
                    lineHeight: '1.5'
                  }}>
                    <input
                      type="checkbox"
                      checked={hasReadConstitution}
                      onChange={(e) => setHasReadConstitution(e.target.checked)}
                      style={{
                        marginTop: '2px'
                      }}
                    />
                    <span>
                      <strong>I confirm that I have read the entire Holacracy Constitution v5.0</strong> 
                      and understand its contents, including the governance and operational processes.
                    </span>
                  </label>
                </div>

                <div style={{
                  marginBottom: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '12px' : '16px'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    cursor: 'pointer',
                    fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '13px' : '14px',
                    lineHeight: '1.5'
                  }}>
                    <input
                      type="checkbox"
                      checked={explicitConsent}
                      onChange={(e) => setExplicitConsent(e.target.checked)}
                      style={{
                        marginTop: '2px'
                      }}
                    />
                    <span>
                      <strong>I explicitly consent to be bound by the Holacracy Constitution v5.0</strong> 
                      and agree to operate within this governance framework as a partner in this organization. 
                      I understand that in a Holacracy, all authority derives from the Constitution, not from individuals.
                    </span>
                  </label>
                </div>

                <div style={{
                  padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '10px' : '12px',
                  background: '#e3eaf2',
                  borderRadius: '6px',
                  fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '12px' : '13px',
                  color: '#4a5568',
                  lineHeight: '1.4'
                }}>
                  <strong>Legal Notice:</strong> By signing this constitution, you are creating a legally binding agreement. 
                  This signature will be recorded on the blockchain and stored securely. You acknowledge that this electronic 
                  signature has the same legal effect as a handwritten signature.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '12px' : '24px 32px',
          borderTop: '1px solid #e3eaf2',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '8px' : '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #e3eaf2',
              borderRadius: '6px',
              padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '10px 16px' : '12px 24px',
              fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '13px' : '14px',
              fontWeight: '600',
              cursor: 'pointer',
              color: '#4a5568'
            }}
            disabled={signingPending}
          >
            Cancel
          </button>
          <button
            onClick={handleSignConstitution}
            disabled={!hasReadConstitution || !explicitConsent || signingPending}
            style={{
              background: hasReadConstitution && explicitConsent && !signingPending ? '#4ecdc4' : '#e3eaf2',
              color: hasReadConstitution && explicitConsent && !signingPending ? '#fff' : '#888',
              border: 'none',
              borderRadius: '6px',
              padding: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '10px 16px' : '12px 24px',
              fontSize: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '13px' : '14px',
              fontWeight: '600',
              cursor: hasReadConstitution && explicitConsent && !signingPending ? 'pointer' : 'not-allowed'
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