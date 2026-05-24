document.addEventListener('DOMContentLoaded', () => {
    loadUserVenues();
    setupSearch();
});
async function loadUserVenues() {
    const showcase = document.querySelector('.venue-showcase');
    
    try {
        const response = await fetch('/api/venues');
        const venues = await response.json();

        if (venues.length === 0) {
            showcase.innerHTML = `<p class="no-data">No venues available at the moment. Stay tuned!</p>`;
            return;
        }

        renderVenues(venues);
    } catch (err) {
        console.error("Error loading venues:", err);
        showcase.innerHTML = `<p class="error">Failed to load venues. Please try again later.</p>`;
    }
}

function renderVenues(venues) {
    const showcase = document.querySelector('.venue-showcase');
    showcase.innerHTML = venues.map(venue => `
        <div class="venue-card-horizontal">
            <div class="card-image-section">
                <img src="${venue.imgUrl || 'default-venue.jpg'}" alt="${venue.name}">
                <div class="venue-type-badge">${venue.type || 'Premium'}</div>
            </div>

            <div class="card-info-section">
                <div class="card-header-row">
                    <h2 class="venue-title">${venue.name}</h2>
                    <div class="price-tag">₹${venue.cost.toLocaleString()} <span>/ Day</span></div>
                </div>

                <p class="venue-desc">${venue.desc || 'A stunning space tailored for your most memorable moments.'}</p>

                <div class="venue-details-grid">
                    <div class="detail-item">
                        <span class="detail-icon">📍</span>
                        <div class="detail-text"><strong>Location</strong><span>${venue.address}</span></div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">📏</span>
                        <div class="detail-text"><strong>Size</strong><span>${venue.size} sq.ft</span></div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">📞</span>
                        <div class="detail-text"><strong>Phone</strong><span>${venue.phone || 'Contact for details'}</span></div>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">✉️</span>
                        <div class="detail-text"><strong>Email</strong><span>${venue.email || 'N/A'}</span></div>
                    </div>
                </div>

                <div class="card-actions-row">
                    <div class="spacer"></div> 
                    <button class="btn-view-availability" onclick="openCalendar('${venue._id}', '${venue.status}', '${venue.name}','${venue.cost}','${venue.adminId}')">
                        <i class='bx bx-calendar-event'></i> View Availability
                    </button>
                    <button class="action-btn book-now-btn" onclick="initiateBooking('${venue._id}','${venue.adminId}','${venue.status}','${venue.cost}')">
                        💝 Book Now
                    </button>
                </div>
            </div>
        </div>`
    ).join('');
}

