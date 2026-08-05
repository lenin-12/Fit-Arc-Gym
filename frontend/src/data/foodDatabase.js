// Curated Food Database supporting South Indian, North Indian, Continental, and Mediterranean cuisines

export const FOOD_DATABASE = [
  // SOUTH INDIAN
  { id: 'si_v1', name: 'Steamed Idli with Sambar & Chutney', category: 'Veg', cuisine: 'South Indian', servingUnit: '3 idlis (150g)', calories: 210, protein: 8, carbs: 42, fats: 2 },
  { id: 'si_v2', name: 'Plain Dosa with Sambar', category: 'Veg', cuisine: 'South Indian', servingUnit: '1 medium (120g)', calories: 240, protein: 6, carbs: 38, fats: 7 },
  { id: 'si_v3', name: 'Curd Rice with Pomegranate', category: 'Veg', cuisine: 'South Indian', servingUnit: '1 bowl (200g)', calories: 220, protein: 7, carbs: 36, fats: 5 },
  { id: 'si_v4', name: 'Paneer / Soya Chuka Curry', category: 'Veg', cuisine: 'South Indian', servingUnit: '150g', calories: 230, protein: 18, carbs: 12, fats: 12 },
  { id: 'si_nv1', name: 'Egg Dosa / Egg Appam', category: 'Non-Veg', cuisine: 'South Indian', servingUnit: '2 pieces', calories: 280, protein: 16, carbs: 32, fats: 9 },
  { id: 'si_nv2', name: 'Chettinad Chicken Curry & Rice', category: 'Non-Veg', cuisine: 'South Indian', servingUnit: '200g + 1 cup rice', calories: 420, protein: 38, carbs: 45, fats: 10 },
  { id: 'si_nv3', name: 'South Indian Fish Curry & Red Rice', category: 'Non-Veg', cuisine: 'South Indian', servingUnit: '180g + 1 cup rice', calories: 380, protein: 32, carbs: 42, fats: 8 },

  // NORTH INDIAN
  { id: 'v1', name: 'Oats with Almond Milk & Chia', category: 'Veg', cuisine: 'North Indian', servingUnit: '1 bowl (80g)', calories: 320, protein: 12, carbs: 54, fats: 7 },
  { id: 'v2', name: 'Paneer Tikka / Bhurji', category: 'Veg', cuisine: 'North Indian', servingUnit: '150g', calories: 280, protein: 20, carbs: 6, fats: 18 },
  { id: 'v3', name: 'Dal Tadka with Whole Wheat Roti', category: 'Veg', cuisine: 'North Indian', servingUnit: '1 bowl dal + 2 rotis', calories: 340, protein: 14, carbs: 54, fats: 6 },
  { id: 'v6', name: 'Soya Chunk Masala', category: 'Veg', cuisine: 'North Indian', servingUnit: '150g', calories: 210, protein: 28, carbs: 16, fats: 4 },
  { id: 'nv1', name: 'Egg White Omelette with Roti', category: 'Non-Veg', cuisine: 'North Indian', servingUnit: '4 whites + 2 rotis', calories: 220, protein: 20, carbs: 32, fats: 2 },
  { id: 'nv3', name: 'Tandoori Grilled Chicken Breast', category: 'Non-Veg', cuisine: 'North Indian', servingUnit: '180g', calories: 280, protein: 48, carbs: 2, fats: 8 },

  // CONTINENTAL
  { id: 'co_v1', name: 'Avocado Toast on Sourdough', category: 'Veg', cuisine: 'Continental', servingUnit: '2 slices', calories: 310, protein: 9, carbs: 38, fats: 14 },
  { id: 'co_v2', name: 'Quinoa & Grilled Tofu Salad', category: 'Veg', cuisine: 'Continental', servingUnit: '250g', calories: 290, protein: 19, carbs: 34, fats: 9 },
  { id: 'co_nv1', name: 'Pan-Seared Salmon & Asparagus', category: 'Non-Veg', cuisine: 'Continental', servingUnit: '180g salmon + veggies', calories: 340, protein: 36, carbs: 6, fats: 18 },
  { id: 'co_nv2', name: 'Grilled Chicken Caesar Bowl', category: 'Non-Veg', cuisine: 'Continental', servingUnit: '250g', calories: 360, protein: 42, carbs: 12, fats: 14 },

  // MEDITERRANEAN
  { id: 'me_v1', name: 'Hummus & Whole Wheat Pita with Falafel', category: 'Veg', cuisine: 'Mediterranean', servingUnit: '1 pita + 3 falafels', calories: 340, protein: 14, carbs: 48, fats: 11 },
  { id: 'me_v2', name: 'Greek Salad with Feta & Olives', category: 'Veg', cuisine: 'Mediterranean', servingUnit: '200g', calories: 210, protein: 8, carbs: 12, fats: 15 },
  { id: 'me_nv1', name: 'Mediterranean Lemon Chicken & Rice', category: 'Non-Veg', cuisine: 'Mediterranean', servingUnit: '200g chicken + rice', calories: 390, protein: 40, carbs: 38, fats: 9 }
];

