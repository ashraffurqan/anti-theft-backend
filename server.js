require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');

const Capture = require('./models/Capture');
const { uploadBuffer } = require('./services/cloudinaryService');
const { analyzeImage } = require('./services/geminiService');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// Simple auth check — har request pe DEVICE_AUTH_TOKEN zaroori hai
// taake koi aur random log aapke Cloudinary/Gemini free-tier quota na khaye
function requireAuth(req, res, next) {
  const token = req.headers['x-device-token'];
  if (token !== process.env.DEVICE_AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// 1) App volume-up trigger ke baad yahan photo POST karegi
app.post('/api/capture', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Photo nahi mili' });
    const deviceId = req.body.deviceId || 'unknown-device';

    // 1. Cloudinary pe upload
    const uploadResult = await uploadBuffer(req.file.buffer, deviceId);

    // 2. DB mein "pending" record bana den (fast response ke liye)
    const capture = await Capture.create({
      deviceId,
      imageUrl: uploadResult.secure_url,
      status: 'pending'
    });

    // App ko turant respond kar den — widget "processing..." dikha sakta hai
    res.json({ captureId: capture._id, imageUrl: uploadResult.secure_url, status: 'pending' });

    // 3. Gemini analysis background mein (response ke baad) chalayen
    analyzeImage(req.file.buffer)
      .then(async ({ text, keyUsed }) => {
        capture.geminiResponse = text;
        capture.status = 'analyzed';
        capture.geminiKeyUsed = keyUsed;
        await capture.save();
        console.log(`Capture ${capture._id} analyzed using Gemini key ${keyUsed}`);
      })
      .catch(async (err) => {
        capture.status = 'failed';
        capture.geminiResponse = 'Analysis fail hui: ' + err.message;
        await capture.save();
        console.error('Gemini analysis error:', err.message);
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// 2) Android widget yeh endpoint poll karega latest status ke liye
app.get('/api/status/:deviceId', requireAuth, async (req, res) => {
  const latest = await Capture.findOne({ deviceId: req.params.deviceId }).sort({ createdAt: -1 });
  if (!latest) return res.json({ status: 'none' });
  res.json({
    status: latest.status,
    imageUrl: latest.imageUrl,
    geminiResponse: latest.geminiResponse,
    createdAt: latest.createdAt
  });
});

// 3) History (optional, app ke andar list dikhane ke liye)
app.get('/api/history/:deviceId', requireAuth, async (req, res) => {
  const captures = await Capture.find({ deviceId: req.params.deviceId })
    .sort({ createdAt: -1 })
    .limit(20);
  res.json(captures);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server chal raha hai port ${PORT} par`));
