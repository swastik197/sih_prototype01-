const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const whatsappService = require('../services/whatsappService');
const config = require('../config/env');
const logger = require('../utils/logger');

// GET /whatsapp - Webhook verification required by Meta
router.get('/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === config.metaWhatsapp.verifyToken) {
            logger.info('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            logger.warn('WEBHOOK_VERIFICATION_FAILED');
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// POST /whatsapp - Receive incoming messages
router.post('/whatsapp', async (req, res) => {
    try {
        const body = req.body;

        // Check if this is an event from a WhatsApp API
        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const messageObj = body.entry[0].changes[0].value.messages[0];
                const contactObj = body.entry[0].changes[0].value.contacts?.[0];
                
                const from = messageObj.from; // Sender phone number
                const profileName = contactObj?.profile?.name || '';
                
                // Extract text if it's a text message
                const msgBody = messageObj.type === 'text' ? messageObj.text.body : '';
                
                // Location parsing (if they send location)
                let location = null;
                if (messageObj.type === 'location') {
                    location = {
                        lat: messageObj.location.latitude,
                        lon: messageObj.location.longitude
                    };
                }

                // Process the message via the controller
                const responseMessage = await messageController.handleIncoming({
                    body: msgBody,
                    from: from,
                    profileName: profileName,
                    channel: 'whatsapp',
                    location
                });

                // Send the reply asynchronously (Meta doesn't expect the reply in the HTTP response)
                if (responseMessage) {
                    await whatsappService.sendMessage(from, responseMessage);
                }
            }
            
            // Meta expects a 200 OK to acknowledge receipt
            res.sendStatus(200);
        } else {
            // Not a WhatsApp API event
            res.sendStatus(404);
        }
    } catch (error) {
        logger.error(`Error in /whatsapp POST route: ${error.message}`, error);
        res.sendStatus(500);
    }
});

module.exports = router;
