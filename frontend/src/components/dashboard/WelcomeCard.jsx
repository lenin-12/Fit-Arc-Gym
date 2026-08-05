import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ShieldAlert, Award } from 'lucide-react';

const WelcomeCard = ({ user, workoutData, todayNutrition, planData }) => {
  const navigate = useNavigate();

  const isHeightMissing = !user?.height || Number(user.height) <= 0;
  const isWeightMissing = !user?.weight || Number(user.weight) <= 0;
  const isGoalMissing = !user?.fitnessGoal || user.fitnessGoal === 'Not Set';
  const isProfileIncomplete = isHeightMissing || isWeightMissing || isGoalMissing;

  const daysRemaining = planData?.remainingDays ?? 0;
  const isExpiringSoon = daysRemaining <= 5 && planData?.status !== 'Expired';
  const planDisplay = planData?.currentPlan
    ? planData.currentPlan === 'basic'
      ? 'Basic Plan'
      : planData.currentPlan === 'pro_ai_vip'
      ? 'Pro AI VIP'
      : 'Premium Plan'
    : 'Premium Plan';

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  // Calculate dynamic AI Summary strictly from real MongoDB data (Workout + Nutrition)
  let aiSummary = "No workout generated for today yet. Start today's personalized AI workout to track progress!";
  if (workoutData && todayNutrition) {
    const workoutDone = workoutData.completed;
    const title = workoutData.title;
    const caloriesConsumed = todayNutrition.consumed.calories || 0;
    const caloriesTarget = todayNutrition.targets.calories || 2200;

    if (workoutDone) {
      aiSummary = `Today's workout "${title}" completed! Consumed ${caloriesConsumed}/${caloriesTarget} kcal. Fantastic consistency, keep it up!`;
    } else {
      const completedExercises = workoutData.exercises?.filter((ex) => ex.completed).length || 0;
      const totalExercises = workoutData.exercises?.length || 0;
      aiSummary = `Today's target: "${title}" (${completedExercises}/${totalExercises} exercises completed). Consumed ${caloriesConsumed}/${caloriesTarget} kcal. Keep pushing!`;
    }
  }

  const currentHour = new Date().getHours();
  let greeting = 'Good Morning';
  if (currentHour >= 12 && currentHour < 17) {
    greeting = 'Good Afternoon';
  } else if (currentHour >= 17) {
    greeting = 'Good Evening';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Profile Incomplete Banner - Reduced Colors (Gray border, Yellow CTA) */}
      {isProfileIncomplete && (
        <div
          style={{
            background: '#181818',
            border: '1px solid #2A2A2A',
            borderRadius: '12px',
            padding: '0.85rem 1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 600 }}>
            <AlertTriangle size={18} color="#B3B3B3" />
            <span>Complete your profile to unlock personalized recommendations.</span>
          </div>
          <button
            onClick={() => navigate('/dashboard/profile')}
            style={{
              background: '#FFD60A',
              color: '#090909',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* Subscription Expiring Soon Alert - Reduced Colors (Gray border, Yellow CTA) */}
      {isExpiringSoon && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid #2A2A2A',
            borderRadius: '12px',
            padding: '0.85rem 1.2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 600 }}>
            <ShieldAlert size={18} color="#B3B3B3" />
            <span>Your subscription expires in {daysRemaining} days. Renew now to maintain access!</span>
          </div>
          <button
            onClick={() => navigate('/dashboard/plan')}
            style={{
              background: '#FFD60A',
              color: '#090909',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Renew Plan
          </button>
        </div>
      )}

      {/* Welcome SaaS Banner Card - Black, Gray, White Theme */}
      <div
        style={{
          background: '#181818',
          border: '1px solid #2A2A2A',
          borderRadius: '16px',
          padding: '1.5rem 1.8rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.2rem'
        }}
      >
        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{ color: '#B3B3B3', fontSize: '0.85rem', fontWeight: 500 }}>{todayStr}</span>
            <span style={{ color: '#2A2A2A' }}>•</span>
            <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Award size={14} color="#B3B3B3" />
              <span>{planDisplay}</span>
            </span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', margin: 0, marginBottom: '0.5rem' }}>
            {greeting}, {user?.name || 'Athlete'} 👋
          </h2>
          <p style={{ color: '#B3B3B3', margin: 0, fontSize: '0.92rem', lineHeight: '1.5', borderLeft: '3px solid #2A2A2A', paddingLeft: '0.8rem', fontStyle: 'italic' }}>
            {aiSummary}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCard;
