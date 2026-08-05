import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Play, ArrowRight, Sparkles } from 'lucide-react';
import Card from '../common/Card';

const WorkoutSummaryCard = ({ workoutData, loading, weight = 'secondary' }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card weight={weight}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', minHeight: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#2A2A2A', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
              <Dumbbell size={20} color="#FFFFFF" />
            </div>
            <span style={{ color: '#FFFFFF', fontWeight: 700 }}>Today's Workout</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '1.5rem 0' }}>
            <div style={{ border: '2px solid #2A2A2A', borderTop: '2px solid #FFFFFF', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
          </div>
        </div>
      </Card>
    );
  }

  // Beautiful empty state if no workout data exists
  if (!workoutData) {
    return (
      <Card weight={weight}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', minHeight: '220px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{ background: '#2A2A2A', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
              <Dumbbell size={20} color="#FFFFFF" />
            </div>
            <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: weight === 'primary' ? '1.25rem' : '1.05rem' }}>Today's Workout</span>
          </div>

          {/* Empty State Body */}
          <div
            style={{
              background: '#090909',
              border: '1px dashed #2A2A2A',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
              marginBottom: '1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Sparkles size={24} color="#B3B3B3" />
            <h4 style={{ margin: 0, color: '#FFFFFF', fontWeight: 700, fontSize: '0.95rem' }}>No Workout Generated</h4>
            <p style={{ margin: 0, color: '#B3B3B3', fontSize: '0.8rem', lineHeight: '1.4' }}>
              Generate your personalized workout plan for today.
            </p>
          </div>

          {/* Yellow CTA Button */}
          <button
            onClick={() => navigate('/dashboard/workout')}
            style={{
              width: '100%',
              background: '#FFD60A',
              color: '#090909',
              border: 'none',
              borderRadius: '10px',
              padding: '0.75rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 200ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffe347';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFD60A';
            }}
          >
            <Play size={16} />
            <span>Start Workout</span>
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card weight={weight}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#2A2A2A', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
              <Dumbbell size={20} color="#FFFFFF" />
            </div>
            <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: weight === 'primary' ? '1.25rem' : '1.05rem' }}>Today's Workout</span>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#FFFFFF',
              fontWeight: 700,
              background: '#090909',
              padding: '0.25rem 0.65rem',
              borderRadius: '12px',
              border: '1px solid #2A2A2A',
              textTransform: 'uppercase'
            }}
          >
            {workoutData.overallDifficulty || workoutData.difficulty} Tier
          </span>
        </div>

        {/* Content Body */}
        <div
          style={{
            background: '#090909',
            border: '1px solid #2A2A2A',
            borderRadius: '12px',
            padding: '1.2rem',
            marginBottom: '1.2rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h4 style={{ margin: '0 0 0.4rem 0', fontWeight: 800, fontSize: '1.25rem', color: '#FFFFFF' }}>
              {workoutData.simpleTitle || workoutData.title}
            </h4>
            {workoutData.completed && (
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#00E676', background: 'rgba(0, 230, 118, 0.08)', padding: '0.15rem 0.45rem', borderRadius: '6px', border: '1px solid rgba(0, 230, 118, 0.2)' }}>
                COMPLETED
              </span>
            )}
          </div>
          <span style={{ color: '#B3B3B3', fontSize: '0.82rem', fontWeight: 700 }}>
            {workoutData.splitName}
          </span>
          <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.6rem', fontSize: '0.85rem', color: '#B3B3B3' }}>
            <span>⏱️ {workoutData.durationMinutes} Mins</span>
            <span>🔥 {workoutData.caloriesBurned} Est. kcal</span>
            <span>💪 {workoutData.exercises?.length || 0} Exercises</span>
          </div>
        </div>

        {/* Action Buttons - CTA is Yellow */}
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button
            onClick={() => navigate('/dashboard/workout')}
            style={{
              flex: 1,
              background: '#FFD60A',
              color: '#090909',
              border: 'none',
              borderRadius: '10px',
              padding: '0.75rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 200ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffe347';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFD60A';
            }}
          >
            <Play size={16} />
            <span>{workoutData.completed ? 'Review Workout' : 'Start Workout'}</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/workout')}
            style={{
              background: '#090909',
              color: '#FFFFFF',
              border: '1px solid #2A2A2A',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem'
            }}
          >
            <span>View</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default WorkoutSummaryCard;
