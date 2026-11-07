const { GoogleGenerativeAI } = require('@google/generative-ai');

// Dono accounts ki keys load karen
const keys = [
  { id: 1, key: process.env.GEMINI_API_KEY_1 },
  { id: 2, key: process.env.GEMINI_API_KEY_2 }
].filter(k => k.key); // agar koi key missing ho to skip

if (keys.length === 0) {
  throw new Error('Koi Gemini API key nahi mili — .env check karen');
}

const PROMPT = `Yeh tasveer ek phone ki front camera se li gayi hai jo "anti-theft" trigger se li gayi (device ka asal malik absent hai). 
Tasveer mein jo insaan nazar aa raha hai uska chehra, pehnawa, aur maahol (indoor/outdoor, din/raat) describe karen. 
Agar koi cheez mushkook ya note karne layak lage to batayen. 2-3 lines mein jawab den, Roman Urdu ya English mein, jo bhi natural ho.`;

/**
 * Ek image buffer ko Gemini se analyze karwata hai.
 * Pehle Account 1 try karta hai; agar wo quota/rate-limit error de
 * (HTTP 429 ya "RESOURCE_EXHAUSTED"), to automatically Account 2 pe switch.
 */
async function analyzeImage(imageBuffer, mimeType = 'image/jpeg') {
  let lastError = null;

  for (const { id, key } of keys) {
    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const result = await model.generateContent([
        { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
        { text: PROMPT }
      ]);

      const text = result.response.text();
      return { text, keyUsed: id };
    } catch (err) {
      const isQuotaError =
        err?.status === 429 ||
        /RESOURCE_EXHAUSTED|quota/i.test(err?.message || '');

      console.warn(`Gemini account ${id} fail hui:`, err.message);
      lastError = err;

      if (!isQuotaError) {
        // Quota ka masla nahi, kisi aur wajah se fail hua — phir bhi
        // doosri key try kar lete hain, nuksan nahi.
        continue;
      }
      // Quota khatam — loop agli key try karega
    }
  }

  throw lastError || new Error('Sari Gemini keys fail ho gayin');
}

module.exports = { analyzeImage };
