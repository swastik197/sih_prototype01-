# Smart Crop Advisory & Farmer Distress Early-Warning System
**SIH 2026 Project Documentation**

## 1. Executive Summary
The **Smart Crop Advisory & Farmer Distress Early-Warning System** is a robust, highly accessible backend architecture designed to assist farmers without requiring them to download a dedicated smartphone application or navigate complex frontend interfaces. Built to operate entirely over WhatsApp (via the official Meta WhatsApp Cloud API) and SMS, the system provides real-time, multilingual agricultural advisory, local mandi price updates, and automated distress risk assessment.

## 2. System Architecture
The project is built on a modern Node.js backend stack:
- **Core Framework**: Node.js with Express.js
- **Database**: MongoDB (via Mongoose) for scalable, schema-based data storage.
- **Messaging Integration**: Meta WhatsApp Cloud API for bidirectional messaging, supporting rich text and emojis.
- **External Services**: OpenWeatherMap API for 5-day/3-hour localized weather forecasting.
- **Task Scheduling**: `node-cron` for automated batch processing and alerts.

## 3. Core Features & Workflows

### 3.1. Multilingual Conversational Interface
Farmers interact with the system using natural language keywords (e.g., "bhav", "weather", "help"). The `intentParser` service detects the user's intent across multiple languages (Hindi, English, Tamil, Telugu) and routes the request appropriately. Responses are generated using a localized templating engine (`languageService`).

### 3.2. Automated Distress Scoring Model
A predictive algorithm continuously evaluates the distress risk of registered farmers based on three weighted factors:
1. **Rainfall Deviation (35%)**: Compares the 3-day forecast against the ideal rainfall requirements for the farmer's specific crops.
2. **Price Crash Analysis (35%)**: Monitors local mandi prices. If a crop's price drops significantly (e.g., >30%) compared to previous records, the risk score spikes.
3. **Loan Proximity (30%)**: Evaluates the days remaining until the farmer's loan repayment deadline.

If a farmer's cumulative score exceeds the configured `DISTRESS_THRESHOLD` (e.g., 70/100), the system automatically dispatches an alert to both the farmer and the regional Agricultural Officer.

### 3.3. Location-Based Weather & Advisory
By linking the farmer's registered district to the OpenWeatherMap API, the `advisoryEngine` generates hyper-local advice. It correlates current weather (heavy rain, heatwaves, frost) with the farmer's crop cycle (sowing, harvesting) to provide actionable insights, such as "Delay harvesting due to heavy rain expected tomorrow."

### 3.4. Market Price Tracking
The `marketPriceService` tracks commodity prices across various regional Mandis. When a farmer asks for prices, the system prioritizes mandis within their district and highlights the most profitable market (✅).

### 3.5. Background Cron Jobs
The system operates autonomously using scheduled background tasks:
- **Every 6 Hours**: Runs the `distressScorer` across all registered farmers.
- **Daily at 7 AM**: Broadcasts extreme weather warnings (if any) to affected districts.
- **Daily at 6 AM**: Updates and simulates market price fluctuations.

## 4. Database Schema Overview
- **Farmer**: Stores phone number, name, location, preferred language, crop portfolio, land size, and loan details. Manages the multi-step registration state.
- **Crop**: Contains agronomic data (ideal temperature, rainfall, sowing/harvesting months) used by the advisory engine.
- **MarketPrice**: Historical and current commodity prices by mandi and district.
- **AgriOfficer**: Registry of government officials mapped to specific districts for distress escalation.
- **Alert**: Audit trail of all system-generated warnings.

## 5. Setup and Deployment
1. Configure `.env` with MongoDB URI, Meta WhatsApp tokens, and OpenWeather API keys.
2. Run `npm install` to resolve dependencies.
3. Execute `npm run seed` to populate the database with mock crop data, market prices, and dummy farmers for testing.
4. Run `npm run dev` and expose the webhook endpoint (e.g., via `ngrok`).
5. Configure the Meta App Dashboard to route webhook events to `/webhook/whatsapp`.

## 6. Conclusion
By removing the friction of app installations and leveraging ubiquitous platforms like WhatsApp, this architecture ensures that critical, life-saving agricultural data reaches the most vulnerable farming populations instantly and effectively.
