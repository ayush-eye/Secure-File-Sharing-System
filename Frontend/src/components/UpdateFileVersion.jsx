import React, { useState } from "react";
import { BrowserProvider, Contract, toBigInt } from "ethers";
import { sha256Hex } from "../utils/cryptoUtils";
import { encryptCid } from "../utils/cidEncryptor";
import FileRegistryABI from "../abi/FileRegistry.json";

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "0x9C5252B37aA0B5a65949DA888AA0D7128147396B";
const BACKEND_UPLOAD_URL = "http://localhost:5000/upload-file";

function isValidFileId(s) { return /^\d+$/.test(String(s).trim()); }
function isValidAddress(a) { return /^0x[0-9a-fA-F]{40}$/.test(a); }

export default function UpdateFileVersion() {
  const [fileId, setFileId] = useState("");
  const [file, setFile] = useState(null);
  const [phrase, setPhrase] = useState("");
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleUpdate() {
    try {
      setStatus("");
      setIsLoading(true);

      if (!isValidFileId(fileId)) {
        setStatus("❌ Enter numeric fileId.");
        return;
      }
      if (!file) {
        setStatus("❌ Choose a file to upload.");
        return;
      }
      if (!phrase) {
        setStatus("❌ Enter encryption phrase (or reuse previous).");
        return;
      }
      if (!recipient || !isValidAddress(recipient)) {
        setStatus("❌ Enter a valid recipient address.");
        return;
      }

      setStatus("⏳ Uploading file to backend (pin to IPFS)...");
      const form = new FormData();
      form.append("file", file, file.name);
      const res = await fetch(BACKEND_UPLOAD_URL, { method: "POST", body: form });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error("Upload failed: " + txt);
      }
      const { cid } = await res.json();
      setStatus("✅ File pinned: " + cid);

      setStatus("🔐 Hashing file for integrity...");
      const buf = await file.arrayBuffer();
      const hex = await sha256Hex(buf);
      const fileHashBytes32 = "0x" + hex.padStart(64, "0");

      setStatus("🔒 Encrypting CID with phrase + recipient...");
      const encryptedCid = await encryptCid(cid, phrase, recipient);

      setStatus("🔗 Connecting wallet (owner)...");
      await window.ethereum.request({ method: "eth_requestAccounts" });

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, FileRegistryABI.abi, signer);

      setStatus(`📝 Calling addVersion(fileId=${fileId}) — confirm transaction...`);
      const tx = await contract.addVersion(Number(fileId), encryptedCid, fileHashBytes32);
      setStatus("⏳ Waiting for transaction confirmation...");
      await tx.wait();

      setStatus(`🎉 File version updated for fileId ${fileId}.`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Error: " + (err?.message || String(err)));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.icon}>🔄</div>
        <h3 style={styles.title}>Update File Version</h3>
        <p style={styles.subtitle}>Upload new version of existing file (Owner Only)</p>
      </div>

      {/* File ID Input */}
      <div style={styles.formGroup}>
        <label style={styles.label}>
          <span style={styles.labelText}>File ID</span>
          <span style={styles.labelHint}>Numeric identifier of the file to update</span>
        </label>
        <input
          placeholder="Enter file ID (e.g., 123)"
          value={fileId}
          onChange={(e) => setFileId(e.target.value)}
          style={styles.input}
          disabled={isLoading}
        />
      </div>

      {/* File Upload */}
      <div style={styles.uploadArea}>
        <input 
          type="file" 
          onChange={(e) => setFile(e.target.files[0])}
          style={styles.fileInput}
          id="version-file-upload"
          disabled={isLoading}
        />
        <label htmlFor="version-file-upload" style={styles.fileLabel}>
          <div style={styles.uploadIcon}>📁</div>
          <div style={styles.uploadText}>
            {file ? file.name : "Choose New Version File"}
          </div>
          <div style={styles.uploadSubtext}>
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Select the updated file"}
          </div>
        </label>
      </div>

      {/* Encryption Phrase */}
      <div style={styles.formGroup}>
        <label style={styles.label}>
          <span style={styles.labelText}>Encryption Phrase</span>
          <span style={styles.labelHint}>Use same phrase or new one</span>
        </label>
        <input
          type="password"
          placeholder="Enter encryption phrase..."
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          style={styles.input}
          disabled={isLoading}
        />
      </div>

      {/* Recipient Address */}
      <div style={styles.formGroup}>
        <label style={styles.label}>
          <span style={styles.labelText}>Recipient Address</span>
          <span style={styles.labelHint}>Who can access this version</span>
        </label>
        <input
          placeholder="0x742d35Cc6634C0532925a3b8D..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          style={styles.input}
          disabled={isLoading}
        />
      </div>

      {/* Update Button */}
      <button 
        onClick={handleUpdate} 
        style={{
          ...styles.updateButton,
          ...(isLoading ? styles.updateButtonDisabled : {})
        }}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div style={styles.spinner}></div>
            Updating Version...
          </>
        ) : (
          <>
            <div style={styles.buttonIcon}>🚀</div>
            Upload New Version
          </>
        )}
      </button>

      {/* Status Display */}
      {status && (
        <div style={styles.statusContainer}>
          <div style={styles.statusHeader}>
            <div style={styles.statusIcon}>📋</div>
            <span style={styles.statusTitle}>Update Status</span>
          </div>
          <div style={styles.statusMessage}>
            {status}
          </div>
        </div>
      )}

      {/* Process Steps */}
      <div style={styles.stepsContainer}>
        <div style={styles.stepsTitle}>Version Update Process</div>
        <div style={styles.steps}>
          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepText}>Upload File</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepText}>Encrypt CID</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepText}>Update Version</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>4</div>
            <div style={styles.stepText}>Confirm</div>
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div style={styles.infoPanel}>
        <div style={styles.infoHeader}>
          <div style={styles.infoIcon}>💡</div>
          <span style={styles.infoTitle}>About Version Updates</span>
        </div>
        <div style={styles.infoContent}>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            Only the file owner can update versions
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            Previous versions remain accessible to existing users
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            New versions use the same file ID with updated content
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            Version history is maintained on the blockchain
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
  uploadArea: {
    marginBottom: '24px',
  },
  fileInput: {
    display: 'none',
  },
  fileLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    border: '2px dashed rgba(168, 85, 247, 0.3)',
    borderRadius: '16px',
    background: 'rgba(30, 20, 45, 0.5)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
    minHeight: '120px',
  },
  uploadIcon: {
    fontSize: '2.5rem',
    marginBottom: '12px',
    opacity: 0.7,
  },
  uploadText: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#E9D5FF',
    marginBottom: '4px',
  },
  uploadSubtext: {
    fontSize: '0.85rem',
    color: '#C084FC',
    opacity: 0.7,
  },
  updateButton: {
    width: '100%',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%)',
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
    boxShadow: '0 8px 25px rgba(168, 85, 247, 0.3)',
  },
  updateButtonDisabled: {
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

// Add CSS for spinner animation and hover effects
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

label[for="version-file-upload"]:hover {
  border-color: #A855F7 !important;
  background: rgba(30, 20, 45, 0.7) !important;
  transform: translateY(-2px);
}

button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 35px rgba(168, 85, 247, 0.4) !important;
}
`;
document.head.append(style);