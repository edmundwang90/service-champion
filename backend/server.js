const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const Record = require('./models/Record');
const User = require('./models/User'); // <-- Import the User model

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 8000;

// 1. Middleware
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

// 4. Socket.io Setup
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
  console.log(`🔌 New Client Connected: ${socket.id}`);
});

// 5. API Routes

// --- AUTHENTICATION ROUTES ---

// POST: Register a new admin user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = await User.create({ username, password });
    console.log(`👤 New user created: ${username}`);
    
    res.status(201).json({ message: 'User created successfully', userId: user._id });
  } catch (err) {
    console.error("❌ Registration Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST: Login admin user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      console.log(`🔓 User logged in: ${username}`);
      res.status(200).json({ message: 'Login successful', username: user.username });
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (err) {
    console.error("❌ Login Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- RECORD ROUTES ---

app.get('/api/records', async (req, res) => {
  try {
    const records = await Record.find().sort({ timeTaken: 1 });
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.put('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { badgeName, employeeId, galaxyId, timeTaken } = req.body;

    const updatedRecord = await Record.findByIdAndUpdate(
      id,
      { badgeName, employeeId, galaxyId, timeTaken },
      { new: true } 
    );

    if (!updatedRecord) return res.status(404).json({ error: 'Record not found' });

    console.log(`📝 Updated record for ${badgeName}`);
    const allRecords = await Record.find().sort({ timeTaken: 1 });
    io.emit('leaderboardUpdated', allRecords);

    res.status(200).json(updatedRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/records/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRecord = await Record.findByIdAndDelete(id);
    
    if (!deletedRecord) return res.status(404).json({ error: 'Record not found' });

    console.log(`🗑️ Deleted record with ID: ${id}`);
    const allRecords = await Record.find().sort({ timeTaken: 1 });
    io.emit('leaderboardUpdated', allRecords);

    res.status(200).json({ message: 'Record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Batch Delete Multiple Records
app.post('/api/records/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No record IDs provided for deletion' });
    }
    
    // Deletes all records whose _id is inside the 'ids' array
    await Record.deleteMany({ _id: { $in: ids } });
    console.log(`🗑️ Batch deleted ${ids.length} records`);

    // Fetch and broadcast updated leaderboard
    const allRecords = await Record.find().sort({ timeTaken: 1 });
    io.emit('leaderboardUpdated', allRecords);

    res.status(200).json({ message: 'Selected records deleted successfully' });
  } catch (err) {
    console.error("❌ Batch Delete Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Health Check Route for the Root URL
app.get('/', (req, res) => {
  res.status(200).json({ message: "Service Champion API is running successfully." });
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