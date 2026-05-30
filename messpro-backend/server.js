const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import all your Mongoose Models
const Student = require('./models/Student');
const Wallet = require('./models/Wallet');
const Expense = require('./models/Expense');
const Transaction = require('./models/Transaction');
const Notice = require('./models/Notice');

const app = express();

// Middleware
app.use(cors()); // Allows your React app to talk to this server
app.use(express.json()); // Allows the server to understand JSON data

// Connect to MongoDB using the URI in your .env file
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.log("❌ MongoDB Connection Error:", err));

// ==========================================
// API ROUTES (The bridge to your React app)
// ==========================================

// 1. Fetch All App Data (Used when React app first loads)
app.get('/api/init', async (req, res) => {
  try {
    const students = await Student.find();
    const wallets = await Wallet.find();
    const expenses = await Expense.find();
    const txns = await Transaction.find();
    const notices = await Notice.find().sort({ date: -1 }); // Newest first

    res.json({ students, wallets, expenses, txns, notices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    // Admin check
    if (phone === "admin" && password === "admin123") {
      return res.json({ role: "admin" });
    }

    // Student check
    const student = await Student.findOne({ phone, password });
    if (student) {
      return res.json({ role: "student", id: student._id, name: student.name });
    }

    res.status(401).json({ error: "Invalid phone number or password." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Register a New Student
app.post('/api/students', async (req, res) => {
  try {
    const { name, phone, password, email, address } = req.body;

    // Check if phone already exists
    const existing = await Student.findOne({ phone });
    if (existing) return res.status(400).json({ error: "Phone number already registered." });

    // Create Student
    const newStudent = new Student({ name, phone, password, email, address });
    await newStudent.save();

    // Create an empty Wallet for the new student
    const newWallet = new Wallet({ studentId: newStudent._id, balance: 0 });
    await newWallet.save();

    res.json({ student: newStudent, wallet: newWallet });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Add a Notice
app.post('/api/notices', async (req, res) => {
  try {
    const newNotice = new Notice({ text: req.body.text });
    await newNotice.save();
    res.json(newNotice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Basic route to check if server is running
app.get('/', (req, res) => {
  res.send("MessPro Backend API is running!");
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});