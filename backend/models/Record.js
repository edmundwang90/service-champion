const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  badgeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  galaxyId: { type: String, required: false }, // <-- Make sure this line exists!
  timeTaken: { type: Number, required: true }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Record', recordSchema);