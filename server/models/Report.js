const mongoose = require('mongoose');

const biasFlagSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  questionText: { type: String, required: true },
  biasType: { type: String, default: 'visual' },
  reason: { type: String, default: '' },
  suggestion: { type: String, default: '' },
});

const reportSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    candidateSummary: {
      overallScore: { type: Number, default: null },
      strongestAnswer: { questionIndex: Number, score: Number },
      weakestAnswer: { questionIndex: Number, score: Number },
      topImprovementArea: { type: String, default: '' },
    },
    communicationAnalysis: {
      avgWpm: { type: Number, default: 0 },
      totalFillers: { type: Number, default: 0 },
      paceAssessment: { type: String, default: '' },
    },
    biasFlags: [biasFlagSchema],
    accommodationSuggestions: [{ type: String }],
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
