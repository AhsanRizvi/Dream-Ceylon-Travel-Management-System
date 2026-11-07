const express = require('express');
const {
  getHolidaysList,
  getCalendarMonth
} = require('../controllers/calendarController');

const router = express.Router();

router.get('/holidays', getHolidaysList);
router.get('/:year/:month', getCalendarMonth);

module.exports = router;

