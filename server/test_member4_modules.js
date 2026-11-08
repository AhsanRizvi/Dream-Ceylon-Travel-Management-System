/**
 * Comprehensive Automated Verification Suite for MEMBER 4:
 * MODULE 4 - GUIDE AND HOTEL MANAGEMENT
 */
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

dotenv.config();

const createTestApp = () => {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/guides', require('./routes/guideRoutes'));
  app.use('/api/hotels', require('./routes/hotelRoutes'));
  app.use('/api/bookings', require('./routes/bookingRoutes'));
  app.use('/api/uploads', require('./routes/uploadRoutes'));
  app.use('/api/reviews', require('./routes/reviewRoutes'));
  return app;
};

let passed = 0;
let failed = 0;

const assert = (condition, label, details = '') => {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${label}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${label} ${details ? `-> ${details}` : ''}`);
  }
};

const runTests = async () => {
  await connectDB();
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const req = async (method, endpoint, body = null, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  const uniqueSuffix = Date.now();
  let guideTokenA = null;
  let guideIdA = null;
  let guideTokenB = null;
  let hotelOwnerTokenA = null;
  let hotelIdA = null;
  let createdRoomId = null;
  let hotelOwnerTokenB = null;
  let touristToken = null;
  let guideBookingId = null;
  let hotelBookingId = null;

  try {
    console.log('\n=== 1. IMAGE UPLOAD SERVICE & VALIDATION ===');
    // 1x1 transparent PNG base64
    const validPngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const uploadRes = await req('POST', '/uploads/image', {
      imageData: validPngDataUrl,
      fileName: 'avatar.png',
      category: 'guide'
    });
    assert(
      uploadRes.status === 201 && uploadRes.data.success && uploadRes.data.url.includes('/uploads/'),
      'Valid PNG image upload saves file and returns public URL'
    );

    const invalidUploadRes = await req('POST', '/uploads/image', {
      imageData: 'data:application/pdf;base64,JVBERi0xLjQ=',
      fileName: 'malicious.pdf'
    });
    assert(
      invalidUploadRes.status === 400 && !invalidUploadRes.data.success,
      'Rejects non-image MIME types (application/pdf) with 400 error'
    );

    console.log('\n=== 2. TOUR GUIDE REGISTRATION, PROFILE & AVAILABILITY ===');
    const guideRegRes = await req('POST', '/guides/register', {
      name: `Test Guide A ${uniqueSuffix}`,
      email: `guide.a.${uniqueSuffix}@dreamceylon.lk`,
      password: 'Password123!',
      contactNumber: '+94 77 111 2233',
      profilePhoto: uploadRes.data.url,
      bio: 'Certified Cultural Triangle & Kandy heritage specialist with 10 years experience.',
      languages: ['English', 'German', 'Sinhala'],
      serviceAreas: ['Kandy', 'Sigiriya', 'Polonnaruwa'],
      expertise: ['Cultural', 'Historical'],
      experienceYears: 10,
      dailyRate: 16000,
      availability: true,
      qualifications: ['SLTDA National Guide License #NTG-9999']
    });
    assert(
      guideRegRes.status === 201 && guideRegRes.data.token && guideRegRes.data.user.role === 'guide',
      'POST /api/guides/register creates guide account, assigns role="guide", and returns JWT'
    );
    guideTokenA = guideRegRes.data.token;
    guideIdA = guideRegRes.data.data._id;

    // Register second guide B for ownership security testing
    const guideRegB = await req('POST', '/guides/register', {
      name: `Test Guide B ${uniqueSuffix}`,
      email: `guide.b.${uniqueSuffix}@dreamceylon.lk`,
      password: 'Password123!',
      contactNumber: '+94 77 444 5566',
      bio: 'Southern coast specialist.',
      languages: ['English'],
      serviceAreas: ['Galle'],
      experienceYears: 4,
      dailyRate: 12000
    });
    guideTokenB = guideRegB.data.token;

    const myGuideProf = await req('GET', '/guides/profile/me', null, guideTokenA);
    assert(
      myGuideProf.status === 200 &&
      myGuideProf.data.hasProfile === true &&
      myGuideProf.data.profileCompletion.percentage === 100,
      'GET /api/guides/profile/me returns guide profile and 100% completion status'
    );

    const updateGuideProf = await req(
      'PUT',
      '/guides/profile/me',
      { dailyRate: 17500, experienceYears: 11 },
      guideTokenA
    );
    assert(
      updateGuideProf.status === 200 && updateGuideProf.data.data.dailyRate === 17500,
      'PUT /api/guides/profile/me updates guide dailyRate and experienceYears'
    );

    // Ownership security: Guide B tries to edit Guide A's profile by ID
    const unauthorizedGuideEdit = await req(
      'PUT',
      `/guides/${guideIdA}`,
      { dailyRate: 500 },
      guideTokenB
    );
    assert(
      unauthorizedGuideEdit.status === 403,
      'Prevents Guide B from modifying Guide A profile (403 Forbidden)'
    );

    // Guide availability update & check
    const availUpdate = await req(
      'PUT',
      '/guides/availability',
      {
        availability: true,
        unavailableDates: [
          {
            startDate: '2027-05-10',
            endDate: '2027-05-12',
            reason: 'Private German Group Tour'
          }
        ]
      },
      guideTokenA
    );
    assert(
      availUpdate.status === 200 && availUpdate.data.data.unavailableDates.length === 1,
      'PUT /api/guides/availability saves blocked date ranges'
    );

    const checkConflict = await req(
      'GET',
      `/guides/${guideIdA}/availability?startDate=2027-05-11&endDate=2027-05-13`
    );
    assert(
      checkConflict.status === 200 && checkConflict.data.data.dateRangeAvailable === false,
      'GET /api/guides/:id/availability detects blocked date conflict accurately'
    );

    console.log('\n=== 3. GUIDE DISCOVERY & FILTERING ===');
    const filterGuidesRes = await req(
      'GET',
      '/guides?district=Kandy&language=German&minPrice=15000&maxPrice=20000&minExperience=8&availability=true'
    );
    assert(
      filterGuidesRes.status === 200 &&
      filterGuidesRes.data.data.some((g) => String(g._id) === String(guideIdA)),
      'GET /api/guides filters by district, language, price range, experience, and availability'
    );

    console.log('\n=== 4. HOTEL OWNER REGISTRATION, PROFILE & ROOM CRUD ===');
    const hotelRegRes = await req('POST', '/hotels/register', {
      ownerName: `Test Hotel Group A ${uniqueSuffix}`,
      email: `hotel.a.${uniqueSuffix}@dreamceylon.lk`,
      password: 'Password123!',
      contactNumber: '+94 81 222 3344',
      name: `Grand Kandy Heritage Hotel ${uniqueSuffix}`,
      district: 'Kandy',
      address: '10 Temple Street, Kandy',
      latitude: 7.2936,
      longitude: 80.6413,
      description: 'Luxury heritage hotel overlooking Kandy Lake.',
      facilities: ['Free Wi-Fi', 'Infinity Pool', 'Ayurvedic Spa'],
      checkInTime: '14:00',
      checkOutTime: '11:00',
      photos: [uploadRes.data.url],
      rooms: [
        {
          type: 'Lake View Deluxe',
          description: 'Panoramic Kandy Lake view room',
          count: 2,
          capacity: 2,
          bedConfiguration: '1 King Bed',
          roomFacilities: ['Air Conditioning', 'Lake Balcony'],
          pricePerNight: 30000,
          availability: true
        }
      ]
    });
    assert(
      hotelRegRes.status === 201 &&
      hotelRegRes.data.token &&
      hotelRegRes.data.user.role === 'hotel_owner',
      'POST /api/hotels/register creates hotel_owner account and hotel property'
    );
    hotelOwnerTokenA = hotelRegRes.data.token;
    hotelIdA = hotelRegRes.data.data._id;

    // Second hotel owner B for security tests
    const hotelRegB = await req('POST', '/hotels/register', {
      ownerName: `Test Hotel Group B ${uniqueSuffix}`,
      email: `hotel.b.${uniqueSuffix}@dreamceylon.lk`,
      password: 'Password123!',
      name: `Galle Beach Villa ${uniqueSuffix}`,
      district: 'Galle',
      pricePerNight: 25000
    });
    hotelOwnerTokenB = hotelRegB.data.token;

    // Add a new room type via POST /api/hotels/:hotelId/rooms
    const addRoomRes = await req(
      'POST',
      `/hotels/${hotelIdA}/rooms`,
      {
        type: 'Royal Kandyan Family Suite',
        description: 'Two-bedroom luxury suite',
        count: 3,
        capacity: 4,
        bedConfiguration: '2 King Beds',
        roomFacilities: ['Air Conditioning', 'Living Room', 'Jacuzzi'],
        pricePerNight: 46000,
        availability: true
      },
      hotelOwnerTokenA
    );
    assert(
      addRoomRes.status === 201 && addRoomRes.data.hotel.rooms.length === 2,
      'POST /api/hotels/:hotelId/rooms adds a new room category to the hotel'
    );
    createdRoomId = addRoomRes.data.data._id;

    // Update room via PUT /api/hotels/:hotelId/rooms/:roomId
    const editRoomRes = await req(
      'PUT',
      `/hotels/${hotelIdA}/rooms/${createdRoomId}`,
      { pricePerNight: 48000, count: 4 },
      hotelOwnerTokenA
    );
    assert(
      editRoomRes.status === 200 && editRoomRes.data.data.pricePerNight === 48000,
      'PUT /api/hotels/:hotelId/rooms/:roomId updates room pricePerNight and count'
    );

    // Ownership security: Hotel Owner B tries to edit Hotel A's room
    const unauthorizedRoomEdit = await req(
      'PUT',
      `/hotels/${hotelIdA}/rooms/${createdRoomId}`,
      { pricePerNight: 1000 },
      hotelOwnerTokenB
    );
    assert(
      unauthorizedRoomEdit.status === 403,
      'Prevents Hotel Owner B from modifying Hotel Owner A rooms (403 Forbidden)'
    );

    console.log('\n=== 5. HOTEL DISCOVERY & FILTERING ===');
    const filterHotelsRes = await req(
      'GET',
      '/hotels?district=Kandy&facility=Infinity%20Pool&minPrice=25000&maxPrice=35000'
    );
    assert(
      filterHotelsRes.status === 200 &&
      filterHotelsRes.data.data.some((h) => String(h._id) === String(hotelIdA)),
      'GET /api/hotels filters by district, facility, and starting price range'
    );

    console.log('\n=== 6. TOURIST GUIDE & HOTEL BOOKING REQUESTS & STATUS WORKFLOW ===');
    const touristReg = await req('POST', '/auth/register', {
      name: `Test Tourist ${uniqueSuffix}`,
      email: `tourist.${uniqueSuffix}@dreamceylon.lk`,
      password: 'Password123!',
      role: 'tourist'
    });
    touristToken = touristReg.data.token;

    // Create Guide Booking Request (3 days: 2027-06-01 to 2027-06-03 @ 17,500 LKR/day = 52,500 LKR)
    const createGuideBookRes = await req(
      'POST',
      '/bookings/guides',
      {
        guideId: guideIdA,
        startDate: '2027-06-01',
        endDate: '2027-06-03',
        travelersCount: 2,
        serviceNotes: 'Cultural Triangle photography tour',
        totalAmount: 100 // Tampered frontend total — backend must ignore and calculate 52,500!
      },
      touristToken
    );
    assert(
      createGuideBookRes.status === 201 &&
      createGuideBookRes.data.data.serviceDays === 3 &&
      createGuideBookRes.data.data.totalAmount === 52500 &&
      createGuideBookRes.data.data.status === 'Pending',
      'POST /api/bookings/guides calculates authoritative totalAmount (17500 * 3 = 52500 LKR) and sets Pending status'
    );
    guideBookingId = createGuideBookRes.data.data._id;

    // Tourist tries to confirm their own booking -> must fail with 403
    const touristSelfConfirm = await req(
      'PUT',
      `/bookings/${guideBookingId}/status`,
      { status: 'Confirmed' },
      touristToken
    );
    assert(
      touristSelfConfirm.status === 403,
      'Prevents tourist from confirming their own booking request (403 Forbidden)'
    );

    // Guide A confirms the booking
    const guideConfirmRes = await req(
      'PUT',
      `/bookings/${guideBookingId}/status`,
      { status: 'Confirmed', providerNote: 'Looking forward to guiding you in Kandy!' },
      guideTokenA
    );
    assert(
      guideConfirmRes.status === 200 && guideConfirmRes.data.data.status === 'Confirmed',
      'Owning Guide confirms booking request via PUT /api/bookings/:id/status'
    );

    // Overlapping guide booking on already confirmed dates must be rejected
    const overlappingGuideBook = await req(
      'POST',
      '/bookings/guides',
      {
        guideId: guideIdA,
        startDate: '2027-06-02',
        endDate: '2027-06-04',
        travelersCount: 2
      },
      touristToken
    );
    assert(
      overlappingGuideBook.status === 400,
      'Prevents creating a guide booking that overlaps with an already Confirmed booking'
    );

    // Hotel Booking: Test guest capacity validation first (1 room of capacity 2 with 5 guests -> 400)
    const firstRoomId = hotelRegRes.data.data.rooms[0]._id;
    const exceedCapacityRes = await req(
      'POST',
      '/bookings/hotels',
      {
        hotelId: hotelIdA,
        roomId: firstRoomId,
        roomQuantity: 1,
        guestsCount: 5,
        checkInDate: '2027-07-10',
        checkOutDate: '2027-07-12'
      },
      touristToken
    );
    assert(
      exceedCapacityRes.status === 400,
      'Rejects hotel booking when guestsCount exceeds room capacity * roomQuantity'
    );

    // Valid Hotel Booking (2 rooms of Lake View Deluxe @ 30,000 LKR for 2 nights = 120,000 LKR)
    const validHotelBookRes = await req(
      'POST',
      '/bookings/hotels',
      {
        hotelId: hotelIdA,
        roomId: firstRoomId,
        roomQuantity: 2,
        guestsCount: 4,
        checkInDate: '2027-07-10',
        checkOutDate: '2027-07-12',
        specialRequests: 'High floor lake view'
      },
      touristToken
    );
    assert(
      validHotelBookRes.status === 201 &&
      validHotelBookRes.data.data.nights === 2 &&
      validHotelBookRes.data.data.totalAmount === 120000,
      'POST /api/bookings/hotels calculates authoritative totalAmount (30000 * 2 rooms * 2 nights = 120000 LKR)'
    );
    hotelBookingId = validHotelBookRes.data.data._id;

    // Hotel Owner A confirms the reservation
    const hotelConfirmRes = await req(
      'PUT',
      `/bookings/${hotelBookingId}/status`,
      { status: 'Confirmed' },
      hotelOwnerTokenA
    );
    assert(
      hotelConfirmRes.status === 200 && hotelConfirmRes.data.data.status === 'Confirmed',
      'Owning Hotel Owner confirms hotel reservation via PUT /api/bookings/:id/status'
    );

    // Deleting a room with an active future Confirmed reservation must be blocked
    const deleteActiveRoomRes = await req(
      'DELETE',
      `/hotels/${hotelIdA}/rooms/${firstRoomId}`,
      null,
      hotelOwnerTokenA
    );
    assert(
      deleteActiveRoomRes.status === 400,
      'Prevents deleting a room category that has active future Confirmed reservations'
    );

    // Deleting the second room (no bookings) succeeds
    const deleteUnusedRoomRes = await req(
      'DELETE',
      `/hotels/${hotelIdA}/rooms/${createdRoomId}`,
      null,
      hotelOwnerTokenA
    );
    assert(
      deleteUnusedRoomRes.status === 200 && deleteUnusedRoomRes.data.hotel.rooms.length === 1,
      'DELETE /api/hotels/:hotelId/rooms/:roomId deletes unused room category cleanly'
    );

    // Tourist fetches their bookings via GET /api/bookings/my-requests
    const myRequestsRes = await req('GET', '/bookings/my-requests', null, touristToken);
    assert(
      myRequestsRes.status === 200 && myRequestsRes.data.count >= 2,
      'GET /api/bookings/my-requests returns tourist guide and hotel booking requests'
    );

    // Cleanup test documents
    const User = require('./models/User');
    const Guide = require('./models/Guide');
    const Hotel = require('./models/Hotel');
    const Booking = require('./models/Booking');
    await Booking.deleteMany({ _id: { $in: [guideBookingId, hotelBookingId] } });
    await Guide.deleteMany({ _id: { $in: [guideIdA, guideRegB.data.data._id] } });
    await Hotel.deleteMany({ _id: { $in: [hotelIdA, hotelRegB.data.data._id] } });
    await User.deleteMany({
      email: {
        $in: [
          `guide.a.${uniqueSuffix}@dreamceylon.lk`,
          `guide.b.${uniqueSuffix}@dreamceylon.lk`,
          `hotel.a.${uniqueSuffix}@dreamceylon.lk`,
          `hotel.b.${uniqueSuffix}@dreamceylon.lk`,
          `tourist.${uniqueSuffix}@dreamceylon.lk`
        ]
      }
    });

    console.log(`\n======================================================`);
    console.log(`MEMBER 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`======================================================\n`);
  } catch (err) {
    failed++;
    console.error('UNCAUGHT TEST ERROR:', err);
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(failed > 0 ? 1 : 0);
  }
};

runTests();