// Simple Search Logic
function setupSearch() {
    const searchInput = document.querySelector('.search-glass input');
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.venue-card-horizontal');
        
        cards.forEach(card => {
            const title = card.querySelector('.venue-title').innerText.toLowerCase();
            const addr = card.querySelector('.detail-text span').innerText.toLowerCase();
            
            if (title.includes(term) || addr.includes(term)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });
}


// =============================
// BOOKING MODAL FUNCTIONS
// =============================

let selectedVenue = null;
let selectedDate = null;
let basePrice = null;
let selectedVenueAdminId = null;
async function initiateBooking(venueId, venueAdminId, venueStatus, venueCost = null, venueDate = null) {
    console.log(venueStatus);
    if (venueStatus !== "ACTIVE") {
        alert("This venue is currently unavailable for booking.");
        return; // Stop the function here
    }
    selectedVenue = venueId;
    selectedDate = venueDate;
    basePrice = venueCost;
    selectedVenueAdminId = venueAdminId;


    // 1. Set the date in the input field
    if (venueDate) {
        document.getElementById('bookingDate').value = venueDate;
    }

    // 2. Get the userId from localStorage (saved during login)
    const savedId = localStorage.getItem('userId');

    if (savedId && savedId !== "undefined" && savedId !== "null") {
        try {
            // 3. Fetch user details from your new ID-based API route
            const response = await fetch(`/api/user/user-by-id/${savedId}`);
            const data = await response.json();

            if (data.success) {
                // 4. Auto-fill the form fields
                const nameField = document.getElementById('bookedBy');
                const contactField = document.getElementById('contact');
                const emailField = document.getElementById('email');

                nameField.value = data.name || "";
                contactField.value = data.phone || "";
                emailField.value = data.email || "";

                // 5. Lock the fields to prevent changes (Read-Only)
                nameField.readOnly = true;
                contactField.readOnly = true;
                emailField.readOnly = true;

                // Optional: Style them to look "locked"
                nameField.style.backgroundColor = "#f4f4f4";
                contactField.style.backgroundColor = "#f4f4f4";
                emailField.style.backgroundColor = "#f4f4f4";
            }
        } catch (err) {
            console.error("Error auto-filling user data:", err);
            // If API fails, we just let them type manually
        }
    } else {
        console.warn("No userId found in localStorage. User might not be logged in.");
    }

    // 6. Finally, display the modal
    document.getElementById("bookingModal").style.display = "block";
}

function closeBookingModal(){
    clearBookingForm();
    document.getElementById("bookingModal").style.display = "none";
}


// =============================
// CONFIRM BOOKING FUNCTION
// =============================

async function confirmBooking() {
    // 1. Get the logged-in User ID from localStorage
    const savedUserId = localStorage.getItem('userId');
    const screenshotInput = document.getElementById('screenshot');
    const isLocked = document.getElementById('paymentDisplay').classList.contains('blurred');

    // 2. Session & Payment Validation
    if (!savedUserId) {
        alert("Authentication required. Please log in again.");
        window.location.href = '/home/home.html';
        return;
    }

    if (isLocked) {
        alert("Please click 'Pay Now' and complete the payment process first.");
        return;
    }

    if (!screenshotInput.files[0]) {
        alert("Please upload the payment screenshot as proof.");
        return;
    }

    // 3. Collect data using FormData (Important for file uploads)
    const formData = new FormData();
    
    // Standard Fields
    console.log(selectedVenueAdminId);
    formData.append('userId', savedUserId);
    formData.append('adminId', selectedVenueAdminId);
    formData.append('venueId', selectedVenue.trim()); // trim to clean any whitespace
    formData.append('bookingDate', document.getElementById('bookingDate').value);
    formData.append('guests', document.getElementById('guests').value);
    formData.append('bookedBy', document.getElementById('bookedBy').value);
    formData.append('contact', document.getElementById('contact').value);
    formData.append('email', document.getElementById('email').value);
    formData.append('purpose', document.getElementById('purpose').value);
    formData.append('requirements', document.getElementById('requirements').value);

    // Payment Fields
    formData.append('paymentType', selectedPaymentType);
    
    // Recalculate amount for the database
    let finalAmount = 0;
    if (selectedPaymentType === 'partial') finalAmount = basePrice * 0.25;
    else if (selectedPaymentType === 'advance') finalAmount = basePrice * 0.50;
    else finalAmount = basePrice;
    
    formData.append('paymentAmount', Math.round(finalAmount));

    // The File (Matches 'screenshot' in upload.single('screenshot') in server.js)
    formData.append('screenshot', screenshotInput.files[0]);

    // 4. Basic Validation for required fields
    if (!document.getElementById('bookingDate').value || !document.getElementById('bookedBy').value) {
        alert("Please fill in the required fields: Date and Name.");
        return;
    }

    try {
        // 5. Send to API
        const response = await fetch('/api/user/bookings', {
            method: 'POST',
            body: formData 
        });

        const result = await response.json();

        if (response.ok) {
            alert("✨ Perfect! Your reservation and payment proof have been sent for approval.");
            clearBookingForm();
            closeBookingModal();
            if(window.location.pathname.includes('user.html')) {
                // Optional: refresh page to update calendar/tracking
                location.reload(); 
            }
        } else {
            alert("❌ " + (result.message || "Failed to submit booking request."));
        }

    } catch (err) {
        console.error("Booking Error:", err);
        alert("Server Error. Please check if your backend is running.");
    }
}

// Helper function to clear form after success
function clearBookingForm() {
    document.getElementById('bookingDate').value = "";
    document.getElementById('guests').value = "";
    document.getElementById('bookedBy').value = "";
    document.getElementById('contact').value = "";
    document.getElementById('email').value = "";
    document.getElementById('purpose').value = "";
    document.getElementById('requirements').value = "";

    // 2. Reset File Input and Status
    document.getElementById('screenshot').value = "";
    const fileStatus = document.getElementById('file-status');
    if (fileStatus) {
        fileStatus.innerText = "Select Image";
        fileStatus.style.color = "#888";
    }

    // 3. Reset Payment Selection to first card
    document.getElementById('amountDisplay').innerText = "Payable: ₹0";
    selectedPaymentType = 'partial'; 
    const allCards = document.querySelectorAll('.payment-card');
    allCards.forEach((card, index) => {
        card.classList.toggle('active', index === 0);
    });

    // 4. Reset QR image to placeholder
    const qrImg = document.getElementById('qrImage');
    if (qrImg) qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Locked";

    // 5. THE CRITICAL FIX: Restore Blur AND Overlay
    const paymentDisplay = document.getElementById('paymentDisplay');
    const paymentOverlay = document.getElementById('paymentOverlay');
    
    if (paymentDisplay) {
        paymentDisplay.classList.add('blurred');
    }
    
    if (paymentOverlay) {
        paymentOverlay.style.display = "flex"; // Re-show the overlay
        paymentOverlay.style.opacity = "1";    // Ensure it is visible
    }
}

// Close modal if user clicks outside of it
window.onclick = function(event) {
    const modal = document.getElementById("bookingModal");
    if (event.target == modal) {
        closeBookingModal();
    }
}

let allBookingsData = []; // Global variable to hold the fetched data

async function openTrackModal() {
    const modal = document.getElementById("trackModal");
    const container = document.getElementById("trackBookingsList");
    const savedId = localStorage.getItem('userId');

    if (!savedId || savedId === "undefined" || savedId === "null") {
        alert("Please log in to view your bookings.");
        return;
    }

    modal.style.display = "flex";
    container.innerHTML = "<div class='loading'>Loading your dossier...</div>";

    try {
        const response = await fetch(`/api/user/my-bookings-by-id/${savedId}`);
        const data = await response.json();

        if (data.success && data.bookings.length > 0) {
            allBookingsData = data.bookings; // Store data globally
            filterBy('upcoming'); // Show upcoming by default
        } else {
            container.innerHTML = "<p class='empty-msg'>No reservations found.</p>";
        }
    } catch (err) {
        container.innerHTML = "<p class='error-msg'>Connection failed.</p>";
    }
}

function filterBy(type) {
    const container = document.getElementById("trackBookingsList");
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    document.getElementById('btnUpcoming').classList.toggle('active', type === 'upcoming');
    document.getElementById('btnPassed').classList.toggle('active', type === 'passed');

    const filtered = allBookingsData.filter(book => {
        const eventDate = new Date(book.bookingDate);
        return type === 'upcoming' ? eventDate >= now : eventDate < now;
    });

    container.innerHTML = "";

    if (filtered.length === 0) {
        container.innerHTML = `<p class='empty-msg'>No ${type} reservations found.</p>`;
        return;
    }

    filtered.forEach(book => {
        const eventDate = new Date(book.bookingDate);
        eventDate.setHours(0, 0, 0, 0);
        const isPast = eventDate < now;

        const venue = book.venueId || { name: "Grand Venue", imgUrl: "default.jpg", address: "N/A", phone: "N/A" };
        const bookingData = encodeURIComponent(JSON.stringify(book));

        const card = document.createElement('div');
        card.className = `mini-booking-card ${isPast ? 'past-event' : 'upcoming'}`;
        
        const canManage = !isPast && book.status !== 'Cancelled' && book.status !== 'Rejected';

        const canDelete = book.status !== 'Approved';

        card.innerHTML = `
            <div class="card-status-badge ${book.status ? book.status.toLowerCase() : 'pending'}">
                ${book.status || 'Pending'}
            </div>
            
            <div class="card-inner">
                <div class="card-left">
                    <img src="${venue.imgUrl || 'default-venue.jpg'}" class="card-venue-img">
                </div>

                <div class="card-content">
                    <h2 class="venue-title">${venue.name}</h2>
                    
                    <div class="meta-info">
                        <p><i class='bx bx-calendar'></i> <span><strong>Date:</strong> ${book.bookingDate}</span></p>
                        <p><i class='bx bx-group'></i> <span><strong>Guests:</strong> ${book.guests || 'N/A'}</span></p>
                        <p><i class='bx bx-map-pin'></i> <span><strong>Address:</strong> ${venue.address || 'N/A'}</span></p>
                        <p><i class='bx bx-phone'></i> <span><strong>Contacts:</strong> ${venue.phone || 'N/A'}</span></p>
                        <p><i class='bx bx-wallet'></i> <span><strong>Paid:</strong> ₹${book.paymentAmount || 0}</span></p>
                        <p><i class='bx bx-info-circle'></i> <span><strong>Status:</strong> ${book.status || 'Pending'}</span></p>
                    </div>

                    <div class="action-footer">
                        <div class="footer-main-actions">
                            ${canManage ? `
                                <button class="manage-booking-btn" onclick="openManageModal('${bookingData}')">
                                    View Details <i class='bx bx-chevron-right'></i>
                                </button>
                            ` : `
                                <div class="finalized-label">
                                    ${book.status === 'Cancelled' ? 'Booking Cancelled' : 'Management Closed'}
                                </div>
                            `}
                        </div>

                        <!-- Conditionally render Delete Button -->
                        ${canDelete ? `
                            <button class="delete-booking-btn" onclick="deleteBookingRecord('${book._id}')">
                                <i class='bx bx-trash'></i> Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}


// Add these at the very top of your user_script.js file
let activeBookingId = null; 
let currentActiveVenueId = null; 
let occupiedDates = []; 

function openManageModal(encodedData) {
    const book = JSON.parse(decodeURIComponent(encodedData));
    activeBookingId = book._id; 
    
    const venue = book.venueId || {};

    // --- NEW LINE HERE ---
    // This ensures toggleDateChange knows which venue to fetch dates for
    currentActiveVenueId = venue._id || venue; 

    document.getElementById("m-venueName").innerText = venue.name || "Venue Details";
    document.getElementById("m-address").innerText = venue.address || "N/A";
    document.getElementById("m-contact").innerText = venue.phone || "N/A";
    document.getElementById("m-date").innerText = book.bookingDate;
    document.getElementById("m-guests").innerText = book.guests || "0";
    document.getElementById("m-paid").innerText = `₹${book.paymentAmount || 0}`;
    
    const statusPill = document.getElementById("m-status-pill");
    statusPill.innerText = book.status;
    statusPill.className = `status-pill ${book.status.toLowerCase()}`;

    document.getElementById("m-proofImg").src = `/api/bookings/screenshot/${book._id}`;

    document.getElementById("dateEditBox").style.display = "none";
    document.getElementById("bookingActionModal").style.display = "flex";
    document.getElementById("bookingActionModal").style.display = "flex";
}

// Close the modal
function closeManageModal() {
    document.getElementById("bookingActionModal").style.display = "none";
}

// Function to handle Booking Cancellation
async function handleCancellation() {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
        const response = await fetch(`/api/bookings/status/${activeBookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Cancelled' })
        });
        
        const result = await response.json();
        if (result.success) {
            alert("Booking successfully cancelled.");
            location.reload(); // Refresh the list
        }
    } catch (err) {
        console.error("Cancellation error:", err);
        alert("Failed to cancel booking.");
    }
}
async function toggleDateChange() {
    const box = document.getElementById("dateEditBox");
    const dateInput = document.getElementById("newDateSelect");

    if (box.style.display === "none" || box.style.display === "") {
        if (!currentActiveVenueId) return alert("Venue error. Please reopen the modal.");

        // 1. Set Min Date (Tomorrow)
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.setAttribute('min', tomorrow.toISOString().split('T')[0]);

        // 2. Fetch occupied dates
        try {
            const response = await fetch(`/api/user/venue/${currentActiveVenueId}/booked-dates`);
            
            // Check for valid JSON to avoid the <!DOCTYPE error
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const data = await response.json();
                if (data.success) {
                    occupiedDates = data.bookedDates;
                }
            }
        } catch (err) {
            console.error("Availability check failed:", err);
        }

        box.style.display = "flex";
    } else {
        box.style.display = "none";
        dateInput.value = "";
    }
}

// 3. Add the Listener (Only add this ONCE in your script)
document.getElementById("newDateSelect").addEventListener("change", function(e) {
    if (occupiedDates.includes(e.target.value)) {
        alert("This date is already occupied. Please pick another.");
        e.target.value = ""; 
    }
});

async function submitDateUpdate() {
    const newDate = document.getElementById("newDateSelect").value;
    if (!newDate) return alert("Select a date first.");

    try {
        const response = await fetch(`/api/user/bookings/update-date/${activeBookingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newDate: newDate })
        });

        const result = await response.json(); // This will now receive the "Date occupied" message

        if (result.success) {
            alert("Success! Date changed.");
            location.reload();
        } else {
            // This will now alert "This date is already occupied..."
            alert("Oops! " + result.message); 
        }
    } catch (err) {
        alert("Server error. Please try again later.");
    }
}
// Function to hide the Tracking Modal
function closeTrackModal() {
    const modal = document.getElementById("trackModal");
    modal.style.display = "none"; // Hides it again
    document.body.style.overflow = "auto";
}

