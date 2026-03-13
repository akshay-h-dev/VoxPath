const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveUserData, getUserData } = require('../controllers/userDataController');

// Store JSON payload for the authenticated user
router.post('/', protect, saveUserData);

// Fetch JSON payload for the authenticated user
router.get('/', protect, getUserData);

module.exports = router;

