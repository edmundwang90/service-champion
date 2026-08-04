const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const Record = require('./models/Record');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 8000;

// 1. Middleware (CORS for Express routes)
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:4000',
    'https://service-champion.vercel.app'
  ],
  credentials: true
}));

app.use(express.json());

// 2. Custom Debugging Logger 
app.use((req, res, next) => {
  console.log(`➡️ [${req.method}] ${req.url}`);
  next();
});

// 3. Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 4. Socket.io Setup (Updated CORS to include Vercel and local ports)
const io = new Server(server, {
  cors: { 
    origin: [
      'http://localhost:3000',
      'http://localhost:4000',
      'https://service-champion.vercel.app'
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 New Crew Client Connected: ${socket.id}`);
});

// 5. API Routes

// GET: Fetch Leaderboard
app.get('/api/records', async (req, res) => {
  try {
    const records = await Record.find().sort({ timeTaken: 1 });
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Submit Score & Broadcast via Socket.io
app.post('/api/records', async (req, res) => {
  try {
    const { badgeName, employeeId, galaxyId, timeTaken } = req.body;
    
    const newRecord = new Record({ badgeName, employeeId, galaxyId, timeTaken });
    await newRecord.save();
    console.log(`💾 Saved time for ${badgeName}: ${timeTaken}ms`);

    const updatedRecords = await Record.find().sort({ timeTaken: 1 });
    io.emit('leaderboardUpdated', updatedRecords);

    res.status(201).json(newRecord);
  } catch (err) {
    console.error("❌ Save Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT: Update an existing record
app.put('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { badgeName, employeeId, galaxyId, timeTaken } = req.body;

    const updatedRecord = await Record.findByIdAndUpdate(
      id,
      { badgeName, employeeId, galaxyId, timeTaken },
      { new: true } 
    );

    if (!updatedRecord) {
      return res.status(404).json({ error: 'Record not found' });
    }

    console.log(`📝 Updated record for ${badgeName}`);

    const allRecords = await Record.find().sort({ timeTaken: 1 });
    io.emit('leaderboardUpdated', allRecords);

    res.status(200).json(updatedRecord);
  } catch (err) {
    console.error("❌ Update Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Remove a record
app.delete('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedRecord = await Record.findByIdAndDelete(id);
    
    if (!deletedRecord) {
      return res.status(404).json({ error: 'Record not found' });
    }

    console.log(`🗑️ Deleted record with ID: ${id}`);

    const allRecords = await Record.find().sort({ timeTaken: 1 });
    io.emit('leaderboardUpdated', allRecords);

    res.status(200).json({ message: 'Record deleted successfully' });
  } catch (err) {
    console.error("❌ Delete Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// 6. 404 Catch-All
app.use((req, res) => {
  console.log(`⚠️ 404 ERROR: Frontend tried to hit [${req.method}] ${req.url}`);
  res.status(404).json({ error: "Route not found on backend" });
});

// 7. Start Server
server.listen(PORT, () => {
  console.log(`🚀 Backend Server running securely on http://localhost:${PORT}`);
});