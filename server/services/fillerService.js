/**
 * Filler words and phrases to detect in transcribed speech.
 */
const FILLER_WORDS = [
  'um', 'uh', 'like', 'basically', 'you know',
  'kind of', 'sort of', 'actually', 'literally',
  'right', 'so yeah', 'I mean',
];

/**
 * Analyze a transcript for filler words, pace (WPM), and pauses.
 * This runs as pure JS — no AI API call needed.
 *
 * @param {string} transcript - The transcribed answer text
 * @param {number} durationSeconds - Duration of the recording in seconds
 * @returns {Object} { fillerCount, fillersFound, wordCount, wpm, durationSeconds, paceAssessment }
 */
const analyzeFillers = (transcript, durationSeconds) => {
  const lowerTranscript = transcript.toLowerCase();
  const words = transcript.trim().split(/\s+/);
  const wordCount = words.length;

  // --- Filler word detection ---
  const fillersFound = [];
  let totalFillerCount = 0;

  for (const filler of FILLER_WORDS) {
    // Use regex with word boundaries for single-word fillers
    const regex = new RegExp(`\\b${escapeRegex(filler)}\\b`, 'gi');
    const matches = lowerTranscript.match(regex);
    const count = matches ? matches.length : 0;

    if (count > 0) {
      fillersFound.push({ word: filler, count });
      totalFillerCount += count;
    }
  }

  // --- Pace analysis (words per minute) ---
  const wpm =
    durationSeconds > 0
      ? Math.round((wordCount / durationSeconds) * 60)
      : 0;

  // Ideal interview pace: 120–150 WPM
  let paceAssessment = 'normal';
  if (wpm > 0 && wpm < 100) paceAssessment = 'too slow';
  else if (wpm >= 100 && wpm < 120) paceAssessment = 'slightly slow';
  else if (wpm >= 120 && wpm <= 150) paceAssessment = 'ideal';
  else if (wpm > 150 && wpm <= 180) paceAssessment = 'slightly fast';
  else if (wpm > 180) paceAssessment = 'too fast';

  return {
    fillerCount: totalFillerCount,
    fillersFound,
    wordCount,
    durationSeconds,
    wpm,
    paceAssessment,
  };
};

/**
 * Escape special regex characters in a string.
 */
const escapeRegex = (string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { analyzeFillers, FILLER_WORDS };
