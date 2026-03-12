const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createSession,
  getSessionById,
  updateSession,
  getAllSessions,
} = require('../controllers/sessionController');

router.get('/', protect, getAllSessions);
router.post('/', protect, createSession);
router.get('/:id', protect, getSessionById);
router.put('/:id', protect, updateSession);

module.exports = router;
