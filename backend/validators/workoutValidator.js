const validateUpdateExercise = (body) => {
  const errors = [];
  const { exerciseId, completed } = body;

  if (exerciseId === undefined || exerciseId === null || String(exerciseId).trim() === '') {
    errors.push('exerciseId is required');
  }

  if (completed === undefined || completed === null || typeof completed !== 'boolean') {
    errors.push('completed must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateUpdateExercise
};
