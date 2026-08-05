import React from 'react';

const Card = ({ weight = 'secondary', style = {}, children, ...props }) => {
  const isPrimary = weight === 'primary';
  const combinedStyle = {
    background: isPrimary ? 'var(--bg-card-elevated, #222222)' : 'var(--bg-card, #181818)',
    border: isPrimary ? '1px solid var(--border-elevated, #3A3A3A)' : '1px solid var(--border, #2A2A2A)',
    borderTop: isPrimary ? '3px solid var(--color-primary, #FFD60A)' : undefined,
    borderRadius: '16px',
    padding: '1.6rem 1.8rem',
    boxShadow: isPrimary ? '0 12px 30px rgba(0, 0, 0, 0.6)' : '0 4px 12px rgba(0, 0, 0, 0.2)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    ...style
  };

  return (
    <div style={combinedStyle} {...props}>
      {children}
    </div>
  );
};

export default Card;
