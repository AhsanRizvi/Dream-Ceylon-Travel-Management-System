const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const Destination = require('./models/Destination');
const Package = require('./models/Package');
const connectDB = require('./config/db');

// Authentic Sri Lankan destinations with accurate GPS, categories, and high-res imagery
const destinationsData = [
  {
    name: 'Sigiriya',
    district: 'Matale',
    category: 'Cultural',
    description: 'Ancient rock fortress and palace ruin of King Kashyapa, featuring mirror walls, world-famous frescoes, and landscaped water gardens.',
    latitude: 7.9570,
    longitude: 80.7603,
    rating: 4.8,
    viewCount: 1540,
    bestVisitTime: 'Morning',
    image: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Ella',
    district: 'Badulla',
    category: 'Mountain',
    description: 'Picturesque hill-country town surrounded by misty cloud forests, lush tea plantations, Ravana Falls, and the iconic colonial Nine Arch Bridge.',
    latitude: 6.8667,
    longitude: 81.0466,
    rating: 4.7,
    viewCount: 1320,
    bestVisitTime: 'Morning',
    image: 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Kandy',
    district: 'Kandy',
    category: 'Cultural',
    description: 'Sri Lanka’s sacred cultural capital, home to the revered Temple of the Sacred Tooth Relic, scenic Kandy Lake, and Royal Botanical Gardens.',
    latitude: 7.2906,
    longitude: 80.6337,
    rating: 4.5,
    viewCount: 1180,
    bestVisitTime: 'Evening',
    image: 'https://images.unsplash.com/photo-1588258524675-c6350f5888a7?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1588258524675-c6350f5888a7?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Galle Fort',
    district: 'Galle',
    category: 'Cultural',
    description: 'Living UNESCO World Heritage fortification on the southern coast, built by the Portuguese and Dutch with colonial ramparts and lighthouse.',
    latitude: 6.0270,
    longitude: 80.2168,
    rating: 4.6,
    viewCount: 1450,
    bestVisitTime: 'Evening',
    image: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Yala National Park',
    district: 'Hambantota',
    category: 'Wildlife',
    description: 'Premier wildlife sanctuary with the world’s highest leopard concentration, roaming elephant herds, sloth bears, and coastal lagoons.',
    latitude: 6.3683,
    longitude: 81.5204,
    rating: 4.5,
    viewCount: 1620,
    bestVisitTime: 'Morning',
    image: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Nuwara Eliya',
    district: 'Nuwara Eliya',
    category: 'Mountain',
    description: 'Colonial hill retreat known as "Little England", famous for cool highland climate, manicured tea estates, Gregory Lake, and waterfalls.',
    latitude: 6.9497,
    longitude: 80.7828,
    rating: 4.6,
    viewCount: 1290,
    bestVisitTime: 'Any',
    image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Mirissa',
    district: 'Matara',
    category: 'Beach',
    description: 'Tropical southern paradise renowned for blue whale watching excursions, vibrant sunsets at Coconut Tree Hill, and golden surf beaches.',
    latitude: 5.9483,
    longitude: 80.4571,
    rating: 4.7,
    viewCount: 1380,
    bestVisitTime: 'Afternoon',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Arugam Bay',
    district: 'Ampara',
    category: 'Beach',
    description: 'World-class point-break surfing mecca on Sri Lanka’s eastern coast, surrounded by peaceful lagoons, relaxed cafés, and wild safari fringes.',
    latitude: 6.8436,
    longitude: 81.8285,
    rating: 4.8,
    viewCount: 990,
    bestVisitTime: 'Morning',
    image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=80'
  },
  {
    name: 'Horton Plains',
    district: 'Nuwara Eliya',
    category: 'Forest',
    description: 'Mystical high-altitude cloud forest and montane grassland plateau featuring the breathtaking 880-meter World’s End cliff and Baker’s Falls.',
    latitude: 6.8041,
    longitude: 80.8066,
    rating: 4.6,
    viewCount: 870,
    bestVisitTime: 'Morning',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80'
  }
];

