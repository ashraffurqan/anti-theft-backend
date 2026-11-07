# Anti-Theft Backend

## Setup
1. `npm install`
2. `.env.example` ko `.env` mein copy karen aur apni free-tier keys bharen:
   - MongoDB Atlas connection string
   - Cloudinary cloud name / key / secret
   - Dono Gemini API keys (2 alag Google accounts se)
   - `DEVICE_AUTH_TOKEN` — koi bhi lamba random string (yeh aapka app aur server ke beech password hai)
3. `npm start`

## Endpoints
- `POST /api/capture` — multipart form: `photo` (file) + `deviceId` (text). Header: `x-device-token: <DEVICE_AUTH_TOKEN>`
- `GET /api/status/:deviceId` — widget ke liye latest result
- `GET /api/history/:deviceId` — pichli 20 captures

## Deploy free tier options
- **Render.com** ya **Railway.app** — free tier pe Node app directly deploy ho jata hai (GitHub repo connect karen, env vars dashboard mein daal den)
- Codeanywhere/Cloudinary ka zikr aapne kiya — agar "Codeanywhere" IDE hai to wahan se bhi yeh code Render/Railway pe push kar sakte hain; khud Codeanywhere container public internet-facing server ke liye reliable nahi hota.

## Gemini dual-key rotation kaise kaam karta hai
`services/geminiService.js` pehle Account 1 ki key try karta hai. Agar response 429 / quota-exhausted error de, to automatically Account 2 ki key try hoti hai — koi manual switch nahi karna padta.
