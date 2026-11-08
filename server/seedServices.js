const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const Guide = require('./models/Guide');
const Hotel = require('./models/Hotel');
const Booking = require('./models/Booking');
const Review = require('./models/Review');
const { recalculateTargetRating } = require('./services/ratingService');

dotenv.config();
connectDB();

const ensureUser = async ({ name, email, password, role }) => {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name,
      email,
      passwordHash: password,
      role
    });
  }
  return user;
};

const seedServicesAndReviews = async () => {
  try {
    // 1. Ensure Demo Accounts exist (non-destructive)
    await ensureUser({
      name: 'System Administrator',
      email: 'admin@dreamceylon.lk',
      password: 'Password123!',
      role: 'admin'
    });

    const tourist1 = await ensureUser({
      name: 'Kasun Perera',
      email: 'kasun.tourist@dreamceylon.lk',
      password: 'Password123!',
      role: 'tourist'
    });

    const tourist2 = await ensureUser({
      name: 'Emma Richardson',
      email: 'emma.tourist@dreamceylon.lk',
      password: 'Password123!',
      role: 'tourist'
    });

    const tourist3 = await ensureUser({
      name: 'Liam OConnor',
      email: 'liam.tourist@dreamceylon.lk',
      password: 'Password123!',
      role: 'tourist'
    });

    const guideUser1 = await ensureUser({
      name: 'Nimal Bandara',
      email: 'nimal.guide@dreamceylon.lk',
      password: 'Password123!',
      role: 'guide'
    });

    const guideUser2 = await ensureUser({
      name: 'Chaminda Silva',
      email: 'chaminda.guide@dreamceylon.lk',
      password: 'Password123!',
      role: 'guide'
    });

    const guideUser3 = await ensureUser({
      name: 'Priyantha Fernando',
      email: 'priyantha.guide@dreamceylon.lk',
      password: 'Password123!',
      role: 'guide'
    });

    const guideUser4 = await ensureUser({
      name: 'Anushka Jayawardena',
      email: 'anushka.guide@dreamceylon.lk',
      password: 'Password123!',
      role: 'guide'
    });

    const hotelOwner1 = await ensureUser({
      name: 'Ceylon Heritage Hospitality',
      email: 'hotels@dreamceylon.lk',
      password: 'Password123!',
      role: 'hotel_owner'
    });

    const hotelOwner2 = await ensureUser({
      name: 'Serendib Boutique Resorts',
      email: 'serendib.hotels@dreamceylon.lk',
      password: 'Password123!',
      role: 'hotel_owner'
    });

    // 2. Seed or Enrich Guides with Module 4 fields
    const guideSeedDefinitions = [
      {
        userId: guideUser1._id,
        name: 'Nimal Bandara',
        email: 'nimal.guide@dreamceylon.lk',
        contactNumber: '+94 77 234 5678',
        profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
        bio: 'National Cultural & UNESCO Heritage Historian with 12+ years guiding across the Cultural Triangle, Kandy, and ancient monastery complexes.',
        serviceAreas: ['Kandy', 'Sigiriya', 'Anuradhapura', 'Polonnaruwa', 'Dambulla'],
        languages: ['English', 'German', 'Sinhala'],
        expertise: ['Cultural', 'Historical', 'Photography'],
        experienceYears: 12,
        qualifications: ['SLTDA National Tourist Guide License #NTG-1042', 'B.A. in Archaeology (University of Peradeniya)', 'First Aid & Wilderness Safety Certified'],
        dailyRate: 15000,
        currency: 'LKR',
        availability: true,
        availabilityNotes: 'Available daily across Central and North Central Provinces. Early morning Sigiriya climbs supported.',
        serviceStatus: 'active'
      },
      {
        userId: guideUser2._id,
        name: 'Chaminda Silva',
        email: 'chaminda.guide@dreamceylon.lk',
        contactNumber: '+94 71 876 5432',
        profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
        bio: 'Certified Wildlife Tracker & Hill Country Trekking Specialist covering Yala National Park, Ella, Horton Plains, and Knuckles Range.',
        serviceAreas: ['Yala', 'Ella', 'Nuwara Eliya', 'Mirissa', 'Udawalawe'],
        languages: ['English', 'French', 'Sinhala'],
        expertise: ['Wildlife', 'Adventure', 'Trekking', 'Eco Tourism'],
        experienceYears: 9,
        qualifications: ['SLTDA Chauffeur & Trekking Guide #CTG-2198', 'Department of Wildlife Conservation Field Naturalist Badge'],
        dailyRate: 18000,
        currency: 'LKR',
        availability: true,
        availabilityNotes: 'Specialized 4x4 safari coordination and mountain trail guiding.',
        serviceStatus: 'active'
      },
      {
        userId: guideUser3._id,
        name: 'Priyantha Fernando',
        email: 'priyantha.guide@dreamceylon.lk',
        contactNumber: '+94 76 345 9876',
        profilePhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80',
        bio: 'Southern Coast, Galle Fort Dutch Architecture & Sri Lankan Culinary Tour Specialist with luxury chauffeur experience.',
        serviceAreas: ['Galle', 'Mirissa', 'Bentota', 'Colombo', 'Hikkaduwa'],
        languages: ['English', 'Spanish', 'Sinhala'],
        expertise: ['Cultural', 'Culinary', 'Beach & Coastal', 'Historical'],
        experienceYears: 7,
        qualifications: ['SLTDA Area Guide License (Southern Province)', 'Hospitality & Culinary Heritage Diploma'],
        dailyRate: 13500,
        currency: 'LKR',
        availability: true,
        availabilityNotes: 'Available for coastal day tours and multi-day southern round trips.',
        serviceStatus: 'active'
      },
      {
        userId: guideUser4._id,
        name: 'Anushka Jayawardena',
        email: 'anushka.guide@dreamceylon.lk',
        contactNumber: '+94 77 998 1122',
        profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
        bio: 'Tea Plantation Heritage, Wellness Retreats & Scenic Train Journey Curator across Nuwara Eliya, Kandy, and East Coast beaches.',
        serviceAreas: ['Kandy', 'Nuwara Eliya', 'Ella', 'Trincomalee', 'Colombo'],
        languages: ['English', 'Japanese', 'Sinhala', 'Tamil'],
        expertise: ['Tea Heritage', 'Wellness & Ayurveda', 'Cultural', 'Photography'],
        experienceYears: 8,
        qualifications: ['SLTDA National Guide License #NTG-3081', 'JLPT N2 Japanese Language Proficiency'],
        dailyRate: 16500,
        currency: 'LKR',
        availability: true,
        availabilityNotes: 'Ideal for family, photography, and tea estate immersion tours.',
        serviceStatus: 'active'
      }
    ];

    const guides = [];
    for (const def of guideSeedDefinitions) {
      let existing = await Guide.findOne({ name: def.name });
      if (!existing) {
        existing = await Guide.create(def);
      } else {
        existing.userId = def.userId;
        existing.email = existing.email || def.email;
        existing.contactNumber = existing.contactNumber || def.contactNumber;
        existing.profilePhoto = existing.profilePhoto || def.profilePhoto;
        existing.bio = existing.bio || def.bio;
        existing.serviceAreas = existing.serviceAreas?.length ? existing.serviceAreas : def.serviceAreas;
        existing.languages = existing.languages?.length ? existing.languages : def.languages;
        existing.expertise = existing.expertise?.length ? existing.expertise : def.expertise;
        existing.experienceYears = existing.experienceYears || def.experienceYears;
        existing.qualifications = existing.qualifications?.length ? existing.qualifications : def.qualifications;
        if (!existing.dailyRate || existing.dailyRate < 1000) {
          existing.dailyRate = def.dailyRate;
        }
        existing.currency = 'LKR';
        existing.availabilityNotes = existing.availabilityNotes || def.availabilityNotes;
        existing.serviceStatus = existing.serviceStatus || 'Active';
        await existing.save();
      }
      guides.push(existing);
    }

    // 3. Seed or Enrich Hotels with Module 4 fields
    const hotelSeedDefinitions = [
      {
        ownerId: hotelOwner1._id,
        ownerName: 'Ceylon Heritage Hospitality',
        name: 'Cinnamon Citadel Kandy Resort',
        location: 'Kandy',
        district: 'Kandy',
        address: '124 Srimath Kuda Ratwatte Mawatha, Kandy 20000',
        latitude: 7.3094,
        longitude: 80.6311,
        contactEmail: 'reservations@cinnamoncitadel-demo.lk',
        contactNumber: '+94 81 223 4365',
        description: 'Tranquil riverside 4-star resort surrounded by misty hills and sweeping Mahaweli River bends, minutes from the Temple of the Sacred Tooth Relic.',
        photos: [
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80'
        ],
        rooms: [
          {
            type: 'Superior River View',
            name: 'Superior Mahaweli River View Room',
            description: 'Spacious contemporary room with private balcony overlooking the Mahaweli River.',
            capacity: 2,
            count: 15,
            bedConfiguration: '1 King Bed',
            roomFacilities: ['Air Conditioning', 'River Balcony', 'Free Wi-Fi', 'Mini Bar', 'Rain Shower'],
            pricePerNight: 32000,
            price: 32000,
            photos: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'],
            availability: true
          },
          {
            type: 'Deluxe Family Suite',
            name: 'Kandyan Heritage Family Suite',
            description: 'Two-zone luxury family suite with traditional Kandyan woodcraft accents and garden terrace.',
            capacity: 4,
            count: 6,
            bedConfiguration: '1 King Bed + 2 Twin Beds',
            roomFacilities: ['Air Conditioning', 'Living Lounge', 'Free Wi-Fi', 'Bathtub', 'Coffee Maker'],
            pricePerNight: 48000,
            price: 48000,
            photos: ['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80'],
            availability: true
          }
        ],
        facilities: ['Infinity Pool', 'Free Wi-Fi', 'Ayurvedic Spa', 'Riverside Dining', 'Free Parking', 'Airport Shuttle'],
        checkInTime: '14:00',
        checkOutTime: '11:00',
        pricePerNight: 32000,
        currency: 'LKR',
        availability: true
      },
      {
        ownerId: hotelOwner1._id,
        ownerName: 'Ceylon Heritage Hospitality',
        name: '98 Acres Mountain Eco Resort',
        location: 'Ella',
        district: 'Ella',
        address: 'Greenland Estate, Ella - Passara Road, Ella 90090',
        latitude: 6.8667,
        longitude: 81.0586,
        contactEmail: 'stay@98acres-demo.lk',
        contactNumber: '+94 57 205 0050',
        description: 'Luxury boutique eco-chalets nestled in a scenic 98-acre organic tea estate directly overlooking Little Adam’s Peak and Ella Gap.',
        photos: [
          'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1000&q=80'
        ],
        rooms: [
          {
            type: 'Deluxe Tea Chalet',
            name: 'Deluxe Tea Estate Chalet',
            description: 'Handcrafted stone and railway-sleeper timber chalet with panoramic mountain deck.',
            capacity: 2,
            count: 10,
            bedConfiguration: '1 Queen Canopy Bed',
            roomFacilities: ['Mountain View Deck', 'Free Wi-Fi', 'Ceylon Tea Bar', 'Heated Rain Shower'],
            pricePerNight: 45000,
            price: 45000,
            photos: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80'],
            availability: true
          },
          {
            type: 'Grand Mountain Villa',
            name: 'Grand Executive Plunge Pool Villa',
            description: 'Private hillside villa with heated plunge pool and unobstructed views of Ella Rock.',
            capacity: 3,
            count: 4,
            bedConfiguration: '1 King Bed + 1 Daybed',
            roomFacilities: ['Private Plunge Pool', 'Mountain View Deck', 'Free Wi-Fi', 'Butler Service'],
            pricePerNight: 68000,
            price: 68000,
            photos: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'],
            availability: true
          }
        ],
        facilities: ['Mountain View Deck', 'Organic Restaurant', 'Free Wi-Fi', 'Tea Tour', 'Spa & Wellness', 'Helipad'],
        checkInTime: '14:00',
        checkOutTime: '11:30',
        pricePerNight: 45000,
        currency: 'LKR',
        availability: true
      },
      {
        ownerId: hotelOwner2._id,
        ownerName: 'Serendib Boutique Resorts',
        name: 'Galle Fort Heritage Boutique Hotel',
        location: 'Galle',
        district: 'Galle',
        address: '42 Church Street, Galle Fort, Galle 80000',
        latitude: 6.0269,
        longitude: 80.2170,
        contactEmail: 'concierge@gallefortheritage-demo.lk',
        contactNumber: '+94 91 224 6789',
        description: 'Restored 18th-century Dutch colonial merchant mansion inside the UNESCO Galle Fort ramparts with tranquil frangipani courtyard pool.',
        photos: [
          'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1000&q=80'
        ],
        rooms: [
          {
            type: 'Colonial Courtyard Suite',
            name: 'Dutch Verandah Courtyard Suite',
            description: 'High-ceiling heritage suite with antique four-poster teak bed and private veranda.',
            capacity: 2,
            count: 8,
            bedConfiguration: '1 Four-Poster King Bed',
            roomFacilities: ['Air Conditioning', 'Courtyard Verandah', 'Free Wi-Fi', ' clawfoot Bathtub'],
            pricePerNight: 38000,
            price: 38000,
            photos: ['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80'],
            availability: true
          },
          {
            type: 'Rampart Ocean Family Room',
            name: 'Galle Lighthouse Family Quarters',
            description: 'Two-bedroom interconnecting colonial suite overlooking the Indian Ocean ramparts.',
            capacity: 4,
            count: 4,
            bedConfiguration: '2 Queen Beds',
            roomFacilities: ['Air Conditioning', 'Ocean View', 'Free Wi-Fi', 'Mini Bar'],
            pricePerNight: 54000,
            price: 54000,
            photos: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80'],
            availability: true
          }
        ],
        facilities: ['Courtyard Pool', 'Free Wi-Fi', 'Heritage Library', 'Seafood Bistro', 'Guided Fort Walk'],
        checkInTime: '14:00',
        checkOutTime: '11:00',
        pricePerNight: 38000,
        currency: 'LKR',
        availability: true
      },
      {
        ownerId: hotelOwner2._id,
        ownerName: 'Serendib Boutique Resorts',
        name: 'Sigiriya Jungle Eco Lodge',
        location: 'Sigiriya',
        district: 'Sigiriya',
        address: 'Audangawa Road, Kimbissa, Sigiriya 21120',
        latitude: 7.9570,
        longitude: 80.7603,
        contactEmail: 'bookings@sigiriyajungle-demo.lk',
        contactNumber: '+94 66 228 6123',
        description: 'Nature-immersive eco-lodge set amid 20 acres of dry-zone forest habitat with direct vistas of the iconic Sigiriya Lion Rock Fortress.',
        photos: [
          'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1000&q=80'
        ],
        rooms: [
          {
            type: 'Garden Eco Cabin',
            name: 'Forest Canopy Eco Chalet',
            description: 'Sustainable timber chalet with open-sky shower and birdwatching sit-out.',
            capacity: 2,
            count: 12,
            bedConfiguration: '1 Queen Bed',
            roomFacilities: ['Air Conditioning', 'Nature Deck', 'Free Wi-Fi', 'Open-Sky Shower'],
            pricePerNight: 24000,
            price: 24000,
            photos: ['https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80'],
            availability: true
          },
          {
            type: 'Lion Rock Family Lodge',
            name: 'Sigiriya Rock View Family Bungalow',
            description: 'Spacious family bungalow with private garden and direct Sigiriya Rock view.',
            capacity: 4,
            count: 5,
            bedConfiguration: '1 King Bed + 2 Single Beds',
            roomFacilities: ['Air Conditioning', 'Rock View Terrace', 'Free Wi-Fi', 'Bicycle Rental'],
            pricePerNight: 36000,
            price: 36000,
            photos: ['https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80'],
            availability: true
          }
        ],
        facilities: ['Birdwatching Trails', 'Outdoor Pool', 'Village Curry Dining', 'Free Wi-Fi', 'Free Parking'],
        checkInTime: '13:00',
        checkOutTime: '11:00',
        pricePerNight: 24000,
        currency: 'LKR',
        availability: true
      }
    ];

    const hotels = [];
    for (const def of hotelSeedDefinitions) {
      let existing = await Hotel.findOne({ name: def.name });
      if (!existing) {
        existing = await Hotel.create(def);
      } else {
        existing.ownerName = existing.ownerName || def.ownerName;
        existing.district = existing.district || def.district;
        existing.address = existing.address || def.address;
        existing.latitude = existing.latitude ?? def.latitude;
        existing.longitude = existing.longitude ?? def.longitude;
        existing.contactEmail = existing.contactEmail || def.contactEmail;
        existing.contactNumber = existing.contactNumber || def.contactNumber;
        existing.photos = existing.photos?.length ? existing.photos : def.photos;
        existing.checkInTime = existing.checkInTime || def.checkInTime;
        existing.checkOutTime = existing.checkOutTime || def.checkOutTime;
        existing.facilities = existing.facilities?.length ? existing.facilities : def.facilities;
        existing.rooms = def.rooms;
        existing.pricePerNight = def.pricePerNight;
        existing.currency = 'LKR';
        await existing.save();
      }
      hotels.push(existing);
    }

    // 4. Seed Sample Completed Bookings & Reviews if no reviews exist yet
    const existingReviewsCount = await Review.countDocuments();
    if (existingReviewsCount === 0 && guides.length >= 2 && hotels.length >= 2) {
      const booking1 = await Booking.create({
        touristId: tourist1._id,
        bookingType: 'combined',
        guideId: guides[0]._id,
        hotelId: hotels[0]._id,
        startDate: new Date('2026-02-10'),
        endDate: new Date('2026-02-12'),
        serviceDays: 3,
        dailyRateLKR: 15000,
        checkInDate: new Date('2026-02-10'),
        checkOutDate: new Date('2026-02-12'),
        nights: 2,
        roomType: 'Superior River View',
        roomQuantity: 1,
        guestsCount: 2,
        status: 'Completed',
        totalAmount: 109000
      });

      const booking2 = await Booking.create({
        touristId: tourist2._id,
        bookingType: 'combined',
        guideId: guides[0]._id,
        hotelId: hotels[1]._id,
        startDate: new Date('2026-03-05'),
        endDate: new Date('2026-03-07'),
        serviceDays: 3,
        dailyRateLKR: 15000,
        checkInDate: new Date('2026-03-05'),
        checkOutDate: new Date('2026-03-07'),
        nights: 2,
        roomType: 'Deluxe Tea Chalet',
        roomQuantity: 1,
        guestsCount: 2,
        status: 'Completed',
        totalAmount: 135000
      });

      const booking3 = await Booking.create({
        touristId: tourist3._id,
        bookingType: 'combined',
        guideId: guides[1]._id,
        hotelId: hotels[1]._id,
        startDate: new Date('2026-03-15'),
        endDate: new Date('2026-03-17'),
        serviceDays: 3,
        dailyRateLKR: 18000,
        checkInDate: new Date('2026-03-15'),
        checkOutDate: new Date('2026-03-17'),
        nights: 2,
        roomType: 'Deluxe Tea Chalet',
        roomQuantity: 1,
        guestsCount: 2,
        status: 'Completed',
        totalAmount: 144000
      });

      await Review.insertMany([
        {
          authorId: tourist1._id,
          targetType: 'guide',
          targetId: guides[0]._id,
          score: 5,
          comment: 'Nimal was an extraordinary historian! He explained the ancient frescoes and hydraulic engineering of Sigiriya and Polonnaruwa with remarkable depth.',
          verifiedBooking: true,
          bookingId: booking1._id,
          status: 'active'
        },
        {
          authorId: tourist2._id,
          targetType: 'guide',
          targetId: guides[0]._id,
          score: 5,
          comment: 'Very punctual, fluent in both English and German, and customized our Kandy Temple visit to avoid peak crowds. Highly recommended!',
          verifiedBooking: true,
          bookingId: booking2._id,
          status: 'active'
        },
        {
          authorId: tourist3._id,
          targetType: 'guide',
          targetId: guides[1]._id,
          score: 4,
          comment: 'Chaminda spotted two leopards in Yala within the first hour and guided us safely up Ella Rock. Great wildlife knowledge.',
          verifiedBooking: true,
          bookingId: booking3._id,
          status: 'active'
        },
        {
          authorId: tourist1._id,
          targetType: 'hotel',
          targetId: hotels[0]._id,
          score: 5,
          comment: 'Beautiful riverside location in Kandy. The Sri Lankan breakfast buffet and hospitality were top-notch.',
          verifiedBooking: true,
          bookingId: booking1._id,
          status: 'active'
        },
        {
          authorId: tourist2._id,
          targetType: 'hotel',
          targetId: hotels[1]._id,
          score: 5,
          comment: 'Waking up to the mist over Little Adams Peak from our tea chalet was unforgettable. Worth every penny!',
          verifiedBooking: true,
          bookingId: booking2._id,
          status: 'active'
        },
        {
          authorId: tourist3._id,
          targetType: 'hotel',
          targetId: hotels[1]._id,
          score: 4,
          comment: 'Stunning views and eco-friendly architecture. A bit of a climb to the upper chalets, but the staff helped with luggage promptly.',
          verifiedBooking: true,
          bookingId: booking3._id,
          status: 'active',
          isReported: true,
          reports: [
            {
              reportedBy: tourist1._id,
              reason: 'irrelevant',
              details: 'Sample flagged review for testing the Admin Moderation queue.',
              status: 'pending'
            }
          ]
        }
      ]);
    }

    // 5. Ensure sample Pending & Confirmed Guide and Hotel bookings exist for dashboard testing
    const pendingGuideBookingCount = await Booking.countDocuments({ bookingType: 'guide' });
    if (pendingGuideBookingCount === 0 && guides.length >= 1) {
      await Booking.insertMany([
        {
          touristId: tourist1._id,
          bookingType: 'guide',
          guideId: guides[0]._id,
          startDate: new Date('2026-12-10'),
          endDate: new Date('2026-12-12'),
          serviceDays: 3,
          dailyRateLKR: guides[0].dailyRate,
          travelersCount: 2,
          serviceNotes: 'Interested in UNESCO Cultural Triangle sites (Sigiriya, Dambulla & Polonnaruwa) with sunrise photography.',
          totalAmount: guides[0].dailyRate * 3,
          currency: 'LKR',
          status: 'Pending'
        },
        {
          touristId: tourist2._id,
          bookingType: 'guide',
          guideId: guides[0]._id,
          startDate: new Date('2026-12-18'),
          endDate: new Date('2026-12-19'),
          serviceDays: 2,
          dailyRateLKR: guides[0].dailyRate,
          travelersCount: 3,
          serviceNotes: 'Kandy Heritage Walk, Royal Botanical Gardens and Temple of the Tooth evening ceremony.',
          totalAmount: guides[0].dailyRate * 2,
          currency: 'LKR',
          status: 'Confirmed'
        }
      ]);
    }

    const pendingHotelBookingCount = await Booking.countDocuments({ bookingType: 'hotel' });
    if (pendingHotelBookingCount === 0 && hotels.length >= 1) {
      const kandyHotel = hotels[0];
      const firstRoom = kandyHotel.rooms[0];
      await Booking.insertMany([
        {
          touristId: tourist1._id,
          bookingType: 'hotel',
          hotelId: kandyHotel._id,
          roomId: String(firstRoom._id),
          roomType: firstRoom.type,
          roomQuantity: 1,
          checkInDate: new Date('2026-12-10'),
          checkOutDate: new Date('2026-12-13'),
          nights: 3,
          guestsCount: 2,
          roomRatePerNightLKR: firstRoom.pricePerNight,
          specialRequests: 'High floor river view room if available, late arrival around 6:00 PM.',
          totalAmount: firstRoom.pricePerNight * 3,
          currency: 'LKR',
          status: 'Pending'
        },
        {
          touristId: tourist2._id,
          bookingType: 'hotel',
          hotelId: kandyHotel._id,
          roomId: String(firstRoom._id),
          roomType: firstRoom.type,
          roomQuantity: 2,
          checkInDate: new Date('2026-12-20'),
          checkOutDate: new Date('2026-12-22'),
          nights: 2,
          guestsCount: 4,
          roomRatePerNightLKR: firstRoom.pricePerNight,
          specialRequests: 'Adjacent rooms requested for family.',
          totalAmount: firstRoom.pricePerNight * 2 * 2,
          currency: 'LKR',
          status: 'Confirmed'
        }
      ]);
    }

    // Synchronize ratings on all guides and hotels
    for (const g of guides) {
      await recalculateTargetRating('guide', g._id);
    }
    for (const h of hotels) {
      await recalculateTargetRating('hotel', h._id);
    }

    console.log('Module 4 & 5 Services, Rooms, Bookings & Reviews Seeding Complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err.message);
    process.exit(1);
  }
};

seedServicesAndReviews();
