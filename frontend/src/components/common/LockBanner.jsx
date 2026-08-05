import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

const LockBanner = ({
  featureName = 'Unlimited AI Coach & Advanced Features',
  requiredTier = 'Premium',
  description = 'Upgrade your membership to unlock unlimited AI queries, advanced workout routines, and detailed macro analytics.'
}) => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(24, 24, 24, 0.95) 0%, rgba(17, 17, 17, 0.98) 100%)',
        border: '1px solid #2A2A2A',
        borderRadius: '16px',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: '1rem',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
        margin: '1rem 0'
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'rgba(255, 214, 10, 0.12)',
          border: '1px solid #FFD60A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFD60A'
        }}
      >
        <Lock size={26} />
      </div>

      <div style={{ maxWidth: '480px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(255, 214, 10, 0.15)',
            color: '#FFD60A',
            fontSize: '0.78rem',
            fontWeight: 800,
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '0.6rem'
          }}
        >
          <Sparkles size={14} />
          <span>{requiredTier} Feature</span>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: '0.2rem 0 0.5rem 0' }}>
          {featureName} is Locked
        </h3>
        <p style={{ fontSize: '0.88rem', color: '#B3B3B3', margin: 0, lineHeight: '1.5' }}>
          {description}
        </p>
      </div>

      <button
        onClick={() => navigate('/dashboard/plan')}
        style={{
          background: '#FFD60A',
          color: '#090909',
          border: 'none',
          padding: '0.75rem 1.6rem',
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '0.92rem',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 0 16px rgba(255, 214, 10, 0.25)',
          transition: 'all 0.2s ease'
        }}
      >
        <span>Upgrade to {requiredTier}</span>
        <ArrowRight size={16} />
      </button>
    </div>
  );
};

export default LockBanner;
