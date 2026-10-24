import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { AuthModal } from './auth/AuthModal';
import { Toaster } from 'react-hot-toast';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import Marketplace from './components/Marketplace';
import FloatingParticles from './components/ui/FloatingParticles';
import { isNativeApk } from './utils/platform';

const App: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalCallback, setAuthModalCallback] = useState<(() => void) | undefined>();
  const initialLoginPrompted = useRef(false);

  const isApk = isNativeApk();

  // Configure body class for native APK container
  useEffect(() => {
    if (isApk) {
      document.body.classList.add('is-app-platform');
    } else {
      document.body.classList.remove('is-app-platform');
    }
  }, [isApk]);

  // ONLY for native mobile APK: Prompt initial login option on cold launch if unauthenticated
  useEffect(() => {
    if (isApk && !authLoading && !isAuthenticated && !initialLoginPrompted.current) {
      initialLoginPrompted.current = true;
      const timer = setTimeout(() => {
        setShowAuthModal(true);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [isApk, authLoading, isAuthenticated]);

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
          top: isApk ? '48px' : '16px'
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
        {/*
          Web Version (Desktop, mobile browser, Vercel URL):
          ALWAYS displays LandingPage at root "/"

          APK Version Alone (Installed mobile APK):
          Skips LandingPage and routes straight to Cockpit "/dashboard"
        */}
        <Route 
          path="/" 
          element={
            isApk ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LandingPage />
            )
          } 
        />
        <Route path="/dashboard" element={<DashboardPage onOpenAuth={openAuthModal} />} />
        <Route path="/marketplace" element={<Marketplace />} />
        {/* Redirect any unmatched routes */}
        <Route path="*" element={<Navigate to={isApk ? "/dashboard" : "/"} replace />} />
      </Routes>
    </>
  );
};

export default App;
