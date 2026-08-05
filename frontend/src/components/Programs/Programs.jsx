import React from 'react';
import { useNavigate } from 'react-router-dom';
import { programsData } from '../../data/programsData';
import RightArrow from '../../assets/rightArrow.png';
import './Programs.css';

const Programs = () => {
  const navigate = useNavigate();

  return (
    <div className="Programs" id="programs">
      <div className="programs-header">
        <span className="stroke-text">Explore our</span>
        <span>Programs</span>
        <span className="stroke-text">to shape you</span>
      </div>

      <div className="program-categories">
        {programsData.map((program, index) => (
          <div className="category glass-card-program" key={index} onClick={() => navigate('/login')}>
            <div className="category-icon-wrap">{program.image}</div>
            <span className="category-heading">{program.heading}</span>
            <span className="category-details">{program.details}</span>
            <div className="join-now">
              <span>Explore Program</span>
              <img src={RightArrow} alt="" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Programs;
