const axios = require('axios');

const AadharService = {
    // Phase 1: Use the SANDBOX URL
    generateOTP: async (aadharNumber) => {
        try {
            console.log("a");
            console.log("--- TOKEN DEBUG ---");
            console.log("Value:", process.env.SUREPASS_TOKEN);
            console.log("Type:", typeof process.env.SUREPASS_TOKEN);
            console.log("-------------------");
            console.log("FINAL AUTH CHECK:", 'Bearer ' + process.env.SUREPASS_TOKEN.trim());
            const response = await axios.post('https://sandbox.surepass.io/api/v1/aadhaar-v2/generate-otp', 
            { id_number: aadharNumber }, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': "Bearer secret_test_c46fc89e45ea44ebadfe5475c7722c40"
                }
            });
            console.log("b");
            return response.data; 
        } catch (error) {
            // This log in your terminal will now show the REAL reason if it fails
            console.error("Aadhar API Error (Generate):", error.response?.data || error.message);
            throw new Error(error.response?.data?.message || "Could not trigger Aadhaar OTP");
        }
    },

    // Phase 2: Use the SANDBOX URL
    verifyOTP: async (otp, client_id) => {
        try {
            const response = await axios.post('https://sandbox.surepass.io/api/v1/aadhaar-v2/submit-otp', 
            { otp, client_id }, 
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.SUREPASS_TOKEN}`
                }
            });
            return response.data;
        } catch (error) {
            console.error("Aadhar API Error (Verify):", error.response?.data || error.message);
            throw new Error(error.response?.data?.message || "Invalid OTP or session expired");
        }
    }
};

module.exports = AadharService;