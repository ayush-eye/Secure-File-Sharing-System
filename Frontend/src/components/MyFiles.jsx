import React, { useEffect, useState } from "react";
import { BrowserProvider, Contract, toBigInt } from "ethers";
import FileRegistryABI from "../abi/FileRegistry.json";

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || "0x9C5252B37aA0B5a65949DA888AA0D7128147396B";

export default function MyFiles() {
  const [connected, setConnected] = useState("");
  const [ownedFiles, setOwnedFiles] = useState([]);
  const [accessibleFiles, setAccessibleFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function connectWallet() {
    try {
      if (!window.ethereum) throw new Error("MetaMask not found");
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      const a = accs && accs[0];
      setConnected(a || "");
      return a || "";
    } catch (e) {
      console.error(e);
      setStatus("❌ Wallet connect failed.");
      return "";
    }
  }

  async function fetchFiles() {
    setStatus("");
    setLoading(true);
    setOwnedFiles([]);
    setAccessibleFiles([]);
    try {
      const acct = connected || (await connectWallet());
      if (!acct) {
        setStatus("❌ Connect wallet first.");
        setLoading(false);
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, FileRegistryABI.abi, signer);

      setStatus("🔍 Scanning blockchain for files...");
      let nextIdRaw = await contract.nextFileId();
      let nextId = typeof nextIdRaw === "bigint" ? nextIdRaw : toBigInt(nextIdRaw);
      const n = Number(nextId);
      
      if (isNaN(n) || n <= 0) {
        setStatus("📭 No files found on-chain.");
        setLoading(false);
        return;
      }

      const owned = [];
      const accessible = [];

      for (let i = 1; i < n; i++) {
        try {
          const rec = await contract.getFile(toBigInt(String(i)));
          const owner = rec[0];
          const cid = rec[1];
          const exists = rec[5];

          if (!exists) continue;

          if (owner && owner.toLowerCase() === acct.toLowerCase()) {
            owned.push({ 
              id: i, 
              owner, 
              cid: cid.toString(), 
              version: rec[4].toString(), 
              createdAt: rec[3].toString() 
            });
          }

          const hasAccess = await contract.checkAccess(toBigInt(String(i)), acct);
          if (hasAccess) {
            accessible.push({ 
              id: i, 
              owner, 
              cid: cid.toString(), 
              version: rec[4].toString(), 
              createdAt: rec[3].toString() 
            });
          }
        } catch (innerErr) {
          console.warn("getFile error for id", i, innerErr);
        }
      }

      setOwnedFiles(owned);
      setAccessibleFiles(accessible);
      setStatus(`✅ Found ${owned.length} owned files, ${accessible.length} accessible files`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Error fetching files: " + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (window.ethereum && window.ethereum.selectedAddress) {
      setConnected(window.ethereum.selectedAddress);
    }
    if (window.ethereum?.on) {
      const handler = (accounts) => {
        setConnected(accounts[0] || "");
      };
      window.ethereum.on("accountsChanged", handler);
      return () => window.ethereum.removeListener("accountsChanged", handler);
    }
  }, []);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.icon}>📁</div>
        <h3 style={styles.title}>My Files Dashboard</h3>
        <p style={styles.subtitle}>View your owned files and files shared with you</p>
      </div>

      {/* Connection Status */}
      <div style={styles.connectionSection}>
        <div style={styles.connectionStatus}>
          <div style={styles.connectionDot}></div>
          {connected ? `Connected: ${connected.slice(0, 8)}...${connected.slice(-6)}` : "Not Connected"}
        </div>
        <div style={styles.buttonGroup}>
          <button 
            onClick={connectWallet} 
            style={styles.connectButton}
          >
            🔗 Connect Wallet
          </button>
          <button 
            onClick={fetchFiles} 
            style={{
              ...styles.fetchButton,
              ...(loading ? styles.fetchButtonDisabled : {})
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div style={styles.spinner}></div>
                Scanning...
              </>
            ) : (
              <>
                🔍 Fetch My Files
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Display */}
      {status && (
        <div style={styles.statusContainer}>
          <div style={styles.statusHeader}>
            <div style={styles.statusIcon}>📋</div>
            <span style={styles.statusTitle}>Scan Status</span>
          </div>
          <div style={styles.statusMessage}>
            {status}
          </div>
        </div>
      )}

      {/* Files Display */}
      <div style={styles.filesGrid}>
        {/* Owned Files */}
        <div style={styles.filesSection}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>👑</div>
            <h4 style={styles.sectionTitle}>Files You Own</h4>
            <div style={styles.fileCount}>{ownedFiles.length} files</div>
          </div>
          
          {ownedFiles.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📭</div>
              <div style={styles.emptyText}>No owned files found</div>
              <div style={styles.emptySubtext}>Files you upload will appear here</div>
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Encrypted CID</th>
                    <th style={styles.th}>Version</th>
                    <th style={styles.th}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {ownedFiles.map(f => (
                    <tr key={f.id} style={styles.tr}>
                      <td style={styles.td}>{f.id}</td>
                      <td style={{...styles.td, ...styles.cidCell}}>
                        <div style={styles.cidText}>{f.cid}</div>
                      </td>
                      <td style={styles.td}>v{f.version}</td>
                      <td style={styles.td}>
                        {new Date(Number(f.createdAt) * 1000).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Accessible Files */}
        <div style={styles.filesSection}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionIcon}>🔓</div>
            <h4 style={styles.sectionTitle}>Files Shared With You</h4>
            <div style={styles.fileCount}>{accessibleFiles.length} files</div>
          </div>
          
          {accessibleFiles.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🤝</div>
              <div style={styles.emptyText}>No shared files found</div>
              <div style={styles.emptySubtext}>Files shared with you will appear here</div>
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Encrypted CID</th>
                    <th style={styles.th}>Owner</th>
                    <th style={styles.th}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {accessibleFiles.map(f => (
                    <tr key={f.id} style={styles.tr}>
                      <td style={styles.td}>{f.id}</td>
                      <td style={{...styles.td, ...styles.cidCell}}>
                        <div style={styles.cidText}>{f.cid}</div>
                      </td>
                      <td style={styles.td}>
                        {f.owner.slice(0, 8)}...{f.owner.slice(-6)}
                      </td>
                      <td style={styles.td}>
                        {new Date(Number(f.createdAt) * 1000).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Information Panel */}
      <div style={styles.infoPanel}>
        <div style={styles.infoHeader}>
          <div style={styles.infoIcon}>💡</div>
          <span style={styles.infoTitle}>About File Management</span>
        </div>
        <div style={styles.infoContent}>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            Owned files are files you've uploaded to the system
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            Shared files are files others have granted you access to
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            CIDs are encrypted and require the uploader's phrase to decrypt
          </div>
          <div style={styles.infoItem}>
            <span style={styles.infoBullet}>•</span>
            File IDs are used to reference files when downloading
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
  connectionSection: {
    background: 'rgba(20, 15, 35, 0.6)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid rgba(168, 85, 247, 0.2)',
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.9rem',
    color: '#C084FC',
    marginBottom: '16px',
    fontWeight: '500',
  },
  connectionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10B981',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
  },
  connectButton: {
    padding: '12px 20px',
    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(192, 132, 252, 0.1) 100%)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    borderRadius: '8px',
    color: '#E9D5FF',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  fetchButton: {
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #A855F7 0%, #C084FC 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
  },
  fetchButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  spinner: {
    width: '16px',
    height: '16px',
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
  filesGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  filesSection: {
    background: 'rgba(20, 15, 35, 0.6)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(168, 85, 247, 0.2)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(168, 85, 247, 0.1)',
  },
  sectionIcon: {
    fontSize: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#E9D5FF',
    margin: 0,
    flex: 1,
  },
  fileCount: {
    background: 'rgba(168, 85, 247, 0.2)',
    color: '#C084FC',
    padding: '4px 8px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#D8B4FE',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '12px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '1rem',
    fontWeight: '600',
    marginBottom: '4px',
  },
  emptySubtext: {
    fontSize: '0.85rem',
    opacity: 0.7,
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px 8px',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#C084FC',
    borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
  },
  tr: {
    borderBottom: '1px solid rgba(168, 85, 247, 0.1)',
  },
  td: {
    padding: '12px 8px',
    fontSize: '0.85rem',
    color: '#E9D5FF',
  },
  cidCell: {
    maxWidth: '200px',
  },
  cidText: {
    wordBreak: 'break-all',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '4px 6px',
    borderRadius: '4px',
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

button:not(:disabled):hover {
  transform: translateY(-1px);
}

.connect-button:hover {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(192, 132, 252, 0.2) 100%) !important;
}

.fetch-button:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(168, 85, 247, 0.4) !important;
}
`;
document.head.append(style);