const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import Models
const Student = require('./models/Student');
const Wallet = require('./models/Wallet');
const Expense = require('./models/Expense');
const Transaction = require('./models/Transaction');
const Notice = require('./models/Notice');

const app = express();
app.use(cors());
app.use(express.json());

// This magically converts MongoDB's "_id" into standard "id" so React doesn't break!
mongoose.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => { delete ret._id; delete ret.__v; }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// 1. GET ALL DATABASE DATA (Runs when the app opens)
app.get('/api/data', async (req, res) => {
  try {
    const students = await Student.find();
    const wallets = await Wallet.find();
    const expenses = await Expense.find();
    const txns = await Transaction.find().sort({ date: -1 });
    const notices = await Notice.find().sort({ date: -1 });
    res.json({ students, wallets, expenses, txns, notices });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. STUDENTS
app.post('/api/students', async (req, res) => {
  try {
    const existing = await Student.findOne({ phone: req.body.phone });
    if (existing) return res.status(400).json({ error: "Phone number already registered." });
    
    const student = await Student.create(req.body);
    const wallet = await Wallet.create({ studentId: student.id, balance: 0 });
    res.json({ student, wallet });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    if (req.body.phone) {
       const existing = await Student.findOne({ phone: req.body.phone, _id: { $ne: req.params.id } });
       if (existing) return res.status(400).json({ error: "Phone number is already used." });
    }
    await Student.findByIdAndUpdate(req.params.id, req.body);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    await Wallet.deleteMany({ studentId: req.params.id });
    await Expense.deleteMany({ studentId: req.params.id });
    await Transaction.deleteMany({ studentId: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. WALLETS & LEDGER
app.post('/api/wallets/load', async (req, res) => {
  try {
    const { studentId, amount, note } = req.body;
    await Wallet.findOneAndUpdate({ studentId }, { $inc: { balance: amount } });
    await Transaction.create({ studentId, type: 'Credit', amount, description: note || "Wallet Top-Up by Admin" });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. EXPENSES (With Bulk Support)
app.post('/api/expenses', async (req, res) => {
  try {
    const { studentIds, amount, description } = req.body;
    const docs = studentIds.map(id => ({ studentId: id, amount, description }));
    await Expense.insertMany(docs);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/expenses/:id', async (req, res) => {
  try {
    const { amount, description, applyToAllIdentical } = req.body;
    const target = await Expense.findById(req.params.id);
    if (applyToAllIdentical) {
      await Expense.updateMany(
        { description: target.description, amount: target.amount, isPaid: false },
        { amount, description }
      );
    } else {
      await Expense.findByIdAndUpdate(req.params.id, { amount, description });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const target = await Expense.findById(req.params.id);
    if (req.body.applyToAllIdentical) {
      await Expense.deleteMany({ description: target.description, amount: target.amount, isPaid: false });
    } else {
      await Expense.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. BILL PAYMENTS
app.post('/api/pay', async (req, res) => {
  try {
    const { expenseId } = req.body;
    const exp = await Expense.findById(expenseId);
    if (!exp) return res.status(404).json({ error: "Expense not found." });
    
    const w = await Wallet.findOne({ studentId: exp.studentId });
    if (w.balance < exp.amount) return res.status(400).json({ error: "Insufficient balance." });
    
    w.balance -= exp.amount;
    await w.save();
    
    exp.isPaid = true;
    await exp.save();
    
    await Transaction.create({ studentId: exp.studentId, type: 'Debit', amount: exp.amount, description: "Payment: " + exp.description });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. NOTICES
app.post('/api/notices', async (req, res) => {
  try {
    await Notice.create({ text: req.body.text });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/notices/:id', async (req, res) => {
  try {
    await Notice.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));