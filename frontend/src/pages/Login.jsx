import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import BrandLogo from '../components/BrandLogo';
import './AuthStyles.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const cardRef = useRef(null);

  const { login, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';
  const [toastMessage, setToastMessage] = useState('');

  // 1. Redirect already-authenticated users to /dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Check for session expiration notice
    const sessionExpiredNotice = sessionStorage.getItem('fit_auth_toast') || location.state?.toast;
    if (sessionExpiredNotice) {
      setToastMessage(sessionExpiredNotice);
      sessionStorage.removeItem('fit_auth_toast');
    }

    // GSAP Entrance animation
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 40, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'power3.out' }
    );
  }, [location.state]);

  // 2. Login submit logic with auto-detect unregistered email
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    const result = await login(email, password);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      const msg = result.message || '';
      // If account is not found, redirect to /register with pre-filled email and explicit toast notification
      if (msg.toLowerCase().includes('account not found') || msg.toLowerCase().includes('create an account')) {
        navigate('/register', {
          state: {
            email,
            toastMessage: 'No account found with this email. Please register.'
          }
        });
      } else {
        // Password incorrect or invalid credentials -> stay on form, show error badge
        setError(msg);
      }

    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-glow-1"></div>
      <div className="auth-glow-2"></div>

      <div className="auth-card" ref={cardRef}>
        <div className="auth-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', marginBottom: '1rem' }}>
            <BrandLogo size="large" />
          </Link>
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Log in to access your AI Fitness Dashboard</p>
        </div>

        {toastMessage && (
          <div className="error-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255, 214, 10, 0.12)', borderColor: '#FFD60A', color: '#FFD60A', marginBottom: '1rem' }}>
            <AlertCircle size={18} />
            <span>{toastMessage}</span>
          </div>
        )}

        {error && (
          <div className="error-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-container">
              <Mail className="input-icon" size={18} />
              <input
                type="email"
                className={`form-input ${error && !email ? 'input-error' : ''}`}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="form-label">Password</label>
              <Link to="/forgot-password" className="auth-link" style={{ fontSize: '0.8rem' }}>
                Forgot Password?
              </Link>
            </div>
            <div className="input-container">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                className={`form-input ${error && error.toLowerCase().includes('password') ? 'input-error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Login to Dashboard</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Section 8b Bottom-of-Form Link */}
        <div className="auth-links" style={{ justifyContent: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          <span style={{ color: '#B3B3B3' }}>Don't have an account? </span>
          <Link to="/register" className="auth-link" style={{ marginLeft: '0.4rem' }}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
