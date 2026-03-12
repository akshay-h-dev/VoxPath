const { auditQuestionsForBias } = require('./groqService');

/**
 * Run a full bias audit on a completed session.
 * @param {Object} session - Mongoose Session document
 * @returns {Object} { biasFlags, accommodationSuggestions }
 */
const runBiasAudit = async (session) => {
  const questions = session.questions || [];

  if (questions.length === 0) {
    return { biasFlags: [], accommodationSuggestions: [] };
  }

  // Get bias flags from Groq
  const flags = await auditQuestionsForBias(questions);

  // Map flags to include the full question text
  const biasFlags = flags.map((flag) => ({
    questionIndex: flag.questionIndex - 1, // Convert to 0-based
    questionText: questions[flag.questionIndex - 1] || '',
    biasType: flag.biasType || 'visual',
    reason: flag.reason || '',
    suggestion: flag.suggestion || '',
  }));

  // Generate accommodation suggestions based on flags
  const accommodationSuggestions = generateAccommodations(biasFlags);

  return { biasFlags, accommodationSuggestions };
};

/**
 * Generate accommodation suggestions based on detected biases.
 */
const generateAccommodations = (biasFlags) => {
  const suggestions = [
    'Ensure all questions can be answered without visual reference materials.',
    'Provide text descriptions for any visual content referenced in questions.',
    'Allow candidates to use screen readers throughout the interview.',
  ];

  if (biasFlags.length > 0) {
    suggestions.push(
      `${biasFlags.length} question(s) were flagged for visual bias — consider revising them for future interviews.`
    );
  }

  return suggestions;
};

module.exports = { runBiasAudit };