/**
 * AI Natural Language Meal Analysis Function
 * Detects individual food items, estimated portion weights, total nutrition,
 * and triggers conversational clarification if a staple side (rice/roti) is ambiguous.
 */
export function analyzeNaturalMealInput(input) {
  if (!input || !input.trim()) {
    return {
      name: 'Custom Meal',
      detectedFoods: ['Mixed Meal ×1'],
      estimatedPortions: [{ item: 'Mixed Meal', weight: '250 g' }],
      calories: 350,
      protein: 20,
      carbs: 40,
      fats: 10,
      needsClarification: false
    };
  }

  const str = input.toLowerCase().trim();

  // Check for ambiguous standalone curries without staple carbs
  const isCurryOnly = (str.includes('curry') || str.includes('dal') || str.includes('masala')) &&
                      !str.includes('rice') && !str.includes('roti') && !str.includes('chapati') &&
                      !str.includes('bread') && !str.includes('naan') && !str.includes('dosa') && !str.includes('idli');

  if (isCurryOnly && !str.includes('only') && !str.includes('just')) {
    const dishName = str.includes('chicken') ? 'Chicken Curry' : str.includes('paneer') ? 'Paneer Curry' : 'Curry Dish';
    return {
      needsClarification: true,
      clarificationMessage: `I detected ${dishName}. Did you also eat rice or roti with this?`,
      dishName
    };
  }

  let totalCals = 0;
  let totalP = 0;
  let totalC = 0;
  let totalF = 0;

  const detectedFoods = [];
  const estimatedPortions = [];

  // Split multi-item meals by "and", ",", "&", or "+"
  const items = str.split(/\s*(?:and|,|&|\+)\s*/);

  items.forEach((item) => {
    const matchNum = item.match(/(\d+(\.\d+)?)/);
    const qty = matchNum ? parseFloat(matchNum[1]) : 1;

    let foodItem = 'Custom Food';
    let base = { calories: 250, protein: 15, carbs: 30, fats: 8, unitWeight: 150 };

    if (item.includes('egg')) {
      foodItem = 'Eggs';
      base = { calories: 75, protein: 6.5, carbs: 0.6, fats: 5, unitWeight: 50 };
    } else if (item.includes('roti') || item.includes('chapati')) {
      foodItem = 'Wheat Rotis';
      base = { calories: 70, protein: 2.5, carbs: 14, fats: 1, unitWeight: 60 };
    } else if (item.includes('biryani')) {
      foodItem = 'Chicken Biryani';
      base = { calories: 550, protein: 32, carbs: 65, fats: 18, unitWeight: 350 };
    } else if (item.includes('chicken')) {
      foodItem = 'Chicken Breast / Curry';
      base = { calories: 240, protein: 35, carbs: 2, fats: 9, unitWeight: 180 };
    } else if (item.includes('paneer')) {
      foodItem = 'Paneer Curry';
      base = { calories: 280, protein: 18, carbs: 5, fats: 20, unitWeight: 180 };
    } else if (item.includes('rice')) {
      foodItem = 'Steamed Rice';
      base = { calories: 200, protein: 4, carbs: 44, fats: 1, unitWeight: 150 };
    } else if (item.includes('dal')) {
      foodItem = 'Lentil Dal';
      base = { calories: 150, protein: 9, carbs: 24, fats: 3, unitWeight: 180 };
    } else if (item.includes('oats')) {
      foodItem = 'Oats';
      base = { calories: 190, protein: 7, carbs: 32, fats: 3.5, unitWeight: 80 };
    } else if (item.includes('milk')) {
      foodItem = 'Whole Milk';
      base = { calories: 120, protein: 6, carbs: 9, fats: 5, unitWeight: 200 };
    } else if (item.includes('dosa')) {
      foodItem = 'Plain Dosa';
      base = { calories: 180, protein: 4, carbs: 29, fats: 5, unitWeight: 120 };
    } else if (item.includes('idli')) {
      foodItem = 'Steamed Idlis';
      base = { calories: 70, protein: 2.5, carbs: 14, fats: 0.5, unitWeight: 50 };
    } else if (item.includes('banana')) {
      foodItem = 'Bananas';
      base = { calories: 105, protein: 1.3, carbs: 27, fats: 0.3, unitWeight: 110 };
    } else if (item.includes('apple')) {
      foodItem = 'Apples';
      base = { calories: 95, protein: 0.5, carbs: 25, fats: 0.3, unitWeight: 150 };
    } else if (item.includes('shake') || item.includes('protein')) {
      foodItem = 'Whey Protein Shake';
      base = { calories: 140, protein: 25, carbs: 4, fats: 2, unitWeight: 250 };
    }

    const mult = matchNum ? qty : 1;
    totalCals += base.calories * mult;
    totalP += base.protein * mult;
    totalC += base.carbs * mult;
    totalF += base.fats * mult;

    detectedFoods.push(`${foodItem} ${mult > 1 ? '×' + mult : '×1'}`);
    estimatedPortions.push({
      item: foodItem,
      weight: `${Math.round(base.unitWeight * mult)} g`
    });
  });

  return {
    name: input.charAt(0).toUpperCase() + input.slice(1),
    detectedFoods,
    estimatedPortions,
    calories: Math.round(totalCals),
    protein: Math.round(totalP * 10) / 10,
    carbs: Math.round(totalC * 10) / 10,
    fats: Math.round(totalF * 10) / 10,
    needsClarification: false
  };
}

