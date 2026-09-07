import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';
import { carbonAPI } from '../api/carbon';
import type { RouteResponse } from '../api/routing';
import { CoinsIcon, ShieldCheckIcon, ZapIcon } from './ui/Icons';
import Button from './ui/Button';

interface StoreCarbonButtonProps {
  routeData: RouteResponse | null;
  onOpenAuth: (callback?: () => void) => void;
  onSuccess?: () => void;
}

export const StoreCarbonButton: React.FC<StoreCarbonButtonProps> = ({
  routeData,
  onOpenAuth,
  onSuccess
}) => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isStored, setIsStored] = useState(false);

  const handleStoreCarbon = async () => {
    if (!isAuthenticated) {
      onOpenAuth(handleStoreCarbon);
      return;
    }

    if (!routeData) {
      toast.error('No corridor data generated. Please calculate a route first.');
      return;
    }

    setLoading(true);

    try {
      const creditsEarned = routeData.rewards?.creditsEarned || 0;
      const distance = routeData.routes?.[0]?.summary?.distanceKm || 0;

      if (creditsEarned <= 0) {
        toast.error('No credits available for this route.');
        setLoading(false);
        return;
      }

      const selectedRoute = routeData.routes?.find(r => r.id === routeData.ecoRouteId) || routeData.routes?.[0];
      
      const optimizedRoute = {
        id: selectedRoute?.id || 'route-' + Date.now(),
        type: selectedRoute?.type || 'eco',
        summary: selectedRoute?.summary || { distanceKm: distance, carbon: creditsEarned },
        optimizationTriggered: routeData.optimizationTriggered || false
      };

      const response = await carbonAPI.storeCarbonCredits(
        optimizedRoute,
        creditsEarned,
        distance
      );

      if (response.success) {
        toast.success(`🎉 +${creditsEarned} Carbon Credits logged to your ledger!`, { duration: 4 });
        setIsStored(true);
        onSuccess?.();
      } else {
        toast.error(response.error || 'Failed to store credits');
      }
    } catch (error: any) {
      console.error('Store carbon error:', error);
      
      if (error.error === 'This route has already been saved to your account.') {
        toast('Already stored in your ledger!', { icon: '✅' });
        setIsStored(true);
        return;
      }

      if (error.error === 'No token provided. Please login first.') {
        toast.error('Session expired. Please sign in again.');
        onOpenAuth();
      } else {
        toast.error(error.error || 'Failed to store credits');
      }
    } finally {
      setLoading(false);
    }
  };

  const creditsEarned = routeData?.rewards?.creditsEarned || 0;

  if (isStored) {
    return (
      <div style={{
        width: '100%',
        padding: '12px 16px',
        background: 'rgba(16, 185, 129, 0.12)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: '#059669',
        fontWeight: '700',
        fontSize: '13.5px'
      }}>
        <ShieldCheckIcon size={18} color="#10b981" />
        <span>Credits Successfully Logged</span>
      </div>
    );
  }

  return (
    <Button
      variant={isAuthenticated ? "primary" : "secondary"}
      size="lg"
      onClick={handleStoreCarbon}
      disabled={loading || !routeData}
      loading={loading}
      style={{
        width: '100%',
        borderRadius: '10px',
        boxShadow: isAuthenticated ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none'
      }}
      icon={isAuthenticated ? <CoinsIcon size={16} /> : <ZapIcon size={16} />}
    >
      {loading 
        ? 'Writing to Ledger...' 
        : isAuthenticated 
          ? `Store +${creditsEarned} Credits to Ledger` 
          : 'Sign In to Store Credits'
      }
    </Button>
  );
};

export default StoreCarbonButton;
