import React, { useState } from "react";
import { ethers } from "ethers";
import FileRegistryABI from "../abi/FileRegistry.json";

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "0x9C5252B37aA0B5a65949DA888AA0D7128147396B";

function isValidAddress(a) {
  return /^0x[0-9a-fA-F]{40}$/.test(a);
}

export default function RevokeAccess() {
  const [fileId, setFileId] = useState("");
  const [grantee, setGrantee] = useState("");
  const [status, setStatus] = useState("");
  const [connected, setConnected] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function connectWallet() {
    if (!window.ethereum) {
      setStatus("❌ MetaMask not found — install MetaMask and try again.");
      return "";
    }
    try {
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      const a = (accs && accs[0]) || "";
      setConnected(a);
      return a;
    } catch (err) {
      console.error("connect error", err);
      setStatus("❌ Wallet connection rejected or failed.");
      return "";
    }
  }

  function validateInputs() {
    if (!fileId || !/^\d+$/.test(String(fileId).trim())) {
      setStatus("❌ Enter a valid numeric fileId.");
      return false;
    }
    if (!grantee || !isValidAddress(grantee)) {
      setStatus("❌ Enter a valid grantee address (0x...).");
      return false;
    }
    if (!CONTRACT_ADDRESS) {
      setStatus("❌ Frontend missing contract address.");
      return false;
    }
    if (!FileRegistryABI || !FileRegistryABI.abi) {
      setStatus("❌ Missing ABI at src/abi/FileRegistry.json.");
      return false;
    }
    return true;
  }

  async function handleRevoke() {
    setStatus("");
    setIsLoading(true);
    
    try {
      setStatus("🔗 Connecting to wallet...");
      const acct = await connectWallet();
      if (!acct) {
        return;
      }

      if (!validateInputs()) {
        return;
      }

      setStatus("🔍 Checking file ownership...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, FileRegistryABI.abi, signer);

      const id = (typeof ethers.toBigInt === "function") ? ethers.toBigInt(String(fileId)) : ethers.toBigInt(String(fileId));

      const rec = await contract.getFile(id);
      const ownerOnChain = rec[0];
      if (!ownerOnChain) {
        setStatus("❌ Could not read file record (maybe file does not exist).");
        return;
      }

      if (ownerOnChain.toLowerCase() !== acct.toLowerCase()) {
        setStatus(`❌ Connected account (${acct.slice(0, 8)}...) is NOT the owner.`);
        return;
      }

      const ok = window.confirm(`Revoke access for ${grantee} to fileId ${fileId}? This cannot be undone.`);
      if (!ok) {
        setStatus("Action cancelled.");
        return;
      }

      setStatus("⏳ Sending revoke transaction...");
      const tx = await contract.revokeAccess(Number(fileId), grantee);
      
      setStatus("⏳ Waiting for blockchain confirmation...");
      await tx.wait();
      
      setStatus(`✅ Access revoked for ${grantee.slice(0, 8)}... on fileId ${fileId}`);
      
    } catch (err) {
      console.error("revoke error:", err);
      if (err?.data?.message) setStatus("❌ Error: " + err.data.message);
      else if (err?.error?.message) setStatus("❌ Error: " + err.error.message);
      else if (err?.message) setStatus("❌ Error: " + err.message);
      else setStatus("❌ Unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.icon}>⚡</div>
        <h3 style={styles.title}>Manage Access Control</h3>
        <p style={styles.subtitle}>Revoke file access permissions (Owner Only)</p>
      </div>

      {/* File ID Input */}
      <div style={styles.formGroup}>
        <label style={styles.label}>
          <span style={styles.labelText}>File ID</span>
          <span style={styles.labelHint}>Numeric identifier of the file</span>
        </label>
        <input
          placeholder="Enter file ID (e.g., 123)"
          value={fileId}
          onChange={(e) => setFileId(e.target.value)}
          style={styles.input}
          disabled={isLoading}
        />
      </div>

      {/* Grantee Address Input */}
      <div style={styles.formGroup}>
        <label style={styles.label}>
          <span style={styles.labelText}>Grantee Address</span>
          <span style={styles.labelHint}>Address to revoke access from</span>
        </label>
        <input
          placeholder="0x742d35Cc6634C0532925a3b8D..."
          value={grantee}
          onChange={(e) => setGrantee(e.target.value)}
          style={styles.input}
          disabled={isLoading}
        />
      </div>

      {/* Wallet Connection Status */}
      {connected && (
        <div style={styles.connectionStatus}>
          <div style={styles.connectionDot}></div>
          Connected: {connected.slice(0, 8)}...{connected.slice(-6)}
        </div>
      )}

      {/* Revoke Button */}
      <button 
        onClick={handleRevoke} 
        style={{
          ...styles.revokeButton,
          ...(isLoading ? styles.revokeButtonDisabled : {})
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div style={styles.spinner}></div>
            Processing...
          </>
        ) : (
          <>
            <div style={styles.buttonIcon}>🚫</div>
            Revoke Access
          </>
        )}
      </button>

      {/* Status Display */}
      {status && (
        <div style={styles.statusContainer}>
          <div style={styles.statusHeader}>
            <div style={styles.statusIcon}>📋</div>
            <span style={styles.statusTitle}>Operation Status</span>
          </div>
          <div style={styles.statusMessage}>
            {status}
          </div>
        </div>
      )}

      {/* Process Steps */}
      <div style={styles.stepsContainer}>
        <div style={styles.stepsTitle}>Revocation Process</div>
        <div style={styles.steps}>
          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepText}>Verify Ownership</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepText}>Confirm Revoke</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepText}>Blockchain Update</div>
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div style={styles.infoPanel}>
        <div style={styles.infoHeader}>
          <div style={styles.infoIcon}>💡</div>
          <span style={styles.infoTitle}>About Access Control</span>
        </div>
        <div style={styles.infoContent}>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            Only the file owner can revoke access permissions
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            Revoked users will lose ability to download the file
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            Access can be re-granted at any time
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            All changes are recorded on the blockchain
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '0',
    color: '#E9D5FF',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  icon: {
    fontSize: '3rem',
    marginBottom: '16px',
    opacity: 0.9,
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #A855F7 0%, #C084FC 50%, #E9D5FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#D8B4FE',
    opacity: 0.8,
    margin: 0,
    fontWeight: '300',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  labelText: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#E9D5FF',
  },
  labelHint: {
    fontSize: '0.8rem',
    color: '#C084FC',
    opacity: 0.7,
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(20, 15, 35, 0.8)',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    borderRadius: '12px',
    color: '#FFFFFF',
    fontSize: '0.95rem',
    transition: 'all 0.3s ease',
    outline: 'none',
    boxSizing: 'border-box',
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(30, 20, 45, 0.6)',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '20px',
    fontSize: '0.9rem',
    color: '#C084FC',
    border: '1px solid rgba(168, 85, 247, 0.2)',
  },
  connectionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10B981',
  },
  revokeButton: {
    width: '100%',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#FFFFFF',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '24px',
    boxShadow: '0 8px 25px rgba(239, 68, 68, 0.3)',
  },
  revokeButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    transform: 'none',
  },
  buttonIcon: {
    fontSize: '1.2rem',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid #FFFFFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  statusContainer: {
    background: 'rgba(20, 15, 35, 0.8)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  statusIcon: {
    fontSize: '1.2rem',
  },
  statusTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#E9D5FF',
  },
  statusMessage: {
    fontSize: '0.9rem',
    color: '#D8B4FE',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
  },
  stepsContainer: {
    background: 'rgba(20, 15, 35, 0.6)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(168, 85, 247, 0.1)',
    marginBottom: '24px',
  },
  stepsTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#C084FC',
    marginBottom: '16px',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  steps: {
    display: 'flex',
    justifyContent: 'space-between',
    position: 'relative',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    position: 'relative',
    zIndex: 2,
  },
  stepNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #A855F7 0%, #C084FC 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: '0.8rem',
    fontWeight: '600',
    marginBottom: '8px',
  },
  stepText: {
    fontSize: '0.75rem',
    color: '#D8B4FE',
    textAlign: 'center',
    fontWeight: '500',
  },
  infoPanel: {
    background: 'rgba(30, 20, 45, 0.6)',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    borderRadius: '12px',
    padding: '20px',
  },
  infoHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
  },
  infoIcon: {
    fontSize: '1.2rem',
    opacity: 0.8,
  },
  infoTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#E9D5FF',
  },
  infoContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '0.85rem',
    color: '#D8B4FE',
    lineHeight: '1.4',
  },
  infoBullet: {
    color: '#C084FC',
    fontWeight: 'bold',
    minWidth: '12px',
  },
};

// Add CSS for spinner animation
const style = document.createElement('style');
style.textContent = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

input:focus {
  border-color: #A855F7 !important;
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2) !important;
}

button:not(:disabled):hover {
  transform: translateY(-2px);
}

.revoke-button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 35px rgba(239, 68, 68, 0.4) !important;
}
`;
document.head.append(style);