export function estimateCustomNutrition(input) {
  return analyzeNaturalMealInput(input);
}

/**
 * Generator function to auto-generate AI Suggested Meals (Planned Diet)
 */
export const generateDefaultMeals = (targets, preference = 'Non-Veg', cuisine = 'North Indian') => {
  const isVeg = preference === 'Veg';

  if (cuisine === 'South Indian') {
    if (isVeg) {
      return [
        { mealType: 'Breakfast', items: [{ name: 'Steamed Idli with Sambar & Chutney', quantity: 1, calories: 210, protein: 8, carbs: 42, fats: 2 }] },
        { mealType: 'Lunch', items: [{ name: 'Curd Rice & Paneer Chuka', quantity: 1, calories: 450, protein: 25, carbs: 48, fats: 19 }] },
        { mealType: 'Dinner', items: [{ name: 'Plain Dosa with Sambar', quantity: 1, calories: 240, protein: 6, carbs: 38, fats: 7 }] },
        { mealType: 'Snack', items: [{ name: 'Roasted Chana & Filter Coffee', quantity: 1, calories: 150, protein: 7, carbs: 22, fats: 3 }] }
      ];
    }
    return [
      { mealType: 'Breakfast', items: [{ name: 'Egg Dosa / Egg Appam', quantity: 1, calories: 280, protein: 16, carbs: 32, fats: 9 }] },
      { mealType: 'Lunch', items: [{ name: 'Chettinad Chicken Curry & Rice', quantity: 1, calories: 420, protein: 38, carbs: 45, fats: 10 }] },
      { mealType: 'Dinner', items: [{ name: 'South Indian Fish Curry & Red Rice', quantity: 1, calories: 380, protein: 32, carbs: 42, fats: 8 }] },
      { mealType: 'Snack', items: [{ name: 'Whey Shake & Roasted Almonds', quantity: 1, calories: 180, protein: 26, carbs: 4, fats: 6 }] }
    ];
  }

  if (isVeg) {
    return [
      { mealType: 'Breakfast', items: [{ name: 'Oats with Almond Milk & Chia', quantity: 1, calories: 320, protein: 12, carbs: 54, fats: 7 }] },
      { mealType: 'Lunch', items: [{ name: 'Dal Tadka with Whole Wheat Roti & Paneer', quantity: 1, calories: 480, protein: 24, carbs: 57, fats: 15 }] },
      { mealType: 'Dinner', items: [{ name: 'Soya Chunk Masala with Brown Rice', quantity: 1, calories: 380, protein: 32, carbs: 48, fats: 6 }] },
      { mealType: 'Snack', items: [{ name: 'Mixed Roasted Nuts', quantity: 1, calories: 160, protein: 6, carbs: 6, fats: 14 }] }
    ];
  }

  return [
    { mealType: 'Breakfast', items: [{ name: 'Egg White Omelette with Roti', quantity: 1, calories: 220, protein: 20, carbs: 32, fats: 2 }] },
    { mealType: 'Lunch', items: [{ name: 'Tandoori Grilled Chicken Breast with Rice', quantity: 1, calories: 498, protein: 53, carbs: 48, fats: 10 }] },
    { mealType: 'Dinner', items: [{ name: 'Salmon Steak & Quinoa', quantity: 1, calories: 380, protein: 38, carbs: 32, fats: 12 }] },
    { mealType: 'Snack', items: [{ name: 'Whey Protein Isolate', quantity: 1, calories: 120, protein: 25, carbs: 2, fats: 1 }] }
  ];
};
