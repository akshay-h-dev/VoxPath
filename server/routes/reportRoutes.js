const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  generateReport,
  getReportBySession,
} = require('../controllers/reportController');

router.post('/', protect, generateReport);
router.get('/:sessionId', protect, getReportBySession);

module.exports = router;
