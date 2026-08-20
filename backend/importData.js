const mongoose = require('mongoose');
const xlsx = require('xlsx');
require('dotenv').config();
const Record = require('./models/Record');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error(err));

// Bulletproof Date Parser
const parseExcelDate = (dateVal, timeVal) => {
  if (!dateVal || dateVal === '-') return new Date();

  let jsDate;

  // 1. If Excel turned the date into a serial number (e.g., 45145)
  if (typeof dateVal === 'number') {
    jsDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
  } 
  // 2. If it is still a string with slashes
  else if (typeof dateVal === 'string' && dateVal.includes('/')) {
    const parts = dateVal.split('/');
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    // Failsafe if Excel flipped it to MM/DD/YYYY
    if (month > 12) {
      day = parseInt(parts[1], 10);
      month = parseInt(parts[0], 10);
    }
    jsDate = new Date(year, month - 1, day);
  } else {
    return new Date(); // Fallback
  }

  // Parse time safely
  if (timeVal && typeof timeVal === 'string' && timeVal.includes(':')) {
    const timeParts = timeVal.split(':');
    jsDate.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), 0, 0);
  } else if (typeof timeVal === 'number') {
     // If Excel turned time into a fraction of a day
     const totalSeconds = Math.round(timeVal * 86400);
     jsDate.setHours(Math.floor(totalSeconds / 3600), Math.floor((totalSeconds % 3600) / 60), 0, 0);
  }

  return jsDate;
};

const workbook = xlsx.readFile('./Campaign_Records.xlsx');
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

const formattedData = data.map(row => {
  const historicalDate = parseExcelDate(row['Date'], row['Time']);

  return {
    badgeName: row['Badge Name'],
    employeeId: row['ERN'],
    galaxyId: row['Galaxy ID'],
    timeTaken: row['Raw Time (ms)'],
    createdAt: historicalDate,
    updatedAt: historicalDate
  };
});

const importData = async () => {
  try {
    // Wipe the bad data first
    await Record.deleteMany({}); 
    console.log('🗑️ Cleared bad records...');

    // Bypass Mongoose timestamps
    await Record.collection.insertMany(formattedData);
    console.log(`✅ Successfully imported ${formattedData.length} records with accurate historical dates!`);
    
    process.exit();
  } catch (error) {
    console.error('❌ Error importing data:', error);
    process.exit(1);
  }
};

importData();