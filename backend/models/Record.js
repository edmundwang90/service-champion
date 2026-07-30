const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
  badgeName: { type: String, required: true },
  employeeId: { type: String, required: true },
  timeTaken: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Record', RecordSchema);