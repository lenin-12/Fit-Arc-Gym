import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PLAN_TIERS, TAX_RATE, normalizePlanKey } from '../utils/planTiers';
import {
  Wallet,
  CheckCircle,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Building2,
  Crown,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import "../components/dashboard/Dashboard.css";

const PaymentPage = () => {
  const { user, authFetch, updateUserProfileState, refreshUserPlan, refreshWalletBalance } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Get passed plan data or default to Premium Plan
  const selectedState = location.state || {};
  const initialPlanKey = selectedState.planKey || 'premium';
  const initialTier = PLAN_TIERS.find((t) => t.key === initialPlanKey) || PLAN_TIERS[1];

  const [selectedPlan, setSelectedPlan] = useState(initialTier);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null); // { type: 'success' | 'error' | 'warning', text: string }
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // Authoritative data from backend
  const [authoritativeBalance, setAuthoritativeBalance] = useState(
    user?.walletBalance !== undefined ? user.walletBalance : 15000
  );
  const [transactions, setTransactions] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Admin stats state
  const [adminStats, setAdminStats] = useState(null);
  const [adminTransactions, setAdminTransactions] = useState([]);

  // Client idempotency key per checkout session
  const idempotencyKeyRef = useRef('IDEMP_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));

  // Fetch live wallet balance and transaction history on mount
  const fetchWalletData = async () => {
    try {
      const res = await authFetch('/wallet');
      if (res.success && res.data) {
        setAuthoritativeBalance(res.data.walletBalance);
        updateUserProfileState({
          walletBalance: res.data.walletBalance,
          role: res.data.role
        });
      }
    } catch (e) {
      console.warn('Failed to fetch wallet balance:', e);
    }
  };

  const fetchTransactions = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await authFetch('/wallet/transactions?limit=10');
      if (res.success && res.data) {
        setTransactions(res.data.transactions || []);
      }
    } catch (e) {
      console.warn('Failed to fetch transactions:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchAdminPlatformData = async () => {
    if (user?.role !== 'admin') return;
    try {
      const [walletRes, txnRes] = await Promise.all([
        authFetch('/admin/wallet'),
        authFetch('/admin/transactions?limit=5')
      ]);
      if (walletRes.success && walletRes.data) {
        setAdminStats(walletRes.data);
      }
      if (txnRes.success && txnRes.data) {
        setAdminTransactions(txnRes.data.transactions || []);
      }
    } catch (e) {
      console.warn('Failed to fetch admin data:', e);
    }
  };

  useEffect(() => {
    fetchWalletData();
    fetchTransactions();
    if (user?.role === 'admin') {
      fetchAdminPlatformData();
    }
  }, []);

  // Calculation breakdown
  const currentPlanKey = normalizePlanKey(user?.currentPlan || user?.plan) || 'basic';
  const subtotal = selectedPlan.price;
  const tax = Math.round(subtotal * TAX_RATE);
  const totalPlanAmount = subtotal + tax;

  // Determine upgrade-difference proration if active paid plan exists
  const isCurrentActive = user?.paymentStatus === 'active' && user?.planExpiryDate && new Date(user.planExpiryDate) > new Date();
  const currentPlanTier = PLAN_TIERS.find((t) => t.key === currentPlanKey);
  const isUpgrade = currentPlanTier && selectedPlan.tierRank > currentPlanTier.tierRank && isCurrentActive;

  let payableAmount = totalPlanAmount;
  let upgradeDiscount = 0;

  if (isUpgrade && currentPlanTier) {
    const currentPrice = currentPlanTier.price;
    const currentTotal = currentPrice + Math.round(currentPrice * TAX_RATE);
    const diff = totalPlanAmount - currentTotal;
    if (diff > 0) {
      payableAmount = diff;
      upgradeDiscount = currentTotal;
    }
  }

  const remainingBalance = authoritativeBalance - payableAmount;
  const hasInsufficientFunds = authoritativeBalance < payableAmount;
  const isBasicPlan = selectedPlan.key === 'basic';

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  const handlePayWithWallet = async () => {
    if (hasInsufficientFunds) {
      showToast('error', `Insufficient wallet credits. Required: ${payableAmount.toLocaleString()} Credits, Available: ${authoritativeBalance.toLocaleString()} Credits.`);
      return;
    }

    if (isBasicPlan) {
      showToast('warning', 'Basic plan is free and does not require credit checkout.');
      return;
    }

    setIsProcessing(true);
    setToastMessage(null);

    try {
      const response = await authFetch('/payments/plan', {
        method: 'POST',
        body: JSON.stringify({
          planName: selectedPlan.key,
          idempotencyKey: idempotencyKeyRef.current
        })
      });

      if (response.success && response.data) {
        // Success: update authoritative local state & user context
        const { walletBalance: newBalance, user: updatedUser, transactionId } = response.data;

        setAuthoritativeBalance(newBalance);
        setPaymentSuccessData(response.data);

        if (updatedUser) {
          updateUserProfileState(updatedUser);
        } else {
          updateUserProfileState({
            walletBalance: newBalance,
            currentPlan: selectedPlan.key,
            plan: selectedPlan.name,
            paymentStatus: 'active'
          });
        }

        await refreshUserPlan();
        if (typeof refreshWalletBalance === 'function') {
          await refreshWalletBalance();
        }

        // Refresh transaction list
        await fetchTransactions();

        if (user?.role === 'admin') {
          await fetchAdminPlatformData();
        }

        // Prepare new idempotency key for future operations
        idempotencyKeyRef.current = 'IDEMP_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

        showToast('success', response.message || `Your ${selectedPlan.name} has been activated successfully!`);
      } else {
        showToast('error', response.message || 'Payment processing failed. Your wallet balance has not been changed.');
      }
    } catch (error) {
      showToast('error', 'Network communication error or transaction timeout. Please check your transaction history.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.8rem', paddingBottom: '3rem' }}>
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

      {/* Page Title & Live Balance Ribbon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Wallet color="var(--color-primary)" />
            <span>Internal Wallet Checkout</span>
          </h1>
          <p style={{ color: '#9c9c9c', marginTop: '0.3rem', fontSize: '0.95rem' }}>
            Pay for your gym membership securely using internal credits. 1 Credit = 1 Unit internal pricing currency.
          </p>
        </div>

        {/* Live Wallet Balance Pill */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255, 214, 10, 0.12) 0%, rgba(244, 137, 21, 0.12) 100%)',
            border: '1.5px solid #FFD60A',
            borderRadius: '14px',
            padding: '0.8rem 1.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem'
          }}
        >
          <Wallet size={24} color="#FFD60A" />
          <div>
            <div style={{ fontSize: '0.72rem', color: '#B3B3B3', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              AVAILABLE BALANCE
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF' }}>
              {authoritativeBalance.toLocaleString()}{' '}
              <span style={{ fontSize: '0.8rem', color: '#FFD60A', fontWeight: 700 }}>CREDITS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification Alert Banner */}
      {toastMessage && (
        <div
          style={{
            background:
              toastMessage.type === 'success'
                ? 'rgba(46, 213, 115, 0.15)'
                : toastMessage.type === 'warning'
                ? 'rgba(255, 214, 10, 0.15)'
                : 'rgba(250, 80, 66, 0.15)',
            border: `1.5px solid ${
              toastMessage.type === 'success'
                ? '#2ed573'
                : toastMessage.type === 'warning'
                ? '#FFD60A'
                : '#fa5042'
            }`,
            borderRadius: '12px',
            padding: '1rem 1.4rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            color:
              toastMessage.type === 'success'
                ? '#2ed573'
                : toastMessage.type === 'warning'
                ? '#FFD60A'
                : '#fa5042',
            fontWeight: 700
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Success Confirmation Modal / Banner if payment succeeded */}
      {paymentSuccessData && (
        <div
          style={{
            background: '#151515',
            border: '2px solid #2ed573',
            borderRadius: '16px',
            padding: '1.8rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <CheckCircle size={32} color="#2ed573" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF' }}>
                Payment Confirmed & Plan Activated!
              </h2>
              <p style={{ margin: '0.2rem 0 0 0', color: '#9c9c9c', fontSize: '0.9rem' }}>
                Transaction ID: <code style={{ color: '#FFD60A' }}>{paymentSuccessData.transactionId}</code>
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              background: '#090909',
              padding: '1rem 1.2rem',
              borderRadius: '10px',
              border: '1px solid #2A2A2A',
              fontSize: '0.9rem'
            }}
          >
            <div>
              <span style={{ color: '#9c9c9c' }}>Active Plan: </span>
              <strong style={{ color: '#FFFFFF' }}>{paymentSuccessData.planName}</strong>
            </div>
            <div>
              <span style={{ color: '#9c9c9c' }}>Credits Deducted: </span>
              <strong style={{ color: '#fa5042' }}>-{paymentSuccessData.amountPaid.toLocaleString()}</strong>
            </div>
            <div>
              <span style={{ color: '#9c9c9c' }}>New Wallet Balance: </span>
              <strong style={{ color: '#FFD60A' }}>{paymentSuccessData.walletBalance.toLocaleString()} Credits</strong>
            </div>
            <div>
              <span style={{ color: '#9c9c9c' }}>Expiry Date: </span>
              <strong style={{ color: '#FFFFFF' }}>{formatDate(paymentSuccessData.planExpiryDate)}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => navigate('/dashboard/plan')}
              style={{
                background: 'var(--color-primary)',
                color: '#090909',
                border: 'none',
                borderRadius: '8px',
                padding: '0.65rem 1.4rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              View Active Membership
            </button>
            <button
              onClick={() => setPaymentSuccessData(null)}
              style={{
                background: 'transparent',
                color: '#9c9c9c',
                border: '1px solid #2A2A2A',
                borderRadius: '8px',
                padding: '0.65rem 1.4rem',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Checkout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Left Column: Plan Selection & Wallet Payment Method */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
            Payment Method
          </h2>

          {/* Wallet Active Card (Primary) */}
          <div
            style={{
              border: '2px solid #FFD60A',
              background: 'rgba(255, 214, 10, 0.08)',
              borderRadius: '12px',
              padding: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#FFD60A',
                color: '#090909',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Wallet size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#FFFFFF' }}>
                Fit Arc Internal Wallet
              </div>
              <div style={{ fontSize: '0.82rem', color: '#B3B3B3', marginTop: '0.2rem' }}>
                Instant debit from your verified credits account
              </div>
            </div>
            <input type="radio" checked readOnly style={{ accentColor: '#FFD60A', transform: 'scale(1.2)' }} />
          </div>

          {/* Change Plan Switcher */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#9c9c9c', marginBottom: '0.6rem', display: 'block' }}>
              Selected Membership Plan:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {PLAN_TIERS.filter((t) => t.key !== 'basic').map((tier) => {
                const isSelected = selectedPlan.key === tier.key;
                return (
                  <div
                    key={tier.key}
                    onClick={() => setSelectedPlan(tier)}
                    style={{
                      border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid #2A2A2A',
                      background: isSelected ? 'rgba(244, 137, 21, 0.06)' : '#111111',
                      borderRadius: '10px',
                      padding: '0.8rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>{tier.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#9c9c9c' }}>30 Days Unlimited Access</div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#FFD60A', fontSize: '0.95rem' }}>
                      {tier.formattedPrice} Credits
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9c9c9c', fontSize: '0.82rem', marginTop: 'auto' }}>
            <ShieldCheck size={18} color="#2ed573" />
            <span>ACID Transaction Safe • MongoDB Multi-Document Guarantee</span>
          </div>
        </div>

        {/* Right Column: Authoritative Accounting Summary */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              Wallet Checkout Summary
            </h2>

            {/* Plan Info */}
            <div style={{ borderBottom: '1px solid #2A2A2A', padding: '1rem 0', margin: '0.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#FFFFFF' }}>{selectedPlan.name}</span>
                <span style={{ fontWeight: 800, color: '#FFD60A', fontSize: '1.1rem' }}>
                  {subtotal.toLocaleString()} Credits
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#9c9c9c', marginTop: '0.2rem' }}>
                Duration: {selectedPlan.durationDays} Days (Instant Activation)
              </div>
            </div>

            {/* Pricing Line Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', paddingTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#d9d9d9' }}>
                <span>Plan Price</span>
                <span>{subtotal.toLocaleString()} Credits</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#d9d9d9' }}>
                <span>Internal GST (18%)</span>
                <span>{tax.toLocaleString()} Credits</span>
              </div>

              {upgradeDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#2ed573' }}>
                  <span>Upgrade Credit ({currentPlanTier?.name})</span>
                  <span>-{upgradeDiscount.toLocaleString()} Credits</span>
                </div>
              )}

              <div style={{ borderTop: '1px dashed #2A2A2A', margin: '0.4rem 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                <span>Amount Payable</span>
                <span style={{ color: '#FFD60A' }}>{payableAmount.toLocaleString()} Credits</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#9c9c9c', marginTop: '0.4rem' }}>
                <span>Available Wallet Balance</span>
                <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{authoritativeBalance.toLocaleString()} Credits</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: remainingBalance >= 0 ? '#2ed573' : '#fa5042' }}>
                <span>Remaining Balance After Payment</span>
                <span style={{ fontWeight: 700 }}>{remainingBalance.toLocaleString()} Credits</span>
              </div>
            </div>

            {/* Insufficient Funds Warning */}
            {hasInsufficientFunds && (
              <div
                style={{
                  background: 'rgba(250, 80, 66, 0.1)',
                  border: '1px solid #fa5042',
                  borderRadius: '10px',
                  padding: '0.8rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  color: '#fa5042',
                  fontSize: '0.85rem',
                  marginTop: '1.2rem',
                  fontWeight: 600
                }}
              >
                <AlertCircle size={18} />
                <span>
                  Insufficient balance. You need {(payableAmount - authoritativeBalance).toLocaleString()} more credits.
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1.5rem' }}>
            <button
              disabled={isProcessing || hasInsufficientFunds || isBasicPlan}
              className="auth-btn-primary"
              style={{
                width: '100%',
                margin: 0,
                padding: '0.9rem',
                fontSize: '1rem',
                background: hasInsufficientFunds ? '#333333' : 'var(--color-primary)',
                color: hasInsufficientFunds ? '#777777' : '#090909',
                cursor: hasInsufficientFunds || isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.7 : 1
              }}
              onClick={handlePayWithWallet}
            >
              {isProcessing
                ? 'Processing Transaction...'
                : hasInsufficientFunds
                ? 'Insufficient Wallet Balance'
                : `Pay ${payableAmount.toLocaleString()} Credits with Wallet`}
            </button>

            <button
              disabled={isProcessing}
              className="auth-btn-secondary"
              style={{ width: '100%', margin: 0, padding: '0.6rem', fontSize: '0.85rem' }}
              onClick={() => navigate('/dashboard/plan')}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Admin Platform Overview (Shown only to administrators) */}
      {user?.role === 'admin' && adminStats && (
        <div
          style={{
            background: '#151515',
            border: '1.5px solid #FFD60A',
            borderRadius: '16px',
            padding: '1.8rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.2rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Building2 size={22} color="#FFD60A" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                Administrator Platform Balance & Revenue
              </h2>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                background: '#FFD60A',
                color: '#090909',
                padding: '0.2rem 0.6rem',
                borderRadius: '8px'
              }}
            >
              ADMIN ACCESS ONLY
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.2rem'
            }}
          >
            <div style={{ background: '#090909', padding: '1rem 1.2rem', borderRadius: '12px', border: '1px solid #2A2A2A' }}>
              <div style={{ fontSize: '0.78rem', color: '#9c9c9c', fontWeight: 700 }}>PLATFORM CURRENT BALANCE</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFD60A', marginTop: '0.2rem' }}>
                {adminStats.platformBalance?.toLocaleString()} Credits
              </div>
            </div>
            <div style={{ background: '#090909', padding: '1rem 1.2rem', borderRadius: '12px', border: '1px solid #2A2A2A' }}>
              <div style={{ fontSize: '0.78rem', color: '#9c9c9c', fontWeight: 700 }}>TOTAL REVENUE RECEIVED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2ed573', marginTop: '0.2rem' }}>
                {adminStats.totalRevenue?.toLocaleString()} Credits
              </div>
            </div>
            <div style={{ background: '#090909', padding: '1rem 1.2rem', borderRadius: '12px', border: '1px solid #2A2A2A' }}>
              <div style={{ fontSize: '0.78rem', color: '#9c9c9c', fontWeight: 700 }}>TOTAL COMPLETED TRANSACTIONS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
                {adminStats.totalTransactions}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Section */}
      <div
        style={{
          background: '#151515',
          border: '1px solid #2A2A2A',
          borderRadius: '16px',
          padding: '1.8rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              Wallet Transaction History
            </h2>
            <p style={{ color: '#9c9c9c', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
              All credit deposits, registration bonuses, and plan purchase debits
            </p>
          </div>
          <button
            onClick={fetchTransactions}
            disabled={isLoadingHistory}
            style={{
              background: 'transparent',
              border: '1px solid #2A2A2A',
              color: '#9c9c9c',
              borderRadius: '8px',
              padding: '0.4rem 0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
              fontSize: '0.82rem'
            }}
          >
            <RefreshCw size={14} className={isLoadingHistory ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#777777', fontSize: '0.9rem' }}>
            No wallet transactions recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {transactions.map((tx) => {
              const isCredit = tx.transactionType === 'REGISTRATION_BONUS' || tx.transactionType === 'REFUND';
              return (
                <div
                  key={tx._id || tx.idempotencyKey}
                  style={{
                    background: '#090909',
                    border: '1px solid #222222',
                    borderRadius: '12px',
                    padding: '0.9rem 1.2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isCredit ? 'rgba(46, 213, 115, 0.15)' : 'rgba(250, 80, 66, 0.15)',
                        color: isCredit ? '#2ed573' : '#fa5042',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFFFFF' }}>
                        {tx.description || tx.transactionType}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#777777', marginTop: '0.1rem' }}>
                        {formatDate(tx.createdAt)} • Status: <span style={{ color: '#2ed573' }}>{tx.status}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: isCredit ? '#2ed573' : '#fa5042'
                      }}
                    >
                      {isCredit ? '+' : '-'}{tx.amount.toLocaleString()} Credits
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#777777', marginTop: '0.1rem' }}>
                      Balance After: {tx.balanceAfter?.toLocaleString()} Credits
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;
