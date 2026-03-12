const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  scoreAnswerHandler,
  analyzeFillerHandler,
} = require('../controllers/scoreController');

router.post('/', protect, scoreAnswerHandler);
router.post('/filler', protect, analyzeFillerHandler);

module.exports = router;
