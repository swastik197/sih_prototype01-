require('dotenv').config();
const mongoose = require('mongoose');
const Crop = require('../src/models/Crop');
const MarketPrice = require('../src/models/MarketPrice');
const Farmer = require('../src/models/Farmer');
const AgriOfficer = require('../src/models/AgriOfficer');
const Alert = require('../src/models/Alert');
const cropCalendar = require('../src/data/cropCalendar.json');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sih2026';

const mandis = [
  { name: 'Azadpur', district: 'Delhi', state: 'Delhi' },
  { name: 'Vashi', district: 'Mumbai', state: 'Maharashtra' },
  { name: 'Lucknow Mandi', district: 'Lucknow', state: 'Uttar Pradesh' },
  { name: 'Patna Mandi', district: 'Patna', state: 'Bihar' },
  { name: 'Bhopal Mandi', district: 'Bhopal', state: 'Madhya Pradesh' },
  { name: 'Indore Mandi', district: 'Indore', state: 'Madhya Pradesh' },
  { name: 'Nagpur Mandi', district: 'Nagpur', state: 'Maharashtra' },
  { name: 'Ludhiana Mandi', district: 'Ludhiana', state: 'Punjab' },
  { name: 'Jaipur Mandi', district: 'Jaipur', state: 'Rajasthan' },
  { name: 'Ahmedabad Mandi', district: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Koyambedu', district: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Bowenpally', district: 'Hyderabad', state: 'Telangana' },
  { name: 'APMC Yeshwanthpur', district: 'Bangalore', state: 'Karnataka' },
  { name: 'Pune Mandi', district: 'Pune', state: 'Maharashtra' },
  { name: 'Kanpur Mandi', district: 'Kanpur', state: 'Uttar Pradesh' }
];

const basePrices = {
  tomato: 2200, wheat: 2250, rice: 2300, onion: 1500, potato: 900,
  cotton: 6200, maize: 1850, mustard: 5000, chickpea: 4500,
  moong: 7000, sugarcane: 315, soybean: 4100
};

const farmers = [
  { name: 'Ramesh Kumar', phone: '+919876500001', district: 'Varanasi', state: 'Uttar Pradesh', language: 'hi', crops: ['rice', 'wheat'], landSize: 3.5, loanAmount: 50000, loanDueDate: new Date(Date.now() + 12 * 86400000) },
  { name: 'Suresh Singh', phone: '+919876500002', district: 'Lucknow', state: 'Uttar Pradesh', language: 'hi', crops: ['wheat', 'potato'], landSize: 5, loanAmount: 75000, loanDueDate: new Date(Date.now() + 45 * 86400000) },
  { name: 'Lakshmi Devi', phone: '+919876500003', district: 'Patna', state: 'Bihar', language: 'hi', crops: ['rice', 'maize'], landSize: 2.5, loanAmount: null, loanDueDate: null },
  { name: 'Arjun Yadav', phone: '+919876500004', district: 'Bhopal', state: 'Madhya Pradesh', language: 'hi', crops: ['soybean', 'wheat'], landSize: 8, loanAmount: 120000, loanDueDate: new Date(Date.now() + 25 * 86400000) },
  { name: 'Muthu Selvan', phone: '+919876500005', district: 'Madurai', state: 'Tamil Nadu', language: 'ta', crops: ['rice', 'sugarcane'], landSize: 4, loanAmount: null, loanDueDate: null },
  { name: 'Ravi Reddy', phone: '+919876500006', district: 'Warangal', state: 'Telangana', language: 'te', crops: ['cotton', 'rice'], landSize: 6, loanAmount: 90000, loanDueDate: new Date(Date.now() + 8 * 86400000) },
  { name: 'Gurpreet Singh', phone: '+919876500007', district: 'Ludhiana', state: 'Punjab', language: 'hi', crops: ['wheat', 'rice'], landSize: 12, loanAmount: null, loanDueDate: null },
  { name: 'Devendra Patel', phone: '+919876500008', district: 'Ahmedabad', state: 'Gujarat', language: 'hi', crops: ['cotton', 'mustard'], landSize: 7, loanAmount: 60000, loanDueDate: new Date(Date.now() + 90 * 86400000) },
  { name: 'Anita Sharma', phone: '+919876500009', district: 'Jaipur', state: 'Rajasthan', language: 'hi', crops: ['mustard', 'chickpea'], landSize: 4.5, loanAmount: 35000, loanDueDate: new Date(Date.now() + 20 * 86400000) },
  { name: 'Venkatesh', phone: '+919876500010', district: 'Bangalore', state: 'Karnataka', language: 'en', crops: ['tomato', 'onion'], landSize: 2, loanAmount: null, loanDueDate: null }
];

