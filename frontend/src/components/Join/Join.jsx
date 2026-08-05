import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Join.css';
import { ArrowRight, Mail } from 'lucide-react';

const Join = () => {
  const form = useRef();
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    const email = form.current?.user_email?.value || '';
    navigate('/register', { state: { email } });
  };

  return (
    <div className="Join" id="join-us">
      <div className="left-j">
        <hr />
        <div>
          <span className="stroke-text">READY TO</span>
          <span> LEVEL UP</span>
        </div>
        <div>
          <span>YOUR BODY</span>
          <span className="stroke-text"> WITH US?</span>
        </div>
      </div>
      <div className="right-j">
        <form ref={form} className="email-container glass-card-join" onSubmit={handleJoin}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1 }}>
            <Mail color="#FFD60A" size={20} />
            <input type="email" name="user_email" placeholder="Enter your email address" required />
          </div>
          <button type="submit" className="btn-token-primary" style={{ width: 'auto', padding: '0.8rem 1.6rem', margin: 0 }}>
            <span>Join Now</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Join;
