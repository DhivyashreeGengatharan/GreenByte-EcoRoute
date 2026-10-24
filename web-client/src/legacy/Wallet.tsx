import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

interface Props {
  userId?: string;
  credits?: number;
}

export const Wallet: React.FC<Props> = ({ userId, credits = 0 }) => {
  const [isMinting, setIsMinting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // For mobile click to expand
  const { token } = useAuth();
  const navigate = useNavigate();

  const handleMarketplace = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling expansion
    navigate('/marketplace');
  };

  const mintCredits = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling expansion
    if (!credits || isMinting) return;
    
    try {
      setIsMinting(true);
      if (!token) {
        alert("🔒 Please log in to mint credits.");
        setIsMinting(false);
        return;
      }

      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
      await axios.post(
        `${API_BASE}/api/mint-credit`, 
        {
          userId: userId || "guest",
          credits,
          walletAddress: "YourSolanaWalletAddressHere"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert("🌱 Minted to Blockchain!");
    } catch (error) {
      console.error(error);
      alert("❌ Mint Failed");
    } finally {
      setIsMinting(false);
    }
  };

  // Mobile: If expanded, show full UI. If not, just show badge.
  // Desktop: Always show full UI.
  // We handle this via CSS mostly, but logic helps.

  return (
    <div 
      className={`wallet ${isExpanded ? 'mobile-expanded' : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
      data-credits={credits} // Used by CSS for mobile pill view
    >
      <div className="wallet-content">
        <h4>💰 Green Wallet</h4>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '10px 0'
        }}>
          <span>Balance:</span>
          <span className="credit-display">{credits.toLocaleString()}</span>
        </div>
        <button 
          className="mint-btn"
          onClick={mintCredits} 
          disabled={credits === 0 || isMinting}
        >
          {isMinting ? 'Minting...' : 'Mint to Solana'}
        </button>
        <button 
          className="marketplace-btn"
          onClick={handleMarketplace}
          style={{
            marginTop: '8px',
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            width: '100%'
          }}
        >
          🏪 Find Vendors
        </button>

      </div>
    </div>
  );
};