let venueBookings = [];
let selectedVenueId = null;

async function openCalendar(venueId, venueStatus, venueName, venueCost, venueAdminId) {
    selectedVenueId = venueId;
    document.getElementById('calVenueName').innerText = venueName;
    const modal = document.getElementById('calendarModal');

    try {
        // 1. Fetch bookings from the API
        const response = await fetch(`/api/bookings/venue/${venueId}`);
        venueBookings = await response.json();

        // 2. Setup the Dropdown (Current month + next 5)
        setupMonthDropdown(venueId, venueStatus, venueCost, venueAdminId);

        // 3. Show the Modal
        modal.style.display = 'flex'; 
    } catch (err) {
        console.error("Calendar Load Error:", err);
        // Fallback: If API fails, show empty calendar
        venueBookings = [];
        setupMonthDropdown(venueId, venueStatus, venueAdminId);
        modal.style.display = 'flex';
    }
}
function setupMonthDropdown(venueId, venueStatus, venueCost, venueAdminId) {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect'); // Grab your new year dropdown
    if (!monthSelect || !yearSelect) return;
    
    // 1. Setup Years (Current + Next)
    yearSelect.innerHTML = '';
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    [currentYear, currentYear + 1].forEach(yr => {
        const option = document.createElement('option');
        option.value = yr;
        option.innerText = yr;
        yearSelect.appendChild(option);
    });

    // 2. Setup Months (January - December)
    monthSelect.innerHTML = ''; 
    for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, i, 1);
        const option = document.createElement('option');
        
        // We only store the Month Number (01-12) as the value here
        const monthNum = String(i + 1).padStart(2, '0');
        option.value = monthNum;
        option.innerText = date.toLocaleString('default', { month: 'long' });
        
        if (i === currentMonth) {
            option.selected = true;
        }
        monthSelect.appendChild(option);
    }

    // 3. Helper function to get "YYYY-MM" and render
    const refreshGrid = () => {
        const selectedYear = yearSelect.value;
        const selectedMonth = monthSelect.value;
        renderCalendarGrid(`${selectedYear}-${selectedMonth}`, venueId, venueStatus, venueCost, venueAdminId);
    };

    // 4. Update grid whenever EITHER dropdown changes
    yearSelect.onchange = refreshGrid;
    monthSelect.onchange = refreshGrid;

    // Initial Render for current month/year
    refreshGrid();
}

