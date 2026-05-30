const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  isPaid: { type: Boolean, default: false }
});

module.exports = mongoose.model('Expense', expenseSchema);