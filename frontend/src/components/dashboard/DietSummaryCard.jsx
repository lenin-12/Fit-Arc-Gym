import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, ArrowUpRight, PlusCircle, AlertCircle } from 'lucide-react';
import Card from '../common/Card';

const DietSummaryCard = ({ todayNutrition, loading, weight = 'secondary' }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card weight={weight}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', minHeight: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#2A2A2A', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
              <Utensils size={20} color="#FFFFFF" />
            </div>
            <span style={{ color: '#FFFFFF', fontWeight: 700 }}>Today's Nutrition</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '1.5rem 0' }}>
            <div style={{ border: '2px solid #2A2A2A', borderTop: '2px solid #FFFFFF', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
          </div>
        </div>
      </Card>
    );
  }

  const hasLoggedMeals = todayNutrition?.hasLoggedMeals || false;
  const consumedCalories = todayNutrition?.consumed?.calories || 0;
  const consumedProtein = todayNutrition?.consumed?.protein || 0;

  const targetCalories = todayNutrition?.targets?.calories || 2200;
  const targetProtein = todayNutrition?.targets?.protein || 140;

  const remainingCalories = todayNutrition?.remaining?.calories || targetCalories;
  const loggedMealsToday = todayNutrition?.loggedMeals || [];

  return (
    <Card weight={weight}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ background: '#2A2A2A', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
              <Utensils size={20} color="#FFFFFF" />
            </div>
            <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: weight === 'primary' ? '1.25rem' : '1.05rem' }}>Today's Nutrition</span>
          </div>
        </div>

        {!hasLoggedMeals ? (
          /* Empty State: Calories 0 / Daily Target, Protein 0 / Daily Target, "No meals logged today." */
          <div>
            <div
              style={{
                background: '#090909',
                border: '1px solid #2A2A2A',
                borderRadius: '12px',
                padding: '1rem 1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}
            >
              <div>
                <span style={{ color: '#B3B3B3', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Calories
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
                  0 <span style={{ fontSize: '0.82rem', color: '#888888', fontWeight: 500 }}>/ {targetCalories} kcal</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#B3B3B3', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Protein
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
                  0g <span style={{ fontSize: '0.82rem', color: '#888888', fontWeight: 500 }}>/ {targetProtein}g</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#090909',
                border: '1px dashed #2A2A2A',
                borderRadius: '12px',
                padding: '1.2rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                marginBottom: '1.2rem'
              }}
            >
              <AlertCircle size={18} color="#B3B3B3" />
              <span style={{ color: '#B3B3B3', fontSize: '0.88rem', fontWeight: 600 }}>
                No meals logged today.
              </span>
            </div>
          </div>
        ) : (
          /* Logged State: Display consumed & remaining values */
          <div>
            <div
              style={{
                background: '#090909',
                border: '1px solid #2A2A2A',
                borderRadius: '12px',
                padding: '1rem 1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.2rem'
              }}
            >
              <div>
                <span style={{ color: '#B3B3B3', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Calories Remaining
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
                  {remainingCalories.toLocaleString()} <span style={{ fontSize: '0.82rem', color: '#888888', fontWeight: 500 }}>/ {targetCalories} kcal</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#B3B3B3', fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Protein Logged
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', marginTop: '0.2rem' }}>
                  {consumedProtein}g <span style={{ fontSize: '0.82rem', color: '#888888', fontWeight: 500 }}>/ {targetProtein}g</span>
                </div>
              </div>
            </div>

            {/* Logged Meals List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.2rem' }}>
              <span style={{ color: '#888888', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                LOGGED MEALS TODAY ({loggedMealsToday.length})
              </span>
              {loggedMealsToday.slice(0, 3).map((m, idx) => (
                <div key={idx} style={{ background: '#090909', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '0.65rem 0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#FFFFFF', fontSize: '0.88rem', fontWeight: 600 }}>
                    {m.mealName || m.name}
                  </span>
                  <span style={{ color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 700 }}>
                    +{m.calories} kcal
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons - CTA is Yellow */}
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button
            onClick={() => navigate('/dashboard/diet')}
            style={{
              flex: 1,
              background: '#090909',
              color: '#FFFFFF',
              border: '1px solid #2A2A2A',
              borderRadius: '10px',
              padding: '0.75rem',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 200ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2A2A2A';
            }}
          >
            <span>Open Diet</span>
            <ArrowUpRight size={15} />
          </button>

          <button
            onClick={() => navigate('/dashboard/diet')}
            style={{
              flex: 1,
              background: '#FFD60A',
              color: '#090909',
              border: 'none',
              borderRadius: '10px',
              padding: '0.75rem',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 200ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffe347';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFD60A';
            }}
          >
            <PlusCircle size={15} />
            <span>Log Meal</span>
          </button>
        </div>
      </div>
    </Card>
  );
};

export default DietSummaryCard;
