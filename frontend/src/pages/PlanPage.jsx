import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { calculatePlanMetrics, formatDateUTC } from '../utils/planCalculations';
import { PLAN_TIERS, normalizePlanKey, getPlanDisplayTitle } from '../utils/planTiers';
import { Award, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import "../components/dashboard/Dashboard.css";

const PlanPage = () => {
  const { user, refreshUserPlan } = useAuth();
  const navigate = useNavigate();

  // Always refresh user plan on mount to make sure context is up-to-date
  useEffect(() => {
    refreshUserPlan();
  }, []);

  // Derive metrics at render time from planStartDate and planExpiryDate
  const metrics = calculatePlanMetrics(user?.planStartDate, user?.planExpiryDate);
  const currentPlanKey = normalizePlanKey(user?.currentPlan || user?.plan);
  const currentPlanTitle = getPlanDisplayTitle(currentPlanKey);

  const formattedStartDate = formatDateUTC(user?.planStartDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const formattedExpiryDate = formatDateUTC(user?.planExpiryDate || new Date(Date.now() + 23 * 24 * 60 * 60 * 1000));

  const currentTierObj = PLAN_TIERS.find((t) => t.key === currentPlanKey) || PLAN_TIERS[1];
  const currentTierRank = currentTierObj.tierRank;

  // Handles clicking a plan tier (or Renew button)
  const handleSelectPlan = (tier) => {
    navigate('/dashboard/payment', {
      state: {
        planKey: tier.key,
        planName: tier.name,
        price: tier.price,
        durationDays: tier.durationDays,
        features: tier.features
      }
    });
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.8rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0, color: '#FFFFFF' }}>
          <Award color="var(--color-primary)" />
          <span>Membership Plan & Subscription</span>
        </h1>
        <p style={{ color: '#B3B3B3', marginTop: '0.3rem', fontSize: '0.95rem' }}>
          Manage your subscription tier, billing period, and real-time AI access privileges.
        </p>
      </div>

      {/* Renewal Warning Banner (Minimal Dark Alert with Yellow Accent) */}
      {metrics.remainingDays <= 5 && metrics.status !== 'Expired' && (
        <div
          style={{
            background: '#151515',
            border: '1px solid #2A2A2A',
            borderLeft: '4px solid var(--color-primary)',
            borderRadius: '14px',
            padding: '1.2rem 1.6rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--color-accent-muted)',
                border: '1px solid var(--color-accent-muted-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)'
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>
                Subscription Expiring Soon ({metrics.remainingDays} Day{metrics.remainingDays === 1 ? '' : 's'} Remaining)
              </h3>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem', color: '#B3B3B3' }}>
                Renew your <strong style={{ color: '#FFFFFF' }}>{currentPlanTitle}</strong> to maintain uninterrupted AI coaching.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSelectPlan(currentTierObj)}
            style={{
              background: 'var(--color-primary)',
              color: '#090909',
              border: 'none',
              borderRadius: '10px',
              padding: '0.75rem 1.4rem',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>Renew Plan Now</span>
            <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* Hero Active Plan Card (Solid Dark Card with Subtle Yellow Top Border) */}
      <div
        style={{
          background: '#151515',
          border: '1px solid #2A2A2A',
          borderTop: '3px solid var(--color-primary)',
          borderRadius: '16px',
          padding: '1.8rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.4rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
              <span style={{ color: '#B3B3B3', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                ACTIVE SUBSCRIPTION TIER
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  background: '#090909',
                  color: '#FFFFFF',
                  border: '1px solid #2A2A2A'
                }}
              >
                ● {metrics.status}
              </span>
            </div>

            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              {currentPlanTitle}
            </h2>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.8rem', marginTop: '0.8rem', color: '#B3B3B3', fontSize: '0.9rem' }}>
              <span>Start Date: <strong style={{ color: '#FFFFFF' }}>{formattedStartDate}</strong></span>
              <span>Expiry Date: <strong style={{ color: '#FFFFFF' }}>{formattedExpiryDate}</strong></span>
              <span>Elapsed: <strong style={{ color: '#FFFFFF' }}>{metrics.elapsedDays} Days</strong></span>
              <span>Remaining: <strong style={{ color: 'var(--color-primary)' }}>{metrics.remainingDays} Days</strong></span>
            </div>
          </div>

          <button
            onClick={() => handleSelectPlan(currentTierObj)}
            style={{
              background: 'transparent',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
              borderRadius: '10px',
              padding: '0.75rem 1.4rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 200ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-primary)';
              e.currentTarget.style.color = '#090909';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-primary)';
            }}
          >
            <span>Renew Plan</span>
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Gray Progress Bar with Yellow Progress Fill */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 700, marginBottom: '0.45rem', color: '#B3B3B3' }}>
            <span>Plan Progression (Day {metrics.currentDay} of {metrics.totalDays})</span>
            <span style={{ color: 'var(--color-primary)' }}>{metrics.progressPct}% Complete</span>
          </div>
          <div style={{ background: '#090909', border: '1px solid #2A2A2A', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${metrics.progressPct}%`,
                background: 'var(--color-primary)',
                height: '100%',
                borderRadius: '4px',
                transition: 'width 300ms ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* Pricing Tier Grid */}
      <div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '1rem 0 0.4rem 0', color: '#FFFFFF' }}>
          Available Membership Tiers
        </h2>
        <p style={{ color: '#B3B3B3', fontSize: '0.88rem', margin: '0 0 1.5rem 0' }}>
          Select a tier to upgrade or renew. Instant activation starts a new 30-day billing cycle.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.4rem' }}>
          {PLAN_TIERS.map((tier) => {
            const isCurrent = tier.key === currentPlanKey;
            const isUpgrade = tier.tierRank > currentTierRank;
            const isDowngrade = tier.tierRank < currentTierRank;

            let buttonLabel = 'Select Plan';
            if (isCurrent) buttonLabel = 'Current Plan';
            else if (isUpgrade) buttonLabel = 'Upgrade';
            else if (isDowngrade) buttonLabel = 'Downgrade';

            return (
              <div
                key={tier.key}
                style={{
                  background: '#151515',
                  border: '1px solid #2A2A2A',
                  borderRadius: '16px',
                  padding: '1.8rem 1.6rem',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.4rem',
                  boxSizing: 'border-box',
                  transition: 'border-color 200ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2A2A2A';
                }}
              >
                {/* Recommended Badge (Minimal White Pill) */}
                {tier.featured && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: '#FFFFFF',
                      color: '#090909',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.22rem 0.65rem',
                      borderRadius: '12px'
                    }}
                  >
                    Recommended
                  </div>
                )}

                {/* Current Plan Badge (Minimal White Pill) */}
                {isCurrent && !tier.featured && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      background: '#FFFFFF',
                      color: '#090909',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.22rem 0.65rem',
                      borderRadius: '12px'
                    }}
                  >
                    Current Plan
                  </div>
                )}

                <div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>{tier.name}</h3>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', margin: '0.5rem 0 1.2rem 0' }}>
                    {tier.formattedPrice} <span style={{ fontSize: '0.85rem', color: '#B3B3B3', fontWeight: 400 }}>{tier.period}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
                    {tier.features.map((feat, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#B3B3B3' }}>
                        <CheckCircle size={15} color="var(--color-success)" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Button: Dark default with yellow border, yellow fill on hover */}
                <button
                  disabled={isCurrent}
                  onClick={() => handleSelectPlan(tier)}
                  style={{
                    width: '100%',
                    background: isCurrent ? '#090909' : 'transparent',
                    color: isCurrent ? '#666666' : 'var(--color-primary)',
                    border: isCurrent ? '1px solid #2A2A2A' : '1px solid var(--color-primary)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    cursor: isCurrent ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    transition: 'all 200ms ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.background = 'var(--color-primary)';
                      e.currentTarget.style.color = '#090909';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--color-primary)';
                    }
                  }}
                >
                  <span>{buttonLabel}</span>
                  {!isCurrent && <ArrowRight size={15} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlanPage;
