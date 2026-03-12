const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessionById,
  updateSession,
  getAllSessions,
} = require('../controllers/sessionController');

router.get('/', getAllSessions);
router.post('/', createSession);
router.get('/:id', getSessionById);
router.put('/:id', updateSession);

module.exports = router;
