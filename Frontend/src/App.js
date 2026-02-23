import React, { useState } from "react";
import DecryptAndDownload from "./components/DownloadFile.jsx";
import UploadFile from "./components/UploadFile.jsx";
import RevokeAccess from "./components/RevokeAccess.jsx";
import MyFiles from "./components/MyFiles.jsx";
import UpdateFileVersion from "./components/UpdateFileVersion.jsx";

export default function App() {
  const [activeSection, setActiveSection] = useState('upload');

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'upload':
        return <UploadFile />;
      case 'download':
        return <DecryptAndDownload />;
      case 'revoke':
        return <RevokeAccess />;
      case 'update':
        return <UpdateFileVersion />;
      case 'myfiles':
        return <MyFiles />;
      
      default:
        return <UploadFile />;
    }
  };

  return (
    <div style={styles.container}>
      {/* Animated Background */}
      <div style={styles.backgroundAnimation}></div>
      
      {/* Navigation Bar */}
      <nav style={styles.navbar}>
        <div style={styles.navContent}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>🔒</div>
            <span style={styles.logoText}>FileShare</span>
            <span style={styles.logoSubtitle}>Secure It</span>
          </div>
          
          <div style={styles.navLinks}>
            <button 
              style={{
                ...styles.navButton,
                ...(activeSection === 'upload' ? styles.navButtonActive : {})
              }}
              onClick={() => setActiveSection('upload')}
            >
              <span style={styles.navIcon}>📤</span>
              Upload Files
            </button>
            
            <button 
              style={{
                ...styles.navButton,
                ...(activeSection === 'download' ? styles.navButtonActive : {})
              }}
              onClick={() => setActiveSection('download')}
            >
              <span style={styles.navIcon}>📥</span>
              Download & Decrypt
            </button>

            <button 
              style={{
                ...styles.navButton,
                ...(activeSection === 'update' ? styles.navButtonActive : {})
              }}
              onClick={() => setActiveSection('update')}
            >
              <span style={styles.navIcon}>📥</span>
              Update File
            </button>

               <button 
              style={{
                ...styles.navButton,
                ...(activeSection === 'revoke' ? styles.navButtonActive : {})
              }}
              onClick={() => setActiveSection('revoke')}
            >
              <span style={styles.navIcon}>⚡</span>
              Revoke Access
            </button>

             <button 
              style={{
                ...styles.navButton,
                ...(activeSection === 'myfiles' ? styles.navButtonActive : {})
              }}
              onClick={() => setActiveSection('myfiles')}
            >
              <span style={styles.navIcon}>📁</span>
              My Files
            </button>
          </div>
            
           
            
           

            

            

           
          
          <div style={styles.navUser}>
            <div style={styles.userBadge}>
              <span style={styles.userIcon}>👤</span>
              Connected
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={styles.mainContent}>
        <div style={styles.contentWrapper}>
          {/* Header */}
          <header style={styles.pageHeader}>
            <h1 style={styles.pageTitle}>
              {activeSection === 'upload' && 'Secure File Upload'}
              {activeSection === 'download' && 'Download & Decrypt Files'}
              {activeSection === 'myfiles' && 'My Files Dashboard'}
              {activeSection === 'revoke' && 'Access Management'}
            </h1>
            <p style={styles.pageDescription}>
              {activeSection === 'upload' && 'Encrypt and upload files to IPFS with secure on-chain registration'}
              {activeSection === 'download' && 'Download and decrypt files using your private keys and passphrase'}
              {activeSection === 'myfiles' && 'View your owned files and files shared with you'}
              {activeSection === 'revoke' && 'Manage file access permissions and revoke existing access'}
            </p>
          </header>

          {/* Active Section Content */}
          <div style={styles.sectionContainer}>
            <div style={{
              ...styles.contentCard,
              ...(activeSection === 'myfiles' ? styles.wideCard : {})
            }}>
              {renderActiveSection()}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={styles.footerText}>
            <strong>FileShare PRO</strong> • Encrypted • Decentralized • Secure
          </div>
          <div style={styles.footerStats}>
            <span style={styles.stat}>🛡️ Enterprise Grade</span>
            <span style={styles.stat}>🔐 End-to-End Encryption</span>
            <span style={styles.stat}>⚡ Lightning Fast</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #050505 0%, #0A0A0A 50%, #000000 100%)',
    fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 15% 50%, rgba(120, 40, 200, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 85% 30%, rgba(160, 60, 220, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 50% 80%, rgba(140, 30, 240, 0.1) 0%, transparent 50%),
      linear-gradient(135deg, #000000 0%, #0A0015 100%)
    `,
    animation: 'pulse 12s ease-in-out infinite alternate',
  },
  navbar: {
    background: 'rgba(10, 5, 20, 0.85)',
    backdropFilter: 'blur(20px) saturate(180%)',
    borderBottom: '1px solid rgba(160, 80, 220, 0.2)',
    boxShadow: '0 4px 30px rgba(120, 40, 200, 0.15)',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },
  navContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    height: '70px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    fontSize: '24px',
    background: 'linear-gradient(135deg, #A855F7 0%, #C084FC 50%, #D8B4FE 100%)',
    borderRadius: '8px',
    padding: '8px',
  },
  logoText: {
    fontSize: '1.5rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #A855F7 0%, #C084FC 50%, #E9D5FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  logoSubtitle: {
    background: 'linear-gradient(135deg, #C084FC 0%, #D8B4FE 100%)',
    color: '#000',
    fontSize: '0.7rem',
    fontWeight: '800',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '4px',
  },
  navLinks: {
    display: 'flex',
    gap: '8px',
    background: 'rgba(20, 10, 30, 0.6)',
    padding: '4px',
    borderRadius: '12px',
    border: '1px solid rgba(160, 80, 220, 0.1)',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'transparent',
    border: 'none',
    color: '#D8B4FE',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  navButtonActive: {
    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(192, 132, 252, 0.1) 100%)',
    color: '#FFFFFF',
    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
  },
  navIcon: {
    fontSize: '16px',
  },
  navUser: {
    display: 'flex',
    alignItems: 'center',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(192, 132, 252, 0.1) 100%)',
    color: '#E9D5FF',
    padding: '8px 16px',
    borderRadius: '10px',
    fontSize: '0.85rem',
    fontWeight: '500',
    border: '1px solid rgba(168, 85, 247, 0.2)',
  },
  userIcon: {
    fontSize: '14px',
  },
  mainContent: {
    position: 'relative',
    padding: '40px 32px',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: 'calc(100vh - 140px)',
  },
  contentWrapper: {
    position: 'relative',
    zIndex: 2,
  },
  pageHeader: {
    textAlign: 'center',
    marginBottom: '48px',
    padding: '0 20px',
  },
  pageTitle: {
    fontSize: '3rem',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #A855F7 0%, #C084FC 50%, #E9D5FF 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '16px',
    letterSpacing: '-0.5px',
  },
  pageDescription: {
    fontSize: '1.2rem',
    color: '#D8B4FE',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
    opacity: 0.9,
    fontWeight: '300',
  },
  sectionContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  contentCard: {
    background: 'linear-gradient(145deg, rgba(20, 15, 35, 0.9) 0%, rgba(10, 5, 25, 0.95) 100%)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(168, 85, 247, 0.25)',
    borderRadius: '24px',
    padding: '40px',
    boxShadow: `
      0 25px 50px rgba(0, 0, 0, 0.5),
      0 8px 32px rgba(168, 85, 247, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      inset 0 0 32px rgba(168, 85, 247, 0.1)
    `,
    width: '100%',
    maxWidth: '800px',
    position: 'relative',
    overflow: 'hidden',
  },
  wideCard: {
    maxWidth: '1200px',
  },
  footer: {
    background: 'rgba(5, 0, 15, 0.9)',
    borderTop: '1px solid rgba(160, 80, 220, 0.15)',
    padding: '24px 32px',
    position: 'relative',
  },
  footerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  footerText: {
    color: '#C084FC',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  footerStats: {
    display: 'flex',
    gap: '24px',
  },
  stat: {
    color: '#D8B4FE',
    fontSize: '0.8rem',
    opacity: 0.7,
  },
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
@keyframes pulse {
  0% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.02);
  }
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
}

@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.nav-button:hover {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(192, 132, 252, 0.05) 100%);
  color: #FFFFFF;
  transform: translateY(-1px);
}
`;
document.head.append(style);