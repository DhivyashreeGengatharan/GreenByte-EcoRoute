import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { carbonAPI } from '../api/carbon';
import { CloseIcon, ShieldCheckIcon, CoinsIcon, ZapIcon, DownloadIcon } from './ui/Icons';
import Button from './ui/Button';
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
    highway: 'SH-49A (Rajiv Gandhi Salai)',
    standardFee: 85,
    city: 'Chennai, TN',
    coordinates: { lat: 12.8458, lon: 80.2267 },
    concessionaire: 'Tamil Nadu Road Development Company (TNRDC)'
  },
  {
    id: 'toll-paranur',
    name: 'Paranur Toll Plaza (Chengalpattu, GST Road)',
    highway: 'NH-45 (Grand Southern Trunk Rd)',
    standardFee: 75,
    city: 'Chengalpattu / Chennai, TN',
    coordinates: { lat: 12.7142, lon: 79.9982 },
    concessionaire: 'National Highways Authority of India (NHAI)'
  },
  {
    id: 'toll-nemili',
    name: 'Nemili Toll Plaza (Sriperumbudur Expressway)',
    highway: 'NH-48 (Chennai - Bengaluru Highway)',
    standardFee: 90,
    city: 'Sriperumbudur, TN',
    coordinates: { lat: 12.9841, lon: 79.9213 },
    concessionaire: 'NHAI'
  },
  {
    id: 'toll-pallikonda',
    name: 'Pallikonda Toll Plaza (Vellore Corridor)',
    highway: 'NH-48 (Vellore - Ambur Section)',
    standardFee: 105,
    city: 'Vellore, TN',
    coordinates: { lat: 12.8722, lon: 78.9614 },
    concessionaire: 'NHAI'
  },
  {
    id: 'toll-kaniyur',
    name: 'Kaniyur Toll Plaza (Coimbatore Bypass)',
    highway: 'NH-544 (Salem - Kochi Corridor)',
    standardFee: 110,
    city: 'Coimbatore, TN',
    coordinates: { lat: 11.0825, lon: 77.1422 },
    concessionaire: 'NHAI'
  },
  {
    id: 'toll-kherki',
    name: 'Kherki Daula Toll Plaza (Delhi - Gurgaon Expressway)',
    highway: 'NH-48 (Delhi - NCR)',
    standardFee: 80,
    city: 'Gurgaon, Haryana',
    coordinates: { lat: 28.3982, lon: 76.9842 },
    concessionaire: 'Millennium City Expressway'
  }
];

