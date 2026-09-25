const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/dashboard', authorize('STAFF', 'ADMIN', 'MANAGEMENT'), getDashboardMetrics);

module.exports = router;
