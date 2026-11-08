
const express = require('express');

const {
  savePreferences,
  getPreferences,
  generateRecommendations,
  getRecommendations,
  getRecommendationById,
  createPlan,
  getMyPlans
} = require('../controllers/plannerController');

const {
  protect,
  authorize
} = require('../middlewares/authMiddleware');

const router = express.Router();

// Protect all planner routes
router.use(protect);

// Allow only tourists and admins
router.use(authorize('tourist', 'admin'));


// Tourist preferences
router
  .route('/preferences')
  .get(getPreferences)
  .post(savePreferences);


// Destination recommendations
router
  .route('/recommendations')
  .get(getRecommendations)
  .post(generateRecommendations);


// Specific recommendation details
router.get('/recommendations/:id', getRecommendationById);


// Saved tour plans
router.get('/plans', getMyPlans);


// Create a new tour plan
router.post('/plan', createPlan);


module.exports = router;
