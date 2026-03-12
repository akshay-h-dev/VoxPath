const Session = require('../models/Session');

/**
 * @route   POST /api/sessions
 * @desc    Create a new interview session
 */
const createSession = async (req, res, next) => {
  try {
    const { portalName, portalUrl, questions } = req.body;

    const session = await Session.create({
      portalName,
      portalUrl,
      questions: questions || [],
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/sessions/:id
 * @desc    Get a session by ID
 */
const getSessionById = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: 'Session not found' });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/sessions/:id
 * @desc    Update a session (add/update an answer)
 */
const updateSession = async (req, res, next) => {
  try {
    const { answer, status } = req.body;
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res
        .status(404)
        .json({ success: false, error: 'Session not found' });
    }

    // Add a new answer to the session
    if (answer) {
      session.answers.push(answer);
    }

    // Update session status (e.g., 'completed')
    if (status) {
      session.status = status;
      if (status === 'completed') {
        session.completedAt = new Date();
      }
    }

    await session.save();
    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/sessions
 * @desc    Get all sessions (most recent first)
 */
const getAllSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find()
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  getSessionById,
  updateSession,
  getAllSessions,
};
