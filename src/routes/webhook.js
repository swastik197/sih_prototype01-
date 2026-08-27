const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const twilioService = require('../services/twilioService');
const logger = require('../utils/logger');

// POST /whatsapp
router.post('/whatsapp', async (req, res) => {
    try {
        const {
            Body,
            From,
            To,
            ProfileName,
            WaId,
            NumMedia,
            Latitude,
            Longitude
        } = req.body;

        const location = (Latitude && Longitude) ? { lat: Latitude, lon: Longitude } : null;

        const responseMessage = await messageController.handleIncoming({
            body: Body,
            from: From,
            profileName: ProfileName,
            channel: 'whatsapp',
            location
        });

        const twiml = twilioService.buildTwiMLReply(responseMessage);
        
        res.set('Content-Type', 'text/xml');
        res.send(twiml);
    } catch (error) {
        logger.error(`Error in /whatsapp route: ${error.message}`, error);
        const twiml = twilioService.buildTwiMLReply("Sorry, something went wrong. Please try again later.");
        res.set('Content-Type', 'text/xml');
        res.send(twiml);
    }
});

// POST /sms
router.post('/sms', async (req, res) => {
    try {
        const {
            Body,
            From,
            To,
            NumMedia,
            Latitude,
            Longitude
        } = req.body;

        const location = (Latitude && Longitude) ? { lat: Latitude, lon: Longitude } : null;

        const responseMessage = await messageController.handleIncoming({
            body: Body,
            from: From,
            channel: 'sms',
            location
        });

        const twiml = twilioService.buildTwiMLReply(responseMessage);
        
        res.set('Content-Type', 'text/xml');
        res.send(twiml);
    } catch (error) {
        logger.error(`Error in /sms route: ${error.message}`, error);
        const twiml = twilioService.buildTwiMLReply("Sorry, something went wrong. Please try again later.");
        res.set('Content-Type', 'text/xml');
        res.send(twiml);
    }
});

module.exports = router;
