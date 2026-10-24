import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AuthModal } from './auth/AuthModal';
import { Toaster } from 'react-hot-toast';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import Marketplace from './components/Marketplace';
import FloatingParticles from './components/ui/FloatingParticles';

const App: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalCallback, setAuthModalCallback] = useState<(() => void) | undefined>();

  const openAuthModal = (callback?: () => void) => {
    setAuthModalCallback(() => callback);
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
    setAuthModalCallback(undefined);
  };

  const handleAuthSuccess = () => {
    authModalCallback?.();
  };

  return (
    <>
      <Toaster 
        position="top-center" 
        reverseOrder={false}
        containerStyle={{
          zIndex: 99999999,
        }}
        toastOptions={{
          style: {
            zIndex: 99999999,
            background: '#0b1120',
            color: '#f8fafc',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.85)',
            fontSize: '13px',
            fontWeight: '600'
          }
        }}
      />
      <FloatingParticles count={35} color="rgba(0, 240, 255, 0.3)" />
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={closeAuthModal}
        onSuccess={handleAuthSuccess}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage onOpenAuth={openAuthModal} />} />
        <Route path="/marketplace" element={<Marketplace />} />
        {/* Redirect any unknown routes to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;