function renderCalendarGrid(yearMonth, venueId, venueStatus, venueCost, venueAdminId) {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = ''; 

    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Get today's date for comparison (resetting time to midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = String(i).padStart(2, '0');
        const monthStr = String(month).padStart(2, '0');
        const formattedDate = `${year}-${monthStr}-${dayStr}`;

        // Create a Date object for the current day in the loop
        const loopDate = new Date(year, month - 1, i);
        
        // 1. Check if it's already booked (Busy)
        const booking = venueBookings.find(b => b.bookingDate === formattedDate);
        
        // 2. THE NEW CHECK: Is this date in the past?
        const isPast = loopDate < today;

        const day = document.createElement('div');
        day.innerText = i;

        // LOGIC: If it's in the past OR already booked, it shouldn't be clickable
        if (isPast) {
            // Style for past dates (you can add a 'past-date' class in CSS)
            day.className = "day-box past-disabled"; 
            day.style.cursor = 'not-allowed';
            day.style.opacity = '0.4'; // Visual cue that it's disabled
            day.onclick = () => alert(`Date ${formattedDate} is in the past and cannot be booked.`);
        } 
        else if (booking) {
            // Already Booked (Red)
            day.className = "day-box busy";
            day.style.cursor = 'not-allowed';
            day.onclick = () => alert(`Date ${formattedDate} is already booked.`);
        } 
        else {
            // Available (Green)
            day.className = "day-box free";
            day.style.cursor = 'pointer';
            day.onclick = () => {
                initiateBooking(venueId, venueAdminId, venueStatus, venueCost, formattedDate);
                closeCalendar();
            };
        }

        grid.appendChild(day);
    }
}

