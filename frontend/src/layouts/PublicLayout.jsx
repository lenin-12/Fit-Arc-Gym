import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer/Footer';

const PublicLayout = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Determine if current path is a standalone auth form
  const isAuthForm = ['/login', '/register', '/forgot-password'].includes(location.pathname);

  return (
    <div className="PublicLayout" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      {/* Main Public Content Outlet */}
      <div style={{ flex: 1 }}>
        <Outlet />
      </div>

      {/* Public Footer (Rendered on public pages except standalone auth cards) */}
      {!isAuthForm && <Footer />}
    </div>
  );
};

export default PublicLayout;
