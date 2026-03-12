const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SCORING_MODEL = 'llama-3.3-70b-versatile';

/**
 * Score a single interview answer using Groq AI.
 * @param {string} question - The interview question
 * @param {string} answer - The candidate's transcribed answer
 * @returns {Object} { relevance, completeness, clarity, overall, improvementTip }
 */
const scoreAnswer = async (question, answer) => {
  const prompt = `Score this interview answer on three dimensions:
1. Relevance to the question (1-5)
2. Completeness — did it fully address the question (1-5)
3. Clarity of communication (1-5)
Provide one improvement tip in one sentence.

Question: ${question}
Answer: ${answer}

Return JSON only in this exact format:
{
  "relevance": <number>,
  "completeness": <number>,
  "clarity": <number>,
  "overall": <number>,
  "improvementTip": "<string>"
}`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          'You are an expert interview evaluator. Return only valid JSON, no markdown fences.',
      },
      { role: 'user', content: prompt },
    ],
    model: SCORING_MODEL,
    temperature: 0.3,
    max_tokens: 300,
    response_format: { type: 'json_object' },
  });

  const content = chatCompletion.choices[0]?.message?.content;
  return JSON.parse(content);
};

/**
 * Audit a list of interview questions for visual bias.
 * @param {string[]} questions - Array of question texts
 * @returns {Object[]} Array of { questionIndex, biasType, reason, suggestion }
 */
const auditQuestionsForBias = async (questions) => {
  const numberedQuestions = questions
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n');

  const prompt = `Analyze these interview questions for visual bias — any question that presupposes the candidate can see (charts, diagrams, visual metaphors, screen-based tasks).

Questions:
${numberedQuestions}

For each biased question, return a JSON array of objects:
{
  "flags": [
    {
      "questionIndex": <1-based number>,
      "biasType": "visual",
      "reason": "<why it's biased>",
      "suggestion": "<accessible alternative>"
    }
  ]
}

If no questions are biased, return: { "flags": [] }
Return JSON only.`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content:
          'You are an accessibility and inclusion expert. Return only valid JSON, no markdown fences.',
      },
      { role: 'user', content: prompt },
    ],
    model: SCORING_MODEL,
    temperature: 0.2,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  });

  const content = chatCompletion.choices[0]?.message?.content;
  const parsed = JSON.parse(content);
  return parsed.flags || [];
};

module.exports = { scoreAnswer, auditQuestionsForBias };