// Authentic Tour Packages with structured business tiers
const packagesData = [
  {
    packageName: 'Basic',
    badge: 'Standard Transport',
    tagline: 'Standard transport arrangements for independent explorers',
    description: 'Designed specifically for tourists who only require standard transport facilities across Sri Lanka. Gives you complete freedom to arrange your own lodging, meals, and daily activities independently.',
    baseCharge: 85,
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80',
    features: {
      transport: 'Standard Air-Conditioned Vehicle with Licensed Chauffeur',
      accommodation: 'Not Included (Self-arranged by tourist)',
      meals: 'Not Included (Self-arranged by tourist)',
      tourGuide: 'Not Included (Driver only, no guiding services)'
    },
    includedFacilities: [
      'Standard air-conditioned vehicle (Sedan / Mini-Van / Van based on group size)',
      'Dedicated licensed professional chauffeur-driver for the entire itinerary',
      'All vehicle fuel, expressway toll fees, and commercial parking charges',
      'Airport pickup and drop-off transfers included',
      'Flexible daily driving hours (up to 8 hours / 200 km per day)',
      '24/7 on-road breakdown assistance and customer hotline'
    ],
    excludedFacilities: [
      'No accommodation or hotel stays included',
      'No food, meals, breakfast, or drinks included',
      'No tour guide or sightseeing commentary included',
      'No attraction, museum, or national park entrance tickets'
    ],
    allowGuideAddon: false,
    guideAddonPrice: 0,
    allowMealSelection: false,
    allowGuideSelection: false,
    mealOptions: [],
    guideOptions: [],
    pricingRules: {
      type: 'per_person_day',
      transportOnly: true
    }
  },
  {
    packageName: 'Standard',
    badge: 'Accommodation & Non-Food Facilities',
    tagline: 'Comfortable hotel stays and standard transport without mandatory meals',
    description: 'Combines comfortable hotel accommodations and reliable standard transport with essential non-food travel amenities. Food services are excluded by default so you can dine where you wish. Tour guides can be added as an optional additional service.',
    baseCharge: 180,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    features: {
      transport: 'Dedicated Standard Air-Conditioned Vehicle with Chauffeur',
      accommodation: 'Handpicked 3 to 4-Star Hotels and Eco-Lodge Stays',
      meals: 'Excluded by Default (Explore authentic local dining at your leisure)',
      tourGuide: 'Not Included by default (Optional add-on available)'
    },
    includedFacilities: [
      'Quality 3 to 4-star hotel accommodations with private ensuite bathrooms',
      'Standard air-conditioned private vehicle with experienced chauffeur',
      'All fuel, highway tolls, driver accommodation, and parking costs',
      'Hotel luggage handling, check-in coordination, and concierge support',
      'Applicable non-food travel facilities: vehicle Wi-Fi, bottled water & route assistance',
      '24/7 Dream Ceylon travel coordinator support throughout your stay'
    ],
    excludedFacilities: [
      'Food and meal services are NOT included by default (pay as you dine)',
      'A tour guide is NOT automatically included (available as an optional add-on)',
      'Laundry services, minibar expenses, and personal spending',
      'Optional activity entry fees and safari jeep rentals'
    ],
    allowGuideAddon: true,
    guideAddonPrice: 45,
    allowMealSelection: false,
    allowGuideSelection: false,
    mealOptions: [],
    guideOptions: [],
    pricingRules: {
      type: 'per_person_day',
      guideAddonRatePerDay: 45
    }
  },
  {
    packageName: 'Premium',
    badge: 'Complete Travel Experience',
    tagline: 'All-inclusive luxury with curated dining and specialist guides',
    description: 'The pinnacle of Sri Lankan hospitality. Enjoy luxury 5-star resort accommodations, executive transport, all gourmet meals tailored to your taste, and your choice of a dedicated specialist tour guide.',
    baseCharge: 350,
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
    features: {
      transport: 'Luxury Air-Conditioned SUV / Executive Van with VIP Chauffeur',
      accommodation: '5-Star Luxury Resorts, Heritage Villas & Tea Bungalows',
      meals: 'All Gourmet Meals Included (Choose your preferred culinary selection)',
      tourGuide: 'Dedicated Licensed Tour Guide Included (Choose your specialist)'
    },
    includedFacilities: [
      '5-Star luxury resort stays and boutique colonial heritage tea bungalows',
      'Luxury air-conditioned transport (SUV / VIP Van) with professional chauffeur',
      'Complete gourmet dining experience: Daily breakfast, lunch, high tea, and dinner',
      'Full selection of preferred food & meal options (Sri Lankan, Seafood, Halal, Vegan)',
      'Dedicated licensed National Tour Guide of your choice included',
      'All national park safaris, UNESCO heritage site tickets & cultural passes',
      'Airport VIP fast-track lounge access and priority luggage handling',
      'Complimentary Ayurvedic spa wellness session and traditional cultural show tickets'
    ],
    excludedFacilities: [
      'International airfares and visa processing fees',
      'Personal shopping and discretionary gratuities'
    ],
    allowGuideAddon: false,
    guideAddonPrice: 0,
    allowMealSelection: true,
    allowGuideSelection: true,
    mealOptions: [
      {
        name: 'Authentic Sri Lankan Culinary Experience',
        description: 'Traditional clay-pot village curries, hoppers, kottu, coconut sambols & local sweets',
        extraCostPerDay: 0
      },
      {
        name: 'Fresh Coastal Seafood Deluxe',
        description: 'Negombo lagoon crab, grilled jumbo tiger prawns, yellowfin tuna steaks & coastal catch',
        extraCostPerDay: 30
      },
      {
        name: 'International Continental & Western Cuisine',
        description: 'Fine-dining multi-course menus prepared by executive hotel chefs',
        extraCostPerDay: 15
      },
      {
        name: 'Vegetarian & Vegan Farm-to-Table Organic Feast',
        description: 'Organic seasonal vegetables, young jackfruit curries, tropical salads & herbal teas',
        extraCostPerDay: 0
      },
      {
        name: 'Halal-Certified Gourmet Selection',
        description: '100% Halal certified authentic Sri Lankan and international culinary spreads',
        extraCostPerDay: 10
      }
    ],
    guideOptions: [
      {
        name: 'Cultural & Heritage Historian Guide',
        specialty: 'Sigiriya, Anuradhapura, Polonnaruwa, Temple of the Tooth & UNESCO ancient history',
        languages: ['English', 'German', 'Sinhala'],
        dailyRate: 0
      },
      {
        name: 'Wildlife & Nature Safari Specialist',
        specialty: 'Yala leopard tracking, elephant corridors, birdwatching & Sinharaja rainforest ecology',
        languages: ['English', 'French', 'Sinhala'],
        dailyRate: 0
      },
      {
        name: 'Adventure, Trekking & Photography Guide',
        specialty: 'Ella Peak, Knuckles Mountain range trails, hidden waterfalls & best photo spots',
        languages: ['English', 'Spanish', 'Sinhala'],
        dailyRate: 0
      },
      {
        name: 'Executive Multilingual Chauffeur Guide',
        specialty: 'VIP protocol, high-end tea estates, gems & jewelry, luxury coastal hospitality',
        languages: ['English', 'Russian', 'Arabic', 'Sinhala'],
        dailyRate: 0
      }
    ],
    pricingRules: {
      type: 'all_inclusive_per_person_day',
      includesMeals: true,
      includesGuide: true
    }
  }
];

