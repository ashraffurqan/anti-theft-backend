const mongoose = require('mongoose');

const captureSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true },
  imageUrl: { type: String, required: true },      // Cloudinary secure_url
  geminiResponse: { type: String, default: '' },     // Gemini's analysis text
  status: {
    type: String,
    enum: ['pending', 'analyzed', 'failed'],
    default: 'pending'
  },
  geminiKeyUsed: { type: Number, default: 1 },        // 1 or 2, which account answered
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Capture', captureSchema);
