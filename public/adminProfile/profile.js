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
// Function to validate AADHAR structure so that it can be send to UIDAI for further verification's
document.getElementById('editAadhar').addEventListener('input', function (e) {
    const aadharInput = e.target;
    const verifyBtn = document.getElementById('verifyAadharBtn'); // Get your Validate button
    
    aadharInput.value = aadharInput.value.replace(/\D/g, ''); 
    const val = aadharInput.value;
    const aadharRegex = /^\d{12}$/;

    if (val.length === 12) {
        if (aadharRegex.test(val)) {
            aadharInput.style.borderColor = "#4CAF50"; 
            // ENABLE BUTTON
            verifyBtn.disabled = false;
            verifyBtn.style.opacity = "1";
            verifyBtn.style.cursor = "pointer";
        } else {
            aadharInput.style.borderColor = "red";
            verifyBtn.disabled = true;
        }
    } else {
        if (val.length > 12) aadharInput.value = val.slice(0, 12);
        aadharInput.style.borderColor = "#ffa500";
        // DISABLE BUTTON
        verifyBtn.disabled = true;
        verifyBtn.style.opacity = "0.5";
        verifyBtn.style.cursor = "not-allowed";
    }
});

let currentAadharOTP = null;

// This runs when the Validate button is clicked
function sendAadharOTP() {
    // 1. Generate a random 6-digit code
    currentAadharOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 2. Alert the user (Simulating the SMS)
    alert(`OTP sent to Aadhaar-linked mobile: ${currentAadharOTP}`);
    
    // 3. Show the modal
    document.getElementById('otpModal').classList.remove('hidden');
}

function closeOtpModal() {
    document.getElementById('otpModal').classList.add('hidden');
}

function confirmAadharOTP() {
    const enteredOtp = document.getElementById('aadharOtpInput').value;
    const aadharInput = document.getElementById('editAadhar');
    const verifyBtn = document.getElementById('verifyAadharBtn');

    if (enteredOtp === currentAadharOTP) {
        alert("✅ Aadhaar Verified Successfully!");
        
        // Lock the field so it can't be edited anymore
        aadharInput.readOnly = true;
        aadharInput.style.backgroundColor = "#f8f8f8";
        
        // Style the button as 'Verified'
        verifyBtn.innerHTML = "<i class='bx bxs-check-shield'></i> Verified";
        verifyBtn.style.backgroundColor = "#4CAF50";
        verifyBtn.disabled = true;
        
        closeOtpModal();
    } else {
        alert("❌ Invalid OTP. Please try again.");
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