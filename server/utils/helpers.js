/**
 * Format a score object into a human-readable spoken feedback string.
 * Used by the Chrome Extension to speak feedback via TTS.
 *
 * @param {Object} scores - { relevance, completeness, clarity, overall, improvementTip }
 * @returns {string} Spoken feedback text
 */
const formatSpokenFeedback = (scores) => {
  const { relevance, completeness, clarity, improvementTip } = scores;

  return (
    `Your answer scored ${relevance} out of 5 for relevance, ` +
    `${completeness} for completeness, and ${clarity} for clarity. ` +
    (improvementTip ? `Tip: ${improvementTip}` : '')
  );
};

/**
 * Format filler analysis into spoken feedback.
 *
 * @param {Object} fillerData - Result from fillerService.analyzeFillers()
 * @returns {string} Spoken feedback text
 */
const formatFillerFeedback = (fillerData) => {
  const { fillerCount, wpm, paceAssessment } = fillerData;

  let feedback = '';

  if (fillerCount > 0) {
    feedback += `${fillerCount} filler word${fillerCount > 1 ? 's' : ''} detected. `;
  } else {
    feedback += 'No filler words detected. Great job! ';
  }

  if (wpm > 0) {
    feedback += `Your pace was ${wpm} words per minute — ${paceAssessment}. `;

    if (paceAssessment.includes('fast')) {
      feedback += 'Try slowing down on your next answer.';
    } else if (paceAssessment.includes('slow')) {
      feedback += 'Try picking up the pace slightly.';
    }
  }

  return feedback.trim();
};

module.exports = { formatSpokenFeedback, formatFillerFeedback };
