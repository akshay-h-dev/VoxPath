const { scoreAnswer } = require('../services/groqService');
const { analyzeFillers } = require('../services/fillerService');

/**
 * @route   POST /api/score
 * @desc    Score a single answer using Groq AI
 */
const scoreAnswerHandler = async (req, res, next) => {
  try {
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        error: 'Both "question" and "answer" are required',
      });
    }

    const scores = await scoreAnswer(question, answer);

    res.json({ success: true, data: scores });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/score/filler
 * @desc    Analyze filler words and speech pace
 */
const analyzeFillerHandler = async (req, res, next) => {
  try {
    const { transcript, durationSeconds } = req.body;

    if (!transcript) {
      return res.status(400).json({
        success: false,
        error: '"transcript" is required',
      });
    }

    const analysis = analyzeFillers(transcript, durationSeconds || 0);

    res.json({ success: true, data: analysis });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scoreAnswerHandler,
  analyzeFillerHandler,
};
