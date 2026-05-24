const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { submitReport } = require('../controllers/reportController');

router.post('/', authMiddleware, submitReport);

module.exports = router;
