const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Package = require('./models/Package');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const packages = [
  {
    packageName: 'Basic',
    badge: 'Route & Transport Essentials',
    tagline: 'Destination recommendations, day-by-day itinerary & private transport for independent explorers',
    description:
      'Includes personalized destination recommendations, turn-by-turn travel route, day-by-day itinerary schedule, basic trip planning assistance, and estimated transportation costs. Hotel accommodation, food, and tour guide services are not automatically included.',
    currency: 'LKR',
    baseCharge: 25500, // Rs. 25,500 (~$85/day starting reference)
    baseChargeLKR: 25500,
    startingPriceLKR: 25500,
    features: {
      transport: 'Motorcycle, Sedan Car, or Passenger Van with Route Cost Estimation',
      accommodation: 'Not Included (Self-arranged by tourist)',
      meals: 'Not Included (Self-arranged by tourist)',
      tourGuide: 'Not Included (Chauffeur/self-guided only)',
      nonFoodFacilities: [
        'Smart destination recommendations & route planning',
        'Day-by-day itinerary schedule',
        '24/7 emergency road assistance hotline'
      ]
    },
    inclusions: {
      destinationsAndItinerary: true,
      routeAndTransport: true,
      accommodationIncluded: false,
      mealsIncluded: false,
      guideIncluded: false
    },
    includedFacilities: [
      'Personalized destination recommendations & day-by-day itinerary schedule',
      'Interactive travel route mapping & distance estimation',
      'Choice of transportation mode (Motorcycle, Car, or Van)',
      'All vehicle fuel, expressway toll fees, and commercial parking charges',
      'Airport pickup and drop-off coordination',
      '24/7 on-road breakdown assistance and customer support hotline'
    ],
    excludedFacilities: [
      'No hotel or accommodation stays included (Rs. 0 accommodation charge)',
      'No food, meals, breakfast, or dining plans included (Rs. 0 meal charge)',
      'No tour guide or sightseeing commentary included (Rs. 0 guide charge)',
      'No attraction, museum, or national park entrance tickets'
    ],
    optionalServices: [
      'Upgrade vehicle type between Motorcycle, Sedan Car, or KDH Passenger Van'
    ],
    allowHotelSelection: false,
    allowGuideAddon: false,
    guideAddonPrice: 0,
    allowMealSelection: false,
    allowGuideSelection: false,
    mealOptions: [],
    guideOptions: [],
    pricingRules: {
      type: 'per_person_day_lkr',
      baseCurrency: 'LKR',
      transportOnly: true,
      tierCoordinationPerPersonDayLKR: 4500
    }
  },
  {
    packageName: 'Standard',
    badge: 'Accommodation & Non-Food Facilities',
    tagline: 'All Basic features plus partner hotel selection & essential non-food travel amenities',
    description:
      'Includes all Basic package features (recommendations, route, day-by-day itinerary, and transport) plus handpicked 3 to 4-star accommodation options, partner hotel & room selection, relevant non-food facilities, and full accommodation cost calculation. Food services are excluded by default; a licensed tour guide can be added optionally.',
    currency: 'LKR',
    baseCharge: 54000, // Rs. 54,000 (~$180/day starting reference)
    baseChargeLKR: 54000,
    startingPriceLKR: 54000,
    features: {
      transport: 'Dedicated Air-Conditioned Vehicle (Motorcycle / Car / Van) with Chauffeur',
      accommodation: 'Handpicked 3 to 4-Star Partner Hotels & Eco-Lodges (Selectable)',
      meals: 'Excluded by Default (Explore local dining independently)',
      tourGuide: 'Not Included by Default (Optional Licensed Guide Add-On Available)',
      nonFoodFacilities: [
        'On-board 4G Wi-Fi & bottled mineral water',
        'Hotel luggage handling, check-in coordination & concierge support',
        'Expressway tolls, parking & driver accommodation covered'
      ]
    },
    inclusions: {
      destinationsAndItinerary: true,
      routeAndTransport: true,
      accommodationIncluded: true,
      mealsIncluded: false,
      guideIncluded: false
    },
    includedFacilities: [
      'All Basic Package features (recommendations, travel route & day-by-day itinerary)',
      'Quality 3 to 4-star partner hotel accommodations with private ensuite rooms',
      'Direct Partner Hotel & room type selection with real-time cost calculation',
      'Relevant non-food facilities: On-board 4G Wi-Fi, bottled water & luggage porterage',
      'All fuel, highway tolls, driver accommodation, and parking costs',
      '24/7 Dream Ceylon travel coordinator support throughout your stay'
    ],
    excludedFacilities: [
      'Food and meal services are NOT included by default (no unincluded meal charges)',
      'Tour guide is NOT automatically included (available as an optional add-on)',
      'Personal laundry, minibar expenses, and optional safari jeep fees'
    ],
    optionalServices: [
      'Select any verified Partner Hotel & room type from the database',
      'Optional Licensed National Tour Guide add-on (+Rs. 13,500/day or selected guide rate)'
    ],
    allowHotelSelection: true,
    allowGuideAddon: true,
    guideAddonPrice: 13500, // Rs. 13,500/day (~$45/day)
    allowMealSelection: false,
    allowGuideSelection: false,
    mealOptions: [],
    guideOptions: [],
    pricingRules: {
      type: 'per_person_day_lkr',
      baseCurrency: 'LKR',
      tierCoordinationPerPersonDayLKR: 7500,
      defaultAccommodationPerRoomNightLKR: 36000,
      guideAddonRatePerDayLKR: 13500
    }
  },
  {
    packageName: 'Premium',
    badge: 'Complete All-Inclusive Experience',
    tagline: 'All Standard features plus full-board dining, meal preferences & specialist tour guides',
    description:
      'The complete Sri Lankan luxury experience. Includes all Standard package features (itinerary, route, transport, and 5-star hotel accommodations) plus full-board food & meal plans (Vegetarian, Vegan, Seafood, All meat types), specialist or registered tour guide selection, guide charges, and complete package cost calculation.',
    currency: 'LKR',
    baseCharge: 105000, // Rs. 105,000 (~$350/day starting reference)
    baseChargeLKR: 105000,
    startingPriceLKR: 105000,
    features: {
      transport: 'Executive Air-Conditioned Vehicle (Car / VIP Van / Touring Bike) with Chauffeur',
      accommodation: '5-Star Luxury Resorts, Heritage Villas & Boutique Tea Bungalows',
      meals: 'Full-Board Gourmet Meals Included (Vegetarian, Vegan, Seafood, All Meat Types)',
      tourGuide: 'Dedicated Licensed Tour Guide Included (Choose Specialist or Partner Guide)',
      nonFoodFacilities: [
        'Airport VIP fast-track lounge & priority baggage handling',
        'UNESCO heritage site tickets & national park safari permits',
        'Complimentary Ayurvedic wellness spa session & cultural show pass',
        'On-board Wi-Fi, refreshments & 24/7 personal travel butler'
      ]
    },
    inclusions: {
      destinationsAndItinerary: true,
      routeAndTransport: true,
      accommodationIncluded: true,
      mealsIncluded: true,
      guideIncluded: true
    },
    includedFacilities: [
      'All Standard Package features (itinerary, route, executive transport & hotel selection)',
      '5-Star luxury resort stays and boutique colonial heritage tea bungalows',
      'Full-board dining (Breakfast, Lunch & Dinner) tailored to your meal type preference',
      'Choice of Vegetarian, Vegan, Seafood, or All Meat Types culinary plans',
      'Dedicated licensed National Tour Guide of your choice included',
      'All national park safaris, UNESCO heritage site tickets & cultural passes',
      'Airport VIP fast-track lounge access and priority luggage handling',
      'Complimentary Ayurvedic spa wellness session and traditional cultural show tickets'
    ],
    excludedFacilities: [
      'International airfares and visa processing fees',
      'Personal shopping and discretionary gratuities'
    ],
    optionalServices: [
      'Choose specific Partner Hotel & luxury suite from database',
      'Choose specific certified Tour Guide from database or specialist profile',
      'Customize daily meal plan (Vegetarian, Vegan, Seafood, All meat types)'
    ],
    allowHotelSelection: true,
    allowGuideAddon: false,
    guideAddonPrice: 0,
    allowMealSelection: true,
    allowGuideSelection: true,
    mealOptions: [
      {
        name: 'Authentic Sri Lankan Culinary Experience',
        mealType: 'Vegetarian',
        description: 'Traditional clay-pot village curries, hoppers, kottu, coconut sambols & local sweets',
        extraCostPerDay: 0
      },
      {
        name: 'Fresh Coastal Seafood Deluxe',
        mealType: 'Seafood',
        description: 'Negombo lagoon crab, grilled jumbo tiger prawns, yellowfin tuna steaks & coastal catch',
        extraCostPerDay: 9000 // Rs. 9,000/day (~$30/day)
      },
      {
        name: 'International Continental & All-Meat Gourmet',
        mealType: 'All meat types',
        description: 'Fine-dining multi-course meat, poultry & continental menus prepared by executive chefs',
        extraCostPerDay: 4500 // Rs. 4,500/day (~$15/day)
      },
      {
        name: 'Vegetarian & Vegan Farm-to-Table Organic Feast',
        mealType: 'Vegan',
        description: 'Organic seasonal vegetables, young jackfruit curries, tropical salads & herbal teas',
        extraCostPerDay: 0
      },
      {
        name: 'Halal-Certified Gourmet Selection',
        mealType: 'All meat types',
        description: '100% Halal certified authentic Sri Lankan and international culinary spreads',
        extraCostPerDay: 3000 // Rs. 3,000/day (~$10/day)
      }
    ],
    guideOptions: [
      {
        name: 'Cultural & Heritage Historian Guide',
        specialty: 'Sigiriya, Anuradhapura, Polonnaruwa, Temple of the Tooth & UNESCO ancient history',
        languages: ['English', 'German', 'Sinhala'],
        dailyRate: 18000
      },
      {
        name: 'Wildlife & Nature Safari Specialist',
        specialty: 'Yala leopard tracking, elephant corridors, birdwatching & Sinharaja rainforest ecology',
        languages: ['English', 'French', 'Sinhala'],
        dailyRate: 18000
      },
      {
        name: 'Adventure, Trekking & Photography Guide',
        specialty: 'Ella Peak, Knuckles Mountain range trails, hidden waterfalls & best photo spots',
        languages: ['English', 'Spanish', 'Sinhala'],
        dailyRate: 18000
      },
      {
        name: 'Executive Multilingual Chauffeur Guide',
        specialty: 'VIP protocol, high-end tea estates, gems & jewelry, luxury coastal hospitality',
        languages: ['English', 'Russian', 'Arabic', 'Sinhala'],
        dailyRate: 21000
      }
    ],
    pricingRules: {
      type: 'all_inclusive_per_person_day_lkr',
      baseCurrency: 'LKR',
      includesMeals: true,
      includesGuide: true,
      tierCoordinationPerPersonDayLKR: 16500,
      defaultAccommodationPerRoomNightLKR: 63000,
      defaultGuideRatePerDayLKR: 18000
    }
  }
];

const seedPackages = async () => {
  try {
    await Package.deleteMany();
    await Package.insertMany(packages);
    console.log('Packages Seeded Successfully in LKR with Complete Module 3 Rules!');
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedPackages();
