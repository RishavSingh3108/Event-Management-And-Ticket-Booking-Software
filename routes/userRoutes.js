const express = require('express');
const router = express.Router();
const multer = require('multer');
const Booking = require('../models/Booking'); 
const User = require('../models/User'); 

// Setup Multer for memory storage (for binary buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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

router.post('/bookings', upload.single('screenshot'), async (req, res) => {
    try {
        const { venueId, adminId, bookingDate, userId, paymentType, paymentAmount } = req.body;
        if (!req.body.adminId) {
            console.error("CRITICAL: adminId is missing from req.body");
        }

        // 1. Basic Validations
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is missing!" });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Payment screenshot is required!" });
        }

        // 2. Check for duplicate bookings
        const existingBooking = await Booking.findOne({ venueId, bookingDate });
        if (existingBooking) {
            return res.status(400).json({ success: false, message: "Date already reserved." });
        }

        // 3. Create new booking with the file buffer
        const newBooking = new Booking({
            // 1. Core Identification
            userId: req.body.userId,            
            adminId: req.body.adminId,          
            venueId: req.body.venueId,    

            // 2. Booking Specifics
            bookingDate: req.body.bookingDate,
            guests: Number(req.body.guests),    
            bookedBy: req.body.bookedBy,
            contact: req.body.contact,
            email: req.body.email,
            purpose: req.body.purpose,
            requirements: req.body.requirements,

            // 3. Payment Details
            paymentType: req.body.paymentType,
            paymentAmount: Number(req.body.paymentAmount), 

            // 4. File Upload (Multer Buffer)
            paymentScreenshot: {
                data: req.file.buffer,         
                contentType: req.file.mimetype  
            },

            // 5. Status & Metadata
            status: 'Pending',               
            submittedAt: new Date()          
        });

        await newBooking.save();
        
        res.status(201).json({ success: true, message: "Booking and Payment submitted successfully!" });
    } catch (err) {
        console.error("SAVE ERROR:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});
// Change Booking Date
router.put('/bookings/update-date/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { newDate } = req.body;
        const currentBooking = await Booking.findById(id);
        if (!currentBooking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }
        const conflict = await Booking.findOne({
            _id: { $ne: id },
            venueId: currentBooking.venueId,
            bookingDate: newDate,
            status: "Approved" 
        });
        if (conflict) {
            return res.status(400).json({ 
                success: false, 
                message: "This date is already occupied by another event. Please choose a different date." 
            });
        }
        currentBooking.bookingDate = newDate;
        await currentBooking.save();
        res.json({ success: true, message: "Date updated successfully!" });
    } catch (err) {
        console.error("Conflict Check Error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
// Delete Booking 
router.delete('/bookings/:id', async (req, res) => {
    try {
        const bookingId = req.params.id;
        
        const result = await Booking.findByIdAndDelete(bookingId);

        if (!result) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.status(200).json({ success: true, message: "Booking deleted successfully" });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ success: false, message: "Server error during deletion" });
    }
});

module.exports = router;