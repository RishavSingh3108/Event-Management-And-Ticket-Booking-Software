const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // Correct path based on your structure

// 1. REGISTRATION ROUTE
router.post('/register', async (req, res) => {
    try {
        const { name, phone, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already registered!" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            phone,
            email,
            password: hashedPassword,
            role: role || 'User' // Default to User if not specified
        });

        await newUser.save();
        res.status(201).json({ success: true, message: "Registration successful!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error: " + err.message });
    }
});

// 2. LOGIN ROUTE
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Find user by email AND role
        const user = await User.findOne({ email, role });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found or role mismatch!" });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid credentials!" });
        }

        // --- UPDATED RESPONSE ---
        // We now include userId so the frontend can save it
        res.json({ 
            success: true, 
            userId: user._id, // This is the crucial line you were missing!
            userName: user.name, 
            redirect: role === 'Admin' ? 'admin.html' : 'user.html' 

        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// GET: Fetch user details by ID
// Endpoint: /api/user-by-id/:id
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

module.exports = router;