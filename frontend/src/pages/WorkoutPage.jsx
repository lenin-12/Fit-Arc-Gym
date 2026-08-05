import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, CheckCircle, Play, Timer, Flame, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import "../components/dashboard/Dashboard.css";

const WorkoutPage = () => {
  const { user, updateUserProfileState, authFetch } = useAuth();
  const navigate = useNavigate();

  const [workoutData, setWorkoutData] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completedToast, setCompletedToast] = useState('');

  const fetchWorkout = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/workout/today');
      if (res && res.success && res.data?.workout) {
        const workout = res.data.workout;
        setWorkoutData(workout);
        // Sort so uncompleted items stay on top, completed items move smoothly to bottom
        const sorted = [...workout.exercises].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));
        setExercises(sorted);
      }
    } catch (err) {
      console.error('Error fetching today\'s workout:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize workout data from backend
  useEffect(() => {
    fetchWorkout();
  }, []);

  const toggleExercise = async (id) => {
    if (workoutData?.completed) {
      alert("This workout has already been finished and finalized. You cannot modify exercise completion states.");
      return;
    }
    const exercise = exercises.find((ex) => ex.id === id);
    if (!exercise) return;
    const newCompleted = !exercise.completed;

    // Optimistically update UI
    setExercises((prev) => {
      const updated = prev.map((ex) => (ex.id === id ? { ...ex, completed: newCompleted } : ex));
      return [...updated].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));
    });

    try {
      const res = await authFetch('/workout/exercise', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: id,
          completed: newCompleted
        })
      });
      if (res && res.success && res.data?.workout) {
        const sorted = [...res.data.workout.exercises].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));
        setExercises(sorted);
      }
    } catch (e) {
      console.error('Failed to sync exercise completion state:', e);
      // Revert optimism on failure
      setExercises((prev) => {
        const updated = prev.map((ex) => (ex.id === id ? { ...ex, completed: !newCompleted } : ex));
        return [...updated].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));
      });
    }
  };

  const handleFinishWorkout = async () => {
    if (!workoutData) return;

    // Validate every exercise is completed
    const allCompleted = exercises.every((ex) => ex.completed);
    if (!allCompleted) {
      alert('Please complete all exercises in your workout before finishing!');
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch('/workout/finish', {
        method: 'POST'
      });

      if (res && res.success) {
        setCompletedToast('Workout Completed! +50 XP Added to Your Rank 🔥');
        if (res.data?.user) {
          updateUserProfileState(res.data.user);
        }
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (e) {
      console.error('Error completing workout session:', e);
    } finally {
      setSaving(false);
    }
  };

  const completedCount = exercises.filter((e) => e.completed).length;
  const progressPercent = exercises.length > 0 ? Math.round((completedCount / exercises.length) * 100) : 0;

  const seenImages = new Set();

  if (loading) {
    return (
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#B3B3B3' }}>
          <div className="loading-spinner" />
          <p style={{ fontWeight: 600 }}>Loading today's personalized AI workout...</p>
        </div>
      </div>
    );
  }

  if (!workoutData || exercises.length === 0) {
    return (
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div
          style={{
            background: '#181818',
            border: '1px dashed #2A2A2A',
            borderRadius: '16px',
            padding: '2.5rem 2rem',
            textAlign: 'center',
            maxWidth: '440px',
            width: '100%',
            maxHeight: '360px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ background: 'var(--color-accent-muted)', padding: '0.8rem', borderRadius: '50%', border: '1px solid var(--color-accent-muted-border)' }}>
            <Dumbbell size={32} color="var(--color-primary)" />
          </div>
          <h3 style={{ color: '#FFFFFF', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
            Could not fetch workout.
          </h3>
          <p style={{ color: '#B3B3B3', fontSize: '0.88rem', margin: 0 }}>
            There was an error retrieving today's workout split. Please try again.
          </p>
          <button
            onClick={fetchWorkout}
            style={{
              background: 'transparent',
              color: 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
              borderRadius: '10px',
              padding: '0.75rem 1.4rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 200ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-primary)';
              e.currentTarget.style.color = '#090909';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--color-primary)';
            }}
          >
            <Sparkles size={16} />
            <span>Generate Today's Workout</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.8rem', paddingBottom: '2.5rem' }}>
      {/* C1. Workout Header */}
      <div
        style={{
          background: '#181818',
          border: '1px solid #2A2A2A',
          borderRadius: '16px',
          padding: '1.6rem 1.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <span style={{ background: '#090909', border: '1px solid #2A2A2A', color: 'var(--color-accent-muted-text)', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                {workoutData.programDay}
              </span>
              <span style={{ background: 'var(--color-accent-muted)', border: '1px solid var(--color-accent-muted-border)', color: 'var(--color-accent-muted-text)', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                {workoutData.overallDifficulty} Tier
              </span>
            </div>

            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              {workoutData.title}
            </h1>
            <p style={{ color: '#B3B3B3', marginTop: '0.3rem', fontSize: '0.9rem', margin: 0 }}>
              {workoutData.splitName} • ⏱️ {workoutData.durationMinutes} Mins • 🔥 {workoutData.caloriesBurned} Est. kcal
            </p>
          </div>

          <button
            onClick={handleFinishWorkout}
            disabled={saving || workoutData?.completed}
            style={{
              background: (workoutData?.completed || progressPercent === 100) ? 'var(--color-primary)' : 'transparent',
              color: (workoutData?.completed || progressPercent === 100) ? '#090909' : 'var(--color-primary)',
              border: '1px solid var(--color-primary)',
              borderRadius: '10px',
              padding: '0.8rem 1.6rem',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: (saving || workoutData?.completed) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 200ms ease',
              opacity: workoutData?.completed ? 0.75 : 1
            }}
            onMouseEnter={(e) => {
              if (progressPercent !== 100 && !workoutData?.completed) {
                e.currentTarget.style.background = 'var(--color-primary)';
                e.currentTarget.style.color = '#090909';
              }
            }}
            onMouseLeave={(e) => {
              if (progressPercent !== 100 && !workoutData?.completed) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-primary)';
              }
            }}
          >
            <CheckCircle size={18} />
            <span>{saving ? 'Saving Progress...' : workoutData?.completed ? 'Workout Finalized ✓' : 'Finish Workout'}</span>
          </button>
        </div>

        {completedToast && (
          <div style={{ background: 'rgba(0, 230, 118, 0.1)', border: '1px solid #00E676', color: '#00E676', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame size={18} />
            <span>{completedToast}</span>
          </div>
        )}

        {/* Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.85rem' }}>
            <span style={{ color: '#B3B3B3' }}>Workout Completion Progress</span>
            <span style={{ color: 'var(--color-primary)' }}>{completedCount} / {exercises.length} Exercises Done ({progressPercent}%)</span>
          </div>
          <div style={{ background: '#090909', border: '1px solid #2A2A2A', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPercent}%`, background: 'var(--color-primary)', height: '100%', transition: 'width 200ms ease' }} />
          </div>
        </div>
      </div>

      {/* C2. Exercise Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.4rem' }}>
        {exercises.map((ex) => {
          const hasDuplicateImage = seenImages.has(ex.img);
          if (ex.img) {
            seenImages.add(ex.img);
          }
          return (
              <div
                key={ex.id}
                style={{
                  background: '#181818',
                  border: ex.completed ? '1px solid #00E676' : '1px solid #2A2A2A',
                  borderRadius: '16px',
                  padding: '1.5rem 1.6rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 200ms ease',
                  opacity: ex.completed ? 0.85 : 1
                }}
              >
                <div>
                  {/* Image Cover */}
                  <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    {ex.img && !hasDuplicateImage ? (
                      <>
                        <img
                          src={ex.img}
                          alt={ex.name}
                          style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', display: 'block' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement.querySelector('.image-fallback');
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div
                          className="image-fallback"
                          style={{
                            width: '100%',
                            height: '180px',
                            borderRadius: '12px',
                            display: 'none',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#090909',
                            border: '1px solid #2A2A2A',
                            color: '#B3B3B3',
                            gap: '0.5rem'
                          }}
                        >
                          <Dumbbell size={40} color="var(--color-primary)" />
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Exercise Demonstration</span>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '180px',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#090909',
                          border: '1px solid #2A2A2A',
                          color: '#B3B3B3',
                          gap: '0.5rem'
                        }}
                      >
                        <Dumbbell size={40} color="var(--color-primary)" />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Exercise Demonstration</span>
                      </div>
                    )}
                <span
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#090909',
                    border: '1px solid #2A2A2A',
                    color: '#B3B3B3',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.55rem',
                    borderRadius: '8px'
                  }}
                >
                  {ex.difficulty}
                </span>
              </div>

              {/* Title & Muscle */}
              <span style={{ color: 'var(--color-accent-muted-text)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {ex.muscle}
              </span>
              <h3 style={{ margin: '0.2rem 0 0.6rem 0', fontWeight: 800, fontSize: '1.2rem', color: '#FFFFFF' }}>
                {ex.name}
              </h3>

              {/* Sets / Reps / Rest Pills */}
              <div style={{ display: 'flex', gap: '0.8rem', background: '#090909', border: '1px solid #2A2A2A', padding: '0.6rem 0.8rem', borderRadius: '10px', margin: '0.8rem 0', fontSize: '0.82rem', color: '#B3B3B3' }}>
                <span><strong>Sets:</strong> {ex.sets}</span>
                <span>•</span>
                <span><strong>Reps:</strong> {ex.reps}</span>
                <span>•</span>
                <span><strong>Rest:</strong> {ex.rest}</span>
              </div>

              <p style={{ color: '#B3B3B3', fontSize: '0.85rem', lineHeight: '1.5', margin: '0 0 1.2rem 0' }}>
                {ex.instructions}
              </p>
            </div>

            {/* C3 & C5. Interactive Toggle Button (Fix 2: White minimal secondary styling) */}
            <button
              onClick={() => toggleExercise(ex.id)}
              style={{
                width: '100%',
                background: ex.completed ? 'rgba(0, 230, 118, 0.1)' : '#090909',
                color: ex.completed ? '#00E676' : '#FFFFFF',
                border: ex.completed ? '1px solid #00E676' : '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '10px',
                padding: '0.75rem',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 200ms ease'
              }}
              onMouseEnter={(e) => {
                if (!ex.completed) {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.color = '#090909';
                }
              }}
              onMouseLeave={(e) => {
                if (!ex.completed) {
                  e.currentTarget.style.background = '#090909';
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
            >
              {ex.completed ? <CheckCircle2 size={16} color="#00E676" /> : <CheckCircle size={16} color="#FFFFFF" />}
              <span>{ex.completed ? 'Completed ✓' : 'Mark Exercise Complete'}</span>
            </button>
          </div>
        );
        })}
      </div>
    </div>
  );
};

export default WorkoutPage;
