import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2, Check } from 'lucide-react';
import { FOOD_DATABASE } from '../../data/foodDatabase';

const MealEditModal = ({ isOpen, mealType, initialItems = [], onSave, onClose }) => {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCals, setCustomCals] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFats, setCustomFats] = useState('');

  useEffect(() => {
    if (isOpen) {
      setItems(JSON.parse(JSON.stringify(initialItems)));
      setSearchQuery('');
    }
  }, [isOpen, initialItems]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredFoods = FOOD_DATABASE.filter((food) =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = (food) => {
    const existingIdx = items.findIndex((i) => i.name === food.name);
    if (existingIdx >= 0) {
      const updated = [...items];
      updated[existingIdx].quantity += 1;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          name: food.name,
          quantity: 1,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fats: food.fats
        }
      ]);
    }
  };

  const handleUpdateQuantity = (idx, delta) => {
    const updated = [...items];
    const newQty = Math.max(0.5, Number((updated[idx].quantity + delta).toFixed(1)));
    updated[idx].quantity = newQty;
    setItems(updated);
  };

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleAddCustomFood = (e) => {
    e.preventDefault();
    if (!customName || !customCals) return;
    setItems([
      ...items,
      {
        name: customName,
        quantity: 1,
        calories: Number(customCals) || 0,
        protein: Number(customProtein) || 0,
        carbs: Number(customCarbs) || 0,
        fats: Number(customFats) || 0
      }
    ]);
    setCustomName('');
    setCustomCals('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFats('');
  };

  const calculateTotal = (key) =>
    items.reduce((acc, item) => acc + (Number(item[key]) || 0) * (item.quantity || 1), 0);

  const totalCals = Math.round(calculateTotal('calories'));
  const totalProtein = Math.round(calculateTotal('protein'));
  const totalCarbs = Math.round(calculateTotal('carbs'));
  const totalFats = Math.round(calculateTotal('fats'));

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#181818',
          border: '1px solid #2A2A2A',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div
          style={{
            padding: '1.2rem 1.5rem',
            borderBottom: '1px solid #2A2A2A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#111111'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
              Edit {mealType}
            </h2>
            <span style={{ fontSize: '0.82rem', color: '#B3B3B3' }}>
              Add, remove or adjust portion sizes
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#B3B3B3',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Current Meal Items */}
          <div>
            <h4 style={{ fontSize: '0.9rem', color: '#FFD60A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.8rem' }}>
              Meal Items ({items.length})
            </h4>
            {items.length === 0 ? (
              <div style={{ padding: '1.5rem', background: '#090909', borderRadius: '12px', border: '1px dashed #2A2A2A', textAlign: 'center', color: '#B3B3B3', fontSize: '0.9rem' }}>
                No items in this meal. Search below to add foods!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#090909',
                      border: '1px solid #2A2A2A',
                      borderRadius: '12px',
                      padding: '0.8rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.8rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.95rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#B3B3B3', marginTop: '0.2rem' }}>
                        🔥 {Math.round(item.calories * item.quantity)} kcal | P: {Math.round(item.protein * item.quantity)}g | C: {Math.round((item.carbs || 0) * item.quantity)}g | F: {Math.round((item.fats || 0) * item.quantity)}g
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#181818', borderRadius: '8px', border: '1px solid #2A2A2A', padding: '0.2rem 0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(idx, -0.5)}
                        style={{ background: 'transparent', border: 'none', color: '#FFD60A', fontWeight: 800, cursor: 'pointer', fontSize: '1rem', width: '20px' }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.85rem', minWidth: '32px', textAlign: 'center' }}>
                        {item.quantity}x
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(idx, 0.5)}
                        style={{ background: 'transparent', border: 'none', color: '#FFD60A', fontWeight: 800, cursor: 'pointer', fontSize: '1rem', width: '20px' }}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#FF5252', cursor: 'pointer', padding: '0.3rem' }}
                      title="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Food Search Section */}
          <div>
            <h4 style={{ fontSize: '0.9rem', color: '#FFD60A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.8rem' }}>
              Add From Food Database
            </h4>
            <div style={{ position: 'relative', marginBottom: '0.8rem' }}>
              <Search size={18} color="#B3B3B3" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search food item (e.g. Oats, Chicken, Paneer)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#090909',
                  border: '1px solid #2A2A2A',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem 0.75rem 2.6rem',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {filteredFoods.map((food) => (
                <div
                  key={food.id}
                  onClick={() => handleAddItem(food)}
                  style={{
                    background: '#090909',
                    border: '1px solid #2A2A2A',
                    borderRadius: '10px',
                    padding: '0.65rem 0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#FFD60A')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2A2A2A')}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#FFFFFF', fontSize: '0.88rem' }}>{food.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#B3B3B3' }}>
                      {food.servingUnit} • {food.calories} kcal | P: {food.protein}g C: {food.carbs}g F: {food.fats}g
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: 'rgba(255, 214, 10, 0.12)',
                      border: '1px solid #FFD60A',
                      color: '#FFD60A',
                      borderRadius: '6px',
                      padding: '0.3rem 0.6rem',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer with Live Totals & Save */}
        <div
          style={{
            padding: '1.2rem 1.5rem',
            borderTop: '1px solid #2A2A2A',
            background: '#111111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ fontSize: '0.88rem', color: '#B3B3B3' }}>
            Total: <strong style={{ color: '#FFFFFF' }}>{totalCals} kcal</strong> (P: {totalProtein}g | C: {totalCarbs}g | F: {totalFats}g)
          </div>

          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #2A2A2A',
                color: '#B3B3B3',
                borderRadius: '10px',
                padding: '0.65rem 1.2rem',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(mealType, items);
                onClose();
              }}
              style={{
                background: '#FFD60A',
                color: '#090909',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 1.4rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Check size={16} />
              <span>Save Meal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealEditModal;
