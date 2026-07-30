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

// 1. Middleware (Allowing port 4000 specifically)
app.use(cors({
  origin: "http://localhost:4000",
  methods: ["GET", "POST"]
}));
app.use(express.json());

// 2. Custom Debugging Logger 
app.use((req, res, next) => {
  console.log(`➡️  [${req.method}] ${req.url}`);
  next();
});

// 3. Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 4. Socket.io Setup (Allowing port 4000)
const io = new Server(server, {
  cors: { 
    origin: "http://localhost:4000",
    methods: ["GET", "POST"]
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

// POST: Submit Score
app.post('/api/records', async (req, res) => {
  try {
    const { badgeName, employeeId, timeTaken } = req.body;
    
    const newRecord = new Record({ badgeName, employeeId, timeTaken });
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

// 6. 404 Catch-All
app.use((req, res) => {
  console.log(`⚠️  404 ERROR: Frontend tried to hit [${req.method}] ${req.url}`);
  res.status(404).json({ error: "Route not found on backend" });
});

// 7. Start Server
server.listen(PORT, () => {
  console.log(`🚀 Backend Server running securely on http://localhost:${PORT}`);
});