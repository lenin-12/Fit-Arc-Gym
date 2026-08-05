const OpenAI = require('openai');

const apiKey = process.env.OPENAI_API_KEY || '';

let openai = null;

if (apiKey && apiKey.trim() !== '') {
  openai = new OpenAI({
    apiKey: apiKey.trim()
  });
} else {
  console.warn('OPENAI_API_KEY environment variable is not set. OpenAI API will run with fallback generator.');
}

module.exports = openai;
