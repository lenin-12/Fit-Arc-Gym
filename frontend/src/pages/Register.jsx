import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, ArrowRight, ArrowLeft, CheckCircle, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import BrandLogo from '../components/BrandLogo';
import './AuthStyles.css';

const Register = () => {
  const [step, setStep] = useState(1);
  const location = useLocation();

  
  const initialEmail = location.state?.email || '';

  
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [mobile, setMobile] = useState('');
  const [firstSchoolName, setFirstSchoolName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState(25);
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(70);
  const [fitnessGoal, setFitnessGoal] = useState('Gain Muscle');
  const [activityLevel, setActivityLevel] = useState('Intermediate');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [toastMessage, setToastMessage] = useState(() => location.state?.toastMessage || '');
  const cardRef = useRef(null);

  const { register, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (location.state?.toastMessage) {
      setToastMessage(location.state.toastMessage);
    }
  }, [location.state]);

  useEffect(() => {
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, scale: 0.96 },
      { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' }
    );
  }, [step]);


  
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: '', color: '' };
    if (pwd.length < 6) return { label: 'Weak', color: '#EF4444' };
    if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return { label: 'Strong', color: '#00E676' };
    return { label: 'Medium', color: '#FFD60A' };
  };

  const strength = getPasswordStrength(password);

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Full Name is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!mobile || mobile.trim().length < 7) {
      setError('Please enter a valid mobile number.');
      return;
    }
    if (!firstSchoolName.trim()) {
      setError('First school name is required.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!termsAccepted) {
      setError('You must accept the Terms & Conditions to register.');
      return;
    }

    const payload = {
      name,
      email,
      mobile,
      password,
      confirmPassword,
      firstSchoolName,
      gender,
      age: Number(age),
      height: Number(height),
      weight: Number(weight),
      fitnessGoal,
      activityLevel
    };

    const result = await register(payload);
    if (result.success) {
      setSuccessMsg('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { state: { registeredEmail: email } });
      }, 1800);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-glow-1"></div>
      <div className="auth-glow-2"></div>

      <div className={`auth-card ${step === 2 ? 'auth-card-wide' : ''}`} ref={cardRef}>
        <div className="auth-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', marginBottom: '1rem' }}>
            <BrandLogo size="large" />
          </Link>

         
          <div className="stepper-container">
            <div className={`step-dot ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
          </div>

          <h2 className="auth-title">
            {step === 1 ? 'Create Your Account' : 'Complete Your Fitness Profile'}
          </h2>
          <p className="auth-subtitle">
            {step === 1
              ? 'Step 1 of 2: Basic Account Credentials'
              : 'Step 2 of 2: Personalize your AI training metrics'}
          </p>
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


        {successMsg && (
          <div className="success-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 1 ? (
          <form className="auth-form" onSubmit={handleStep1Submit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-container">
                <User className="input-icon" size={18} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-container">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="Enter your Email "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <div className="input-container">
                <Phone className="input-icon" size={18} />
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+91 XXXXX XXXXX"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">First School Name</label>
              <div className="input-container">
                <ShieldCheck className="input-icon" size={18} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your first school name"
                  value={firstSchoolName}
                  onChange={(e) => setFirstSchoolName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Password</label>
                {strength.label && (
                  <span style={{ fontSize: '0.78rem', color: strength.color, fontWeight: 700 }}>
                    Strength: {strength.label}
                  </span>
                )}
              </div>
              <div className="input-container">
                <Lock className="input-icon" size={18} />
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-container">
                <Lock className="input-icon" size={18} />
                <input
                  type="password"
                  className="form-input"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-btn-primary">
              <span>Continue</span>
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleFinalSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="form-select form-input-noicon"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Age</label>
                <input
                  type="number"
                  min="12"
                  max="90"
                  className="form-input form-input-noicon"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Height (cm)</label>
                <input
                  type="number"
                  min="100"
                  max="250"
                  className="form-input form-input-noicon"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Weight (kg)</label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  className="form-input form-input-noicon"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Fitness Goal</label>
              <select
                className="form-select form-input-noicon"
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value)}
              >
                <option value="Lose Weight">Lose Weight</option>
                <option value="Gain Muscle">Gain Muscle</option>
                <option value="Body Recomposition">Body Recomposition</option>
                <option value="Maintain Fitness">Maintain Fitness</option>
                <option value="Improve Endurance">Improve Endurance</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Activity Level</label>
              <select
                className="form-select form-input-noicon"
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
              >
                <option value="Beginner">Beginner (1-2 days/week)</option>
                <option value="Intermediate">Intermediate (3-4 days/week)</option>
                <option value="Advanced">Advanced (5+ days/week)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                id="terms"
                style={{ width: '18px', height: '18px', accentColor: '#FFD60A', cursor: 'pointer' }}
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <label htmlFor="terms" style={{ fontSize: '0.85rem', color: '#B3B3B3', cursor: 'pointer' }}>
                I accept the <span style={{ color: '#FFD60A' }}>Terms & Conditions</span> and Privacy Policy
              </label>
            </div>

            <div className="form-grid" style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                className="auth-btn-secondary"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ShieldCheck size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <div className="auth-links" style={{ justifyContent: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          <span style={{ color: '#B3B3B3' }}>Already have an account? </span>
          <Link to="/login" className="auth-link" style={{ marginLeft: '0.4rem' }}>
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
