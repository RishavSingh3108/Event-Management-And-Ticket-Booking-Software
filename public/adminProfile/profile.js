window.onload = loadAdminProfile;

function updateLiveDate() {
    const dateElement = document.getElementById('currentDateDisplay'); 
    if (dateElement) {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        
        dateElement.innerText = now.toLocaleDateString('en-US', options);
    }
}
updateLiveDate();
function grabLocation() {
    const gpsInput = document.getElementById('editGps');
    if (navigator.geolocation) {
        gpsInput.value = "Locating...";
        navigator.geolocation.getCurrentPosition((position) => {
            gpsInput.value = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        }, () => {
            alert("Permission denied. Enable location services.");
            gpsInput.value = "";
        });
    }
}
function enterEditMode() {
    document.getElementById('credentialsView').classList.add('hidden');
    document.getElementById('credentialsEdit').classList.remove('hidden');
    document.getElementById('mainEditBtn').style.display = 'none';
}
function exitEditMode() {
    document.getElementById('credentialsView').classList.remove('hidden');
    document.getElementById('credentialsEdit').classList.add('hidden');
    document.getElementById('mainEditBtn').style.display = 'block';
}
async function updatePhotoPreview(event) {
    const file = event.target.files[0];
    if (!file) return;

    const savedId = localStorage.getItem('adminId');

    if (!savedId) {
        alert("Session error: Admin ID not found. Please login again.");
        return;
    }
    const reader = new FileReader();
    reader.onload = function() {
        document.getElementById('profileDisplay').src = reader.result;
    };
    reader.readAsDataURL(file);
    const formData = new FormData();
    formData.append('adminPhoto', file); 
    formData.append('adminId', savedId);  

    try {
        const response = await fetch('/api/admin/upload-photo', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            alert("Profile photo Saved.");
            // Optional: update the source with the actual server path
            if (result.imagePath) {
                document.getElementById('profileDisplay').src = result.imagePath;
            }
        } else {
            alert("Error saving photo: " + (result.error || result.message));
        }
    } catch (err) {
        console.error("Photo upload failed:", err);
        alert("Failed to connect to the server.");
    }
}
// Function to validate GST as the admin types
document.getElementById('editGst').addEventListener('input', function (e) {
    const gstInput = e.target;
    const gstValue = gstInput.value.toUpperCase();
    gstInput.value = gstValue; 

    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (gstValue.length > 0 && gstValue.length < 15) {
        gstInput.style.borderColor = "#ffa500"; 
    } else if (gstValue.length === 15 && !gstRegex.test(gstValue)) {
        gstInput.style.borderColor = "red"; 
    } else if (gstRegex.test(gstValue)) {
        gstInput.style.borderColor = "#4CAF50"; 
    } else {
        gstInput.style.borderColor = ""; 
    }
});
// Function to validate FSSAI as the admin types
document.getElementById('editFssai').addEventListener('input', function (e) {
    const fssaiInput = e.target;
    fssaiInput.value = fssaiInput.value.replace(/\D/g, ''); 
    const fssaiValue = fssaiInput.value;
    const fssaiRegex = /^\d{14}$/;
    if (fssaiValue.length > 0 && fssaiValue.length < 14) {
        fssaiInput.style.borderColor = "#ffa500"; 
    } else if (fssaiValue.length === 14 && fssaiRegex.test(fssaiValue)) {
        fssaiInput.style.borderColor = "#4CAF50"; 
    } else if (fssaiValue.length > 14) {
        fssaiInput.value = fssaiValue.slice(0, 14);
    } else {
        fssaiInput.style.borderColor = "red"; 
    }
});
// Verhoeff Algorithm Tables
function validateVerhoeff(idNumber) {
    // Multiplication Table (d)
    const d_table = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
        [2, 3, 4, 0, 1, 7, 8, 9, 5, 6], [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
        [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
        [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
        [8, 7, 6, 5, 9, 3, 2, 1, 0, 4], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    ];

    // Permutation Table (p)
    const p_table = [
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
        [5, 8, 0, 3, 7, 9, 6, 1, 4, 2], [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
        [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
        [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
    ];

    let check = 0;
    // Reverse the digits and convert to numbers
    let digits = idNumber.split('').map(Number).reverse();

    for (let i = 0; i < digits.length; i++) {
        check = d_table[check][p_table[i % 8][digits[i]]];
    }

    return check === 0;
}

// Updated Event Listener
document.getElementById('editAadhar').addEventListener('input', function (e) {
    const inputField = e.target;
    const verifyBtn = document.getElementById('verifyAadharBtn');
    
    // Clean input and limit to 12 digits
    let val = inputField.value.replace(/\D/g, '').slice(0, 12); 
    inputField.value = val;

    if (val.length === 12) {
        if (validateVerhoeff(val)) {
            // SUCCESS
            inputField.style.borderColor = "#4CAF50"; 
            verifyBtn.disabled = false;
            verifyBtn.style.opacity = "1";
            verifyBtn.style.cursor = "pointer";
        } else {
            // FAILED CHECKSUM
            console.warn("Invalid ID Checksum detected.");
            inputField.style.borderColor = "red";
            verifyBtn.disabled = true;
            verifyBtn.style.opacity = "0.5";
        }
    } else {
        inputField.style.borderColor = "#ffa500";
        verifyBtn.disabled = true;
        verifyBtn.style.opacity = "0.5";
    }
});
// Global variable to hold the session ID from the provider
// Global variable to hold the session ID from the provider
let aadharClientId = null; 

async function sendAadharOTP() {
    const aadharInput = document.getElementById('editAadhar');
    const verifyBtn = document.getElementById('verifyAadharBtn');
    const aadharNumber = aadharInput.value;

    // 1. Show Loading State
    verifyBtn.disabled = true;
    const originalContent = verifyBtn.innerHTML;
    verifyBtn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> Sending...";

    try {
        const response = await fetch('/api/admin/aadhar/verify-init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aadharNumber: aadharNumber })
        });

        const result = await response.json();

        if (result.success) {
            aadharClientId = result.client_id;

            // 4. Open Modal & Focus on input
            const modal = document.getElementById('otpModal');
            modal.classList.remove('hidden');
            document.getElementById('aadharOtpInput').focus(); 
            
            verifyBtn.innerHTML = "Validate";
            verifyBtn.disabled = false;
        } else {
            alert("Error: " + (result.message || "Could not trigger OTP"));
            verifyBtn.innerHTML = originalContent;
            verifyBtn.disabled = false;
        }
    } catch (error) {
        console.error("Aadhar Request Error:", error);
        alert("Server connection failed. Check your network.");
        verifyBtn.innerHTML = originalContent;
        verifyBtn.disabled = false;
    }
}

function closeOtpModal() {
    document.getElementById('otpModal').classList.add('hidden');
    document.getElementById('aadharOtpInput').value = "";
}

async function confirmAadharOTP() {
    const otpInput = document.getElementById('aadharOtpInput');
    const confirmBtn = document.querySelector('#otpModal button[onclick="confirmAadharOTP()"]');
    const otp = otpInput.value;
    const adminId = localStorage.getItem('adminId');

    if (otp.length !== 6) {
        alert("Please enter a 6-digit OTP");
        return;
    }

    // Show loading on the modal button
    const originalText = confirmBtn.innerText;
    confirmBtn.innerText = "Verifying...";
    confirmBtn.disabled = true;

    try {
        const response = await fetch('/api/admin/aadhar/verify-confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                otp: otp, 
                client_id: aadharClientId,
                adminId: adminId 
            })
        });

        const result = await response.json();

        if (result.success) {
            alert("✅ Verification Successful! Welcome " + result.data.fullName);
            
            // 1. Lock the field & Update main page Button
            const aadharInput = document.getElementById('editAadhar');
            const verifyBtn = document.getElementById('verifyAadharBtn');
            
            aadharInput.readOnly = true;
            aadharInput.style.backgroundColor = "#e9ecef";
            aadharInput.style.borderColor = "#28a745";
            
            verifyBtn.innerHTML = "<i class='bx bxs-check-shield'></i> Verified";
            verifyBtn.style.backgroundColor = "#28a745";
            verifyBtn.style.color = "white";
            verifyBtn.disabled = true;

            // 2. Close Modal
            closeOtpModal();
        } else {
            alert("Verification Failed: " + result.message);
            confirmBtn.innerText = originalText;
            confirmBtn.disabled = false;
            otpInput.value = ""; // Clear on failure
            otpInput.focus();
        }
    } catch (error) {
        alert("Error during verification. Try again.");
        confirmBtn.innerText = originalText;
        confirmBtn.disabled = false;
    }
}
async function saveAdminData() {
    const savedId = localStorage.getItem('adminId');
    // GST Regex Validation
    const gstValue = document.getElementById('editGst').value.toUpperCase();
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstValue)) {
        alert("Please enter a correct 15-digit GST number format.");
        document.getElementById('editGst').focus();
        return; 
    }
    // FSSAI Validation
    const fssaiValue = document.getElementById('editFssai').value;
    const fssaiRegex = /^\d{14}$/;
    if (fssaiValue && !fssaiRegex.test(fssaiValue)) {
        alert("Please enter a valid 14-digit FSSAI License Number.");
        document.getElementById('editFssai').focus();
        return; 
    }

    if (!savedId) {
        alert("Session error: Admin ID not found. Please login again.");
        return;
    }

    const adminData = {
        adminId: savedId, 
        gst: document.getElementById('editGst').value,
        aadhar: document.getElementById('editAadhar').value,
        fssai: document.getElementById('editFssai').value,
        gps: document.getElementById('editGps').value
    };

    try {
        const response = await fetch('/api/admin/update-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminData)
        });

        const result = await response.json();

        if (result.success) {
            // Update the UI View labels with the new values
            document.getElementById('viewGst').innerText = adminData.gst;
            document.getElementById('viewAadhar').innerText = adminData.aadhar;
            document.getElementById('viewFssai').innerText = adminData.fssai || "Not Provided";
            document.getElementById('viewGps').innerText = adminData.gps;
            
            // Update the address display label as well
            document.getElementById('adminCurrentAddress').innerText = adminData.gps;

            exitEditMode();
            alert("Admin records successfully Updated.");
        } else {
            alert("Update failed: " + result.message);
        }
    } catch (err) {
        console.error("Save error:", err);
        alert("Server error. Check if your Node.js server is running.");
    }
}


