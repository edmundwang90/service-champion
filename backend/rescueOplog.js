const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const rescueData = async () => {
  try {
    // 1. Connect to the database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    // 2. Access the 'local' database and 'oplog.rs' collection directly
    const db = mongoose.connection.client.db('local');
    const oplog = db.collection('oplog.rs');

    // 3. Query for all inserts ("i") made to your records collection
    const inserts = await oplog.find({ ns: "test.records", op: "i" }).toArray();

    // 4. Extract the actual record details (which are nested inside the 'o' object)
    const rescuedRecords = inserts.map(log => log.o);

    // 5. Save the rescued data to a JSON file
    fs.writeFileSync('rescued_data.json', JSON.stringify(rescuedRecords, null, 2));
    
    console.log(`✅ SUCCESS! Rescued ${rescuedRecords.length} records and saved them to 'rescued_data.json'.`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Error rescuing data:', error);
    process.exit(1);
  }
};

rescueData();