function closeCalendar() {
    const modal = document.getElementById('calendarModal');
    if (modal) modal.style.display = 'none';
}

// Close on outside click
window.addEventListener('click', (e) => {
    const modal = document.getElementById('calendarModal');
    if (e.target === modal) {
        closeCalendar();
    }
});

// Variable to store the currently selected payment type
let selectedPaymentType = 'partial'; 
let finalAmount = 0;

function selectPayment(element, type) {
    // 1. Find all payment cards and remove the 'active' class
    const allCards = document.querySelectorAll('.payment-card');
    allCards.forEach(card => {
        card.classList.remove('active');
    });

    // 2. Add the 'active' class to the card that was just clicked
    element.classList.add('active');

    // 3. Update our variable to the new selection
    selectedPaymentType = type;
    handlePayment();
}
// PAY NOW BUUTON KA FUNCTION HAI
function handlePayment() {
    const amountDisplay = document.getElementById('amountDisplay');
    const qrImg = document.getElementById('qrImage');
    const overlay = document.getElementById('paymentOverlay');
    const display = document.getElementById('paymentDisplay');

    if (selectedPaymentType === 'partial') finalAmount = basePrice * 0.25;
    else if (selectedPaymentType === 'advance') finalAmount = basePrice * 0.50;
    else finalAmount = basePrice;

    // 2. Generate the QR Code (Dynamic)
    const upiID = "rishav310805@okicici"; // Put your actual ID here
    const qrData = `upi://pay?pa=${upiID}&pn=EventFlow&am=${finalAmount}&cu=INR`;
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

    // 3. Update Text and Remove Blur
    amountDisplay.innerText = `Payable: ₹${finalAmount}`;
    display.classList.remove('blurred');
    overlay.style.opacity = "0";
    setTimeout(() => { overlay.style.display = "none"; }, 400);
}

