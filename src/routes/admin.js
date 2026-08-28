const express = require('express');
const router = express.Router();
const Farmer = require('../models/Farmer');
const MarketPrice = require('../models/MarketPrice');
const Alert = require('../models/Alert');
const Crop = require('../models/Crop');
const AgriOfficer = require('../models/AgriOfficer');
const logger = require('../utils/logger');
const whatsappService = require('../services/whatsappService');
const distressScorer = require('../services/distressScorer');
const weatherService = require('../services/weatherService');
const languageService = require('../services/languageService');

router.get('/farmers', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const farmers = await Farmer.find().skip(skip).limit(limit);
        const total = await Farmer.countDocuments();

        res.json({ farmers, total, page, totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/farmers/:phone', async (req, res) => {
    try {
        const farmer = await Farmer.findOne({ phone: req.params.phone });
        if (!farmer) return res.status(404).json({ error: 'Farmer not found' });
        res.json(farmer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/prices', async (req, res) => {
    try {
        const query = req.query.crop ? { cropName: req.query.crop } : {};
        const prices = await MarketPrice.find(query);
        res.json(prices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/prices/:crop', async (req, res) => {
    try {
        const prices = await MarketPrice.find({ cropName: req.params.crop });
        res.json(prices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/alerts', async (req, res) => {
    try {
        const alerts = await Alert.find().sort({ createdAt: -1 }).limit(50);
        res.json(alerts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/trigger-distress-check', async (req, res) => {
    try {
        const farmers = await Farmer.find({ isRegistered: true });
        let alertsSent = 0;
        const results = [];

        for (const farmer of farmers) {
            const score = await distressScorer.calculateDistressScore(farmer);
            results.push({ phone: farmer.phone, score });
            
            if (score > (process.env.DISTRESS_THRESHOLD || 75)) {
                alertsSent++;
                const officer = await AgriOfficer.findOne({ district: farmer.district });
                const alertMessage = languageService.getTemplate(farmer.language || 'hi', 'distress_alert', { score });
                await whatsappService.sendMessage(farmer.phone, alertMessage, farmer.preferredChannel || 'whatsapp');
                
                if (officer) {
                    const officerMessage = languageService.getTemplate('en', 'distress_alert_officer', { 
                        farmerName: farmer.name,
                        phone: farmer.phone,
                        score
                    });
                    await whatsappService.sendMessage(officer.phone, officerMessage, 'sms');
                }

                await Alert.create({
                    farmerId: farmer._id,
                    type: 'distress',
                    score: score,
                    details: 'Manual distress trigger'
                });
            }
        }

        res.json({ message: `Distress check triggered for ${farmers.length} farmers. ${alertsSent} alerts sent.`, results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/trigger-weather-alert', async (req, res) => {
    try {
        const farmers = await Farmer.find({ isRegistered: true });
        // Simplified logic for triggering weather alerts manually
        res.json({ message: 'Weather alerts triggered', farmersChecked: farmers.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/send-test-message', async (req, res) => {
    try {
        const { phone, message, channel } = req.body;
        if (!phone || !message) return res.status(400).json({ error: 'Phone and message are required' });
        
        await whatsappService.sendMessage(phone, message, channel || 'whatsapp');
        res.json({ success: true, message: 'Test message sent' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const farmers = await Farmer.countDocuments();
        const crops = await Crop.countDocuments();
        const prices = await MarketPrice.countDocuments();
        const alerts = await Alert.countDocuments();
        const officers = await AgriOfficer.countDocuments();

        res.json({ farmers, crops, prices, alerts, officers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
