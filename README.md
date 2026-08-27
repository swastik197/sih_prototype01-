# 🌾 Smart Crop Advisory & Farmer Distress Early-Warning System

**SIH 2026 | PS-02**

A WhatsApp/SMS-based backend system to provide crop advisories, market prices, and early warnings for farmer distress, designed for high accessibility.

## Features
- 💬 **No-Frontend Architecture**: Fully accessible via WhatsApp and SMS using Twilio.
- 🧑‍🌾 **Farmer Registration Flow**: Easy onboarding via chat.
- 🌦️ **Weather Alerts**: Automated daily weather broadcasts and severe condition warnings.
- 📈 **Market Prices**: Live market price checking for various crops across mandis.
- 🚨 **Distress Scoring System**: Calculates farmer distress based on weather, crop prices, and loan data to preemptively alert authorities.
- 🗣️ **Multilingual Support**: Supports commands in Hindi and English.

## Architecture
The system employs a "headless" backend-only architecture. Users interact entirely through SMS or WhatsApp. This approach ensures maximum accessibility for farmers in rural areas who might have low bandwidth, basic feature phones, or low digital literacy. 

## Tech Stack
| Technology | Purpose |
|------------|---------|
| Node.js / Express | Backend server and API routes |
| MongoDB (Mongoose) | Database for storing farmers, prices, alerts |
| Twilio API | WhatsApp and SMS messaging gateway |
| OpenWeatherMap API | Weather data for advisories |
| node-cron | Task scheduling for alerts and updates |

## Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Twilio account
- OpenWeatherMap API key
- ngrok (for local development)

## Setup Instructions
1. Clone repo: `git clone <repo-url> && cd SIH2026`
2. Install dependencies: `npm install`
3. Setup environment variables: `cp .env.example .env` and fill in values.
4. Start MongoDB (ensure it's running on port 27017 or update `.env`).
5. Seed database: `npm run seed`
6. Start server: `npm run dev`
7. Set up ngrok: `npx ngrok http 3000` (copy the https URL)
8. Configure Twilio webhook URLs with the ngrok URL (e.g. `https://<ngrok-id>.ngrok.io/api/webhook/whatsapp`).

## Twilio Setup
1. Go to Twilio Console -> Messaging -> Try it out -> Send a WhatsApp message.
2. Join the sandbox by sending the join code to the provided number.
3. In Sandbox settings, set the "WHEN A MESSAGE COMES IN" URL to your ngrok `/api/webhook/whatsapp` URL (POST).
4. Save settings.

## Available Commands
| Intent | English Command | Hindi Command |
|--------|-----------------|---------------|
| Register | `register` | `nomaankan` / `register` |
| Weather | `weather` | `mausam` |
| Prices | `price <crop>` | `bhav <crop>` |
| Advisory | `advisory` | `salah` |
| Risk Score | `risk` | `jokhim` |
| Help | `help` | `madad` |

## API Endpoints (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/farmers` | List farmers |
| GET | `/api/admin/prices` | List market prices |
| GET | `/api/admin/alerts` | List alerts |
| POST | `/api/admin/trigger-distress-check`| Run manual distress check |
| GET | `/api/admin/stats` | View system stats |

## Distress Scoring
The distress score (0-100) is calculated based on:
- Weather damage potential
- Market price drops
- Approaching loan due dates
Scores above a threshold (e.g., 75) trigger automated SMS alerts to the assigned Agri Officer.

## Demo Script
1. Send `namaste` or `hi` on WhatsApp → See welcome menu.
2. Send `register` → Complete registration flow.
3. Send `mausam` → Receive weather update.
4. Send `bhav tamatar` → Receive current prices.
5. Send `jokhim` → See your current risk score.
6. Trigger admin distress check via Postman → See Agri Officer receive SMS alert.

## License
MIT
