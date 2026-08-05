import React from 'react';
import { Dumbbell } from 'lucide-react';

const BrandLogo = ({ size = 'medium', onClick }) => {
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  const iconSize = isSmall ? 20 : isLarge ? 30 : 24;
  const fontSize = isSmall ? '1.15rem' : isLarge ? '1.6rem' : '1.35rem';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #FFD60A 0%, #FFE347 100%)',
          borderRadius: '10px',
          padding: isSmall ? '0.35rem' : '0.45rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(255, 214, 10, 0.35)'
        }}
      >
        <Dumbbell size={iconSize} color="#000000" />
      </div>
      <span style={{ fontWeight: 800, fontSize, color: '#ffffff', letterSpacing: '-0.5px', fontFamily: "'Inter', sans-serif" }}>
        FIT<span style={{ color: '#FFD60A' }}>-ARC-GYM</span>
      </span>
    </div>
  );
};

export default BrandLogo;
