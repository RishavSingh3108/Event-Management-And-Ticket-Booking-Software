const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Correct path based on your structure
const Booking = require('../models/Booking'); // Adjust the path if your folders are different

// GET: Fetch user details by ID
router.get('/user-by-id/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // Use findById to get the user, excluding the password
        const user = await User.findById(userId).select('name phone email');

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({
            success: true,
            name: user.name,
            phone: user.phone,
            email: user.email
        });
    } catch (err) {
        console.error("Error fetching by ID:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// GET: Fetch bookings for a specific User ID
// routes/auth.js
router.get('/my-bookings-by-id/:id', async (req, res) => {
    try {
        const id = req.params.id;
        // Search the database for the userId field
        const bookings = await Booking.find({ userId: id }).populate('venueId');
        
        console.log(`Found ${bookings.length} bookings for user ${id}`);
        res.json({ success: true, bookings });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;