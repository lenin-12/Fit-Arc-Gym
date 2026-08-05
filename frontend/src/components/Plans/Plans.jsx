import React from 'react';
import { useNavigate } from 'react-router-dom';
import { plansData } from '../../data/plansData';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import './Plans.css';

const Plans = () => {
  const navigate = useNavigate();

  return (
    <div className="plans-container" id="plans">
      <div className="blur plans-blur-1"></div>
      <div className="blur plans-blur-2"></div>
      <div className="programs-header" style={{ gap: '1.5rem', textTransform: 'uppercase' }}>
        <span className="stroke-text">READY TO START</span>
        <span>YOUR JOURNEY</span>
        <span className="stroke-text">WITH US</span>
      </div>

      <div className="plans">
        {plansData.map((plan, i) => {
          const isFeatured = i === 1; // Middle Premium plan has the Most Popular badge
          return (
            <div className="plan glass-card-plan" key={i} tabIndex={0}>
              {isFeatured && (
                <div className="featured-badge">
                  <Sparkles size={14} color="#000000" />
                  <span>MOST POPULAR</span>
                </div>
              )}
              <div className="plan-icon-wrap">{plan.icon}</div>
              <span className="plan-name">{plan.name}</span>
              <div className="plan-price-wrap">
                <span className="plan-currency">{plan.currency || '₹'}</span>
                <span className="plan-price">{plan.price}</span>
                <span className="plan-period">{plan.period || '/ 30 days'}</span>
              </div>

              <div className="features">
                {plan.features.map((feature, idx) => (
                  <div className="feature" key={idx}>
                    <Check size={16} color="#FFD60A" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                className="btn-token-primary"
                style={{ marginTop: 'auto', width: '100%', padding: '0.9rem' }}
                onClick={() => navigate('/login')}
              >
                <span>Select Plan</span>
                <ArrowRight size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Plans;
