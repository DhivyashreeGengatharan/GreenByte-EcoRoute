import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { carbonAPI } from '../api/carbon';
import { CoinsIcon, CloseIcon, RouteIcon, LeafIcon, ShieldCheckIcon } from './ui/Icons';
import Button from './ui/Button';
import './HistoryModal.css';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
}

interface SavedTrip {
  id: string;
  carbonSaved: number;
  distance: number;
  storedAt: string;
  route?: {
    summary?: {
      distanceKm?: number;
    };
  };
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onOpenAuth }) => {
  const { isAuthenticated, token } = useAuth();
  const [history, setHistory] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (isAuthenticated && token) {
        fetchHistory();
      } else {
        setHistory([]);
        setError(null);
        setLoading(false);
      }
    }
  }, [isOpen, isAuthenticated, token]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchHistory = async () => {
    if (!isAuthenticated || !token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await carbonAPI.getUserCarbonCredits();
      if (data.success) {
        setHistory(data.credits || []);
      } else {
        setError(data.error || 'Failed to fetch credits ledger');
      }
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.status === 401) {
        setError('Session expired. Please sign in again.');
      } else {
        setError(err?.error || err?.message || 'Connection to ledger service failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalCredits = history.reduce((sum, trip) => sum + (trip.carbonSaved || 0), 0);
  const totalDistance = history.reduce((sum, trip) => sum + (trip.distance || 0), 0);
  const totalTrips = history.length;

  return (
    <div className="history-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="history-modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="history-header">
          <div className="history-header-title-wrap">
            <div className="history-header-icon">
              <CoinsIcon size={20} color="#10b981" />
            </div>
            <div>
              <h2>Carbon Credits Ledger</h2>
              <p>Verified environmental offset activity</p>
            </div>
          </div>
          <button className="history-close-btn" onClick={onClose} aria-label="Close ledger">
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="history-body">
          {/* Lifetime Executive Stats */}
          <div className="history-hero-summary">
            <div className="history-stat-card">
              <span className="history-stat-label">Total Credits Earned</span>
              <span className="history-stat-value highlight">+{totalCredits.toFixed(0)}</span>
            </div>
            <div className="history-stat-card">
              <span className="history-stat-label">Clean Distance Traveled</span>
              <span className="history-stat-value">{totalDistance.toFixed(1)} km</span>
            </div>
            <div className="history-stat-card">
              <span className="history-stat-label">Logged Green Trips</span>
              <span className="history-stat-value">{totalTrips}</span>
            </div>
          </div>

          {/* Table / State */}
          {!isAuthenticated ? (
            <div className="history-empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div
                className="history-empty-icon"
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  margin: '0 auto 16px auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%'
                }}
              >
                <ShieldCheckIcon size={28} color="#10b981" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Authentication Required
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
                Sign in to view your verified carbon credit ledger, track lifetime environmental offsets, and redeem clean mobility rewards.
              </p>
              {onOpenAuth && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                >
                  Sign In / Register
                </Button>
              )}
            </div>
          ) : loading ? (
            <div className="history-loading" style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: '36px',
                height: '36px',
                border: '3px solid rgba(16, 185, 129, 0.2)',
                borderTop: '3px solid #10b981',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px auto'
              }} />
              <p style={{ fontSize: '13px', color: '#64748b' }}>Syncing telemetry with credit ledger...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
              <button 
                type="button" 
                onClick={fetchHistory}
                style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Retry
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon">
                <LeafIcon size={28} color="#10b981" />
              </div>
              <h3>No Activity Logged Yet</h3>
              <p>Calculate and navigate an eco-friendly corridor to log your first verified carbon offset credits!</p>
            </div>
          ) : (
            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Corridor Distance</th>
                    <th>Offset Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((trip) => (
                    <tr key={trip.id}>
                      <td style={{ fontWeight: '600' }}>
                        {new Date(trip.storedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                        {trip.distance.toFixed(1)} km
                      </td>
                      <td>
                        <span className="history-credit-pill">
                          <CoinsIcon size={12} color="#10b981" />
                          <span>+{trip.carbonSaved.toFixed(0)} Credits</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
