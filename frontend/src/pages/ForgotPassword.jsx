import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, KeyRound, Lock, ArrowRight, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import gsap from 'gsap';
import BrandLogo from '../components/BrandLogo';
import './AuthStyles.css';

const ForgotPassword = () => {
  const [phase, setPhase] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [demoOtpNotice, setDemoOtpNotice] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const cardRef = useRef(null);

  const { forgotPassword, verifyOTP, resetPassword, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' }
    );
  }, [phase]);

  // Phase 1: Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    const res = await forgotPassword(email);
    if (res.success) {
      setSuccessMsg(res.message);
      if (res.data?.demoOtp) {
        setDemoOtpNotice(`Demo OTP: ${res.data.demoOtp}`);
        setOtp(res.data.demoOtp); // prefill for easy testing
      }
      setPhase(2);
    } else {
      setError(res.message);
    }
  };

  // Phase 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }

    const res = await verifyOTP(email, otp);
    if (res.success) {
      setSuccessMsg('OTP verified! Now enter your new password.');
      setPhase(3);
    } else {
      setError(res.message);
    }
  };

  // Phase 3: Save New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    const res = await resetPassword(email, otp, newPassword);
    if (res.success) {
      setSuccessMsg('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } else {
      setError(res.message);
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
          <h2 className="auth-title">
            {phase === 1 && 'Reset Password'}
            {phase === 2 && 'Verify OTP Code'}
            {phase === 3 && 'Create New Password'}
          </h2>
          <p className="auth-subtitle">
            {phase === 1 && 'Enter your registered email to receive a password reset OTP'}
            {phase === 2 && `We have sent a verification code to ${email}`}
            {phase === 3 && 'Choose a strong password to secure your fitness account'}
          </p>
        </div>

        {error && (
          <div className="error-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="success-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {phase === 1 && (
          <form className="auth-form" onSubmit={handleRequestOTP}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-container">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              <span>Send OTP Code</span>
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {phase === 2 && (
          <form className="auth-form" onSubmit={handleVerifyOTP}>
            {demoOtpNotice && (
              <div style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
                {demoOtpNotice}
              </div>
            )}
            <div className="form-group">
              <label className="form-label">6-Digit Verification Code</label>
              <div className="input-container">
                <KeyRound className="input-icon" size={18} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="123456"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-grid">
              <button type="button" className="auth-btn-secondary" onClick={() => setPhase(1)}>
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>
              <button type="submit" className="auth-btn-primary">
                <span>Verify</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        {phase === 3 && (
          <form className="auth-form" onSubmit={handleResetPassword}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-container">
                <Lock className="input-icon" size={18} />
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="input-container">
                <Lock className="input-icon" size={18} />
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-btn-primary">
              <span>Save & Login</span>
              <CheckCircle size={18} />
            </button>
          </form>
        )}

        <div className="auth-links" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
          <Link to="/login" className="auth-link" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
