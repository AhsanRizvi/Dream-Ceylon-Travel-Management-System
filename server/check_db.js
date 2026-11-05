const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/dream-ceylon';

async function check() {
  console.log('Connecting to URI:', uri);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected successfully to MongoDB!');
    
    // Check admin / list databases
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('Available databases:', dbs.databases.map(d => `${d.name} (${d.sizeOnDisk} bytes)`));

    // Current DB collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in current DB (' + mongoose.connection.db.databaseName + '):', collections.map(c => c.name));

    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`Collection "${col.name}" has ${count} document(s).`);
      if (count > 0 && (col.name === 'destinations' || col.name === 'packages')) {
        const sample = await mongoose.connection.db.collection(col.name).find().limit(2).toArray();
        console.log(`Sample from "${col.name}":`, JSON.stringify(sample, null, 2));
      }
    }

    await mongoose.disconnect();
    console.log('Done checking database.');
    process.exit(0);
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  }
}

check();

