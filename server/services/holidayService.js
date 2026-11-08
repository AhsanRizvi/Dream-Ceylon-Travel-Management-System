const Holiday = require('../models/Holiday');

/**
 * Official Sri Lankan Public, Bank & Full Moon Poya Holidays (2025 - 2027)
 * Source: Sri Lanka Ministry of Public Administration / Official Calendar
 */
const OFFICIAL_SL_HOLIDAYS = [
  // === 2025 ===
  { date: '2025-01-13', name: 'Duruthu Full Moon Poya Day', year: 2025, type: 'Poya Holiday', isPoya: true, description: 'Buddhist Poya holiday commemorating the Buddha’s first visit to Sri Lanka (Kelaniya).' },
  { date: '2025-01-14', name: 'Tamil Thai Pongal Day', year: 2025, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Traditional Tamil harvest festival celebrated across Sri Lanka.' },
  { date: '2025-02-04', name: 'National Independence Day', year: 2025, type: 'National Holiday', isMercantile: true, description: 'Celebrates Sri Lanka’s independence achieved on February 4, 1948.' },
  { date: '2025-02-12', name: 'Navam Full Moon Poya Day', year: 2025, type: 'Poya Holiday', isPoya: true, description: 'Celebrated with the grand Gangaramaya Navam Perahera in Colombo.' },
  { date: '2025-02-26', name: 'Mahasivarathri Day', year: 2025, type: 'Public Holiday', description: 'Hindu festival celebrated in honor of Lord Shiva at kovils island-wide.' },
  { date: '2025-03-13', name: 'Medin Full Moon Poya Day', year: 2025, type: 'Poya Holiday', isPoya: true, description: 'Commemorates the Buddha’s visit to his father King Suddhodana.' },
  { date: '2025-03-31', name: 'Id-Ul-Fitr (Ramazan Festival Day)', year: 2025, type: 'Public Holiday', description: 'Marks the end of the holy fasting month of Ramadan.' },
  { date: '2025-04-12', name: 'Bak Full Moon Poya Day', year: 2025, type: 'Poya Holiday', isPoya: true, description: 'Commemorates the Buddha’s second visit to Sri Lanka (Nagadipa).' },
  { date: '2025-04-13', name: 'Day Prior to Sinhala & Tamil New Year', year: 2025, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Parana Avurudu — traditional preparation and auspicious transition period.' },
  { date: '2025-04-14', name: 'Sinhala & Tamil New Year Day', year: 2025, type: 'National & Mercantile Holiday', isMercantile: true, description: 'Aluth Avurudu / Puthandu — major cultural New Year celebrated nationwide.' },
  { date: '2025-04-18', name: 'Good Friday', year: 2025, type: 'Public Holiday', description: 'Christian observance commemorating the crucifixion of Jesus Christ.' },
  { date: '2025-05-01', name: 'International Workers’ Day (May Day)', year: 2025, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'International Labour Day public and mercantile holiday.' },
  { date: '2025-05-12', name: 'Vesak Full Moon Poya Day', year: 2025, type: 'Poya & Mercantile Holiday', isPoya: true, isMercantile: true, description: 'Sacred Buddhist festival commemorating the Birth, Enlightenment, and Passing of the Buddha.' },
  { date: '2025-05-13', name: 'Day Following Vesak Full Moon Poya Day', year: 2025, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Second day of Vesak celebrations featuring pandals (thorana) and dansalas across Sri Lanka.' },
  { date: '2025-06-07', name: 'Id-Ul-Alha (Hadji Festival Day)', year: 2025, type: 'Public Holiday', description: 'Islamic festival of sacrifice celebrated across Sri Lanka.' },
  { date: '2025-06-10', name: 'Poson Full Moon Poya Day', year: 2025, type: 'Poya Holiday', isPoya: true, description: 'Celebrates the introduction of Buddhism to Sri Lanka by Arahat Mahinda at Mihintale.' },
  { date: '2025-07-10', name: 'Esala Full Moon Poya Day', year: 2025, type: 'Poya Holiday', isPoya: true, description: 'Marks the start of the sacred Kandy Esala Perahera festival season.' },
  { date: '2025-08-08', name: 'Nikini Full Moon Poya Day', year: 2025, type: 'Poya Holiday', isPoya: true, description: 'Commemorates the First Buddhist Council and the Kandy Esala Perahera culmination.' },
  { date: '2025-09-05', name: 'Milad-Un-Nabi (Holy Prophet’s Birthday)', year: 2025, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Commemorates the birth of Prophet Muhammad.' },
  { date: '2025-09-07', name: 'Binara Full Moon Poya Day', year: 2025, type: 'Poya Holiday', isPoya: true, description: 'Commemorates the establishment of the Buddhist Bhikkhuni Sangha.' },
  { date: '2025-10-06', name: 'Vap Full Moon Poya Day', year: 2025, type: 'Poya Holiday', isPoya: true, description: 'Marks the end of the Buddhist Vassa (rainy retreat) season.' },
  { date: '2025-10-20', name: 'Deepavali Festival Day', year: 2025, type: 'Public Holiday', description: 'Hindu Festival of Lights celebrated with oil lamps and sweets.' },
  { date: '2025-11-05', name: 'Il Full Moon Poya Day', year: 2025, type: 'Poya Holiday', isPoya: true, description: 'Commemorates the dispatch of the first sixty Buddhist missionaries.' },
  { date: '2025-12-04', name: 'Unduvap Full Moon Poya Day', year: 2025, type: 'Poya Holiday', isPoya: true, description: 'Celebrates Sanghamitta Theri bringing the Sacred Jaya Sri Maha Bodhi sapling to Anuradhapura.' },
  { date: '2025-12-25', name: 'Christmas Day', year: 2025, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Christian celebration of the birth of Jesus Christ.' },

  // === 2026 ===
  { date: '2026-01-03', name: 'Duruthu Full Moon Poya Day', year: 2026, type: 'Poya Holiday', isPoya: true, description: 'Buddhist Poya holiday commemorating the Buddha’s first visit to Sri Lanka (Kelaniya).' },
  { date: '2026-01-15', name: 'Tamil Thai Pongal Day', year: 2026, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Traditional Tamil harvest festival thanking the Sun God for agricultural abundance.' },
  { date: '2026-02-01', name: 'Navam Full Moon Poya Day', year: 2026, type: 'Poya Holiday', isPoya: true, description: 'Celebrated with the colourful Navam Perahera procession in Colombo.' },
  { date: '2026-02-04', name: 'National Independence Day', year: 2026, type: 'National Holiday', isMercantile: true, description: '78th National Independence Day of Sri Lanka with parades and cultural pageants.' },
  { date: '2026-02-15', name: 'Mahasivarathri Day', year: 2026, type: 'Public Holiday', description: 'Hindu night of prayer and cultural devotion honoring Lord Shiva.' },
  { date: '2026-03-02', name: 'Medin Full Moon Poya Day', year: 2026, type: 'Poya Holiday', isPoya: true, description: 'Commemorates the Buddha’s return to Kapilavastu.' },
  { date: '2026-03-21', name: 'Id-Ul-Fitr (Ramazan Festival Day)', year: 2026, type: 'Public Holiday', description: 'Islamic celebration marking the end of Ramadan.' },
  { date: '2026-04-01', name: 'Bak Full Moon Poya Day', year: 2026, type: 'Poya Holiday', isPoya: true, description: 'Commemorates the Buddha’s second visit to Sri Lanka at Nagadipa.' },
  { date: '2026-04-03', name: 'Good Friday', year: 2026, type: 'Public Holiday', description: 'Christian solemn holiday preceding Easter Sunday.' },
  { date: '2026-04-13', name: 'Day Prior to Sinhala & Tamil New Year', year: 2026, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Traditional New Year Eve (Nonagathaya) auspicious customs.' },
  { date: '2026-04-14', name: 'Sinhala & Tamil New Year Day', year: 2026, type: 'National & Mercantile Holiday', isMercantile: true, description: 'Aluth Avurudu / Puthandu — Sri Lanka’s most celebrated cultural holiday.' },
  { date: '2026-05-01', name: 'Vesak Full Moon Poya Day & May Day', year: 2026, type: 'Poya & Mercantile Holiday', isPoya: true, isMercantile: true, description: 'Sacred Vesak Full Moon Poya Day coinciding with International Workers’ Day.' },
  { date: '2026-05-02', name: 'Day Following Vesak Full Moon Poya Day', year: 2026, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Nationwide Vesak lantern displays, illuminated pandals, and free food stalls (Dansal).' },
  { date: '2026-05-27', name: 'Id-Ul-Alha (Hadji Festival Day)', year: 2026, type: 'Public Holiday', description: 'Islamic festival of sacrifice celebrated island-wide.' },
  { date: '2026-05-30', name: 'Adhi Poson Full Moon Poya Day', year: 2026, type: 'Poya Holiday', isPoya: true, description: 'Intercalary Full Moon Poya observance day.' },
  { date: '2026-06-29', name: 'Poson Full Moon Poya Day', year: 2026, type: 'Poya Holiday', isPoya: true, description: 'Major pilgrimage holiday to Anuradhapura and Mihintale celebrating Buddhism in Sri Lanka.' },
  { date: '2026-07-29', name: 'Esala Full Moon Poya Day', year: 2026, type: 'Poya Holiday', isPoya: true, description: 'Heralds the world-famous Kandy Esala Perahera at the Temple of the Sacred Tooth Relic.' },
  { date: '2026-08-26', name: 'Milad-Un-Nabi (Holy Prophet’s Birthday)', year: 2026, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Commemorates the birth of Prophet Muhammad.' },
  { date: '2026-08-27', name: 'Nikini Full Moon Poya Day', year: 2026, type: 'Poya Holiday', isPoya: true, description: 'Full moon Poya marking the conclusion of the Kandy Esala festival season.' },
  { date: '2026-09-26', name: 'Binara Full Moon Poya Day', year: 2026, type: 'Poya Holiday', isPoya: true, description: 'Full moon Poya during the rainy retreat (Vassa) season.' },
  { date: '2026-10-25', name: 'Vap Full Moon Poya Day', year: 2026, type: 'Poya Holiday', isPoya: true, description: 'Marks the beginning of the Kathina robe-offering month.' },
  { date: '2026-11-08', name: 'Deepavali Festival Day', year: 2026, type: 'Public Holiday', description: 'Hindu Festival of Lights symbolizing the victory of light over darkness.' },
  { date: '2026-11-24', name: 'Il Full Moon Poya Day', year: 2026, type: 'Poya Holiday', isPoya: true, description: 'Marks the conclusion of the Kathina season and dispatch of the first Dharmaduta missionaries.' },
  { date: '2026-12-23', name: 'Unduvap Full Moon Poya Day', year: 2026, type: 'Poya Holiday', isPoya: true, description: 'Marks the start of the Sri Pada (Adam’s Peak) pilgrimage season and arrival of the Sacred Bo Tree.' },
  { date: '2026-12-25', name: 'Christmas Day', year: 2026, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Festive Christmas Day holiday celebrated across Sri Lanka.' },

  // === 2027 ===
  { date: '2027-01-15', name: 'Tamil Thai Pongal Day', year: 2027, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Traditional Tamil harvest festival.' },
  { date: '2027-01-22', name: 'Duruthu Full Moon Poya Day', year: 2027, type: 'Poya Holiday', isPoya: true, description: 'First Full Moon Poya Day of the year.' },
  { date: '2027-02-04', name: 'National Independence Day', year: 2027, type: 'National Holiday', isMercantile: true, description: '79th National Independence Day of Sri Lanka.' },
  { date: '2027-02-20', name: 'Navam Full Moon Poya Day', year: 2027, type: 'Poya Holiday', isPoya: true, description: 'Navam Full Moon Poya Day.' },
  { date: '2027-03-06', name: 'Mahasivarathri Day', year: 2027, type: 'Public Holiday', description: 'Hindu festival honoring Lord Shiva.' },
  { date: '2027-03-10', name: 'Id-Ul-Fitr (Ramazan Festival Day)', year: 2027, type: 'Public Holiday', description: 'Marks the end of Ramadan.' },
  { date: '2027-03-22', name: 'Medin Full Moon Poya Day', year: 2027, type: 'Poya Holiday', isPoya: true, description: 'Medin Full Moon Poya Day.' },
  { date: '2027-03-26', name: 'Good Friday', year: 2027, type: 'Public Holiday', description: 'Christian observance of Good Friday.' },
  { date: '2027-04-13', name: 'Day Prior to Sinhala & Tamil New Year', year: 2027, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Day prior to Sinhala & Tamil New Year.' },
  { date: '2027-04-14', name: 'Sinhala & Tamil New Year Day', year: 2027, type: 'National & Mercantile Holiday', isMercantile: true, description: 'Sinhala & Tamil New Year Day.' },
  { date: '2027-04-20', name: 'Bak Full Moon Poya Day', year: 2027, type: 'Poya Holiday', isPoya: true, description: 'Bak Full Moon Poya Day.' },
  { date: '2027-05-01', name: 'International Workers’ Day (May Day)', year: 2027, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'International Labour Day.' },
  { date: '2027-05-20', name: 'Vesak Full Moon Poya Day', year: 2027, type: 'Poya & Mercantile Holiday', isPoya: true, isMercantile: true, description: 'Sacred Vesak Full Moon Poya Day.' },
  { date: '2027-05-21', name: 'Day Following Vesak Full Moon Poya Day', year: 2027, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Second day of Vesak celebrations.' },
  { date: '2027-06-18', name: 'Poson Full Moon Poya Day', year: 2027, type: 'Poya Holiday', isPoya: true, description: 'Poson Full Moon Poya Day.' },
  { date: '2027-07-18', name: 'Esala Full Moon Poya Day', year: 2027, type: 'Poya Holiday', isPoya: true, description: 'Esala Full Moon Poya Day.' },
  { date: '2027-08-16', name: 'Nikini Full Moon Poya Day', year: 2027, type: 'Poya Holiday', isPoya: true, description: 'Nikini Full Moon Poya Day.' },
  { date: '2027-09-15', name: 'Binara Full Moon Poya Day', year: 2027, type: 'Poya Holiday', isPoya: true, description: 'Binara Full Moon Poya Day.' },
  { date: '2027-10-15', name: 'Vap Full Moon Poya Day', year: 2027, type: 'Poya Holiday', isPoya: true, description: 'Vap Full Moon Poya Day.' },
  { date: '2027-10-29', name: 'Deepavali Festival Day', year: 2027, type: 'Public Holiday', description: 'Hindu Festival of Lights.' },
  { date: '2027-11-13', name: 'Il Full Moon Poya Day', year: 2027, type: 'Poya Holiday', isPoya: true, description: 'Il Full Moon Poya Day.' },
  { date: '2027-12-13', name: 'Unduvap Full Moon Poya Day', year: 2027, type: 'Poya Holiday', isPoya: true, description: 'Unduvap Full Moon Poya Day.' },
  { date: '2027-12-25', name: 'Christmas Day', year: 2027, type: 'Public & Mercantile Holiday', isMercantile: true, description: 'Christmas Day.' }
];

let holidaysInitialized = false;

/**
 * Ensure the Holiday collection in MongoDB is populated with official Sri Lankan holidays.
 * Non-destructive upsert by date + name.
 */
const ensureHolidaysSeeded = async () => {
  if (holidaysInitialized) return;
  try {
    const count = await Holiday.countDocuments();
    if (count < OFFICIAL_SL_HOLIDAYS.length) {
      for (const h of OFFICIAL_SL_HOLIDAYS) {
        const parsedDate = new Date(`${h.date}T00:00:00.000Z`);
        await Holiday.findOneAndUpdate(
          { date: parsedDate, name: h.name },
          {
            $set: {
              date: parsedDate,
              name: h.name,
              year: h.year,
              type: h.type,
              description: h.description,
              isPoya: Boolean(h.isPoya),
              isMercantile: Boolean(h.isMercantile)
            }
          },
          { upsert: true, new: true }
        );
      }
    }
    holidaysInitialized = true;
  } catch (err) {
    console.error('HolidayService - ensureHolidaysSeeded error:', err.message);
  }
};

/**
 * Retrieve holidays filtered by optional year and month (1-12).
 */
const getHolidays = async ({ year, month } = {}) => {
  await ensureHolidaysSeeded();

  const query = {};
  if (year && month) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    query.date = { $gte: startOfMonth, $lte: endOfMonth };
  } else if (year) {
    query.year = parseInt(year, 10);
  }

  const holidays = await Holiday.find(query).sort({ date: 1 }).lean();
  return holidays;
};

module.exports = {
  OFFICIAL_SL_HOLIDAYS,
  ensureHolidaysSeeded,
  getHolidays
};

