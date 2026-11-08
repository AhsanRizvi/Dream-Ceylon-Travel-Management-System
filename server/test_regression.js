const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const express = require('express');
const cors = require('cors');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectDB = require('./config/db');
const Destination = require('./models/Destination');
const Package = require('./models/Package');
const destinationRoutes = require('./routes/destinationRoutes');
const packageRoutes = require('./routes/packageRoutes');
const mapRoutes = require('./routes/mapRoutes');

async function runRegressionTests() {
  console.log('====================================================');
  console.log('STARTING DREAM CEYLON REGRESSION SUITE');
  console.log('====================================================\n');

  // Test 1: MongoDB Connection
  console.log('Test 1: Connecting to MongoDB...');
  await connectDB();
  console.log('  PASS: MongoDB connected successfully!\n');

  // Test 2: Database Records Verification
  console.log('Test 2: Verifying MongoDB Collections and Data Integrity...');
  const destCount = await Destination.countDocuments();
  const pkgCount = await Package.countDocuments();
  console.log(`  Destination records in DB: ${destCount}`);
  console.log(`  Package records in DB: ${pkgCount}`);

  if (destCount < 9) {
    throw new Error(`Expected at least 9 destinations, found ${destCount}`);
  }
  if (pkgCount < 3) {
    throw new Error(`Expected at least 3 packages, found ${pkgCount}`);
  }

  // Check required Sri Lankan destinations
  const requiredDestNames = [
    'Sigiriya', 'Ella', 'Kandy', 'Galle Fort',
    'Yala National Park', 'Nuwara Eliya', 'Mirissa',
    'Arugam Bay', 'Horton Plains'
  ];

  for (const name of requiredDestNames) {
    const doc = await Destination.findOne({ name });
    if (!doc) {
      throw new Error(`Missing expected destination: ${name}`);
    }
    if (!doc.latitude || !doc.longitude) {
      throw new Error(`Missing GPS coordinates for: ${name}`);
    }
    if (!doc.image && !doc.imageUrl) {
      throw new Error(`Missing image URL for: ${name}`);
    }
    console.log(`  PASS: Destination "${name}" verified (${doc.district}, ${doc.category}, lat: ${doc.latitude}, lng: ${doc.longitude}, rating: ${doc.rating})`);
  }

  // Check required Packages
  const requiredPackages = ['Basic', 'Standard', 'Premium'];
  const expectedPrices = { Basic: 85, Standard: 180, Premium: 350 };

  for (const pkgName of requiredPackages) {
    const pkg = await Package.findOne({ packageName: pkgName });
    if (!pkg) {
      throw new Error(`Missing package tier: ${pkgName}`);
    }
    if (pkg.baseCharge !== expectedPrices[pkgName]) {
      throw new Error(`Incorrect price for ${pkgName}: expected ${expectedPrices[pkgName]}, got ${pkg.baseCharge}`);
    }
    if (!pkg.includedFacilities || pkg.includedFacilities.length === 0) {
      throw new Error(`Missing included facilities for ${pkgName}`);
    }
    console.log(`  PASS: Package "${pkgName}" verified ($${pkg.baseCharge}/day, ${pkg.badge}, ${pkg.includedFacilities.length} inclusions)`);
  }

  // Test 3: Express API Server and Routes Testing
  console.log('\nTest 3: Testing Express API Endpoints...');
  const app = express();
  app.use(express.json());
  app.use(cors());

  app.use('/api/destinations', destinationRoutes);
  app.use('/api/packages', packageRoutes);
  app.use('/api/maps', mapRoutes);

  const testPort = 5098;
  const server = app.listen(testPort, async () => {
    const request = (endpoint) => new Promise((resolve, reject) => {
      http.get(`http://localhost:${testPort}${endpoint}`, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }).on('error', reject);
    });

    try {
      // 3.1 GET /api/destinations
      const allDests = await request('/api/destinations');
      if (allDests.status !== 200 || !allDests.body.success || allDests.body.count < 9) {
        throw new Error(`GET /api/destinations failed: status ${allDests.status}, count ${allDests.body?.count}`);
      }
      console.log(`  PASS: GET /api/destinations returned 200 with ${allDests.body.count} destinations.`);

      // 3.2 GET /api/destinations/:id
      const firstDestId = allDests.body.data[0]._id;
      const singleDest = await request(`/api/destinations/${firstDestId}`);
      if (singleDest.status !== 200 || !singleDest.body.data || singleDest.body.data._id !== firstDestId) {
        throw new Error(`GET /api/destinations/:id failed: status ${singleDest.status}`);
      }
      console.log(`  PASS: GET /api/destinations/${firstDestId} returned 200 (${singleDest.body.data.name}).`);

      // 3.3 Filter by category: GET /api/destinations?category=Cultural
      const culturalDests = await request('/api/destinations?category=Cultural');
      if (culturalDests.status !== 200 || culturalDests.body.count < 3) {
        throw new Error(`Category filter failed: count ${culturalDests.body?.count}`);
      }
      console.log(`  PASS: GET /api/destinations?category=Cultural returned ${culturalDests.body.count} items (${culturalDests.body.data.map(d=>d.name).join(', ')}).`);

      // 3.4 Search: GET /api/destinations?search=Sigiriya
      const searchDest = await request('/api/destinations?search=Sigiriya');
      if (searchDest.status !== 200 || searchDest.body.count !== 1 || searchDest.body.data[0].name !== 'Sigiriya') {
        throw new Error(`Search failed for Sigiriya: count ${searchDest.body?.count}`);
      }
      console.log(`  PASS: GET /api/destinations?search=Sigiriya returned Sigiriya.`);

      // 3.5 GET /api/packages
      const allPackages = await request('/api/packages');
      if (allPackages.status !== 200 || !allPackages.body.success || allPackages.body.count !== 3) {
        throw new Error(`GET /api/packages failed: count ${allPackages.body?.count}`);
      }
      console.log(`  PASS: GET /api/packages returned 200 with all 3 package tiers.`);

      // 3.6 GET /api/packages/:id
      const firstPkgId = allPackages.body.data[0]._id;
      const singlePkg = await request(`/api/packages/${firstPkgId}`);
      if (singlePkg.status !== 200 || !singlePkg.body.data || singlePkg.body.data._id !== firstPkgId) {
        throw new Error(`GET /api/packages/:id failed`);
      }
      console.log(`  PASS: GET /api/packages/${firstPkgId} returned ${singlePkg.body.data.packageName}.`);

      console.log('\n====================================================');
      console.log('ALL REGRESSION TESTS PASSED WITH ZERO ERRORS!');
      console.log('====================================================');

      server.close();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Regression Test Failure:', err);
      server.close();
      await mongoose.disconnect();
      process.exit(1);
    }
  });
}

runRegressionTests();