async function recoverData() {
  try {
    console.log('Connecting safely to MongoDB...');
    await connectDB();
    console.log('Connected to MongoDB.');

    // 1. SAFE RECOVERY FOR DESTINATIONS
    console.log('\n--- Recovering Destinations ---');
    let destInserted = 0;
    let destUpdated = 0;
    let destExisting = 0;

    for (const d of destinationsData) {
      const existing = await Destination.findOne({ name: d.name });
      if (existing) {
        destExisting++;
        // Update missing fields without deleting existing record
        const updates = {};
        if (!existing.image) updates.image = d.image;
        if (!existing.imageUrl) updates.imageUrl = d.imageUrl;
        if (!existing.viewCount) updates.viewCount = d.viewCount;

        if (Object.keys(updates).length > 0) {
          await Destination.updateOne({ _id: existing._id }, { $set: updates });
          destUpdated++;
          console.log(`[UPDATE] Destination "${d.name}" updated with missing fields:`, Object.keys(updates));
        } else {
          console.log(`[PRESERVE] Destination "${d.name}" already fully intact.`);
        }
      } else {
        await Destination.create(d);
        destInserted++;
        console.log(`[INSERT] Destination "${d.name}" recovered and inserted.`);
      }
    }

    const totalDestCount = await Destination.countDocuments();
    console.log(`Destinations Summary: Total = ${totalDestCount} (Inserted: ${destInserted}, Updated: ${destUpdated}, Preserved: ${destExisting})`);

    // 2. SAFE RECOVERY FOR PACKAGES
    console.log('\n--- Recovering Packages ---');
    let pkgInserted = 0;
    let pkgUpdated = 0;
    let pkgExisting = 0;

    for (const p of packagesData) {
      const existing = await Package.findOne({ packageName: p.packageName });
      if (existing) {
        pkgExisting++;
        const updates = {};
        if (!existing.image) updates.image = p.image;
        if (!existing.imageUrl) updates.imageUrl = p.imageUrl;
        if (!existing.features) updates.features = p.features;

        if (Object.keys(updates).length > 0) {
          await Package.updateOne({ _id: existing._id }, { $set: updates });
          pkgUpdated++;
          console.log(`[UPDATE] Package "${p.packageName}" updated with missing fields:`, Object.keys(updates));
        } else {
          console.log(`[PRESERVE] Package "${p.packageName}" already fully intact.`);
        }
      } else {
        await Package.create(p);
        pkgInserted++;
        console.log(`[INSERT] Package "${p.packageName}" recovered and inserted.`);
      }
    }

    const totalPkgCount = await Package.countDocuments();
    console.log(`Packages Summary: Total = ${totalPkgCount} (Inserted: ${pkgInserted}, Updated: ${pkgUpdated}, Preserved: ${pkgExisting})`);

    console.log('\n=== RECOVERY COMPLETED SUCCESSFULLY ===');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Data Recovery Error:', error);
    process.exit(1);
  }
}

recoverData();

