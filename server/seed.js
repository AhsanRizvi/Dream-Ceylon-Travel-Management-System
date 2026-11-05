const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Destination = require('./models/Destination');
const connectDB = require('./config/db');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const destinations = [
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

const importData = async () => {
  try {
    await connectDB();
    // Non-destructive safe upsert: only insert missing or update missing fields
    for (const d of destinations) {
      await Destination.findOneAndUpdate(
        { name: d.name },
        { $set: d },
        { upsert: true, new: true }
      );
    }
    const count = await Destination.countDocuments();
    console.log(`Successfully safely seeded/updated ${destinations.length} destinations into MongoDB! Total in DB: ${count}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`Error importing destinations: ${error.message}`);
    process.exit(1);
  }
};

importData();
