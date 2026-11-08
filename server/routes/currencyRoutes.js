const express = require('express');
const {
  getSupportedCurrencies,
  getRates,
  convertCurrency,
  updatePreferredCurrency
} = require('../controllers/currencyController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/supported', getSupportedCurrencies);
router.get('/rates', getRates);
router.get('/convert', convertCurrency);
router.post('/convert', convertCurrency);
router.put('/preference', protect, updatePreferredCurrency);

module.exports = router;

