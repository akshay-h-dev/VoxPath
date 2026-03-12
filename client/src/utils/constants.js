/** API base URL — proxied through Vite in development */
export const API_URL = import.meta.env.VITE_API_URL || '';

/** Filler words list (mirrors the backend list) */
export const FILLER_WORDS = [
  'um', 'uh', 'like', 'basically', 'you know',
  'kind of', 'sort of', 'actually', 'literally',
  'right', 'so yeah', 'I mean',
];

/** Voice commands recognized by VoxPath */
export const VOICE_COMMANDS = {
  BEGIN: 'begin interview',
  NEXT: 'next question',
  REPEAT: 'repeat question',
  SUBMIT: 'submit answer',
  GO_BACK: 'go back',
  END: 'end interview',
  HELP: 'help',
};

/** Ideal speech pace range (words per minute) */
export const PACE = {
  MIN_IDEAL: 120,
  MAX_IDEAL: 150,
};

/** Score thresholds for color coding */
export const SCORE_LEVELS = {
  HIGH: 4,   // 4-5: green
  MEDIUM: 3, // 3: yellow
  // 1-2: red
};
