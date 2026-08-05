import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PLAN_TIERS, TAX_RATE } from '../utils/planTiers';
import { CreditCard, Smartphone, Building, Wallet, CheckCircle, ShieldCheck, AlertCircle, ArrowLeft } from 'lucide-react';
import "../components/dashboard/Dashboard.css";

const PaymentPage = () => {
  const { user, authFetch, updateUserProfileState, refreshUserPlan } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get passed plan data or default to Premium Plan
  const selectedState = location.state || {};
  const initialTier = PLAN_TIERS.find((t) => t.key === selectedState.planKey) || PLAN_TIERS[1];

  const [plan, setPlan] = useState(initialTier);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'upi' | 'net_banking' | 'wallet'
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null); // { type: 'success' | 'error', text: string }

  // Calculation breakdown
  const subtotal = plan.price;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const handlePayNow = async () => {
    setIsProcessing(true);
    setToastMessage(null);

    try {
      // 1. Create payment order via backend API
      const createRes = await authFetch('/payment/create', {
        method: 'POST',
        body: JSON.stringify({
          planName: plan.key,
          method: paymentMethod
        })
      });

      if (!createRes.success) {
        showToast('error', createRes.message || 'Payment initiation failed.');
        setIsProcessing(false);
        return;
      }

      const transactionId = createRes.data.transactionId;

      // 2. Call gateway success callback
      const successRes = await authFetch('/payment/success', {
        method: 'POST',
        body: JSON.stringify({
          transactionId,
          planName: plan.key,
          method: paymentMethod,
          success: true
        })
      });

      if (successRes.success && successRes.data) {
        // 3. Refresh user context client-side (no full page reload)
        if (successRes.data.user) {
          updateUserProfileState(successRes.data.user);
        }
        await refreshUserPlan();

        // 4. Show success toast and redirect after brief pause
        showToast('success', `Your ${plan.name} has been activated successfully.`);
        setTimeout(() => {
          navigate('/dashboard/plan');
        }, 1200);
      } else {
        showToast('error', successRes.message || 'Payment processing failed.');
        setIsProcessing(false);
      }
    } catch (error) {
      showToast('error', 'Network error or transaction cancelled.');
      setIsProcessing(false);
    }
  };

  const handleSimulateFailure = async () => {
    setIsProcessing(true);
    setToastMessage(null);

    try {
      const createRes = await authFetch('/payment/create', {
        method: 'POST',
        body: JSON.stringify({
          planName: plan.key,
          method: paymentMethod
        })
      });

      const transactionId = createRes?.data?.transactionId || 'TXN_FAIL_' + Date.now();

      await authFetch('/payment/success', {
        method: 'POST',
        body: JSON.stringify({
          transactionId,
          planName: plan.key,
          method: paymentMethod,
          success: false
        })
      });

      showToast('error', 'Payment failed or was cancelled by user. Current plan remains unchanged.');
    } catch (err) {
      showToast('error', 'Payment failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard/plan')}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#9c9c9c',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          cursor: 'pointer',
          fontSize: '0.95rem',
          width: 'fit-content',
          padding: 0
        }}
      >
        <ArrowLeft size={18} />
        <span>Back to Plans</span>
      </button>

      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>Secure Checkout</h1>
        <p style={{ color: '#9c9c9c', marginTop: '0.3rem', fontSize: '0.95rem' }}>
          Complete your subscription payment to activate instant access.
        </p>
      </div>

      {/* Toast Notification Alert Banner */}
      {toastMessage && (
        <div
          style={{
            background: toastMessage.type === 'success' ? 'rgba(46, 213, 115, 0.15)' : 'rgba(250, 80, 66, 0.15)',
            border: `1.5px solid ${toastMessage.type === 'success' ? '#2ed573' : '#fa5042'}`,
            borderRadius: '12px',
            padding: '1rem 1.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            color: toastMessage.type === 'success' ? '#2ed573' : '#fa5042',
            fontWeight: 700
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Left Column: Payment Method Selection */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Select Payment Method</h2>

          {/* Payment Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {/* Card */}
            <div
              onClick={() => setPaymentMethod('card')}
              style={{
                border: paymentMethod === 'card' ? '2px solid #f48915' : '1px solid rgba(255,255,255,0.1)',
                background: paymentMethod === 'card' ? 'rgba(244, 137, 21, 0.08)' : 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <CreditCard color={paymentMethod === 'card' ? '#f48915' : '#9c9c9c'} size={24} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Credit / Debit Card</div>
                <div style={{ fontSize: '0.78rem', color: '#9c9c9c' }}>Visa, MasterCard, RuPay</div>
              </div>
              <input type="radio" name="payment" checked={paymentMethod === 'card'} onChange={() => {}} />
            </div>

            {/* UPI */}
            <div
              onClick={() => setPaymentMethod('upi')}
              style={{
                border: paymentMethod === 'upi' ? '2px solid #f48915' : '1px solid rgba(255,255,255,0.1)',
                background: paymentMethod === 'upi' ? 'rgba(244, 137, 21, 0.08)' : 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Smartphone color={paymentMethod === 'upi' ? '#f48915' : '#9c9c9c'} size={24} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>UPI / QR Code</div>
                <div style={{ fontSize: '0.78rem', color: '#9c9c9c' }}>GPay, PhonePe, Paytm, BHIM</div>
              </div>
              <input type="radio" name="payment" checked={paymentMethod === 'upi'} onChange={() => {}} />
            </div>

            {/* Net Banking */}
            <div
              onClick={() => setPaymentMethod('net_banking')}
              style={{
                border: paymentMethod === 'net_banking' ? '2px solid #f48915' : '1px solid rgba(255,255,255,0.1)',
                background: paymentMethod === 'net_banking' ? 'rgba(244, 137, 21, 0.08)' : 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Building color={paymentMethod === 'net_banking' ? '#f48915' : '#9c9c9c'} size={24} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Net Banking</div>
                <div style={{ fontSize: '0.78rem', color: '#9c9c9c' }}>All Indian Major Banks Supported</div>
              </div>
              <input type="radio" name="payment" checked={paymentMethod === 'net_banking'} onChange={() => {}} />
            </div>

            {/* Wallet */}
            <div
              onClick={() => setPaymentMethod('wallet')}
              style={{
                border: paymentMethod === 'wallet' ? '2px solid #f48915' : '1px solid rgba(255,255,255,0.1)',
                background: paymentMethod === 'wallet' ? 'rgba(244, 137, 21, 0.08)' : 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Wallet color={paymentMethod === 'wallet' ? '#f48915' : '#9c9c9c'} size={24} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Digital Wallets</div>
                <div style={{ fontSize: '0.78rem', color: '#9c9c9c' }}>Paytm, Amazon Pay, Mobikwik</div>
              </div>
              <input type="radio" name="payment" checked={paymentMethod === 'wallet'} onChange={() => {}} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9c9c9c', fontSize: '0.82rem', marginTop: '0.5rem' }}>
            <ShieldCheck size={18} color="#2ed573" />
            <span>256-Bit TLS Bank Grade Encryption</span>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Order Summary</h2>

            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '1rem 0', margin: '0.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{plan.name}</span>
                <span style={{ fontWeight: 800, color: '#f48915', fontSize: '1.1rem' }}>₹{subtotal.toLocaleString()}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#9c9c9c', marginTop: '0.2rem' }}>
                Duration: {plan.durationDays} Days (Immediate Activation)
              </div>
            </div>

            {/* Included Features List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '1rem 0' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#9c9c9c' }}>Included Features:</span>
              {plan.features.map((feat, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#d9d9d9' }}>
                  <CheckCircle size={14} color="#2ed573" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            {/* Pricing Line Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#d9d9d9' }}>
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#d9d9d9' }}>
                <span>GST Tax (18%)</span>
                <span>₹{tax.toLocaleString()}</span>
              </div>
              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.15)', margin: '0.4rem 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
                <span>Total Amount</span>
                <span style={{ color: '#f48915' }}>₹{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1.5rem' }}>
            <button
              disabled={isProcessing}
              className="auth-btn-primary"
              style={{ width: '100%', margin: 0, padding: '0.9rem', fontSize: '1rem' }}
              onClick={handlePayNow}
            >
              {isProcessing ? 'Processing Payment...' : `Pay ₹${total.toLocaleString()} Now`}
            </button>

            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                disabled={isProcessing}
                className="auth-btn-secondary"
                style={{ flex: 1, margin: 0, padding: '0.6rem', fontSize: '0.85rem' }}
                onClick={() => navigate('/dashboard/plan')}
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                style={{
                  flex: 1,
                  margin: 0,
                  padding: '0.6rem',
                  fontSize: '0.85rem',
                  background: 'rgba(255, 107, 107, 0.1)',
                  border: '1px solid rgba(255, 107, 107, 0.3)',
                  color: '#ff6b6b',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
                onClick={handleSimulateFailure}
              >
                Simulate Failure
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
