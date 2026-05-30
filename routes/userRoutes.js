const express = require('express');
const router = express.Router();
const multer = require('multer');
const Booking = require('../models/Booking'); 
const User = require('../models/User'); 
const Refund = require('../models/Refund');

// Setup Multer for memory storage (for binary buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/user-by-id/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // UPDATED: Include dob, preferredPayment, and paymentData in the query projection
        const user = await User.findById(userId).select('name dob phone email preferredPayment paymentData');

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Return all fields to the frontend layout
        res.status(200).json({
            success: true,
            name: user.name,
            dob: user.dob, // ISO format from MongoDB
            phone: user.phone,
            email: user.email,
            preferredPayment: user.preferredPayment || 'bank',
            paymentData: user.paymentData || { upiId: '', bankAccount: '', ifscCode: '' }
        });
    } catch (err) {
        console.error("Error fetching by ID:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});
// PUT route to update user payment credentials inside MongoDB
router.put('/payout-details', async (req, res) => {
    try {
        const userId = req.user ? req.user.id : req.body.userId; 

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required to update details." });
        }

        const { preferredPayment, paymentData } = req.body;

        // 1. Basic Server-Side Validation Check
        if (preferredPayment === 'bank') {
            if (!paymentData.bankAccount || !paymentData.ifscCode) {
                return res.status(400).json({ success: false, message: "Bank Account number and IFSC code are required." });
            }
        } else if (preferredPayment === 'upi') {
            if (!paymentData.upiId) {
                return res.status(400).json({ success: false, message: "UPI ID string cannot be blank." });
            }
        }

        // 2. Find User by ID and update fields using atomic $set operator
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    preferredPayment: preferredPayment,
                    'paymentData.upiId': paymentData.upiId || '',
                    'paymentData.bankAccount': paymentData.bankAccount || '',
                    'paymentData.ifscCode': paymentData.ifscCode || ''
                }
            },
            { new: true, runValidators: true } // Returns the newly updated document back
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User profile target records not found." });
        }

        // 3. Return a success response to the client
        return res.status(200).json({
            success: true,
            message: "Payment details successfully saved to the database.",
            data: {
                preferredPayment: updatedUser.preferredPayment,
                paymentData: updatedUser.paymentData
            }
        });

    } catch (error) {
        console.error("Database Save Operation Error Trace:", error);
        return res.status(500).json({ success: false, message: "Internal server error saving payment details." });
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
        const existingBooking = await Booking.findOne({
            venueId,
            bookingDate,
            status: { $in: ["Pending", "Approved"] }
        });
        if (existingBooking) {
            return res.status(400).json({
                success: false,
                message: "Date already reserved."
            });
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
// This route will handle GET /api/user/venue/:id/booked-dates
router.get('/venue/:id/booked-dates', async (req, res) => {
    try {
        const { id } = req.params;

        // Find bookings for this venue that aren't cancelled
        const bookings = await Booking.find({
            venueId: id,
            status: { $nin: ['Cancelled', 'Rejected'] }
        }).select('bookingDate');

        const dates = bookings.map(b => b.bookingDate);

        res.json({ 
            success: true, 
            bookedDates: dates 
        });
    } catch (err) {
        console.error("Error fetching booked dates:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
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

// ==========================================
// USER ROUTE: FETCH ENRICHED REFUND HISTORY FOR A PARTICULAR USER
// ==========================================
router.get('/refunds/user-history', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing userId query parameter context mapping identifier." 
            });
        }

        const mongoose = require('mongoose');
        const cleanUserId = new mongoose.Types.ObjectId(userId);

        // Fetch user refunds and deeply populate fields out of connected collections
        const trackingListLogs = await Refund.find({ userId: cleanUserId })
            .populate({
                path: 'bookingId',
                populate: {
                    path: 'venueId', // Grabs Venue model parameters
                    select: 'name'   // Fetches only the field we need
                }
            })
            .populate('adminId', 'name username') // Grabs the name of the clearing Admin officer
            .sort({ processedAt: -1 });

        return res.status(200).json({
            success: true,
            refunds: trackingListLogs
        });

    } catch (err) {
        console.error("User Refund History Fetch Failure:", err);
        return res.status(500).json({ 
            success: false, 
            message: "Database query error: " + err.message 
        });
    }
});

module.exports = router;