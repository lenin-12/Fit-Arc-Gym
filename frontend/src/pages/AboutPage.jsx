import React from 'react';
import Header from '../components/Header/Header';
import { Info, ShieldCheck, Zap } from 'lucide-react';

const AboutPage = () => {
  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1100px', margin: '0 auto', color: '#ffffff' }}>
      <Header />
      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>About FIT-ARC-GYM</h1>
        <p style={{ color: '#9c9c9c', fontSize: '1.1rem', maxWidth: '700px', margin: '0.8rem auto 2.5rem auto' }}>
          FIT-ARC-GYM is an advanced AI-powered biomechanics coaching, workout generation, and nutrition management platform.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.8rem' }}>
        <div className="glass-card" style={{ padding: '1.8rem' }}>
          <Zap size={28} color="#FFD60A" />
          <h3 style={{ marginTop: '0.8rem' }}>AI Biomechanics</h3>
          <p style={{ color: '#9c9c9c', fontSize: '0.9rem' }}>
            Instant form guidance, set recommendations, and recovery advice customized to your body profile.
          </p>
        </div>
        <div className="glass-card" style={{ padding: '1.8rem' }}>
          <ShieldCheck size={28} color="#FFD60A" />
          <h3 style={{ marginTop: '0.8rem' }}>Science-Backed Routines</h3>
          <p style={{ color: '#9c9c9c', fontSize: '0.9rem' }}>
            Hypertrophy and strength programs designed by exercise physiologists and AI overload algorithms.
          </p>
        </div>
        <div className="glass-card" style={{ padding: '1.8rem' }}>
          <Info size={28} color="#FFD60A" />
          <h3 style={{ marginTop: '0.8rem' }}>Macro Precision</h3>
          <p style={{ color: '#9c9c9c', fontSize: '0.9rem' }}>
            Automated TDEE calculations and diet logging tuned to your exact body weight and fitness goals.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
