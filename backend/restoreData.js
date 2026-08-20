const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const Record = require('./models/Record');

const restore = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    // 1. Read the rescued data from the JSON file
    const rawData = fs.readFileSync('rescued_data.json', 'utf8');
    const rescuedRecords = JSON.parse(rawData);

    // 2. Get all ERNs currently in your database to prevent duplicates
    const existingRecords = await Record.find({}, 'employeeId');
    const existingErns = existingRecords.map(r => r.employeeId);

    // 3. Filter out anyone who is already in the database
    const recordsToRestore = [];

    for (let record of rescuedRecords) {
      if (!existingErns.includes(record.employeeId)) {
        
        // Fix the date strings back into proper MongoDB Date objects
        if (record.createdAt) record.createdAt = new Date(record.createdAt);
        if (record.updatedAt) record.updatedAt = new Date(record.updatedAt);
        
        // Fix the string _id back to a proper MongoDB ObjectId
        if (record._id) {
          // If the _id is an object (like {$oid: "..."}), extract the string
          const idString = typeof record._id === 'object' ? record._id.$oid : record._id;
          record._id = new mongoose.Types.ObjectId(idString);
        }

        recordsToRestore.push(record);
      }
    }

    // 4. Safely insert only the missing records directly to the collection
    if (recordsToRestore.length > 0) {
      await Record.collection.insertMany(recordsToRestore);
      console.log(`✅ SUCCESS! Safely restored ${recordsToRestore.length} missing records.`);
    } else {
      console.log('⚠️ No new missing records found to restore. Your DB might already be up to date.');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error restoring data:', error);
    process.exit(1);
  }
};

restore();