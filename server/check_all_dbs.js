const mongoose = require('mongoose');

async function checkAll() {
  try {
    const conn = await mongoose.connect('mongodb://localhost:27017/admin');
    const admin = conn.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('Databases:', dbs.databases.map(d => d.name));

    for (const dbInfo of dbs.databases) {
      if (['admin', 'config', 'local'].includes(dbInfo.name)) continue;
      const db = conn.connection.client.db(dbInfo.name);
      const cols = await db.listCollections().toArray();
      console.log(`\n--- DB: ${dbInfo.name} ---`);
      for (const col of cols) {
        const count = await db.collection(col.name).countDocuments();
        console.log(`  Collection: ${col.name} -> ${count} doc(s)`);
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkAll();

