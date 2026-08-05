import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link as ScrollLink } from 'react-scroll';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../BrandLogo';
import { Menu, X, ArrowRight } from 'lucide-react';
import './Header.css';

const Header = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpened, setMenuOpened] = useState(false);
  const navRef = useRef(null);

  // Scroll detection for navbar background & blur transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setMenuOpened(false);
      }
    };

    if (menuOpened) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpened]);

  const navItems = [
    { label: 'Home', to: 'home' },
    { label: 'Programs', to: 'programs' },
    { label: 'Why Us', to: 'reasons' },
    { label: 'Plans', to: 'plans' },
    { label: 'Testimonials', to: 'testimonials' },
    { label: 'Contact', to: 'contact' }
  ];

  return (
    <header className={`landing-navbar ${scrolled ? 'navbar-scrolled' : ''}`} ref={navRef}>
      <div className="navbar-container">
        {/* Left: Brand Logo */}
        <div className="navbar-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <BrandLogo size="medium" />
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="navbar-center" aria-label="Main Navigation">
          <ul className="nav-menu">
            {navItems.map((item) => (
              <li key={item.to} className="nav-item">
                <ScrollLink
                  to={item.to}
                  spy={true}
                  smooth={true}
                  offset={-80}
                  duration={500}
                  activeClass="active"
                  className="nav-link"
                  onClick={() => setMenuOpened(false)}
                >
                  {item.label}
                </ScrollLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right: Auth-aware Actions */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <button
              className="btn-token-primary"
              onClick={() => navigate('/dashboard')}
            >
              <span>Go to Dashboard</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <div className="auth-actions-group">
              <button
                className="btn-token-secondary"
                onClick={() => navigate('/login')}
              >
                Login
              </button>
              <button
                className="btn-token-primary"
                onClick={() => navigate('/register')}
              >
                Join Now
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setMenuOpened(!menuOpened)}
          aria-expanded={menuOpened}
          aria-label={menuOpened ? 'Close menu' : 'Open navigation menu'}
        >
          {menuOpened ? <X size={24} color="#FFD60A" /> : <Menu size={24} color="#FFD60A" />}
        </button>
      </div>

      {/* Mobile Drawer Panel */}
      {menuOpened && (
        <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
          <ul className="mobile-nav-menu">
            {navItems.map((item) => (
              <li key={item.to} className="mobile-nav-item">
                <ScrollLink
                  to={item.to}
                  spy={true}
                  smooth={true}
                  offset={-80}
                  duration={500}
                  activeClass="active"
                  className="mobile-nav-link"
                  onClick={() => setMenuOpened(false)}
                >
                  {item.label}
                </ScrollLink>
              </li>
            ))}
          </ul>

          <div className="mobile-drawer-actions">
            {isAuthenticated ? (
              <button
                className="btn-token-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  setMenuOpened(false);
                  navigate('/dashboard');
                }}
              >
                <span>Go to Dashboard</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
                <button
                  className="btn-token-secondary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setMenuOpened(false);
                    navigate('/login');
                  }}
                >
                  Login
                </button>
                <button
                  className="btn-token-primary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setMenuOpened(false);
                    navigate('/register');
                  }}
                >
                  Join Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </header>
  );
};

export default Header;
