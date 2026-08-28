require('dotenv').config();
const axios = require('axios');

async function testSarvamAPI() {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    console.log('No SARVAM_API_KEY found in .env');
    return;
  }

  const url = 'https://api.sarvam.ai/text-to-speech';
  
  // Payload Variant 1 (inputs array)
  const payload1 = {
    inputs: ["This is a test"],
    target_language_code: "hi-IN",
    speaker: "meera",
    pitch: 0,
    pace: 1.0,
    loudness: 0,
    speech_sample_rate: 24000,
    enable_preprocessing: true,
    model: "bulbul:v3"
  };

  // Payload Variant 2 (text string)
  const payload2 = {
    text: "This is a test",
    language_code: "hi-IN",
    speaker: "ritu",
    pace: 1.0,
    speech_sample_rate: 24000,
    model: "bulbul:v3"
  };

  const headers = {
    'api-subscription-key': apiKey,
    'Content-Type': 'application/json'
  };

  console.log('\\n--- Testing Variant 1 (inputs array) ---');
  try {
    await axios.post(url, payload1, { headers });
    console.log('✅ Variant 1 SUCCESS');
  } catch (err) {
    console.log(`❌ Variant 1 FAILED (${err.response?.status}):`, JSON.stringify(err.response?.data || err.message));
  }

  console.log('\\n--- Testing Variant 2 (text string) ---');
  try {
    await axios.post(url, payload2, { headers });
    console.log('✅ Variant 2 SUCCESS');
  } catch (err) {
    console.log(`❌ Variant 2 FAILED (${err.response?.status}):`, JSON.stringify(err.response?.data || err.message));
  }
}

testSarvamAPI();
