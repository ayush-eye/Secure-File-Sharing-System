// ShareFile.jsx
import React, { useState } from "react";
import { ethers } from "ethers";
import FileRegistryABI from "../abi/FileRegistry.json";
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const BACKEND_UPLOAD_JSON = "http://localhost:5000/upload-json";

export default function ShareFile() {
  const [fileId, setFileId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [aesHex, setAesHex] = useState(""); // AES key for now as hex (from owner console)

  async function handleShare() {
    if (!fileId || !recipient || !aesHex) return alert("provide fileId, recipient, aesHex");

    // For demo: we will NOT use MetaMask's eth_getEncryptionPublicKey here.
    // A real flow: use recipient encryption public key and encrypt aesHex for them.
    // For this demo, we will store the aesHex (insecure) as JSON pinned to Pinata.
    // WARNING: Do NOT store unencrypted AES keys in production.

    const encryptedKeyJson = { encryptedKey: aesHex, createdAt: Date.now(), owner: "demo" };
    // POST to backend to pin
    const resp = await fetch(BACKEND_UPLOAD_JSON, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(encryptedKeyJson)
    });
    const j = await resp.json();
    const keyCID = j.cid;

    // Call contract grantAccessKeyPointer(fileId, recipient, keyCID)
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, FileRegistryABI.abi, signer);

    const tx = await contract.grantAccessKeyPointer(Number(fileId), recipient, keyCID);
    await tx.wait();
    alert("Access granted, keyCID: " + keyCID);
  }

  return (
    <div>
      <h3>Share File</h3>
      <input placeholder="fileId" value={fileId} onChange={e=>setFileId(e.target.value)} />
      <input placeholder="recipient address" value={recipient} onChange={e=>setRecipient(e.target.value)} />
      <input placeholder="aes hex (from owner console)" value={aesHex} onChange={e=>setAesHex(e.target.value)} />
      <button onClick={handleShare}>Upload key & Grant access</button>
    </div>
  );
}
