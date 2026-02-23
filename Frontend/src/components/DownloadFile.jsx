import React, { useState } from "react";
import { ethers } from "ethers";
import { decryptCid } from "../utils/cidEncryptor";
import FileRegistryABI from "../abi/FileRegistry.json";

const CONTRACT_ADDRESS = "0x9C5252B37aA0B5a65949DA888AA0D7128147396B";

export default function DecryptAndDownload() {
  const [fileIdInput, setFileIdInput] = useState("");
  const [phrase, setPhrase] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function validateFileId(idStr) {
    if (!idStr || idStr.trim() === "") return { ok: false, msg: "Enter a file id (number)" };
    if (!/^\d+$/.test(idStr.trim())) return { ok: false, msg: "File id must be a positive integer" };
    return { ok: true, value: idStr.trim() };
  }

  async function handleDownload() {
    setStatus("");
    setIsLoading(true);
    
    try {
      const v = validateFileId(fileIdInput);
      if (!v.ok) {
        setStatus("❌ " + v.msg);
        return;
      }
      const idNumberString = v.value;

      if (!phrase) {
        setStatus("❌ Enter the phrase used by the uploader");
        return;
      }
      if (!CONTRACT_ADDRESS) {
        setStatus("❌ Frontend error: contract address missing.");
        return;
      }
      if (!FileRegistryABI || !FileRegistryABI.abi) {
        setStatus("❌ Frontend error: ABI missing at src/abi/FileRegistry.json");
        return;
      }

      setStatus("🔗 Connecting wallet...");
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddr = await signer.getAddress();

      setStatus("🔍 Checking on-chain access for file id " + idNumberString + " ...");

      const fileIdBN = ethers.toBigInt(idNumberString);
      console.log("Using fileId (bigint):", fileIdBN);

      const contract = new ethers.Contract(CONTRACT_ADDRESS, FileRegistryABI.abi, signer);

      setStatus("🔐 Verifying access permissions...");
      const access = await contract.checkAccess(fileIdBN, userAddr);
      if (!access) {
        setStatus("❌ You are not authorized for this file (on-chain check failed).");
        return;
      }

      setStatus("📡 Fetching file record from blockchain...");
      const rec = await contract.getFile(fileIdBN);
      const encryptedCid = rec[1];
      if (!encryptedCid || encryptedCid.length === 0) {
        setStatus("❌ No CID found on-chain for this file id.");
        return;
      }

      setStatus("🔓 Decrypting CID (using your phrase + wallet address)...");
      let cid;
      try {
        cid = await decryptCid(encryptedCid, phrase, userAddr);
      } catch (err) {
        console.error("decrypt error:", err);
        setStatus("❌ Decryption failed — wrong phrase or wrong wallet address. Make sure you used the exact phrase and are connected with the recipient address.");
        return;
      }

      if (!cid) {
        setStatus("❌ Decryption produced empty CID — wrong inputs.");
        return;
      }

      setStatus("✅ CID decrypted: " + cid + " — fetching file from IPFS...");
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
      const resp = await fetch(ipfsUrl);
      if (!resp.ok) {
        setStatus("❌ IPFS fetch failed: " + resp.status);
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "download_" + idNumberString;
      a.click();
      URL.revokeObjectURL(url);

      setStatus("🎉 File downloaded successfully!");
    } catch (err) {
      console.error(err);
      if (err && err.message) setStatus("❌ Error: " + err.message);
      else setStatus("❌ Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.icon}>📥</div>
        <h3 style={styles.title}>Download & Decrypt File</h3>
        <p style={styles.subtitle}>Access and decrypt files using your private keys and passphrase</p>
      </div>

      {/* File ID Input */}
      <div style={styles.formGroup}>
        <label style={styles.label}>
          <span style={styles.labelText}>File ID</span>
          <span style={styles.labelHint}>Numeric identifier from the uploader</span>
        </label>
        <input
          placeholder="Enter file ID (e.g., 123)"
          value={fileIdInput}
          onChange={(e) => setFileIdInput(e.target.value)}
          style={styles.input}
          disabled={isLoading}
        />
      </div>

      {/* Encryption Phrase */}
      <div style={styles.formGroup}>
        <label style={styles.label}>
          <span style={styles.labelText}>Decryption Phrase</span>
          <span style={styles.labelHint}>Provided by the file uploader</span>
        </label>
        <input
          type="password"
          placeholder="Enter the secret decryption phrase..."
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          style={styles.input}
          disabled={isLoading}
        />
      </div>

      {/* Download Button */}
      <button 
        onClick={handleDownload} 
        style={{
          ...styles.downloadButton,
          ...(isLoading ? styles.downloadButtonDisabled : {})
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
            <div style={styles.buttonIcon}>🔓</div>
            Decrypt & Download File
          </>
        )}
      </button>

      {/* Status Display */}
      {status && (
        <div style={styles.statusContainer}>
          <div style={styles.statusHeader}>
            <div style={styles.statusIcon}>📋</div>
            <span style={styles.statusTitle}>Download Status</span>
          </div>
          <div style={styles.statusMessage}>
            {status}
          </div>
        </div>
      )}

      {/* Process Steps */}
      <div style={styles.stepsContainer}>
        <div style={styles.stepsTitle}>Download Process</div>
        <div style={styles.steps}>
          <div style={styles.step}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepText}>Verify Access</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepText}>Fetch Record</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepText}>Decrypt CID</div>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNumber}>4</div>
            <div style={styles.stepText}>Download File</div>
          </div>
        </div>
      </div>

      {/* Information Panel */}
      <div style={styles.infoPanel}>
        <div style={styles.infoHeader}>
          <div style={styles.infoIcon}>💡</div>
          <span style={styles.infoTitle}>How it works</span>
        </div>
        <div style={styles.infoContent}>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            File ID is assigned during upload and shared by the uploader
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            Decryption phrase must match exactly what the uploader used
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            Your wallet address must have been granted access permissions
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            Files are fetched from decentralized IPFS storage
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
  downloadButton: {
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
  downloadButtonDisabled: {
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

button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 35px rgba(168, 85, 247, 0.4) !important;
}
`;
document.head.append(style);