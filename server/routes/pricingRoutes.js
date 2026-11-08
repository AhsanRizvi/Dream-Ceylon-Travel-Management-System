const express = require('express');
const {
  calculatePricing,
  getPricingRules,
  getTourPlanPricing
} = require('../controllers/pricingController');

const router = express.Router();

router.post('/calculate', calculatePricing);
router.get('/rules', getPricingRules);
router.get('/:tourPlanId', getTourPlanPricing);

module.exports = router;

