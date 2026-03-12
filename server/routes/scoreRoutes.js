const express = require('express');
const router = express.Router();
const {
  scoreAnswerHandler,
  analyzeFillerHandler,
} = require('../controllers/scoreController');

router.post('/', scoreAnswerHandler);
router.post('/filler', analyzeFillerHandler);

module.exports = router;
