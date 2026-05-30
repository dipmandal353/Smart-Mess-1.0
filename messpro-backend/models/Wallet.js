const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  balance: { type: Number, default: 0 }
});

module.exports = mongoose.model('Wallet', walletSchema);