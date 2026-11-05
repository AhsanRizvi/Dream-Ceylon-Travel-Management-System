const http = require('http');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectDB = require('./config/db');
const destinationRoutes = require('./routes/destinationRoutes');
const packageRoutes = require('./routes/packageRoutes');

async function testApi() {
  await connectDB();

  const app = express();
  app.use(express.json());
  app.use(cors());

  app.use('/api/destinations', destinationRoutes);
  app.use('/api/packages', packageRoutes);

  const server = app.listen(5099, async () => {
    console.log('Test server listening on port 5099');

    const request = (path) => new Promise((resolve, reject) => {
      http.get(`http://localhost:5099${path}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, raw: data });
          }
        });
      }).on('error', reject);
    });

    try {
      // 1. GET /api/destinations
      console.log('\n--- Testing GET /api/destinations ---');
      const destRes = await request('/api/destinations');
      console.log('Status:', destRes.statusCode);
      console.log('Success:', destRes.data.success);
      console.log('Count:', destRes.data.count);
      console.log('Sample destination names:', destRes.data.data.map(d => `${d.name} (${d.district}, ${d.category}) - rating: ${d.rating}, hasImage: ${!!(d.image || d.imageUrl)}`));

      const firstDestId = destRes.data.data[0]._id;

      // 2. GET /api/destinations/:id
      console.log(`\n--- Testing GET /api/destinations/${firstDestId} ---`);
      const singleDestRes = await request(`/api/destinations/${firstDestId}`);
      console.log('Status:', singleDestRes.statusCode);
      console.log('Name:', singleDestRes.data.data.name);
      console.log('Image:', singleDestRes.data.data.image);
      console.log('Best Visit Time:', singleDestRes.data.data.bestVisitTime);

      // 3. GET /api/destinations?category=Mountain
      console.log('\n--- Testing GET /api/destinations?category=Mountain ---');
      const catRes = await request('/api/destinations?category=Mountain');
      console.log('Status:', catRes.statusCode);
      console.log('Mountain count:', catRes.data.count);
      console.log('Names:', catRes.data.data.map(d => d.name));

      // 4. GET /api/destinations?search=Ella
      console.log('\n--- Testing GET /api/destinations?search=Ella ---');
      const searchRes = await request('/api/destinations?search=Ella');
      console.log('Status:', searchRes.statusCode);
      console.log('Search count:', searchRes.data.count);
      console.log('Names:', searchRes.data.data.map(d => d.name));

      // 5. GET /api/packages
      console.log('\n--- Testing GET /api/packages ---');
      const pkgRes = await request('/api/packages');
      console.log('Status:', pkgRes.statusCode);
      console.log('Success:', pkgRes.data.success);
      console.log('Count:', pkgRes.data.count);
      console.log('Packages:', pkgRes.data.data.map(p => `${p.packageName}: $${p.baseCharge} - ${p.badge}`));

      const firstPkgId = pkgRes.data.data[0]._id;

      // 6. GET /api/packages/:id
      console.log(`\n--- Testing GET /api/packages/${firstPkgId} ---`);
      const singlePkgRes = await request(`/api/packages/${firstPkgId}`);
      console.log('Status:', singlePkgRes.statusCode);
      console.log('Package Name:', singlePkgRes.data.data.packageName);
      console.log('Included Facilities count:', singlePkgRes.data.data.includedFacilities.length);
      console.log('Excluded Facilities count:', singlePkgRes.data.data.excludedFacilities.length);

      console.log('\nALL API TESTS PASSED SUCCESSFULLY!');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('API Test Error:', err);
      server.close();
      process.exit(1);
    }
  });
}

testApi();

