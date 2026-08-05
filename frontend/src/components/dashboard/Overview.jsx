import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, RefreshCw } from 'lucide-react';

import WelcomeCard from './WelcomeCard';
import WorkoutSummaryCard from './WorkoutSummaryCard';
import DietSummaryCard from './DietSummaryCard';

const Overview = () => {
  const { user, updateUserProfileState, authFetch } = useAuth();
  const [workoutData, setWorkoutData] = useState(null);
  const [todayNutrition, setTodayNutrition] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // 1. Fetch user profile
      const userRes = await authFetch('/auth/me');
      if (userRes && userRes.success && userRes.data?.user) {
        updateUserProfileState(userRes.data.user);
      }

      // 2. Fetch today's workout
      let workout = null;
      try {
        const workoutRes = await authFetch('/workout/today');
        if (workoutRes && workoutRes.success && workoutRes.data?.workout) {
          workout = workoutRes.data.workout;
          setWorkoutData(workout);
        }
      } catch (err) {
        console.error('Error fetching today\'s workout:', err);
      }

      // 3. Fetch today's nutrition
      let nutrition = null;
      try {
        const nutritionRes = await authFetch('/nutrition/today');
        if (nutritionRes && nutritionRes.success && nutritionRes.data) {
          nutrition = nutritionRes.data;
          setTodayNutrition(nutrition);
        }
      } catch (err) {
        console.error('Error fetching today\'s nutrition:', err);
      }

      // 4. Fetch plan details
      try {
        const planRes = await authFetch('/plan/status');
        if (planRes && planRes.success && planRes.data) {
          setPlanData(planRes.data);
        }
      } catch (err) {
        console.error('Error fetching plan status:', err);
      }

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setFetchError("Couldn't load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // UI STATE 1: LOADING SKELETON STATE
  if (loading) {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.8rem', paddingBottom: '2rem' }}>
        <div style={{ background: '#181818', border: '1px solid #2A2A2A', borderRadius: '16px', padding: '1.8rem', opacity: 0.6 }}>
          <div style={{ width: '180px', height: '20px', background: '#2A2A2A', borderRadius: '6px', marginBottom: '0.8rem' }} />
          <div style={{ width: '280px', height: '32px', background: '#2A2A2A', borderRadius: '8px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.4rem' }}>
          {[1, 2].map((idx) => (
            <div key={idx} style={{ background: '#181818', border: '1px solid #2A2A2A', borderRadius: '16px', padding: '1.6rem', height: '240px', opacity: 0.5 }}>
              <div style={{ width: '50%', height: '20px', background: '#2A2A2A', borderRadius: '6px', marginBottom: '1.2rem' }} />
              <div style={{ width: '100%', height: '100px', background: '#090909', borderRadius: '10px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // UI STATE 2: ERROR STATE
  if (fetchError) {
    return (
      <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div style={{ background: '#181818', border: '1px solid #2A2A2A', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <AlertTriangle size={44} color="#FFD60A" />
          <h2 style={{ fontSize: '1.4rem', margin: 0, color: '#FFFFFF', fontWeight: 700 }}>Unable to Load Dashboard</h2>
          <p style={{ color: '#B3B3B3', margin: 0, fontSize: '0.9rem' }}>{fetchError}</p>
          <button
            onClick={fetchDashboardData}
            style={{
              background: '#FFD60A',
              color: '#090909',
              border: 'none',
              borderRadius: '8px',
              padding: '0.65rem 1.4rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem'
            }}
          >
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  // UI STATE 3: MINIMAL & FOCUSED DASHBOARD (Welcome, Workout, Nutrition)
  return (
    <div style={{ width: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: '1.8rem', paddingBottom: '2.5rem', overflowX: 'hidden' }}>
      {/* 1. Welcome Section */}
      <WelcomeCard
        user={user}
        workoutData={workoutData}
        todayNutrition={todayNutrition}
        planData={planData}
      />

      {/* 2. Today's Core Focus Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.4rem' }}>
        {/* 2. Today's Workout */}
        <WorkoutSummaryCard
          workoutData={workoutData}
          loading={loading}
          weight="primary"
        />

        {/* 3. Today's Nutrition */}
        <DietSummaryCard
          todayNutrition={todayNutrition}
          loading={loading}
          weight="primary"
        />
      </div>
    </div>
  );
};

export default Overview;