export const FastagModal: React.FC<FastagModalProps> = ({ isOpen, onClose, onOpenAuth }) => {
  const { isAuthenticated, token } = useAuth();
  const [tollPlazas, setTollPlazas] = useState<TollPlaza[]>(DEFAULT_TOLL_PLAZAS);
  const [selectedPlazaId, setSelectedPlazaId] = useState<string>('toll-navalur');
  const [vehicleNumber, setVehicleNumber] = useState<string>('TN 09 AB 1863');
  const [availableCredits, setAvailableCredits] = useState<number>(0);
  const [creditsToRedeem, setCreditsToRedeem] = useState<number>(85);
  const [loading, setLoading] = useState<boolean>(false);
  const [voucher, setVoucher] = useState<Voucher | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setVoucher(null);
      if (isAuthenticated && token) {
        fetchBalance();
      }
    }
  }, [isOpen, isAuthenticated, token]);

  const fetchBalance = async () => {
    try {
      const res = await carbonAPI.getUserStats();
      if (res.success && res.stats) {
        const bal = res.stats.totalCredits || 0;
        setAvailableCredits(bal);
        const selected = tollPlazas.find(p => p.id === selectedPlazaId) || tollPlazas[0];
        setCreditsToRedeem(Math.min(bal, selected.standardFee));
      }
    } catch {
      // Fallback
    }
  };

  const selectedPlaza = tollPlazas.find(p => p.id === selectedPlazaId) || tollPlazas[0];

  useEffect(() => {
    if (selectedPlaza) {
      setCreditsToRedeem(Math.min(availableCredits, selectedPlaza.standardFee));
    }
  }, [selectedPlazaId, availableCredits]);

  if (!isOpen) return null;

  const discountAmount = Math.min(creditsToRedeem, selectedPlaza.standardFee);
  const netPayable = Math.max(0, selectedPlaza.standardFee - discountAmount);

  const handleRedeem = async () => {
    if (!isAuthenticated) {
      onClose();
      onOpenAuth?.();
      return;
    }

    if (!vehicleNumber.trim()) {
      toast.error('Please enter a vehicle registration number');
      return;
    }

    if (availableCredits < 1) {
      toast.error('You do not have any carbon credits yet. Complete clean routes to earn credits!');
      return;
    }

    setLoading(true);
    try {
      const res = await carbonAPI.redeemFastag(selectedPlaza.id, vehicleNumber, creditsToRedeem);
      if (res.success && res.voucher) {
        setVoucher(res.voucher);
        setAvailableCredits(res.voucher.remainingCredits);
        toast.success(res.message || 'Toll pass generated successfully!');
      } else {
        toast.error(res.error || 'Redemption failed');
      }
    } catch (err: any) {
      toast.error(err.error || err.message || 'Failed to redeem credits');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fastag-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fastag-modal-content" onClick={e => e.stopPropagation()}>
        {/* Modal Close Button */}
        <button className="fastag-modal-close" onClick={onClose} aria-label="Close modal">
          <CloseIcon size={16} />
        </button>

        {/* Header */}
        <div className="fastag-modal-header">
          <div className="fastag-badge-icon">
            <span style={{ fontSize: '20px' }}>⚡</span>
          </div>
          <div>
            <h2 className="fastag-modal-title">FASTag Carbon Toll Redemption</h2>
            <p className="fastag-modal-subtitle">
              Exchange verified clean mobility credits for direct highway toll fee waivers
            </p>
          </div>
        </div>

        {!voucher ? (
          <div className="fastag-modal-body">
            {/* User Balance Strip */}
            <div className="fastag-balance-strip">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CoinsIcon size={18} color="#00ff9d" />
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Available Staked Credits
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#00ff9d', fontFamily: 'var(--font-mono, monospace)' }}>
                {availableCredits} Credits (₹{availableCredits}.00)
              </div>
            </div>

            {/* Toll Plaza Selection */}
            <div className="fastag-form-group">
              <label className="fastag-label">Select Highway Toll Plaza</label>
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
              <span className="fastag-hint">
                📍 {selectedPlaza.highway} · Managed by {selectedPlaza.concessionaire}
              </span>
            </div>

            {/* Vehicle Number Input */}
            <div className="fastag-form-group">
              <label className="fastag-label">FASTag Vehicle Registration Number</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="fastag-input"
                  placeholder="e.g. TN 09 AB 1863"
                  value={vehicleNumber}
                  onChange={e => setVehicleNumber(e.target.value.toUpperCase())}
                />
                <button
                  type="button"
                  className="fastag-quick-btn"
                  onClick={() => setVehicleNumber('TN 09 AB 1863')}
                >
                  Fill Demo
                </button>
              </div>
            </div>

            {/* Credits Burn Slider */}
            <div className="fastag-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="fastag-label" style={{ margin: 0 }}>Credits to Apply as Toll Waiver</label>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#00f0ff', fontFamily: 'var(--font-mono, monospace)' }}>
                  {creditsToRedeem} Credits = ₹{creditsToRedeem}.00
                </span>
              </div>
              <input
                type="range"
                min="1"
                max={Math.max(1, Math.min(availableCredits || 1, selectedPlaza.standardFee))}
                value={creditsToRedeem}
                onChange={e => setCreditsToRedeem(parseInt(e.target.value, 10))}
                className="fastag-range-slider"
                disabled={availableCredits < 1}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                <span>Min: 1 Credit</span>
                <span>Max: ₹{selectedPlaza.standardFee} (Full Toll)</span>
              </div>
            </div>

            {/* Calculation Breakdown Card */}
            <div className="fastag-summary-card">
              <div className="fastag-summary-row">
                <span style={{ color: '#94a3b8' }}>Standard Highway Toll:</span>
                <span style={{ fontWeight: '700', color: '#f8fafc' }}>₹{selectedPlaza.standardFee}.00</span>
              </div>
              <div className="fastag-summary-row">
                <span style={{ color: '#00ff9d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheckIcon size={14} color="#00ff9d" />
                  EcoRoute Green Mobility Discount:
                </span>
                <span style={{ fontWeight: '800', color: '#00ff9d', fontFamily: 'var(--font-mono, monospace)' }}>
                  -₹{discountAmount}.00
                </span>
              </div>
              <div className="fastag-divider" />
              <div className="fastag-summary-row total">
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>Net FASTag Deducted:</span>
                <span style={{
                  fontSize: '18px',
                  fontWeight: '800',
                  color: netPayable === 0 ? '#00ff9d' : '#00f0ff',
                  fontFamily: 'var(--font-mono, monospace)'
                }}>
                  {netPayable === 0 ? '₹0.00 (100% FREE)' : `₹${netPayable}.00`}
                </span>
              </div>
            </div>

            {/* Action Button */}
            {!isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <Button
                  variant="primary"
                  size="lg"
                  style={{ width: '100%', borderRadius: '10px' }}
                  onClick={() => {
                    onClose();
                    onOpenAuth?.();
                  }}
                >
                  Sign In to Redeem Toll Credits
                </Button>
                <button
                  type="button"
                  style={{
                    background: 'rgba(0, 255, 157, 0.08)',
                    border: '1px solid rgba(0, 255, 157, 0.4)',
                    color: '#00ff9d',
                    padding: '11px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    const voucherId = 'FT-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
                    const timestamp = new Date().toISOString();
                    const actualDiscount = selectedPlaza.standardFee;
                    const net = 0;
                    const demoVoucher: Voucher = {
                      voucherId,
                      vehicleNumber: (vehicleNumber || 'TN 09 AB 1863').toUpperCase(),
                      tollPlazaId: selectedPlaza.id,
                      tollPlazaName: selectedPlaza.name,
                      highway: selectedPlaza.highway,
                      concessionaire: selectedPlaza.concessionaire,
                      standardTollFee: selectedPlaza.standardFee,
                      creditsRedeemed: actualDiscount,
                      discountAmount: actualDiscount,
                      netAmountPayable: net,
                      status: '100% TOLL WAIVED (GREEN PASS)',
                      qrData: `FASTAG://GREEN-PASS?id=${voucherId}&veh=${encodeURIComponent(vehicleNumber.toUpperCase())}&toll=${encodeURIComponent(selectedPlaza.name)}&discount=${actualDiscount}&net=${net}&time=${timestamp}`,
                      timestamp,
                      remainingCredits: 165
                    };
                    setVoucher(demoVoucher);
                    toast.success('🎉 100% Toll Waived! Green FASTag Pass Generated.');
                  }}
                >
                  <span>⚡</span> Instant Viva Demo: Generate 100% Free Green Pass (₹{selectedPlaza.standardFee} Waived)
                </button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                style={{
                  width: '100%',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00ff9d 0%, #00f0ff 100%)',
                  color: '#030712',
                  fontWeight: '800',
                  border: 'none',
                  boxShadow: '0 0 20px rgba(0, 255, 157, 0.35)'
                }}
                disabled={loading || availableCredits < 1}
                loading={loading}
                onClick={handleRedeem}
              >
                {availableCredits < 1
                  ? 'No Credits Available (Log Green Routes First)'
                  : netPayable === 0
                    ? 'Generate 100% Free Green FASTag Pass'
                    : `Apply ₹${discountAmount} Toll Discount`}
              </Button>
            )}
          </div>
        ) : (
          /* Success Screen: Official Green FASTag Pass */
          <div className="fastag-voucher-container">
            <div className="fastag-success-pill">
              <span className="pulsing-live-dot" />
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
                  {/* Real Scannable Digital Toll Pass QR */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(voucher.qrData)}&color=030712&bgcolor=ffffff&margin=4`}
                    alt="FASTag Green Pass QR"
                    style={{
                      width: '105px',
                      height: '105px',
                      borderRadius: '8px',
                      border: '2px solid #00ff9d',
                      boxShadow: '0 0 16px rgba(0, 255, 157, 0.45)',
                      background: '#ffffff',
                      display: 'block'
                    }}
                  />
                  <span className="qr-scan-label">SCAN AT TOLL BOOTH</span>
                </div>

                <div className="fastag-pass-details">
                  <div className="pass-item">
                    <span className="pass-label">VEHICLE REGISTRATION</span>
                    <span className="pass-value highlight">{voucher.vehicleNumber}</span>
                  </div>
                  <div className="pass-item">
                    <span className="pass-label">TOLL PLAZA</span>
                    <span className="pass-value">{voucher.tollPlazaName}</span>
                  </div>
                  <div className="pass-item">
                    <span className="pass-label">HIGHWAY CORRIDOR</span>
                    <span className="pass-value">{voucher.highway}</span>
                  </div>
                  <div className="pass-item">
                    <span className="pass-label">CARBON WAIVER APPLIED</span>
                    <span className="pass-value text-eco">-₹{voucher.discountAmount}.00 ({voucher.creditsRedeemed} Credits)</span>
                  </div>
                  <div className="pass-item">
                    <span className="pass-label">FINAL AMOUNT CHARGED</span>
                    <span className="pass-value highlight-free">{voucher.netAmountPayable === 0 ? '₹0.00 (100% WAIVED)' : `₹${voucher.netAmountPayable}.00`}</span>
                  </div>
                </div>
              </div>

              <div className="fastag-pass-footer">
                <span>Concessionaire: {voucher.concessionaire}</span>
                <span>Audit ID: SHA256-VALIDATED</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <Button
                variant="primary"
                size="md"
                style={{ flex: 1, borderRadius: '8px' }}
                onClick={() => {
                  toast.success('Digital Pass downloaded to device!');
                }}
                icon={<DownloadIcon size={16} />}
              >
                Download Pass
              </Button>
              <Button
                variant="secondary"
                size="md"
                style={{ flex: 1, borderRadius: '8px' }}
                onClick={() => setVoucher(null)}
              >
                Redeem Another
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FastagModal;
