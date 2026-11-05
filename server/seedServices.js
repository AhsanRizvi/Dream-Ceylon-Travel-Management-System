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
    const adminUser = await ensureUser({
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

    const hotelOwner1 = await ensureUser({
      name: 'Ceylon Heritage Hospitality',
      email: 'hotels@dreamceylon.lk',
      password: 'Password123!',
      role: 'hotel_owner'
    });

    // 2. Seed Guides if none exist
    let guides = await Guide.find();
    if (guides.length === 0) {
      guides = await Guide.insertMany([
        {
          userId: guideUser1._id,
          name: 'Nimal Bandara',
          bio: 'National Cultural & UNESCO Heritage Historian with 12+ years guiding across the Cultural Triangle and Kandy.',
          serviceAreas: ['Kandy', 'Sigiriya', 'Anuradhapura', 'Polonnaruwa'],
          languages: ['English', 'German', 'Sinhala'],
          dailyRate: 55,
          availability: true,
          rating: 0,
          reviewCount: 0
        },
        {
          userId: guideUser2._id,
          name: 'Chaminda Silva',
          bio: 'Certified Wildlife Tracker & Hill Country Trekking Specialist covering Yala, Ella, and Horton Plains.',
          serviceAreas: ['Yala', 'Ella', 'Nuwara Eliya', 'Mirissa'],
          languages: ['English', 'French', 'Sinhala'],
          dailyRate: 60,
          availability: true,
          rating: 0,
          reviewCount: 0
        },
        {
          userId: guideUser3._id,
          name: 'Priyantha Fernando',
          bio: 'Southern Coast, Galle Fort Architecture & Culinary Tour Specialist with comfortable chauffeur expertise.',
          serviceAreas: ['Galle', 'Mirissa', 'Bentota', 'Colombo'],
          languages: ['English', 'Spanish', 'Sinhala'],
          dailyRate: 45,
          availability: true,
          rating: 0,
          reviewCount: 0
        }
      ]);
      console.log('Seeded 3 Tour Guides.');
    }

    // 3. Seed Hotels if none exist
    let hotels = await Hotel.find();
    if (hotels.length === 0) {
      hotels = await Hotel.insertMany([
        {
          ownerId: hotelOwner1._id,
          name: 'Cinnamon Citadel Kandy Resort',
          location: 'Kandy',
          description: 'Tranquil riverside 4-star resort surrounded by misty hills and Mahaweli River views.',
          rooms: [
            { type: 'Superior River View', capacity: 2, count: 15 },
            { type: 'Deluxe Family Suite', capacity: 4, count: 6 }
          ],
          facilities: ['Infinity Pool', 'Free Wi-Fi', 'Ayurvedic Spa', 'Riverside Dining'],
          pricePerNight: 145,
          availability: true,
          rating: 0,
          reviewCount: 0
        },
        {
          ownerId: hotelOwner1._id,
          name: '98 Acres Mountain Eco Resort',
          location: 'Ella',
          description: 'Luxury boutique eco-chalets nestled in a scenic tea estate overlooking Little Adam’s Peak.',
          rooms: [
            { type: 'Deluxe Tea Chalet', capacity: 2, count: 10 },
            { type: 'Grand Mountain Villa', capacity: 3, count: 4 }
          ],
          facilities: ['Mountain View Deck', 'Organic Restaurant', 'Free Wi-Fi', 'Tea Tour'],
          pricePerNight: 210,
          availability: true,
          rating: 0,
          reviewCount: 0
        },
        {
          ownerId: hotelOwner1._id,
          name: 'Galle Fort Heritage Boutique Hotel',
          location: 'Galle',
          description: 'Restored 18th-century Dutch colonial mansion inside the UNESCO Galle Fort ramparts.',
          rooms: [
            { type: 'Colonial Courtyard Suite', capacity: 2, count: 8 }
          ],
          facilities: ['Courtyard Pool', 'Free Wi-Fi', 'Heritage Library', 'Seafood Bistro'],
          pricePerNight: 165,
          availability: true,
          rating: 0,
          reviewCount: 0
        },
        {
          ownerId: hotelOwner1._id,
          name: 'Sigiriya Jungle Eco Lodge',
          location: 'Sigiriya',
          description: 'Nature-immersive eco-lodge with direct views of the iconic Sigiriya Lion Rock Fortress.',
          rooms: [
            { type: 'Garden Eco Cabin', capacity: 2, count: 12 }
          ],
          facilities: ['Birdwatching Trails', 'Outdoor Pool', 'Village Curry Dining'],
          pricePerNight: 95,
          availability: true,
          rating: 0,
          reviewCount: 0
        }
      ]);
      console.log('Seeded 4 Partner Hotels.');
    }

    // 4. Seed Sample Completed Bookings & Reviews if no reviews exist yet
    const existingReviewsCount = await Review.countDocuments();
    if (existingReviewsCount === 0 && guides.length >= 2 && hotels.length >= 2) {
      const booking1 = await Booking.create({
        touristId: tourist1._id,
        guideId: guides[0]._id,
        hotelId: hotels[0]._id,
        status: 'Completed',
        totalAmount: 450
      });

      const booking2 = await Booking.create({
        touristId: tourist2._id,
        guideId: guides[0]._id,
        hotelId: hotels[1]._id,
        status: 'Completed',
        totalAmount: 680
      });

      const booking3 = await Booking.create({
        touristId: tourist3._id,
        guideId: guides[1]._id,
        hotelId: hotels[1]._id,
        status: 'Completed',
        totalAmount: 590
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

      // Synchronize ratings on all guides and hotels
      for (const g of guides) {
        await recalculateTargetRating('guide', g._id);
      }
      for (const h of hotels) {
        await recalculateTargetRating('hotel', h._id);
      }

      console.log('Seeded sample verified bookings, reviews, and synchronized ratings.');
    }

    console.log('Module 5 Services & Reviews Seeding Complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err.message);
    process.exit(1);
  }
};

seedServicesAndReviews();

