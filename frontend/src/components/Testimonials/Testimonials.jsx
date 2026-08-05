import React, { useState } from 'react';
import './Testimonials.css';
import { testimonialsData } from '../../data/testimonialsData';
import leftArrow from '../../assets/leftArrow.png';
import rightArrow from '../../assets/rightArrow.png';
import { Quote } from 'lucide-react';

const Testimonials = () => {
  const [selected, setSelected] = useState(0);
  const tLength = testimonialsData.length;

  return (
    <div className="Testimonials" id="testimonials">
      <div className="left-t">
        <span className="testimonials-tag">TESTIMONIALS</span>
        <span className="stroke-text">WHAT THEY</span>
        <span className="testimonials-title">SAY ABOUT US</span>

        <div className="glass-card-testimonial">
          <Quote color="#FFD60A" size={28} style={{ marginBottom: '0.6rem' }} />
          <p className="testimonial-review">"{testimonialsData[selected].review}"</p>
          <div className="testimonial-author">
            <span className="author-name">{testimonialsData[selected].name}</span>
            <span className="author-status"> — {testimonialsData[selected].status}</span>
          </div>
        </div>
      </div>

      <div className="right-t">
        <div className="border-box"></div>
        <div className="gradient-box"></div>
        <img src={testimonialsData[selected].image} alt="Testimonial User" className="testimonial-img" />

        <div className="arrows">
          <div
            className="arrow-btn"
            onClick={() => setSelected((prev) => (prev === 0 ? tLength - 1 : prev - 1))}
          >
            <img src={leftArrow} alt="Previous" />
          </div>
          <div
            className="arrow-btn"
            onClick={() => setSelected((prev) => (prev === tLength - 1 ? 0 : prev + 1))}
          >
            <img src={rightArrow} alt="Next" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
