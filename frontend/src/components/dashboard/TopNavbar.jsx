import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, User, Settings, LogOut, Crown, ChevronDown, Menu } from 'lucide-react';
import BrandLogo from '../BrandLogo';

const TopNavbar = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(2);

  const handleLogout = () => {
    logout();
    navigate('/');
  };


  return (
    <header className="dash-header">
      {/* Left: Logo & Mobile Menu Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <button
          className="mobile-menu-trigger"
          onClick={onToggleMobileMenu}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#FFD60A',
            borderRadius: '10px',
            padding: '0.45rem',
            cursor: 'pointer',
            display: 'none'
          }}
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <BrandLogo size="medium" />
        </Link>
      </div>



      {/* Right: Notifications, Premium Badge, Avatar Dropdown */}
      <div className="header-actions">
        {/* Current Plan Badge Link */}
        <Link
          to="/dashboard/plan"
          style={{
            background: 'linear-gradient(135deg, rgba(244, 137, 21, 0.2) 0%, rgba(250, 80, 66, 0.2) 100%)',
            border: '1px solid #f48915',
            color: '#f48915',
            padding: '0.4rem 0.8rem',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            textDecoration: 'none',
            transition: 'transform 0.2s ease, filter 0.2s ease'
          }}
        >
          <Crown size={15} />
          <span>{(user?.plan || (user?.currentPlan === 'pro_ai_vip' ? 'PRO AI VIP' : user?.currentPlan === 'basic' ? 'BASIC PLAN' : 'PREMIUM PLAN')).toUpperCase()}</span>
        </Link>

        {/* Notification Icon */}
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setNotifCount(0)}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d9d9d9'
            }}
          >
            <Bell size={18} />
          </div>
          {notifCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                background: '#fa5042',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 800,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {notifCount}
            </span>
          )}
        </div>

        {/* User Profile & Dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
             <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{user?.name || 'Athlete'}</span>
              <span style={{ fontSize: '0.72rem', color: '#9c9c9c' }}>{user?.fitnessGoal || 'Gain Muscle'}</span>
            </div>
            <ChevronDown size={16} color="#9c9c9c" />
          </div>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '52px',
                width: '200px',
                background: 'rgba(20, 22, 28, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '0.6rem',
                boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                zIndex: 100
              }}
            >
              <Link
                to="/profile"
                className="sidebar-item"
                style={{ borderRadius: '10px', padding: '0.6rem 0.8rem', fontSize: '0.88rem' }}
                onClick={() => setDropdownOpen(false)}
              >
                <User size={16} />
                <span>My Profile</span>
              </Link>

              <Link
                to="/"
                className="sidebar-item"
                style={{ borderRadius: '10px', padding: '0.6rem 0.8rem', fontSize: '0.88rem' }}
                onClick={() => setDropdownOpen(false)}
              >
                <Crown size={16} color="#f48915" />
                <span>Public Landing Page</span>
              </Link>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.4rem 0' }}></div>
              <button
                className="sidebar-item"
                style={{ width: '100%', border: 'none', background: 'transparent', borderRadius: '10px', padding: '0.6rem 0.8rem', fontSize: '0.88rem', color: '#ff6b6b' }}
                onClick={handleLogout}
              >
                <LogOut size={16} color="#ff6b6b" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNavbar;
