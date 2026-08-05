const openai = require('../config/openai');

/**
 * Generate AI Coach Chat Response via OpenAI Chat Completions API
 * @param {Object} params - User metrics and prompt
 * @returns {Promise<string>} AI Coach Response
 */
const generateAICoachResponse = async ({ systemContextPrompt, prompt }) => {
  if (!openai) {
    return null; // Signals fallback to internal engine if API Key is omitted
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemContextPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 600
    });

    if (completion.choices && completion.choices.length > 0) {
      return completion.choices[0].message.content.trim();
    }

    return null;
  } catch (error) {
    console.error('OpenAI API Execution Error:', error.message || error);
    // Throw error to trigger controller error handler
    throw error;
  }
};

/**
 * Generate Fitbod-style Structured Workout via OpenAI Chat Completions API
 * @param {Object} params - Muscle group, difficulty, duration
 * @returns {Promise<Object>} Structured Workout Routine
 */
const generateStructuredWorkout = async ({ muscleGroup, difficulty, duration }) => {
  if (!openai) {
    return null;
  }

  const systemPrompt = `You are an expert Strength & Biomechanics Coach. Generate a highly targeted workout split in JSON format with fields: "title", "targetGroup", "difficulty", "estimatedDurationMinutes", "estimatedCaloriesBurned", "exercises" (array of objects with "name", "sets", "reps", "rest", "equipment").`;

  const userPrompt = `Generate a ${difficulty || 'Intermediate'} level workout for ${muscleGroup || 'Full Body'} lasting approx ${duration || 45} minutes. Return valid JSON only.`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    if (completion.choices && completion.choices.length > 0) {
      const content = completion.choices[0].message.content.trim();
      return JSON.parse(content);
    }

    return null;
  } catch (error) {
    console.error('OpenAI Workout Generation Error:', error.message || error);
    return null;
  }
};

module.exports = {
  generateAICoachResponse,
  generateStructuredWorkout
};