function updateFileName(input) {
    if (input.files.length > 0) {
        document.getElementById('file-status').innerText = input.files[0].name;
        document.getElementById('file-status').style.color = "green";
    }
}

async function deleteBookingRecord(bookingId) {
    if (!confirm("Are you sure you want to delete this booking permanently?")) return;

    try {

        const response = await fetch(`/api/user/bookings/${bookingId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Server says:", errorText);
            throw new Error(`Server error: ${response.status}`);
        }
        const data = await response.json();

        if (data.success) {
            alert("Booking deleted successfully!");
            allBookingsData = allBookingsData.filter(book => book.id !== bookingId);
            const activeTab = document.getElementById('btnUpcoming').classList.contains('active') 
                ? 'upcoming' 
                : 'passed';
            filterBy(activeTab);
        }

    } catch (error) {
        console.error("Deletion Error:", error);
        alert("Could not delete. Check the console for details.");
    }
}
// ==========================================================================
// User Profile PopUp & Payout Handlers
// ==========================================================================

let hideTimeout;

async function fetchAndPopulateProfileData() {
    // Read the active logged-in userId from localStorage
    const userId = localStorage.getItem('userId'); 
    
    if (!userId) {
        console.error("No active user session identifier located.");
        return;
    }

    try {
        // Hit our updated router endpoint
        const response = await fetch(`/api/user/user-by-id/${userId}`);
        
        // Safety check to handle accidental HTML fallback templates
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            throw new Error("Server returned an HTML document structure instead of JSON data.");
        }

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to retrieve user profile data.");
        }

        // 1. Generate text initials avatar dynamically from the user's name
        const fullName = result.name || "Guest";
        const nameParts = fullName.trim().split(" ");
        let initials = "GS";
        if (nameParts.length > 1) {
            initials = `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
        } else if (nameParts[0]) {
            initials = nameParts[0].substring(0, 2).toUpperCase();
        }

        // 2. Format the database ISO Date stamp into a clean, human-readable format
        let formattedDob = "Not Set";
        if (result.dob) {
            const dateObj = new Date(result.dob);
            formattedDob = dateObj.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }); // Produces "31 Aug 2005" format
        }

        // 3. Map values across identity DOM fields
        document.getElementById('userInitials').textContent = initials;
        document.getElementById('userName').textContent = fullName;
        document.getElementById('userEmail').textContent = result.email || "—";
        document.getElementById('userPhone').textContent = result.phone || "—";
        document.getElementById('userDob').textContent = formattedDob;

        // 4. Safely pull down saved payment objects
        const pMethod = result.preferredPayment || 'bank';
        const pData = result.paymentData || { upiId: '', bankAccount: '', ifscCode: '' };

        // 5. Populate payment inputs
        document.getElementById('upi-id').value = pData.upiId || '';
        document.getElementById('acno').value = pData.bankAccount || '';
        document.getElementById('acno2').value = pData.bankAccount || ''; // Match the confirm input field as well
        document.getElementById('ifsc').value = pData.ifscCode || '';

        // 6. Switch layout visualization tab to active system variant ('bank' or 'upi')
        switchPayoutMethod(pMethod);

    } catch (error) {
        console.error("Profile Synchronization Defect:", error);
        alert(`Could not load profile details: ${error.message}`);
    }
}
function toggleProfilePopup(show) {
    const popup = document.getElementById('userProfilePopup');
    if (!popup) return;

    if (show) {
        fetchAndPopulateProfileData();
        clearTimeout(hideTimeout);
        popup.classList.add('active');
    } else {
        // Subtle delay to allow moving mouse cleanly between chip and card
        hideTimeout = setTimeout(() => {
            popup.classList.remove('active');
        }, 200);
    }
}

