import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Hero.css';
import Header from '../Header/Header';
import hero_image from '../../assets/hero_image.png';
import hero_image_back from '../../assets/hero_image_back.png';
import Heart from '../../assets/heart.png';
import Calories from '../../assets/calories.png';
import { motion } from 'framer-motion';
import NumberCounter from 'number-counter';
import { ArrowRight, Sparkles, Activity, Flame } from 'lucide-react';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const navigate = useNavigate();
  const transition = { type: 'spring', duration: 2.5 };
  const mobile = window.innerWidth <= 768;

  useEffect(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        scrub: 1,
        pin: true,
        trigger: '#heroimage',
        start: '50% 50%',
        endTrigger: '#reasons',
        end: 'bottom 50%',
      },
    });

    tl.to('#heroimage', {
      rotateZ: 360,
    });

    ScrollTrigger.refresh();
  }, []);

  return (
    <div className="hero" id="home">
      <div className="blur hero-blur"></div>
      <div className="left-h">
        <Header />
        
        {/* Modern Pill Badge */}
        <div className="the-best-ad">
          <motion.div
            initial={{ left: mobile ? '165px' : '238px' }}
            whileInView={{ left: '8px' }}
            transition={{ ...transition, type: 'tween' }}
          ></motion.div>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={14} color="#FFD60A" />
            THE BEST AI FITNESS PLATFORM IN TOWN
          </span>
        </div>

        {/* Hero Headline */}
        <div className="hero-text">
          <div>
            <span className="stroke-text">Shape </span>
            <span>Your</span>
          </div>
          <div>
            <span>Ideal Body</span>
          </div>
          <div>
            <span>
              In here we will help you shape and build your ideal body with personalized AI biomechanics coaching, intelligent workout splits, and macro precision.
            </span>
          </div>
        </div>

        {/* Figures / Stats Counter */}
        <div className="figures">
          <div>
            <span>
              <NumberCounter end={140} start={100} delay="3" preFix="+" />
            </span>
            <span>expert coaches</span>
          </div>
          <div>
            <span>
              <NumberCounter end={978} start={800} delay="3" preFix="+" />
            </span>
            <span>active members</span>
          </div>
          <div>
            <span>
              <NumberCounter end={50} start={10} delay="3" preFix="+" />
            </span>
            <span>fitness programs</span>
          </div>
        </div>

        {/* Hero CTA Buttons */}
        <div className="hero-buttons">
          <button className="btn-token-primary" style={{ padding: '0.9rem 1.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => navigate('/login')}>
            <span>Get Started</span>
            <ArrowRight size={18} />
          </button>
          <button className="btn-token-secondary" style={{ padding: '0.9rem 1.6rem' }} onClick={() => navigate('/login')}>
            Learn More
          </button>
        </div>
      </div>

      <div className="right-h">
        {/* Floating Heart Rate Widget */}
        <motion.div
          initial={{ right: '-1rem' }}
          whileInView={{ right: '4rem' }}
          transition={transition}
          className="heart-rate glass-card-widget"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity color="#FFD60A" size={22} />
            <img src={Heart} alt="" style={{ width: '1.4rem' }} />
          </div>
          <span style={{ color: '#9c9c9c', fontSize: '0.8rem', fontWeight: 600 }}>Heart Rate</span>
          <span style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: 800 }}>116 bpm</span>
        </motion.div>

        {/* Hero Image */}
        <img id="heroimage" src={hero_image} alt="Hero Athlete" className="hero-image" />
        <motion.img
          initial={{ right: '11rem' }}
          whileInView={{ right: '20rem' }}
          transition={transition}
          src={hero_image_back}
          alt=""
          className="hero-image-back"
        />

        {/* Floating Calories Widget */}
        <motion.div
          initial={{ right: '37rem' }}
          whileInView={{ right: '28rem' }}
          transition={transition}
          className="calories glass-card-widget"
        >
          <Flame color="#FFD60A" size={28} />
          <img src={Calories} alt="" style={{ width: '2rem' }} />
          <div>
            <span style={{ color: '#9c9c9c', fontSize: '0.8rem', fontWeight: 600 }}>Calories Burned</span>
            <span style={{ color: '#ffffff', fontSize: '1.4rem', fontWeight: 800 }}>220 kcal</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Hero;
