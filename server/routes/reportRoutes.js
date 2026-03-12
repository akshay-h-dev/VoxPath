const express = require('express');
const router = express.Router();
const {
  generateReport,
  getReportBySession,
} = require('../controllers/reportController');

router.post('/', generateReport);
router.get('/:sessionId', getReportBySession);

module.exports = router;
