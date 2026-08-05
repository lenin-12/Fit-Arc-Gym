import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Sparkles,
  Dumbbell,
  Utensils,
  Settings,
  LogOut,
  Award,
  TrendingUp,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import TopNavbar from '../components/dashboard/TopNavbar';
import '../components/dashboard/Dashboard.css';

const PrivateLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Collapsible state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('fitclub_sidebar_collapsed') === 'true';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('fitclub_sidebar_collapsed', String(nextState));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', path: '/dashboard', alias: ['/dashboard'], icon: LayoutDashboard },
    { label: 'AI Coach', path: '/dashboard/ai-coach', alias: ['/ai-coach'], icon: Sparkles },
    { label: 'Today Workout', path: '/dashboard/workout', alias: ['/workout'], icon: Dumbbell },
    { label: 'Diet & Macros', path: '/dashboard/diet', alias: ['/diet'], icon: Utensils },
    { label: 'Plan & Subscription', path: '/dashboard/plan', alias: ['/plan'], icon: Award },
    { label: 'My Profile', path: '/dashboard/profile', alias: ['/profile'], icon: User }
  ];

  return (
    <div
      className="dash-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundImage: 'url(data:image/png;base64,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)',
        backgroundColor: '#090909'
      }}
    >
      {/* 1. TOP NAVBAR: Fixed height 80px at top, z-index 100 */}
      <TopNavbar onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)} />

      {/* Mobile Drawer Backdrop (Starts below 80px navbar) */}
      {isMobileOpen && (
        <div
          className="mobile-overlay"
          style={{ top: '80px', height: 'calc(100vh - 80px)' }}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 2. MAIN CONTAINER: Begins directly BELOW the 80px Navbar */}
      <div
        className="dash-main-container"
        style={{
          display: 'flex',
          flex: 1,
          height: 'calc(100vh - 80px)',
          width: '100%',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* 3. SIDEBAR: Fixed vertically on left below navbar, independent scroll */}
        <aside
          className={`dash-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
          style={{ borderTop: 'none', height: '100%', overflowY: 'auto' }}
        >
          {/* Desktop Collapse Toggle Button */}
          <div style={{ display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-end', marginBottom: '1rem' }}>
            <button
              onClick={toggleCollapse}
              style={{
                background: '#090909',
                border: '1px solid #2A2A2A',
                color: '#FFD60A',
                borderRadius: '8px',
                padding: '0.45rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms ease'
              }}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label="Toggle Sidebar"
            >
              {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <ul className="sidebar-menu">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.alias && item.alias.includes(location.pathname)) ||
                (item.path === '/dashboard' && (location.pathname === '/dashboard/' || location.pathname === '/dashboard'));
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`sidebar-item ${isActive ? 'active' : ''}`}
                    onClick={() => setIsMobileOpen(false)}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon size={18} />
                    <span className="sidebar-text">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
            <button className="sidebar-item" onClick={handleLogout} style={{ width: '100%', border: 'none', background: 'transparent' }}>
              <LogOut size={18} color="#ff6b6b" />
              <span className="sidebar-text" style={{ color: '#ff6b6b' }}>Logout</span>
            </button>
          </div>
        </aside>

        {/* 4. MAIN CONTENT: Independent scrollable area */}
        <main className="dash-main" style={{ flex: 1, height: '100%', overflowY: 'auto', backgroundColor: 'transparent' }}>
          <div className="dash-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrivateLayout;
