import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Utensils, Sparkles, CheckCircle2, ArrowRight, HelpCircle, Check } from 'lucide-react';
import { calculateTodayNutrition } from '../utils/nutritionCalculator';
import { analyzeNaturalMealInput, generateDefaultMeals } from '../data/foodDatabase';
import "../components/dashboard/Dashboard.css";

const DietPage = () => {
  const { user, updateUserProfileState, authFetch } = useAuth();
  const [mealInput, setMealInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Breakfast');
  const [analyzedMeal, setAnalyzedMeal] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toast, setToast] = useState('');

  
  const todayNutrition = user?.todayNutrition || calculateTodayNutrition(user);

  const targetCalories = todayNutrition.targets.calories;
  const targetProtein = todayNutrition.targets.protein;
  const targetCarbs = todayNutrition.targets.carbs;
  const targetFats = todayNutrition.targets.fats;

  const suggestedPlan = generateDefaultMeals(todayNutrition.targets, user?.dietPreference || 'Non-Veg', user?.cuisinePreference || 'North Indian');

 
  const [loggedIntake, setLoggedIntake] = useState(todayNutrition.loggedMeals);

  
  const refreshTodayNutrition = async () => {
    try {
      const res = await authFetch('/nutrition/today');
      if (res && res.success && res.data) {
        setLoggedIntake(res.data.loggedMeals || []);
        updateUserProfileState({ ...user, todayNutrition: res.data });
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const ok = await refreshTodayNutrition();
      if (!ok && isMounted) {
        setLoggedIntake(calculateTodayNutrition(user).loggedMeals);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  
  const tempConsumed = loggedIntake.reduce((acc, m) => {
    acc.calories += (Number(m.calories) || 0);
    acc.protein += (Number(m.protein) || 0);
    acc.carbs += (Number(m.carbs) || 0);
    acc.fats += (Number(m.fats) || 0);
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

  const roundedCals = Math.round(tempConsumed.calories);
  const roundedProtein = Math.round(tempConsumed.protein);
  const roundedCarbs = Math.round(tempConsumed.carbs);
  const roundedFats = Math.round(tempConsumed.fats);

  
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 4000);
  };

 
  const handleAnalyzeMeal = async (overrideInput) => {
    const query = (overrideInput || mealInput).trim();
    if (!query) return;

    setIsAnalyzing(true);
    try {
      const result = analyzeNaturalMealInput(query, selectedCategory);
      setAnalyzedMeal(result);
    } catch (e) {
      console.error(e);
      showToast('Could not analyze that meal. Try rephrasing it.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  
  const handleClarificationOption = (choice) => {
    if (!analyzedMeal) return;
    const baseQuery = mealInput.trim();
    const query = choice === 'only' ? baseQuery : `${baseQuery} ${choice}`;

    try {
      const result = analyzeNaturalMealInput(query, selectedCategory);
      setAnalyzedMeal(result);
    } catch (e) {
      console.error(e);
      showToast('Could not process that clarification.');
    }
  };

  
  const handleConfirmMeal = async () => {
    if (!analyzedMeal) return;

    const mealForBackend = {
      mealName: analyzedMeal.name,
      mealType: selectedCategory,
      calories: analyzedMeal.calories,
      protein: analyzedMeal.protein,
      carbs: analyzedMeal.carbs,
      fats: analyzedMeal.fats
    };

    // Optimistic UI update (uses the same field names the rest of this page expects)
    const optimisticMeal = {
      name: analyzedMeal.name,
      calories: analyzedMeal.calories,
      protein: analyzedMeal.protein,
      carbs: analyzedMeal.carbs,
      fats: analyzedMeal.fats
    };
    setLoggedIntake((prev) => [...prev, optimisticMeal]);
    setAnalyzedMeal(null);
    setMealInput('');

    try {
      const res = await authFetch('/nutrition/meal', {
        method: 'POST',
        body: JSON.stringify(mealForBackend)
      });

      if (res && res.success) {
        // logMeal doesn't return a recalculated summary, so pull the fresh
        // single-source-of-truth totals to replace our optimistic guess.
        await refreshTodayNutrition();
        showToast(`${optimisticMeal.name} logged successfully!`);
      } else {
        showToast(res?.message || 'Could not save meal — it will be lost on refresh.');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error — meal will be lost on refresh.');
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.8rem', paddingBottom: '3rem' }}>
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            background: '#151515',
            border: '1px solid var(--color-success-border)',
            color: 'var(--color-success)',
            borderRadius: '12px',
            padding: '0.8rem 1.2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontWeight: 700,
            fontSize: '0.88rem'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toast}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0, color: '#FFFFFF' }}>
          <Utensils color="var(--color-primary)" />
          <span>AI Nutrition Coach</span>
        </h1>
        <button
          onClick={async () => {
            if (window.confirm("Are you sure you want to clear today's nutrition logs? This is useful for removing old test data.")) {
              try {
                const res = await authFetch('/nutrition/reset', { method: 'POST' });
                if (res && res.success) {
                  setLoggedIntake([]);
                  updateUserProfileState({ ...user, todayNutrition: null }); // Trigger refresh
                  showToast('Nutrition logs cleared successfully!');
                }
              } catch (e) {
                console.error(e);
                showToast('Failed to clear nutrition data.');
              }
            }
          }}
          style={{
            background: 'transparent',
            border: '1px solid #FF3B30',
            color: '#FF3B30',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Reset Data
        </button>
      </div>

      {/* Daily Progress Cards (Black/Dark Gray theme, Yellow progress bars ONLY) */}
      <div className="stats-grid">
        <div className="glass-card" style={{ background: '#151515', border: '1px solid #2A2A2A' }}>
          <span style={{ color: '#B3B3B3', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            CALORIES CONSUMED LOGGED
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.3rem', color: 'var(--color-primary)' }}>
            {roundedCals.toLocaleString()} <span style={{ fontSize: '0.9rem', color: '#B3B3B3', fontWeight: 400 }}>/ {targetCalories} kcal</span>
          </div>
          <div style={{ background: '#090909', height: '8px', borderRadius: '4px', marginTop: '0.8rem', overflow: 'hidden', border: '1px solid #2A2A2A' }}>
            <div style={{ width: `${Math.min(100, (roundedCals / targetCalories) * 100)}%`, background: 'var(--color-primary)', height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        <div className="glass-card" style={{ background: '#151515', border: '1px solid #2A2A2A' }}>
          <span style={{ color: '#B3B3B3', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            PROTEIN LOGGED
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.3rem', color: '#FFFFFF' }}>
            {roundedProtein}g <span style={{ fontSize: '0.9rem', color: '#B3B3B3', fontWeight: 400 }}>/ {targetProtein}g</span>
          </div>
          <div style={{ background: '#090909', height: '8px', borderRadius: '4px', marginTop: '0.8rem', overflow: 'hidden', border: '1px solid #2A2A2A' }}>
            <div style={{ width: `${Math.min(100, (roundedProtein / targetProtein) * 100)}%`, background: 'var(--color-primary)', height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        <div className="glass-card" style={{ background: '#151515', border: '1px solid #2A2A2A' }}>
          <span style={{ color: '#B3B3B3', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            CARBOHYDRATES LOGGED
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.3rem', color: '#FFFFFF' }}>
            {roundedCarbs}g <span style={{ fontSize: '0.9rem', color: '#B3B3B3', fontWeight: 400 }}>/ {targetCarbs}g</span>
          </div>
          <div style={{ background: '#090909', height: '8px', borderRadius: '4px', marginTop: '0.8rem', overflow: 'hidden', border: '1px solid #2A2A2A' }}>
            <div style={{ width: `${Math.min(100, (roundedCarbs / targetCarbs) * 100)}%`, background: 'var(--color-primary)', height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        <div className="glass-card" style={{ background: '#151515', border: '1px solid #2A2A2A' }}>
          <span style={{ color: '#B3B3B3', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            FAT LOGGED
          </span>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.3rem', color: '#FFFFFF' }}>
            {roundedFats}g <span style={{ fontSize: '0.9rem', color: '#B3B3B3', fontWeight: 400 }}>/ {targetFats}g</span>
          </div>
          <div style={{ background: '#090909', height: '8px', borderRadius: '4px', marginTop: '0.8rem', overflow: 'hidden', border: '1px solid #2A2A2A' }}>
            <div style={{ width: `${Math.min(100, (roundedFats / targetFats) * 100)}%`, background: 'var(--color-primary)', height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>

      {/* Single Conversational AI Input Card */}
      <div
        style={{
          background: '#151515',
          border: '1px solid #2A2A2A',
          borderTop: '3px solid var(--color-primary)',
          borderRadius: '16px',
          padding: '1.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.2rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="var(--color-primary)" />
              <span>What did you eat today?</span>
            </h2>
            <p style={{ color: '#B3B3B3', margin: '0.3rem 0 0 0', fontSize: '0.88rem' }}>
              Type your meal naturally — AI will analyze ingredients and portions before logging.
            </p>
          </div>

          {/* Meal Category Selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ background: '#090909', border: '1px solid #2A2A2A', color: 'var(--color-accent-muted-text)', padding: '0.55rem 0.9rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem' }}
          >
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Snack">Snack</option>
          </select>
        </div>

        {/* Textarea for Natural Language Input */}
        <textarea
          rows={3}
          placeholder="e.g. 2 Eggs and 2 Rotis, or Chicken Biryani..."
          value={mealInput}
          onChange={(e) => {
            setMealInput(e.target.value);
            setAnalyzedMeal(null);
          }}
          style={{
            width: '100%',
            background: '#090909',
            border: '1px solid #2A2A2A',
            borderRadius: '12px',
            padding: '1rem',
            color: '#FFFFFF',
            fontSize: '0.95rem',
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />

        
            
        <button
          onClick={() => handleAnalyzeMeal()}
          disabled={isAnalyzing || !mealInput.trim()}
          style={{
            width: '100%',
            background: !mealInput.trim() ? '#222222' : 'var(--color-primary)',
            color: !mealInput.trim() ? '#666666' : '#090909',
            border: 'none',
            borderRadius: '10px',
            padding: '0.85rem',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: !mealInput.trim() ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}
        >
          <Sparkles size={18} />
          <span>{isAnalyzing ? 'Analyzing Meal with AI...' : 'Analyze Meal'}</span>
        </button>

    
        {/* {analyzedMeal && analyzedMeal.needsClarification && (
          <div style={{ background: '#090909', border: '1px solid var(--color-primary)', borderRadius: '12px', padding: '1.2rem', marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--color-primary)' }}>
              <HelpCircle size={20} />
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#FFFFFF' }}>AI Clarification</h4>
            </div>
            <p style={{ margin: 0, color: '#FFFFFF', fontSize: '0.92rem', fontWeight: 600 }}>
              {analyzedMeal.clarificationMessage}
            </p>
         </div>
        )} */}

      
        {analyzedMeal && !analyzedMeal.needsClarification && (
          <div style={{ background: '#090909', border: '1px solid #2A2A2A', borderRadius: '14px', padding: '1.4rem', marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2A2A2A', paddingBottom: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--color-primary)', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>AI ANALYSIS COMPLETE</span>
                <h3 style={{ margin: '0.2rem 0 0 0', color: '#FFFFFF', fontSize: '1.15rem', fontWeight: 800 }}>{analyzedMeal.name}</h3>
              </div>
              <span style={{ color: '#B3B3B3', fontSize: '0.82rem', fontWeight: 700, background: '#151515', border: '1px solid #2A2A2A', padding: '0.3rem 0.7rem', borderRadius: '8px' }}>
                {selectedCategory}
              </span>
            </div>

            
            
            <div>
              <span style={{ color: '#B3B3B3', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.5rem' }}>
                Estimated Nutrition
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                <div style={{ background: '#151515', border: '1px solid #2A2A2A', padding: '0.7rem 0.5rem', borderRadius: '10px' }}>
                  <span style={{ color: '#B3B3B3', fontSize: '0.7rem', fontWeight: 700 }}>Calories</span>
                  <div style={{ color: 'var(--color-primary)', fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem' }}>{analyzedMeal.calories} <span style={{ fontSize: '0.72rem', color: '#B3B3B3', fontWeight: 500 }}>kcal</span></div>
                </div>
                <div style={{ background: '#151515', border: '1px solid #2A2A2A', padding: '0.7rem 0.5rem', borderRadius: '10px' }}>
                  <span style={{ color: '#B3B3B3', fontSize: '0.7rem', fontWeight: 700 }}>Protein</span>
                  <div style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem' }}>{analyzedMeal.protein} <span style={{ fontSize: '0.72rem', color: '#B3B3B3', fontWeight: 500 }}>g</span></div>
                </div>
                <div style={{ background: '#151515', border: '1px solid #2A2A2A', padding: '0.7rem 0.5rem', borderRadius: '10px' }}>
                  <span style={{ color: '#B3B3B3', fontSize: '0.7rem', fontWeight: 700 }}>Carbs</span>
                  <div style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem' }}>{analyzedMeal.carbs} <span style={{ fontSize: '0.72rem', color: '#B3B3B3', fontWeight: 500 }}>g</span></div>
                </div>
                <div style={{ background: '#151515', border: '1px solid #2A2A2A', padding: '0.7rem 0.5rem', borderRadius: '10px' }}>
                  <span style={{ color: '#B3B3B3', fontSize: '0.7rem', fontWeight: 700 }}>Fat</span>
                  <div style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem' }}>{analyzedMeal.fats} <span style={{ fontSize: '0.72rem', color: '#B3B3B3', fontWeight: 500 }}>g</span></div>
                </div>
              </div>
            </div>

            {/* Confirm Meal Button (Triggers macro updates & MongoDB storage) */}
            <button
              onClick={handleConfirmMeal}
              style={{
                width: '100%',
                background: 'var(--color-primary)',
                color: '#090909',
                border: 'none',
                borderRadius: '10px',
                padding: '0.85rem',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '0.4rem'
              }}
            >
              <span>Confirm Meal</span>
              <ArrowRight size={17} />
            </button>
          </div>
        )}
      </div>

      {/* Logged Meals List Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
          Today's Logged Meals
        </h3>
        {loggedIntake.length === 0 ? (
          <div style={{ background: '#151515', border: '1px dashed #2A2A2A', borderRadius: '12px', padding: '1.8rem', textAlign: 'center' }}>
            <p style={{ color: '#B3B3B3', margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>
              No meals logged today yet. Use the natural language input card above to log your food!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loggedIntake.map((meal, index) => (
              <div key={index} style={{ background: '#151515', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '1rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span style={{ color: 'var(--color-primary)', fontSize: '0.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {meal.mealType || 'Meal'}
                  </span>
                  <h4 style={{ color: '#FFFFFF', margin: '0.15rem 0 0 0', fontSize: '1rem', fontWeight: 750 }}>
                    {meal.mealName || meal.name}
                  </h4>
                </div>
                <div style={{ display: 'flex', gap: '1.2rem', color: '#B3B3B3', fontSize: '0.82rem', fontWeight: 600 }}>
                  <span>🔥 <strong style={{ color: '#FFFFFF' }}>{meal.calories}</strong> kcal</span>
                  <span>💪 <strong style={{ color: '#FFFFFF' }}>{meal.protein}g</strong> P</span>
                  <span>🍞 <strong style={{ color: '#FFFFFF' }}>{meal.carbs}g</strong> C</span>
                  <span>🥑 <strong style={{ color: '#FFFFFF' }}>{meal.fats}g</strong> F</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested Meals (Minimal Bottom Section) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
          Suggested Meals
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {suggestedPlan.map((meal) => (
            <div key={meal.mealType} style={{ background: '#151515', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <span style={{ color: 'var(--color-accent-muted-text)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase' }}>{meal.mealType}</span>
              <div style={{ color: '#FFFFFF', fontSize: '0.9rem', fontWeight: 600 }}>
                {meal.items[0]?.name}
              </div>
              <span style={{ color: '#B3B3B3', fontSize: '0.8rem' }}>~{meal.items[0]?.calories} kcal ({meal.items[0]?.protein || 15}g P)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DietPage;
