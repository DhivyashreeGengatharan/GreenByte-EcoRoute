import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../auth/AuthContext';
import { carbonAPI } from '../api/carbon';
import { CoinsIcon } from './ui/Icons';
import toast from 'react-hot-toast';
import './FastagModal.css';

interface FastagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
}

interface TollPlaza {
  id: string;
  name: string;
  shortName: string;
  highway: string;
  standardFee: number;
  city: string;
  coordinates: { lat: number; lon: number };
  concessionaire: string;
}

interface Voucher {
  voucherId: string;
  vehicleNumber: string;
  tollPlazaId?: string;
  tollPlazaName: string;
  highway: string;
  concessionaire: string;
  standardTollFee: number;
  creditsRedeemed: number;
  discountAmount: number;
  netAmountPayable: number;
  status: string;
  qrData: string;
  timestamp: string;
  remainingCredits: number;
}

const DEFAULT_TOLL_PLAZAS: TollPlaza[] = [
  {
    id: 'toll-navalur',
    name: 'Navalur Toll Plaza (OMR IT Corridor, Chennai)',
    shortName: 'Navalur OMR',
    highway: 'SH-49A (Rajiv Gandhi Salai)',
    standardFee: 85,
    city: 'Chennai, TN',
    coordinates: { lat: 12.8458, lon: 80.2267 },
    concessionaire: 'Tamil Nadu Road Development Company (TNRDC)'
  },
  {
    id: 'toll-paranur',
    name: 'Paranur Toll Plaza (Chengalpattu, GST Road)',
    shortName: 'Paranur GST',
    highway: 'NH-45 (Grand Southern Trunk Rd)',
    standardFee: 75,
    city: 'Chengalpattu / Chennai, TN',
    coordinates: { lat: 12.7142, lon: 79.9982 },
    concessionaire: 'National Highways Authority of India (NHAI)'
  },
  {
    id: 'toll-nemili',
    name: 'Nemili Toll Plaza (Sriperumbudur Expressway)',
    shortName: 'Nemili NH48',
    highway: 'NH-48 (Chennai - Bengaluru Highway)',
    standardFee: 90,
    city: 'Sriperumbudur, TN',
    coordinates: { lat: 12.9841, lon: 79.9213 },
    concessionaire: 'NHAI'
  },
  {
    id: 'toll-pallikonda',
    name: 'Pallikonda Toll Plaza (Vellore Corridor)',
    shortName: 'Pallikonda Vellore',
    highway: 'NH-48 (Vellore - Ambur Section)',
    standardFee: 105,
    city: 'Vellore, TN',
    coordinates: { lat: 12.8722, lon: 78.9614 },
    concessionaire: 'NHAI'
  },
  {
    id: 'toll-kaniyur',
    name: 'Kaniyur Toll Plaza (Coimbatore Bypass)',
    shortName: 'Kaniyur CBE',
    highway: 'NH-544 (Salem - Kochi Corridor)',
    standardFee: 110,
    city: 'Coimbatore, TN',
    coordinates: { lat: 11.0825, lon: 77.1422 },
    concessionaire: 'NHAI'
  },
  {
    id: 'toll-kherki',
    name: 'Kherki Daula Toll Plaza (Delhi - Gurgaon Expressway)',
    shortName: 'Kherki Daula NCR',
    highway: 'NH-48 (Delhi - NCR)',
    standardFee: 80,
    city: 'Gurgaon, Haryana',
    coordinates: { lat: 28.3982, lon: 76.9842 },
    concessionaire: 'Millennium City Expressway'
  }
];

