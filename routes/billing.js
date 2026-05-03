const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');


router.get('/history', async (req, res) => {
    try {
        const { bookingId } = req.query;

        // If a bookingId is provided, filter the results to ONLY that ID
        const query = bookingId ? { bookingId: bookingId } : {};

        const bills = await Billing.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            bills: bills 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// CRITICAL: You must include this line!
module.exports = router;