import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { LeafIcon, CloseIcon } from '../components/ui/Icons';
import Button from '../components/ui/Button';
import '../components/AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const { login, signup } = useAuth();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFillDemo = () => {
    setFormData({
      name: 'Eco Traveler',
      email: 'demo@greenbyte.io',
      password: 'password123',
      confirmPassword: 'password123'
    });
    toast.success('Demo credentials loaded!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        if (!formData.email || !formData.password) {
          toast.error('Please fill in email and password');
          setLoading(false);
          return;
        }
        try {
          await login(formData.email, formData.password);
          toast.success('Authenticated successfully!');
        } catch (loginErr: any) {
          // If demo user hasn't been seeded in database yet, automatically register and login!
          if (formData.email === 'demo@greenbyte.io' || formData.email.includes('demo')) {
            await signup(formData.name || 'Eco Traveler', formData.email, formData.password);
            toast.success('Demo pilot account initialized!');
          } else {
            throw loginErr;
          }
        }
      } else {
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
          toast.error('Please fill in all registration fields');
          setLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }
        await signup(formData.name, formData.email, formData.password);
        toast.success('Citizen account created and logged in!');
      }

      setFormData({ name: '', email: '', password: '', confirmPassword: '' });
      onClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="auth-modal-content" onClick={e => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close modal">
          <CloseIcon size={16} />
        </button>

        {/* Brand Icon Badge */}
        <div className="auth-header-badge">
          <LeafIcon size={24} color="#ffffff" />
        </div>

        <h2 className="auth-modal-title">
          {isLogin ? 'Welcome to EcoRoute' : 'Create Citizen Account'}
        </h2>
        <p className="auth-modal-subtitle">
          {isLogin 
            ? 'Sign in to log carbon credits and view your ledger.' 
            : 'Join the decentralized sustainability network and earn credits for clean commutes.'}
        </p>

        {/* Tab Switcher */}
        <div className="auth-mode-switch">
          <button
            type="button"
            className={`auth-tab-btn ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="auth-form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Alex Rivera"
                required={!isLogin}
                disabled={loading}
              />
            </div>
          )}

          <div className="auth-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@domain.com"
              required
              disabled={loading}
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {!isLogin && (
            <div className="auth-form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required={!isLogin}
                disabled={loading}
              />
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            type="submit"
            loading={loading}
            style={{ width: '100%', marginTop: '8px', borderRadius: '10px' }}
          >
            {loading ? 'Authenticating...' : isLogin ? 'Sign In to Cockpit' : 'Register Account'}
          </Button>
        </form>

        {/* Demo Account Quick-Fill */}
        <div className="auth-demo-box">
          <div className="auth-demo-text">
            <strong>Need a test account?</strong>
            <div>Use one-click instant credentials.</div>
          </div>
          <button
            type="button"
            className="auth-demo-btn"
            onClick={handleFillDemo}
          >
            Fill Demo
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
