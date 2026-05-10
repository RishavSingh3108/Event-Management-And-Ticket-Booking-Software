const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors'); 
const bcrypt = require('bcryptjs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
// app.use(express.static(path.join(__dirname, 'public'))); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const Venue = require('./models/Venue');
const User = require('./models/User');
const Admin = require('./models/Admin');
const Booking = require('./models/Booking');
const billingRoutes = require('./routes/billing');
const Billing = require('./models/Billing'); 

app.use('/api/billing', billingRoutes);

// 3. Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// 4. Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home', 'home.html'));
});

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);

const userRoutes = require('./routes/userRoutes'); 
app.use('/api/user', userRoutes);

// get all venues (common)
app.get('/api/venues', async (req, res) => {
    try {
        const { adminId } = req.query;
        const filter = adminId ? { adminId: adminId } : {};
        const venues = await Venue.find(filter); 
        res.status(200).json(venues); 
    } catch (err) {
        console.error("Fetch Error:", err);
        res.status(500).json({ message: "Server error while fetching venues" });
    }
});
// all bookings for a SPECIFIC venue (needed for the User's & Admin's Calender)
app.get('/api/bookings/venue/:venueId', async (req, res) => {
    try {
        const { venueId } = req.params;
        const bookings = await Booking.find({ venueId: venueId });
        res.status(200).json(bookings);
    } catch (err) {
        console.error("Error fetching bookings for venue:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});
// User's Payment Photo 
app.get('/api/bookings/screenshot/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking || !booking.paymentScreenshot || !booking.paymentScreenshot.data) {
            return res.status(404).send('Image not found');
        }
        res.set('Content-Type', booking.paymentScreenshot.contentType);
        res.send(booking.paymentScreenshot.data);
    } catch (err) {
        res.status(500).send('Error retrieving image');
    }
});
// UPDATE BOOKING STATUS (Approve/Reject)
app.put('/api/bookings/status/:id', async (req, res) => {
    console.log("Called!");
    try {
        const { status } = req.body; // 'Approved' or 'Rejected'
        const updatedBooking = await Booking.findByIdAndUpdate(
            req.params.id, 
            { status: status }, 
            { returnDocument: 'after' }
        );

        if (!updatedBooking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.json({ success: true, message: `Booking ${status} successfully!` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Update failed" });
    }
});

const otpSchema = new mongoose.Schema({
    target: { type: String, required: true }, 
    otp: { type: String, required: true },    
    createdAt: { 
        type: Date, 
        default: Date.now, 
        index: { expires: 300 }
    }
});
const OTPModel = mongoose.model('OTP', otpSchema);
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
const accountSid = process.env.TWILIO_SID;; 
const authToken = process.env.TWILIO_TOKEN; 
const client = twilio(accountSid, authToken);
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
app.post('/api/auth/send-otp', async (req, res) => {
    const { target, type } = req.body;
    const otp = generateOTP();
    try {
        if (type === 'email') {
            await transporter.sendMail({
                from: '"EventHub Team" <rishav310805@gmail.com>',
                to: target,
                subject: "Your EventHub Verification Code",
                html: `<b>Your OTP is ${otp}</b>`
            });
        }
        else if (type === 'phone') {
            // WHATSAPP LOGIC
            await client.messages.create({
                from: '+18562809398', // Twilio Sandbox Number
                to: `+91${target}`,   // User's number
                body: `Your EventHub verification code is: ${otp}`
            });
        }
        await OTPModel.create({ target, otp });
        res.json({ success: true, message: "OTP sent!" });
    } catch (error) {
        console.error("CRITICAL SERVER ERROR:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});
// 4. API Route to Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
    const { target, otp } = req.body;

    try {
        const record = await OTPModel.findOne({ target, otp });

        if (record) {
            await OTPModel.deleteOne({ _id: record._id });
            res.json({ success: true, message: "Email verified successfully!" });
        } else {
            res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }
    } catch (error) {
        console.error("Verification Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});
app.post('/api/auth/forgot-password-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "Email not registered." });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await OTPModel.deleteMany({ target: email });
        const newOtpEntry = new OTPModel({
            target: email, 
            otp: otp
        });
        await newOtpEntry.save();
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'EventHub - Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}. It will expire in 5 minutes.`
        };

        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: "OTP sent successfully!" });

    } catch (err) {
        console.error("Forgot OTP Send Error:", err);
        res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
    }
});
app.post('/api/auth/verify-reset-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        const otpRecord = await OTPModel.findOne({ 
            target: email, 
            otp: otp 
        });

        if (!otpRecord) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid or expired OTP. Please request a new one." 
            });
        }
        await OTPModel.deleteOne({ _id: otpRecord._id });

        // Success! 
        res.json({ success: true, message: "OTP verified successfully." });

    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: "Password updated successfully." });
    } catch (error) {
        console.error("Bcrypt Update Error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { name, dob, email, phone, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        const existingAdmin = await Admin.findOne({ email });

        if (existingUser || existingAdmin) {
            return res.status(400).json({ success: false, message: "Email already registered!" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        if (role === 'Admin') {
            const newAdmin = new Admin({ 
                name, 
                dob, 
                email, 
                phone, 
                password: hashedPassword, 
                role 
            });
            await newAdmin.save();
        } else {
            const newUser = new User({ 
                name, 
                dob, 
                email, 
                phone, 
                password: hashedPassword, 
                role 
            });
            await newUser.save();
        }
        res.status(201).json({ success: true, message: "Registration successful!" });
    } catch (err) {
        console.error("Reg Error:", err.message);
        res.status(500).json({ success: false, message: "Error saving to database." });
    }
});
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }
        const Model = (role === 'Admin') ? Admin : User;
        const account = await Model.findOne({ email });
        if (!account) {
            return res.status(401).json({ success: false, message: "Invalid email or role." });
        }
        const isMatch = await bcrypt.compare(password, account.password); 
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrect password." });
        }
        res.status(200).json({
            success: true,
            message: `Welcome back, ${account.name}!`,
            user: {
                id: account._id,
                name: account.name,
                email: account.email,
                role: account.role
            }
        });
    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

//  THIS SHOULD BE AT THE BOTTOM
app.use(express.static(path.join(__dirname, 'public')));

// 5. Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
