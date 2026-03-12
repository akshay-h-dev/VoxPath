const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  questionText: { type: String, required: true },
  answerText: { type: String, default: '' },
  scores: {
    relevance: { type: Number, min: 1, max: 5, default: null },
    completeness: { type: Number, min: 1, max: 5, default: null },
    clarity: { type: Number, min: 1, max: 5, default: null },
    overall: { type: Number, min: 1, max: 5, default: null },
  },
  improvementTip: { type: String, default: '' },
  fillerStats: {
    fillerCount: { type: Number, default: 0 },
    fillersFound: [{ word: String, count: Number }],
    wordCount: { type: Number, default: 0 },
    durationSeconds: { type: Number, default: 0 },
    wpm: { type: Number, default: 0 },
    pauseCount: { type: Number, default: 0 },
  },
  answeredAt: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema(
  {
    portalName: { type: String, default: 'Unknown Portal' },
    portalUrl: { type: String, default: '' },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
    },
    questions: [{ type: String }],
    answers: [answerSchema],
    totalScore: { type: Number, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Virtual: average score across all answers
sessionSchema.virtual('averageScore').get(function () {
  if (!this.answers || this.answers.length === 0) return null;
  const scored = this.answers.filter((a) => a.scores.overall !== null);
  if (scored.length === 0) return null;
  const sum = scored.reduce((acc, a) => acc + a.scores.overall, 0);
  return Math.round((sum / scored.length) * 10) / 10;
});

sessionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Session', sessionSchema);
