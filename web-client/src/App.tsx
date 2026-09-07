import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AuthModal } from './auth/AuthModal';
import { Toaster } from 'react-hot-toast';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import Marketplace from './components/Marketplace';

const DashboardGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isExplored = sessionStorage.getItem('ecoroute_explored') === 'true';
  if (!isExplored) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

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
      <Toaster position="top-center" reverseOrder={false} />
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={closeAuthModal}
        onSuccess={handleAuthSuccess}
      />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/dashboard" 
          element={
            <DashboardGuard>
              <DashboardPage onOpenAuth={openAuthModal} />
            </DashboardGuard>
          } 
        />
        <Route path="/marketplace" element={<Marketplace />} />
        {/* Redirect any unknown routes to landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;