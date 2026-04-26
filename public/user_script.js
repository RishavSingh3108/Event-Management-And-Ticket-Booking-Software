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
                    <button class="btn-view-availability" onclick="openCalendar('${venue._id}', '${venue.name}')">
                        <i class='bx bx-calendar-event'></i> View Availability
                    </button>
                    <button class="action-btn book-now-btn" onclick="initiateBooking('${venue._id}')">
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

async function initiateBooking(venueId, venueDate = null) {
    selectedVenue = venueId;
    selectedDate = venueDate;

    // 1. Set the date in the input field
    if (venueDate) {
        document.getElementById('bookingDate').value = venueDate;
    }

    // 2. Get the userId from localStorage (saved during login)
    const savedId = localStorage.getItem('userId');

    if (savedId && savedId !== "undefined" && savedId !== "null") {
        try {
            // 3. Fetch user details from your new ID-based API route
            const response = await fetch(`/api/user-by-id/${savedId}`);
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
    document.getElementById("bookingModal").style.display = "none";
}


// =============================
// CONFIRM BOOKING FUNCTION
// =============================


async function confirmBooking() {
    // 1. Collect data from your Modal Inputs
    const bookingData = {
        venueId: selectedVenue, 
        bookingDate: document.getElementById('bookingDate').value,
        guests: document.getElementById('guests').value,
        bookedBy: document.getElementById('bookedBy').value,
        contact: document.getElementById('contact').value,
        email: document.getElementById('email').value,
        purpose: document.getElementById('purpose').value,
        requirements: document.getElementById('requirements').value
    };

    // 2. Basic Validation
    if (!bookingData.bookingDate || !bookingData.bookedBy || !bookingData.contact) {
        alert("Please fill in the required fields: Date, Name, and Contact Number.");
        return;
    }

    try {
        // 3. Send data to the Backend API
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (response.ok) {
            // 4. Success Actions
            alert("✨ Perfect! Your reservation has been recorded. \n\nImportant: Please visit the venue or contact the owner within 24 hours for advance payment.");
            
            clearBookingForm();
            closeBookingModal();
        } else {
            // UPDATED: This now catches the "Already Booked" message from server.js
            // result.message comes from your: res.status(400).json({ message: "..." })
            alert("❌ " + (result.message || result.error || "Failed to submit booking request."));
        }

    } catch (err) {
        console.error("Booking Error:", err);
        alert("Could not connect to the server. Please check if your backend is running.");
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
}

// Close modal if user clicks outside of it
window.onclick = function(event) {
    const modal = document.getElementById("bookingModal");
    if (event.target == modal) {
        closeBookingModal();
    }
}

// Function to show the Tracking Modal
function openTrackModal() {
    const modal = document.getElementById("trackModal");
    modal.style.display = "flex"; // Changes from 'none' to 'flex' to show it
    
    // Prevent the background page from scrolling while the popup is open
    document.body.style.overflow = "hidden";
}

// Function to hide the Tracking Modal
function closeTrackModal() {
    const modal = document.getElementById("trackModal");
    modal.style.display = "none"; // Hides it again
    
    // Re-enable background scrolling
    document.body.style.overflow = "auto";
}

// For the user view Availability button dates slots for event in venues

let venueBookings = [];
let selectedVenueId = null;

/**
 * Open Calendar for Users
 * Triggered by: onclick="openCalendar('ID', 'Name')"
 */
async function openCalendar(venueId, venueName) {
    selectedVenueId = venueId;
    document.getElementById('calVenueName').innerText = venueName;
    const modal = document.getElementById('calendarModal');

    try {
        // 1. Fetch bookings from the API
        const response = await fetch(`/api/bookings/venue/${venueId}`);
        venueBookings = await response.json();

        // 2. Setup the Dropdown (Current month + next 5)
        setupMonthDropdown(venueId);

        // 3. Show the Modal
        modal.style.display = 'flex'; 
    } catch (err) {
        console.error("Calendar Load Error:", err);
        // Fallback: If API fails, show empty calendar
        venueBookings = [];
        setupMonthDropdown(venueId);
        modal.style.display = 'flex';
    }
}

function setupMonthDropdown(venueId) {
    const select = document.getElementById('monthSelect');
    if (!select) return;
    
    select.innerHTML = ''; 
    const now = new Date();

    for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const option = document.createElement('option');
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        option.value = `${year}-${month}`;
        option.innerText = date.toLocaleString('default', { month: 'long' });
        select.appendChild(option);
    }

    // Default: Render the first month
    renderCalendarGrid(select.value, venueId);

    // Update grid when dropdown changes
    select.onchange = (e) => renderCalendarGrid(e.target.value, venueId);
}

function renderCalendarGrid(yearMonth, venueId) {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = ''; // Clear previous days

    const [year, month] = yearMonth.split('-').map(Number);
    
    // Get total days in selected month
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = String(i).padStart(2, '0');
        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;

        // Using your exact logic: find if this date exists in the bookings array
        const booking = venueBookings.find(b => b.bookingDate === formattedDate);

        const day = document.createElement('div');
        
        // Applying your working classes: 'busy' for Red, 'free' for Green
        day.className = `day-box ${booking ? 'busy' : 'free'}`;
        day.innerText = i;

        // USER-SIDE INTERACTION LOGIC
        if (booking) {
            // If it's occupied (Red)
            day.style.cursor = 'not-allowed';
            day.onclick = () => alert(`Date ${formattedDate} is Already Booked.`);
        } else {
            day.style.cursor = 'pointer';
            
            day.addEventListener('click', () => {
                initiateBooking(venueId, formattedDate);
                closeCalendar();
            }) ;
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