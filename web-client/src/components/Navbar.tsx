import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { HistoryModal } from "./HistoryModal";
import { 
  LeafIcon, 
  CoinsIcon, 
  RouteIcon, 
  ShieldCheckIcon, 
  SlidersIcon, 
  ActivityIcon 
} from "./ui/Icons";
import Button from "./ui/Button";
import "./Navbar.css";

interface NavbarProps {
  onOpenAuth?: (callback?: () => void) => void;
  onOpenSimulator?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onOpenSimulator }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <header className="ecoroute-navbar">
      {/* Brand & Status Section */}
      <div className="nav-brand-section">
        <Link to="/" className="nav-brand-link" title="EcoRoute Spatial Platform">
          <div className="nav-brand-icon-box">
            <LeafIcon size={20} color="#ffffff" />
          </div>
          <div className="nav-brand-title-wrap">
            <span className="nav-brand-title">EcoRoute</span>
            <span className="nav-brand-tagline">GreenByte Mobility OS</span>
          </div>
        </Link>

        {/* Real-time Engine Status Chip */}
        <div className="nav-engine-chip" title="Real-time multi-factor pollution & routing algorithm active">
          <span className="nav-engine-dot" />
          <span>OSRM Multi-Factor Engine Active</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="nav-center-links" aria-label="Main Navigation">
        <Link 
          to="/dashboard" 
          className={`nav-item-link ${location.pathname === "/dashboard" ? "active" : ""}`}
        >
          <RouteIcon size={15} />
          <span>Cockpit</span>
        </Link>

        <Link 
          to="/marketplace" 
          className={`nav-item-link ${location.pathname === "/marketplace" ? "active" : ""}`}
        >
          <ShieldCheckIcon size={15} />
          <span>Marketplace</span>
        </Link>

        {onOpenSimulator && (
          <button 
            type="button"
            onClick={onOpenSimulator}
            className="nav-item-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <SlidersIcon size={15} />
            <span>Digital Twin Lab</span>
          </button>
        )}
      </nav>

      {/* Action / User Profile Section */}
      <div className="nav-action-section">
        {/* Carbon Ledger Quick Access */}
        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          className="nav-ledger-btn"
          title="Open Carbon Credits Ledger"
        >
          <CoinsIcon size={16} color="#10b981" />
          <span>Ledger</span>
        </button>

        {/* User Account / Sign In */}
        {isAuthenticated ? (
          <div className="nav-user-trigger" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="nav-avatar-btn"
              title={`Logged in as ${user?.name || user?.email}`}
              aria-expanded={showUserMenu}
              aria-haspopup="true"
            >
              {(user?.name?.[0] || user?.email?.[0] || "U").toUpperCase()}
            </button>

            {showUserMenu && (
              <div className="nav-user-dropdown" role="menu">
                <div className="nav-user-header">
                  <div className="nav-user-name">{user?.name || "Eco Citizen"}</div>
                  <div className="nav-user-email">{user?.email}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowHistoryModal(true);
                    setShowUserMenu(false);
                  }}
                  className="nav-dropdown-item"
                  role="menuitem"
                >
                  <CoinsIcon size={15} color="#10b981" />
                  <span>Carbon Credits History</span>
                </button>

                <Link
                  to="/marketplace"
                  onClick={() => setShowUserMenu(false)}
                  className="nav-dropdown-item"
                  role="menuitem"
                  style={{ textDecoration: 'none' }}
                >
                  <ShieldCheckIcon size={15} />
                  <span>Verified Solutions</span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="nav-dropdown-item danger"
                  role="menuitem"
                >
                  <ActivityIcon size={15} color="#ef4444" />
                  <span>Disconnect / Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenAuth ? (
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => onOpenAuth()}
              >
                Sign In
              </Button>
            ) : (
              <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm">Sign In</Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Credits / History Modal */}
      <HistoryModal 
        isOpen={showHistoryModal} 
        onClose={() => setShowHistoryModal(false)} 
        onOpenAuth={onOpenAuth}
      />
    </header>
  );
};

export default Navbar;