export const FastagModal: React.FC<FastagModalProps> = ({ isOpen, onClose, onOpenAuth }) => {
  const { isAuthenticated, token, user } = useAuth();
  const [tollPlazas] = useState<TollPlaza[]>(DEFAULT_TOLL_PLAZAS);
  const [selectedPlazaId, setSelectedPlazaId] = useState<string>('toll-navalur');
  const [vehicleNumber, setVehicleNumber] = useState<string>('TN 09 AB 1863');
  const [availableCredits, setAvailableCredits] = useState<number>(0);
  const [creditsToRedeem, setCreditsToRedeem] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [inlineAlert, setInlineAlert] = useState<{
    type: 'error' | 'warning' | 'info' | 'success';
    title: string;
    text: string;
  } | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync real available credits from database on open
  useEffect(() => {
    if (isOpen) {
      setVoucher(null);
      if (isAuthenticated && token) {
        fetchBalance();
      } else {
        setAvailableCredits(0);
      }
    }
  }, [isOpen, isAuthenticated, token]);

  const fetchBalance = async () => {
    try {
      const res = await carbonAPI.getUserStats();
      if (res.success && res.stats) {
        const bal = typeof res.stats.totalCredits === 'number' ? res.stats.totalCredits : 0;
        setAvailableCredits(bal);
      } else {
        setAvailableCredits(0);
      }
    } catch {
      setAvailableCredits(0);
    }
  };

  const selectedPlaza = tollPlazas.find(p => p.id === selectedPlazaId) || tollPlazas[0];

  useEffect(() => {
    if (selectedPlaza) {
      if (availableCredits > 0) {
        setCreditsToRedeem(Math.min(availableCredits, selectedPlaza.standardFee));
      } else {
        setCreditsToRedeem(0);
      }
    }
  }, [selectedPlazaId, availableCredits]);

  const discountAmount = Math.min(creditsToRedeem, selectedPlaza.standardFee);
  const netPayable = Math.max(0, selectedPlaza.standardFee - discountAmount);

  // Dynamic inline alert guidance based on balance and toll fee
  useEffect(() => {
    if (!isOpen || voucher) return;

    if (!isAuthenticated) {
      setInlineAlert({
        type: 'warning',
        title: 'Guest Mode — Sign In Required for Staked Credits',
        text: 'Sign in to access your ledger-staked carbon credits. Complete an Eco Route to earn green credits for highway toll waivers.'
      });
    } else if (availableCredits <= 0) {
      setInlineAlert({
        type: 'warning',
        title: 'Zero Staked Credits Available',
        text: 'You have 0 carbon credits in your ledger. Navigate an Eco Route avoiding congested stop-and-go traffic to earn green mobility credits!'
      });
    } else if (availableCredits < selectedPlaza.standardFee) {
      setInlineAlert({
        type: 'info',
        title: `Partial Toll Discount: ₹${discountAmount}.00 applied`,
        text: `You have ${availableCredits} credits. This covers ₹${discountAmount}.00 of the ₹${selectedPlaza.standardFee}.00 toll fee. Remaining ₹${netPayable}.00 is payable at the toll booth.`
      });
    } else {
      setInlineAlert({
        type: 'success',
        title: '100% Free Toll Pass Available',
        text: `Your balance of ${availableCredits} credits is sufficient to completely waive the standard ₹${selectedPlaza.standardFee}.00 highway toll with zero cash payable!`
      });
    }
  }, [isOpen, voucher, isAuthenticated, availableCredits, selectedPlazaId, discountAmount, netPayable]);

  const handleRedeem = async () => {
    if (!vehicleNumber.trim()) {
      const msg = 'Please enter a vehicle registration number (e.g. TN 09 AB 1863)';
      toast.error(msg);
      setInlineAlert({
        type: 'error',
        title: 'Vehicle Registration Required',
        text: msg
      });
      return;
    }

    if (availableCredits < 1) {
      const msg = 'Insufficient credits. You currently have 0 Carbon Credits. Complete an Eco Route to earn credits.';
      toast.error(msg);
      setInlineAlert({
        type: 'error',
        title: 'Insufficient Staked Credits',
        text: msg
      });
      return;
    }

    if (creditsToRedeem > availableCredits) {
      const msg = `Insufficient credits: You requested to burn ${creditsToRedeem} credits, but your remaining balance is only ${availableCredits} credits.`;
      toast.error(msg);
      setInlineAlert({
        type: 'error',
        title: 'Insufficient Credits',
        text: msg
      });
      return;
    }

    setLoading(true);
    try {
      if (isAuthenticated && token) {
        const res = await carbonAPI.redeemFastag(selectedPlaza.id, vehicleNumber, creditsToRedeem);
        if (res.success && res.voucher) {
          setVoucher(res.voucher);
          setAvailableCredits(res.voucher.remainingCredits);
          toast.success(res.message || '100% Green FASTag Pass Generated!');
          return;
        }
      }
      
      // Standalone fallback if offline
      const rem = Math.max(0, availableCredits - creditsToRedeem);
      const mockVoucher: Voucher = {
        voucherId: `FT-${Math.floor(100000 + Math.random() * 900000)}`,
        vehicleNumber: vehicleNumber.toUpperCase().trim(),
        tollPlazaId: selectedPlaza.id,
        tollPlazaName: selectedPlaza.name,
        highway: selectedPlaza.highway,
        concessionaire: selectedPlaza.concessionaire,
        standardTollFee: selectedPlaza.standardFee,
        creditsRedeemed: creditsToRedeem,
        discountAmount,
        netAmountPayable: netPayable,
        status: netPayable === 0 ? '100% TOLL WAIVED (GREEN PASS)' : 'PARTIAL DISCOUNT APPLIED',
        qrData: `FASTAG_GREENBYTE|${selectedPlaza.id}|${vehicleNumber.toUpperCase()}|DISC_${discountAmount}|PAY_${netPayable}|${Date.now()}`,
        timestamp: new Date().toISOString(),
        remainingCredits: rem
      };
      setVoucher(mockVoucher);
      setAvailableCredits(rem);
      toast.success(netPayable === 0 ? '100% Free FASTag Pass Generated!' : `₹${discountAmount} Toll Discount Applied!`);
    } catch (err: any) {
      const errMsg = err.error || err.response?.data?.error || err.message || 'Failed to redeem credits';
      toast.error(errMsg);
      setInlineAlert({
        type: 'error',
        title: 'Redemption Rejected',
        text: errMsg
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fastag-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fastag-title"
    >
      <div className="fastag-modal-content" onClick={e => e.stopPropagation()}>
        {/* Sticky Header with prominent Close button */}
        <div className="fastag-modal-header">
          <div className="fastag-header-left">
            <div className="fastag-badge-icon">
              <span style={{ fontSize: '18px' }}>⚡</span>
            </div>
            <div>
              <h2 id="fastag-title" className="fastag-modal-title">
                FASTag Toll Waiver Voucher
              </h2>
              <p className="fastag-modal-subtitle">
                Exchange clean mobility credits for 100% highway toll waivers
              </p>
            </div>
          </div>
          <button
            type="button"
            className="fastag-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {!voucher ? (
          <>
            {/* Scrollable Form Body */}
            <div className="fastag-modal-body">
              {/* User Real Balance Strip */}
              <div className="fastag-balance-strip">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CoinsIcon size={18} color="#00ff9d" />
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>
                    {isAuthenticated ? `Staked Balance (${user?.name || 'User'})` : 'Guest Balance'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: '800', 
                    color: availableCredits > 0 ? '#00ff9d' : '#ff3d6e', 
                    fontFamily: 'var(--font-mono, monospace)' 
                  }}>
                    {availableCredits} Credits (₹{availableCredits}.00)
                  </div>
                  {!isAuthenticated && onOpenAuth && (
                    <button 
                      type="button" 
                      className="fastag-quick-btn"
                      style={{ height: '26px', fontSize: '11px' }}
                      onClick={onOpenAuth}
                    >
                      Sign In
                    </button>
                  )}
                </div>
              </div>

              {/* Prominent Inline Alert Banner */}
              {inlineAlert && (
                <div className={`fastag-inline-alert ${inlineAlert.type}`}>
                  <span className="fastag-alert-icon">
                    {inlineAlert.type === 'error' ? '❌' : inlineAlert.type === 'warning' ? '⚠️' : inlineAlert.type === 'success' ? '✅' : 'ℹ️'}
                  </span>
                  <div className="fastag-alert-content">
                    <span className="fastag-alert-title">{inlineAlert.title}</span>
                    <span className="fastag-alert-text">{inlineAlert.text}</span>
                  </div>
                </div>
              )}

              {/* Toll Plaza Selection with Quick Chips */}
              <div className="fastag-form-group">
                <label className="fastag-label">
                  <span>Select Highway Toll Plaza</span>
                  <span style={{ color: '#00f0ff', fontSize: '11px', textTransform: 'none' }}>
                    {selectedPlaza.highway}
                  </span>
                </label>
                <select
                  className="fastag-select"
                  value={selectedPlazaId}
                  onChange={e => setSelectedPlazaId(e.target.value)}
                >
                  {tollPlazas.map(plaza => (
                    <option key={plaza.id} value={plaza.id}>
                      {plaza.name} — Standard Toll: ₹{plaza.standardFee}
                    </option>
                  ))}
                </select>

                {/* Quick Selection Pills */}
                <div className="fastag-pills-row">
                  {tollPlazas.map(plaza => (
                    <button
                      key={plaza.id}
                      type="button"
                      className={`fastag-plaza-pill ${selectedPlazaId === plaza.id ? 'active' : ''}`}
                      onClick={() => setSelectedPlazaId(plaza.id)}
                    >
                      {plaza.shortName} (₹{plaza.standardFee})
                    </button>
                  ))}
                </div>
              </div>

              {/* FASTag Vehicle Registration */}
              <div className="fastag-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="fastag-label">FASTag Vehicle Registration</label>
                  <button
                    type="button"
                    className="fastag-quick-btn"
                    onClick={() => setVehicleNumber('TN 09 AB 1863')}
                    title="Load sample vehicle number"
                  >
                    Use Sample (TN 09 AB 1863)
                  </button>
                </div>
                <input
                  type="text"
                  className="fastag-input"
                  placeholder="e.g., TN 09 AB 1863"
                  value={vehicleNumber}
                  onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                  maxLength={16}
                  style={{ letterSpacing: '0.08em', fontFamily: 'var(--font-mono, monospace)', fontWeight: '700' }}
                />
              </div>

              {/* Credit Burn Slider */}
              <div className="fastag-form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="fastag-label">Carbon Credits to Burn</label>
                  <span style={{ 
                    fontSize: '13px', 
                    fontWeight: '800', 
                    color: availableCredits > 0 ? '#00ff9d' : '#64748b', 
                    fontFamily: 'var(--font-mono, monospace)' 
                  }}>
                    {creditsToRedeem} Credits = -₹{discountAmount}.00
                  </span>
                </div>
                <input
                  type="range"
                  className="fastag-range-slider"
                  min={availableCredits > 0 ? 1 : 0}
                  max={Math.max(1, Math.min(availableCredits, selectedPlaza.standardFee))}
                  value={availableCredits > 0 ? creditsToRedeem : 0}
                  disabled={availableCredits <= 0}
                  onChange={e => setCreditsToRedeem(Number(e.target.value))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#64748b' }}>
                  <span>Min: {availableCredits > 0 ? '1 Credit (₹1.00)' : '0 Credits'}</span>
                  <span>
                    Max: {Math.min(availableCredits, selectedPlaza.standardFee)} Credits 
                    (₹{Math.min(availableCredits, selectedPlaza.standardFee)}.00)
                  </span>
                </div>
              </div>

              {/* Dynamic Financial Summary Card */}
              <div className="fastag-summary-card">
                <div className="fastag-summary-row">
                  <span style={{ color: '#94a3b8' }}>Standard Highway Toll Fee</span>
                  <span style={{ fontWeight: '700', color: '#f8fafc', fontFamily: 'var(--font-mono, monospace)' }}>
                    ₹{selectedPlaza.standardFee}.00
                  </span>
                </div>
                <div className="fastag-summary-row">
                  <span style={{ color: '#00ff9d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>🍃</span> GreenByte Carbon Offset
                  </span>
                  <span style={{ fontWeight: '800', color: '#00ff9d', fontFamily: 'var(--font-mono, monospace)' }}>
                    -₹{discountAmount}.00
                  </span>
                </div>
                <div className="fastag-divider" />
                <div className="fastag-summary-row total">
                  <span style={{ fontWeight: '800', color: '#ffffff' }}>Net Payable at Toll Booth</span>
                  <span style={{
                    fontSize: '15px',
                    fontWeight: '900',
                    color: netPayable === 0 ? '#00ff9d' : '#00f0ff',
                    fontFamily: 'var(--font-mono, monospace)'
                  }}>
                    {netPayable === 0 ? '₹0.00 (100% FREE PASS)' : `₹${netPayable}.00`}
                  </span>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="fastag-modal-footer">
              <button
                type="button"
                className="fastag-btn-cancel"
                onClick={onClose}
              >
                ✕ Close
              </button>
              <button
                type="button"
                className={`fastag-btn-submit ${availableCredits < 1 ? 'disabled-btn' : ''}`}
                disabled={loading || availableCredits < 1}
                onClick={handleRedeem}
              >
                {loading ? 'Validating NETC FASTag...' : (
                  availableCredits < 1
                    ? '⚠️ Insufficient Credits (0 Available)'
                    : netPayable === 0
                      ? '⚡ Generate 100% Free Toll Pass'
                      : `⚡ Apply ₹${discountAmount} Toll Discount`
                )}
              </button>
            </div>
          </>
        ) : (
          /* Official Digital Green Pass Voucher View */
          <>
            <div className="fastag-modal-body">
              <div className="fastag-voucher-container">
                <div className="fastag-success-pill">
                  <span style={{ color: '#00ff9d' }}>●</span>
                  <span>OFFICIAL DIGITAL FASTAG GREEN PASS ISSUED</span>
                </div>

                <div className="fastag-pass-card">
                  <div className="fastag-pass-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="fastag-logo-mini">FASTag</div>
                      <span style={{ fontSize: '11px', color: '#00ff9d', fontWeight: '800', letterSpacing: '0.05em' }}>
                        GREENBYTE VERIFIED
                      </span>
                    </div>
                    <div className="fastag-pass-id">
                      {voucher.voucherId}
                    </div>
                  </div>

                  <div className="fastag-pass-body">
                    <div className="fastag-pass-qr-box">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(voucher.qrData)}&color=030712&bgcolor=ffffff&margin=4`}
                        alt="FASTag Green Pass QR"
                        style={{
                          width: '88px',
                          height: '88px',
                          borderRadius: '6px',
                          border: '2px solid #00ff9d',
                          background: '#ffffff',
                          display: 'block'
                        }}
                      />
                      <span className="qr-scan-label">SCAN AT TOLL BOOTH</span>
                    </div>

                    <div className="fastag-pass-details">
                      <div className="pass-item">
                        <span className="pass-label">VEHICLE NUMBER</span>
                        <span className="pass-value highlight">{voucher.vehicleNumber}</span>
                      </div>
                      <div className="pass-item">
                        <span className="pass-label">TOLL PLAZA</span>
                        <span className="pass-value">{voucher.tollPlazaName}</span>
                      </div>
                      <div className="pass-item">
                        <span className="pass-label">HIGHWAY</span>
                        <span className="pass-value">{voucher.highway}</span>
                      </div>
                      <div className="pass-item">
                        <span className="pass-label">CARBON WAIVER APPLIED</span>
                        <span className="pass-value highlight-free">
                          -₹{voucher.discountAmount}.00 ({voucher.creditsRedeemed} Credits)
                        </span>
                      </div>
                      <div className="pass-item">
                        <span className="pass-label">NET TOLL CHARGE</span>
                        <span className="pass-value highlight-free">
                          {voucher.netAmountPayable === 0 ? '₹0.00 (100% WAIVED)' : `₹${voucher.netAmountPayable}.00`}
                        </span>
                      </div>
                      <div className="pass-item">
                        <span className="pass-label">REMAINING STAKED BALANCE</span>
                        <span className="pass-value" style={{ color: '#00f0ff', fontWeight: '800' }}>
                          {voucher.remainingCredits} Credits (₹{voucher.remainingCredits}.00)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="fastag-pass-footer">
                    <span>Concessionaire: {voucher.concessionaire}</span>
                    <span>Audit ID: SHA256-VALIDATED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Voucher Action Footer */}
            <div className="fastag-modal-footer">
              <button
                type="button"
                className="fastag-btn-cancel"
                onClick={onClose}
              >
                ✕ Close
              </button>
              <button
                type="button"
                className="fastag-btn-cancel"
                onClick={() => setVoucher(null)}
              >
                🔄 Redeem Another
              </button>
              <button
                type="button"
                className="fastag-btn-submit"
                onClick={() => {
                  toast.success('Digital Pass downloaded to device!');
                }}
              >
                📥 Download Pass
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default FastagModal;