const officers = [
  { name: 'Dr. Ashok Verma', phone: '+919888000001', district: 'Varanasi', state: 'Uttar Pradesh', designation: 'District Agriculture Officer' },
  { name: 'Shri R. Pandey', phone: '+919888000002', district: 'Patna', state: 'Bihar', designation: 'Block Development Officer' },
  { name: 'Dr. Meena Sharma', phone: '+919888000003', district: 'Bhopal', state: 'Madhya Pradesh', designation: 'District Agriculture Officer' },
  { name: 'Thiru K. Muthu', phone: '+919888000004', district: 'Madurai', state: 'Tamil Nadu', designation: 'Agricultural Extension Officer' },
  { name: 'Sri P. Reddy', phone: '+919888000005', district: 'Warangal', state: 'Telangana', designation: 'District Agriculture Officer' }
];

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');

  // Clear all collections
  console.log('🧹 Clearing existing data...');
  await Promise.all([
    Crop.deleteMany({}),
    MarketPrice.deleteMany({}),
    Farmer.deleteMany({}),
    AgriOfficer.deleteMany({}),
    Alert.deleteMany({})
  ]);

  // Seed crops from cropCalendar.json
  console.log('🌾 Seeding crops...');
  const cropDocs = Object.entries(cropCalendar).map(([name, data]) => ({
    name,
    nameHi: data.nameHi,
    nameTa: data.nameTa,
    nameTe: data.nameTe,
    season: data.season,
    sowingMonths: data.sowingMonths,
    harvestMonths: data.harvestMonths,
    idealRainfall: data.idealRainfall,
    idealTemp: data.idealTemp,
    regions: data.regions
  }));
  await Crop.insertMany(cropDocs);

  // Seed market prices
  console.log('💰 Seeding market prices...');
  const priceDocs = [];
  for (const [cropName, basePrice] of Object.entries(basePrices)) {
    for (const mandi of mandis) {
      const variation = (Math.random() * 0.4 - 0.2); // ±20%
      const price = Math.round(basePrice * (1 + variation));
      const prevVariation = (Math.random() * 0.2 - 0.1); // ±10% from current
      const previousPrice = Math.round(price * (1 + prevVariation));

      priceDocs.push({
        crop: cropName,
        mandi: mandi.name,
        district: mandi.district,
        state: mandi.state,
        price,
        previousPrice,
        priceDate: new Date(),
        unit: 'quintal'
      });
    }
  }
  await MarketPrice.insertMany(priceDocs);

  // Seed farmers
  console.log('👨🌾 Seeding farmers...');
  const farmerDocs = farmers.map(f => ({
    ...f,
    channel: 'whatsapp',
    isRegistered: true,
    registrationStep: 7,
    tempData: {}
  }));
  await Farmer.insertMany(farmerDocs);

  // Seed officers
  console.log('👮 Seeding agri-officers...');
  await AgriOfficer.insertMany(officers.map(o => ({ ...o, isActive: true })));

  // Summary
  console.log('\n📊 Seed Summary:');
  console.log(`  Crops:         ${await Crop.countDocuments()}`);
  console.log(`  Market Prices: ${await MarketPrice.countDocuments()}`);
  console.log(`  Farmers:       ${await Farmer.countDocuments()}`);
  console.log(`  Officers:      ${await AgriOfficer.countDocuments()}`);
  console.log('\n✅ Seeding complete!');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
