import React, { useState } from "react";
import { ethers } from "ethers";
import { sha256Hex } from "../utils/cryptoUtils";
import { encryptCid } from "../utils/cidEncryptor";
import FileRegistryABI from "../abi/FileRegistry.json";

const CONTRACT_ADDRESS = "0x9C5252B37aA0B5a65949DA888AA0D7128147396B";
const BACKEND_UPLOAD_URL = "http://localhost:5000/upload-file";

export default function UploadFile() {
  const [file, setFile] = useState(null);
  const [phrase, setPhrase] = useState("");
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function isValidAddress(a) {
    return /^0x[0-9a-fA-F]{40}$/.test(a);
  }

  async function handleUpload() {
    try {
      setIsLoading(true);
      
      // basic checks
      if (!CONTRACT_ADDRESS) {
        setStatus("❌ Contract address not set in frontend.");
        return;
      }
      if (!FileRegistryABI || !FileRegistryABI.abi) {
        setStatus("❌ ABI missing at src/abi/FileRegistry.json");
        return;
      }
      if (!file) {
        setStatus("❌ Please select a file");
        return;
      }
      if (!phrase) {
        setStatus("❌ Please enter encryption phrase");
        return;
      }
      if (!recipient || !isValidAddress(recipient)) {
        setStatus("❌ Please enter a valid recipient address (0x...)");
        return;
      }

      setStatus("⏳ Uploading file to backend (pin to IPFS)...");
      const form = new FormData();
      form.append("file", file, file.name);
      const res = await fetch(BACKEND_UPLOAD_URL, { method: "POST", body: form });
      if (!res.ok) {
        const t = await res.text();
        throw new Error("Upload failed: " + t);
      }
      const { cid } = await res.json();
      setStatus("✅ File pinned to IPFS: " + cid);

      setStatus("🔐 Hashing file for on-chain integrity...");
      const buf = await file.arrayBuffer();
      const hex = await sha256Hex(buf);
      const fileHashBytes32 = "0x" + hex.padStart(64, "0");

      setStatus("🔒 Encrypting CID...");
      const encryptedCid = await encryptCid(cid, phrase, recipient);

      // connect wallet
      setStatus("🔗 Connecting wallet...");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // create contract instance
      const contract = new ethers.Contract(CONTRACT_ADDRESS, FileRegistryABI.abi, signer);

      // 1) registerFile
      setStatus("📝 Registering encrypted CID on-chain (confirm transaction in MetaMask)...");
      const tx = await contract.registerFile(encryptedCid, fileHashBytes32);
      setStatus("⏳ Waiting for registration confirmation...");
      const receipt = await tx.wait();

      // parse FileRegistered event to obtain new fileId
      let newFileId = null;
      try {
        const ev = receipt.events?.find(e => e.event === "FileRegistered") || receipt.events?.[0];
        if (ev && ev.args) {
          if (ev.args.fileId !== undefined && ev.args.fileId !== null) {
            newFileId = ev.args.fileId.toString();
          } else if (ev.args[0] !== undefined && ev.args[0] !== null) {
            newFileId = ev.args[0].toString();
          }
        }
      } catch (e) {
        console.warn("Could not parse FileRegistered event automatically:", e);
      }

      if (!newFileId) {
        try {
          const nextId = await contract.nextFileId();
          if (nextId) {
            const numeric = (typeof ethers.toBigInt === "function") ? ethers.toBigInt(nextId) : nextId;
            newFileId = (ethers.toBigInt(numeric) - ethers.toBigInt(1)).toString();
          }
        } catch (e) {
          // ignore fallback errors
        }
      }

      if (!newFileId) {
        setStatus("⚠️ Registered but could not determine fileId from receipt. Grant access manually if needed.");
        console.warn("Receipt:", receipt);
        return;
      }

      // 2) grantAccessKeyPointer
      setStatus(`🔑 Granting access to ${recipient} for fileId ${newFileId} (confirm second transaction)...`);
      try {
        const tx2 = await contract.grantAccessKeyPointer(Number(newFileId), recipient, "");
        await tx2.wait();
        setStatus(`🎉 File registered (id=${newFileId}) and access granted to ${recipient}`);
      } catch (grantErr) {
        console.error("Grant access error:", grantErr);
        setStatus(`⚠️ Registered (id=${newFileId}) but automatic grant failed. You can grant access manually.`);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ Error: " + (err.message || err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.icon}>📤</div>
        <h3 style={styles.title}>Upload & Register File</h3>
        <p style={styles.subtitle}>Encrypt and upload files to IPFS with secure on-chain registration</p>
      </div>

      {/* File Upload */}
      <div style={styles.uploadArea}>
        <input 
          type="file" 
          onChange={(e) => setFile(e.target.files[0])}
          style={styles.fileInput}
          id="file-upload"
        />
        <label htmlFor="file-upload" style={styles.fileLabel}>
          <div style={styles.uploadIcon}>📁</div>
          <div style={styles.uploadText}>
            {file ? file.name : "Choose File"}
          </div>
          <div style={styles.uploadSubtext}>
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Click to browse files"}
          </div>
        </label>
      </div>

      {/* Form Inputs */}
      <div style={styles.formGroup}>
        <label style={styles.label}>
          <span style={styles.labelText}>Encryption Phrase</span>
          <span style={styles.labelHint}>Keep this secret and secure</span>
        </label>
        <input
          type="password"
          placeholder="Enter a strong encryption phrase..."
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          style={styles.input}
          disabled={isLoading}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>
          <span style={styles.labelText}>Recipient Address</span>
          <span style={styles.labelHint}>Ethereum address that can access this file</span>
        </label>
        <input
          placeholder="0x742d35Cc6634C0532925a3b8D..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          style={styles.input}
          disabled={isLoading}
        />
      </div>

      {/* Upload Button */}
      <button 
        onClick={handleUpload} 
        style={{
          ...styles.uploadButton,
          ...(isLoading ? styles.uploadButtonDisabled : {})
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
            <div style={styles.buttonIcon}>🚀</div>
            Upload & Register (Auto-Grant)
          </>
        )}
      </button>

      {/* Status Display */}
      {status && (
        <div style={styles.statusContainer}>
          <div style={styles.statusHeader}>
            <div style={styles.statusIcon}>📋</div>
            <span style={styles.statusTitle}>Process Status</span>
          </div>
          <div style={styles.statusMessage}>
            {status}
          </div>
        </div>
      )}

      {/* Process Steps */}
      <div style={styles.stepsContainer}>
        <div style={styles.stepsTitle}>Upload Process</div>
        <div style={styles.steps}>
          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepText}>Upload to IPFS</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepText}>Encrypt CID</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepText}>Register on Blockchain</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>4</div>
            <div style={styles.stepText}>Grant Access</div>
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
  uploadButton: {
    width: '100%',
    padding: '16px 24px',
    background: 'linear-gradient(135deg, #A855F7 0%, #C084FC 100%)',
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
  uploadButtonDisabled: {
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
};

// Add CSS for spinner animation
const style = document.createElement('style');
style.textContent = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Add hover effects */
input:focus {
  border-color: #A855F7 !important;
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.2) !important;
}

label[for="file-upload"]:hover {
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