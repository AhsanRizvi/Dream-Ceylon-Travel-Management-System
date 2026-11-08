const express = require('express');
const { getRecommendations, createPlan, getMyPlans } = require('../controllers/plannerController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('tourist', 'admin'));

router.get('/recommendations', getRecommendations);
router.get('/plans', getMyPlans);
router.post('/plan', createPlan);

module.exports = router;
