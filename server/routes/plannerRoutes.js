const express = require('express');
const {
  savePreferences,
  getPreferences,
  generateRecommendations,
  getRecommendations,
  getRecommendationById,
  createPlan
} = require('../controllers/plannerController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('tourist', 'admin'));

router
  .route('/preferences')
  .get(getPreferences)
  .post(savePreferences);

router
  .route('/recommendations')
  .get(getRecommendations)
  .post(generateRecommendations);

router.get('/recommendations/:id', getRecommendationById);
router.post('/plan', createPlan);

module.exports = router;
