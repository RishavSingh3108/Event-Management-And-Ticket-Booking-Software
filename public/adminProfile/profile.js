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

    const savedId = localStorage.getItem('userId');

    if (!savedId) {
        alert("Session error: User ID not found. Please login again.");
        return;
    }
    const reader = new FileReader();
    reader.onload = function() {
        document.getElementById('profileDisplay').src = reader.result;
    };
    reader.readAsDataURL(file);
    const formData = new FormData();
    formData.append('adminPhoto', file); 
    formData.append('userId', savedId);  

    try {
        const response = await fetch('/api/admin/upload-photo', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            alert("Profile photo saved to MongoDB Atlas!");
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
async function saveAdminData() {
    // 1. Get the dynamic userId from localStorage
    const savedId = localStorage.getItem('userId');

    if (!savedId) {
        alert("Session error: User ID not found. Please login again.");
        return;
    }

    const adminData = {
        userId: savedId, 
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
            alert("Admin records successfully updated in Atlas database.");
        } else {
            alert("Update failed: " + result.message);
        }
    } catch (err) {
        console.error("Save error:", err);
        alert("Server error. Check if your Node.js server is running.");
    }
}

window.onload = loadAdminProfile;

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
    const savedId = localStorage.getItem('userId');
    loadPerformanceStats();
    if (!savedId) {
        console.error("No userId found in storage.");
        window.location.href = '../auth.html';
        return;
    }

    try {
        // Fetch specific admin data using the ID from your MongoDB Atlas cluster
        const response = await fetch(`/api/admin/get-profile?id=${savedId}`);
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
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const response = await fetch(`/api/admin/dashboard-stats?userId=${userId}`);
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
