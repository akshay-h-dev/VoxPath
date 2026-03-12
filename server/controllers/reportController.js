const Session = require('../models/Session');
const Report = require('../models/Report');
const { runBiasAudit } = require('../services/biasAuditService');

/**
 * @route   POST /api/reports
 * @desc    Generate a bias-free evaluation report for a session
 */
const generateReport = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: '"sessionId" is required',
      });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: 'Session not found' });
    }

    // --- Candidate performance summary ---
    const answeredQuestions = session.answers.filter(
      (a) => a.scores.overall !== null
    );

    let strongestAnswer = null;
    let weakestAnswer = null;
    let overallScore = null;

    if (answeredQuestions.length > 0) {
      const sorted = [...answeredQuestions].sort(
        (a, b) => b.scores.overall - a.scores.overall
      );
      strongestAnswer = {
        questionIndex: sorted[0].questionIndex,
        score: sorted[0].scores.overall,
      };
      weakestAnswer = {
        questionIndex: sorted[sorted.length - 1].questionIndex,
        score: sorted[sorted.length - 1].scores.overall,
      };

      const totalScores = answeredQuestions.reduce(
        (sum, a) => sum + a.scores.overall,
        0
      );
      overallScore =
        Math.round((totalScores / answeredQuestions.length) * 10) / 10;
    }

    // --- Communication analysis ---
    const allFillerCounts = session.answers.map(
      (a) => a.fillerStats?.fillerCount || 0
    );
    const totalFillers = allFillerCounts.reduce((sum, c) => sum + c, 0);

    const allWpm = session.answers
      .map((a) => a.fillerStats?.wpm || 0)
      .filter((w) => w > 0);
    const avgWpm =
      allWpm.length > 0
        ? Math.round(allWpm.reduce((s, w) => s + w, 0) / allWpm.length)
        : 0;

    let paceAssessment = 'normal';
    if (avgWpm < 120) paceAssessment = 'below ideal pace';
    else if (avgWpm <= 150) paceAssessment = 'ideal pace';
    else paceAssessment = 'above ideal pace';

    // Determine top improvement area
    const avgScores = {
      relevance: 0,
      completeness: 0,
      clarity: 0,
    };
    if (answeredQuestions.length > 0) {
      for (const a of answeredQuestions) {
        avgScores.relevance += a.scores.relevance || 0;
        avgScores.completeness += a.scores.completeness || 0;
        avgScores.clarity += a.scores.clarity || 0;
      }
      avgScores.relevance /= answeredQuestions.length;
      avgScores.completeness /= answeredQuestions.length;
      avgScores.clarity /= answeredQuestions.length;
    }

    const lowestDimension = Object.entries(avgScores).sort(
      (a, b) => a[1] - b[1]
    )[0];
    const topImprovementArea = lowestDimension
      ? lowestDimension[0].charAt(0).toUpperCase() +
        lowestDimension[0].slice(1)
      : '';

    // --- Bias audit ---
    const { biasFlags, accommodationSuggestions } =
      await runBiasAudit(session);

    // --- Create report ---
    const report = await Report.create({
      session: session._id,
      candidateSummary: {
        overallScore,
        strongestAnswer,
        weakestAnswer,
        topImprovementArea,
      },
      communicationAnalysis: {
        avgWpm,
        totalFillers,
        paceAssessment,
      },
      biasFlags,
      accommodationSuggestions,
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/reports/:sessionId
 * @desc    Get report for a specific session
 */
const getReportBySession = async (req, res, next) => {
  try {
    const report = await Report.findOne({
      session: req.params.sessionId,
    }).populate('session');

    if (!report) {
      return res
        .status(404)
        .json({ success: false, error: 'Report not found for this session' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateReport, getReportBySession };