// Ensure popup doesn't close prematurely when user hovers directly over the popup card itself
document.getElementById('userProfilePopup').addEventListener('mouseenter', () => {
    clearTimeout(hideTimeout);
});
document.getElementById('userProfilePopup').addEventListener('mouseleave', () => {
    toggleProfilePopup(false);
});

/**
 * Toggles internal editable input status fields for payout management components.
 */
function enablePayoutEdit() {
    const editBtn = document.getElementById('payoutEditBtn');
    const updateBtn = document.getElementById('updatePayoutBtn');
    const methodBtns = document.querySelectorAll('.method-btn');
    const inputs = document.querySelectorAll('#payoutInputsArea input');

    // Toggle interactive states
    methodBtns.forEach(btn => btn.disabled = false);
    updateBtn.style.display = 'block';
    editBtn.style.display = 'none';

    inputs.forEach(input => {
        input.removeAttribute('readonly');
        input.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    });
}

/**
 * Toggles layout arrays between alternative electronic transaction mechanisms (UPI vs Bank).
 */
function switchPayoutMethod(method) {
    const upiFields = document.getElementById('upi-fields');
    const bankFields = document.getElementById('bank-fields');
    const upiBtn = document.getElementById('method-upi');
    const bankBtn = document.getElementById('method-bank');

    if (method === 'upi') {
        upiFields.style.display = 'block';
        bankFields.style.display = 'none';
        upiBtn.classList.add('active');
        bankBtn.classList.remove('active');
    } else {
        upiFields.style.display = 'none';
        bankFields.style.display = 'block';
        bankBtn.classList.add('active');
        upiBtn.classList.remove('active');
    }
}
async function savePayoutDetails() {
    const editBtn = document.getElementById('payoutEditBtn');
    const updateBtn = document.getElementById('updatePayoutBtn');
    const methodBtns = document.querySelectorAll('.method-btn');
    const inputs = document.querySelectorAll('#payoutInputsArea input');

    // Determine which payment system layout tab is currently flagged active
    const isUpiActive = document.getElementById('method-upi').classList.contains('active');
    const selectedMethod = isUpiActive ? 'upi' : 'bank';

    // 1. Validate matching confirmation inputs if Bank is selected
    if (!isUpiActive) {
        const acNum = document.getElementById('acno').value.trim();
        const acConfirm = document.getElementById('acno2').value.trim();
        if (acNum !== acConfirm) {
            alert("Account numbers do not match!");
            return;
        }
    }

    // 2. Build out Request Payload
    const payload = {
        userId: localStorage.getItem('userId'), // Ensure your login script sets this parameter on local session initialization
        preferredPayment: selectedMethod,
        paymentData: {
            upiId: document.getElementById('upi-id').value.trim(),
            bankAccount: document.getElementById('acno').value.trim(),
            ifscCode: document.getElementById('ifsc').value.trim()
        }
    };

    // UI Feedback: Show progress state inside action button
    const defaultBtnText = updateBtn.textContent;
    updateBtn.textContent = "Saving to Database...";
    updateBtn.disabled = true;

    try {
        // 3. Send AJAX payload tracking data directly to back-end controllers
        const response = await fetch('/api/user/payout-details', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                // Optional: Pass authorization tokens if using protected route middlewares
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to update target database registers.");
        }

        alert("Success! Details safely recorded.");

        methodBtns.forEach(btn => btn.disabled = true);
        updateBtn.style.display = 'none';
        editBtn.style.display = 'block';

        inputs.forEach(input => {
            input.setAttribute('readonly', true);
            input.style.border = '1px solid transparent';
            input.style.borderBottom = 'none';
        });

    } catch (error) {
        console.error("API Network Sync Breakdown:", error);
        alert(`Error: ${error.message}`);
    } finally {
        updateBtn.textContent = defaultBtnText;
        updateBtn.disabled = false;
    }
}

/**
 * Fallback global tracking links
 */
function openRefundHistory() {
    alert("Navigating to secure refund data ledgers...");
}