import React from 'react';
import './Reasons.css';
import image1 from '../../assets/image1.png';
import image2 from '../../assets/image2.png';
import image3 from '../../assets/image3.png';
import image4 from '../../assets/image4.png';
import nb from '../../assets/nb.png';
import adidas from '../../assets/adidas.png';
import nike from '../../assets/nike.png';
import tick from '../../assets/tick.png';
import { CheckCircle2 } from 'lucide-react';

const Reasons = () => {
  return (
    <div className="Reasons" id="reasons">
      <div className="left-r">
        <img src={image1} alt="" />
        <img src={image2} alt="" />
        <img src={image3} alt="" />
        <img src={image4} alt="" />
      </div>
      <div className="right-r">
        <span className="reasons-tag">SOME REASONS</span>

        <div className="reasons-heading">
          <span className="stroke-text">WHY </span>
          <span>CHOOSE US?</span>
        </div>

        <div className="details-r">
          <div>
            <CheckCircle2 color="#FFD60A" size={22} />
            <span>OVER 140+ EXPERT COACHES & AI ASSISTANTS</span>
          </div>
          <div>
            <CheckCircle2 color="#FFD60A" size={22} />
            <span>TRAIN SMARTER AND FASTER WITH BIOMECHANICS AI</span>
          </div>
          <div>
            <CheckCircle2 color="#FFD60A" size={22} />
            <span>1 FREE CUSTOM PROGRAM FOR EVERY NEW MEMBER</span>
          </div>
          <div>
            <CheckCircle2 color="#FFD60A" size={22} />
            <span>RELIABLE PARTNERS & NUTRITION INTEGRATIONS</span>
          </div>
        </div>

        <span style={{ color: '#9c9c9c', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '1px', marginTop: '1rem' }}>
          OUR PARTNERS
        </span>

        <div className="partners">
          <img src={nb} alt="NB" />
          <img src={adidas} alt="Adidas" />
          <img src={nike} alt="Nike" />
        </div>
      </div>
    </div>
  );
};

export default Reasons;
