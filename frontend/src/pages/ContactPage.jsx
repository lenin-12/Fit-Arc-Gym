import React from 'react';
import Header from '../components/Header/Header';
import { Mail, Phone, MapPin } from 'lucide-react';

const ContactPage = () => {
  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1100px', margin: '0 auto', color: '#ffffff' }}>
      <Header />
      <div style={{ marginTop: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Contact & Support</h1>
        <p style={{ color: '#9c9c9c', fontSize: '1.1rem', maxWidth: '600px', margin: '0.8rem auto 2.5rem auto' }}>
          Have questions or need assistance with your FIT-ARC-GYM membership? Get in touch with our team.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.8rem' }}>
        <div className="glass-card" style={{ padding: '1.8rem', textAlign: 'center' }}>
          <Mail size={32} color="#FFD60A" style={{ margin: '0 auto' }} />
          <h3 style={{ marginTop: '0.8rem' }}>Email Support</h3>
          <p style={{ color: '#9c9c9c', fontSize: '0.9rem' }}>support@fitarcgym.com</p>
        </div>
        <div className="glass-card" style={{ padding: '1.8rem', textAlign: 'center' }}>
          <Phone size={32} color="#FFD60A" style={{ margin: '0 auto' }} />
          <h3 style={{ marginTop: '0.8rem' }}>Member Hotline</h3>
          <p style={{ color: '#9c9c9c', fontSize: '0.9rem' }}>+1 (800) 555-FIT-ARC</p>
        </div>
        <div className="glass-card" style={{ padding: '1.8rem', textAlign: 'center' }}>
          <MapPin size={32} color="#FFD60A" style={{ margin: '0 auto' }} />
          <h3 style={{ marginTop: '0.8rem' }}>Headquarters</h3>
          <p style={{ color: '#9c9c9c', fontSize: '0.9rem' }}>777 Innovation Way, San Francisco, CA</p>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
