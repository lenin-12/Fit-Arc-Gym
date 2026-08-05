import React from 'react';
import Header from '../components/Header/Header';
import Plans from '../components/Plans/Plans';

const PricingPage = () => {
  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1100px', margin: '0 auto', color: '#ffffff' }}>
      <Header />
      <div style={{ marginTop: '2rem' }}>
        <Plans />
      </div>
    </div>
  );
};

export default PricingPage;