async function getFullAddressFromCoords(coordsString) {
    if (!coordsString || !coordsString.includes(',')) return "No Location Set";
    const [lat, lon] = coordsString.split(',').map(c => c.trim());

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
        const data = await response.json();

        if (data.address) {
            const addr = data.address;
            const parts = [
                addr.road || addr.suburb || addr.neighbourhood, 
                addr.village || addr.town || addr.city_district, 
                addr.state_district || addr.city,  
                addr.state,  
                addr.country 
            ].filter(part => part); 

            const mainAddress = parts.join(', ');
            const pincode = addr.postcode || ""; 
            return pincode ? `${mainAddress} - ${pincode}` : mainAddress;
        }
        return coordsString; 
    } catch (error) {
        console.error("Geocoding failed:", error);
        return coordsString;
    }
}

async function loadAdminProfile() {
    const savedId = localStorage.getItem('adminId');
    loadPerformanceStats();
    if (!savedId) {
        console.error("No adminId found in storage.");
        window.location.href = '../home/home.html';
        return;
    }

    try {
        // Fetch specific admin data using the ID from your MongoDB Atlas cluster
        const response = await fetch(`/api/admin/get-profile?adminId=${savedId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const data = result.data;
            const business = data.businessDetails || {};

            const profileImg = document.getElementById('profileDisplay');
            if (profileImg) {
                profileImg.src = data.profileImage || '/uploads/default-admin.png';
            }
            document.getElementById('adminNameDisplay').innerText = data.name;
            document.getElementById('adminEmailDisplay').innerText = `  ${data.email}`;
            document.getElementById('adminPhoneDisplay').innerText = `  ${data.phone}`;
            document.getElementById('adminRole').innerText = `  ${data.role}`;
            if (business.gpsLocation) {
                getFullAddressFromCoords(business.gpsLocation).then(readableAddress => {
                    document.getElementById('adminCurrentAddress').innerText = ` ${readableAddress}`;
                });
            } else {
                document.getElementById('adminCurrentAddress').innerText = " Location Not Provided";
            }
            // Update View Labels
            document.getElementById('viewGst').innerText = business.gstNumber || "Not Provided";
            document.getElementById('viewAadhar').innerText = business.aadharNumber || "Not Provided";
            document.getElementById('viewFssai').innerText = business.foodLicense || "Not Provided";
            document.getElementById('viewGps').innerText = business.gpsLocation || "Not Provided";
            // Update Edit Inputs
            document.getElementById('editGst').value = business.gstNumber || "";
            document.getElementById('editAadhar').value = business.aadharNumber || "";
            document.getElementById('editFssai').value = business.foodLicense || "";
            document.getElementById('editGps').value = business.gpsLocation || "";

            if (data.profileImage) {
                document.getElementById('profileDisplay').src = data.profileImage;
            }
        }
    } catch (err) {
        console.error("Failed to fetch admin profile from database:", err);
    }
}
async function loadPerformanceStats() {
    const adminId = localStorage.getItem('adminId');
    if (!adminId) return;

    try {
        const response = await fetch(`/api/admin/dashboard-stats?adminId=${adminId}`);
        const data = await response.json();

        if (data.success) {
            // Updating your performance grid cards
            document.getElementById('totalVenuesDisplay').innerText = data.totalVenues;
            document.getElementById('totalBookingsDisplay').innerText = data.totalBookings;
            
            // Format profit as Indian Rupees (e.g., ₹10,000)
            const profit = data.totalProfit || 0;
            document.getElementById('totalProfitDisplay').innerText = `₹${profit.toLocaleString('en-IN')}`;
        }
    } catch (err) {
        console.error("Error loading performance grid:", err);
    }
}