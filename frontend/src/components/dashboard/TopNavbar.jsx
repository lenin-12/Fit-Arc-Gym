import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, User, Settings, LogOut, Crown, ChevronDown, Menu, ArrowRight } from 'lucide-react';
import BrandLogo from '../BrandLogo';

const TopNavbar = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifRead, setNotifRead] = useState(false);

  const getDaysRemaining = () => {
    if (!user?.planExpiryDate || user?.currentPlan === 'basic') return null;
    const diffTime = new Date(user.planExpiryDate) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = getDaysRemaining();
  const isExpiring = daysLeft !== null && daysLeft <= 4 && daysLeft > 0;
  const notifCount = isExpiring && !notifRead ? 1 : 0;

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
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => {
              setNotifDropdownOpen(!notifDropdownOpen);
              setNotifRead(true);
            }}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d9d9d9',
              cursor: 'pointer'
            }}
          >
            <Bell size={18} />
          </div>
          {notifCount > 0 && (
            <span
              onClick={() => {
                setNotifDropdownOpen(!notifDropdownOpen);
                setNotifRead(true);
              }}
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
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {notifCount}
            </span>
          )}

          {notifDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '52px',
                width: '280px',
                background: 'rgba(20, 22, 28, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px',
                padding: '1rem',
                boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.8rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FFFFFF' }}>Notifications</span>
                {isExpiring && !notifRead && (
                  <span style={{ fontSize: '0.72rem', color: '#FFD60A', fontWeight: 600 }}>1 New</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto' }}>
                {isExpiring ? (
                  <div style={{ background: 'rgba(255,214,10,0.06)', border: '1px solid rgba(255,214,10,0.12)', borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#FFD60A', fontWeight: 700, fontSize: '0.82rem' }}>
                      <Crown size={14} />
                      <span>Subscription Alert</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#d9d9d9', lineHeight: '1.4' }}>
                      Your plan is expiring in <strong style={{ color: '#FFFFFF' }}>{daysLeft} day{daysLeft === 1 ? '' : 's'}</strong>. Renew your plan to continue access.
                    </p>
                    <Link
                      to="/dashboard/plan"
                      onClick={() => setNotifDropdownOpen(false)}
                      style={{ fontSize: '0.75rem', color: '#FFD60A', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}
                    >
                      <span>Renew Now</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                ) : (
                  <div style={{ padding: '1rem 0', textAlign: 'center', color: '#9c9c9c', fontSize: '0.8rem' }}>
                    No notifications
                  </div>
                )}
              </div>
            </div>
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
