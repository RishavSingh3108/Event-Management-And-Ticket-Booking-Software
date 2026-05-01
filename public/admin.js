let isEditMode = false;
let currentEditId = null;
const venueModal = document.getElementById('venueModal');
const addVenueBtn = document.querySelector('.add-venue-btn');
const addVenueForm = document.getElementById('addVenueForm');

// 1. Function to check profile status
async function checkProfileAndOpenModal() {
    const userId = localStorage.getItem('userId');

    try {
        const response = await fetch(`/api/admin/dashboard-stats?userId=${userId}`);
        const data = await response.json();
        
        // This will now see the strings from businessDetails
        const isComplete = data.gst && data.fssai && data.aadhar && data.location;

        if (!isComplete) {
            alert("⚠️ Please complete your profile (GST, FSSAI, Aadhar, and Location) before adding a venue!");
            return; 
        }

        // Open your modal logic
        isEditMode = false;
        currentEditId = null;
        addVenueForm.reset();
        document.querySelector('.modal-header h2').innerHTML = "<i class='bx bx-building-house'></i> Register New Venue";
        document.querySelector('.btn-primary').innerText = "Submit";
        venueModal.classList.add('active');

    } catch (err) {
        console.error("Error:", err);
    }
}

// 2. Logic to actually open the modal (extracted from your click listener)
function openAddVenueModal() {
    isEditMode = false;     // Reset mode
    currentEditId = null;   // Reset ID
    addVenueForm.reset();   // Clear fields
    
    // Reset Modal UI
    document.querySelector('.modal-header h2').innerHTML = "<i class='bx bx-building-house'></i> Register New Venue";
    document.querySelector('.btn-primary').innerText = "Submit";
    
    venueModal.classList.add('active');
}

// 3. Update your click listener to use the check
addVenueBtn.addEventListener('click', checkProfileAndOpenModal);

function closeModal() {
    venueModal.classList.remove('active');
}

window.addEventListener('click', (e) => {
    if (e.target === venueModal) {
        closeModal();
    }
});


addVenueForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const savedId = localStorage.getItem('userId');

    // 1. Data Collection
    const venueData = {
        adminId: savedId,
        name: document.getElementById('vName').value,
        address: document.getElementById('vAddress').value,
        phone: document.getElementById('vPhone').value,
        email: document.getElementById('vEmail').value,
        imgUrl: document.getElementById('vImage').value,
        desc: document.getElementById('vDesc').value,
        type: document.getElementById('vType').value,
        size: Number(document.getElementById('vSize').value),
        cost: Number(document.getElementById('vCost').value)
    };

    if (!savedId) {
        alert("Error: User session not found. Please log in again.");
        return;
    }

    // 2. Logic Switch (The fix is here)
    let url = '/api/venues';
    let method = 'POST';

    if (isEditMode && currentEditId) {
        url = `/api/venues/${currentEditId}`;
        method = 'PUT';
    }

    console.log(`Attempting ${method} to ${url}`); // Look at F12 console for this!

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(venueData)
        });

        // 3. Handle response carefully
        if (response.ok) {
            alert(isEditMode ? "✅ Updated!" : "✅ Added!");
            location.reload();
        } else {
            const errorText = await response.text();
            throw new Error(errorText || "Server returned an error");
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        alert("Failed to connect to the server. Check if your server.js is running!");
    }
});

// function for loading venues

async function loadVenues() {
    const container = document.getElementById('venueContainer');
    if (!container) return;
    const myId = localStorage.getItem('userId'); // added this

    try {
        const response = await fetch(`/api/venues?adminId=${myId}`); // added this
        // const response = await fetch('/api/venues');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const venues = await response.json();
        container.innerHTML = ""; // Clear loading text

        if (venues.length === 0) {
            container.innerHTML = "<p>You haven't added any venues yet.</p>";
            return;
        }

        venues.forEach(venue => {
            container.innerHTML += `
                <div class="venue-card-horizontal">
                    <div class="card-image-section">
                        <img src="${venue.imgUrl || 'default-image.jpg'}" alt="${venue.name}">
                        <div class="venue-type-badge">${venue.type || 'Seminar'}</div>
                    </div>

                    <div class="card-info-section">
                        <div class="card-header-row">
                            <h2 class="venue-title">${venue.name}</h2>
                            <div class="price-tag">₹${venue.cost.toLocaleString()} <span>/ Day</span></div>
                        </div>

                        <p class="venue-desc">${venue.desc || 'No description provided.'}</p>

                        <div class="venue-details-grid">
                            <div class="detail-item">
                                <span class="detail-icon">📍</span>
                                <div class="detail-text"><strong>Address</strong><span>${venue.address}</span></div>
                            </div>
                            <div class="detail-item">
                                <span class="detail-icon">📏</span>
                                <div class="detail-text"><strong>Size</strong><span>${venue.size} sq.ft</span></div>
                            </div>
                            <div class="detail-item">
                                <span class="detail-icon">📞</span>
                                <div class="detail-text"><strong>Contact</strong><span>${venue.phone || 'N/A'}</span></div>
                            </div>
                            <div class="detail-item">
                                <span class="detail-icon">✉️</span>
                                <div class="detail-text"><strong>Email</strong><span>${venue.email || 'N/A'}</span></div>
                            </div>
                        </div>

                        <div class="card-actions-row">
                            <button class="action-btn view-bookings-btn" onclick="openCalendar('${venue._id}', '${venue.name}')">
                                <span class="btn-icon">📅</span> View Bookings
                            </button>
                            
                            <div class="right-actions">
                                <button class="action-btn edit-btn" onclick="editVenue('${venue._id}')">
                                    <span class="btn-icon">✏️</span> Edit
                                </button>
                                <button class="action-btn remove-btn" onclick="deleteVenue('${venue._id}')">
                                    <span class="btn-icon">🗑️</span> Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Frontend Fetch Error:", err);
        container.innerHTML = "<p style='color:red;'>Error: Could not connect to the server.</p>";
    }
}

// 1. Initialize both loading and search on page load
document.addEventListener('DOMContentLoaded', () => {
    loadVenues();
    setupAdminSearch(); 
});

// 2. The Search Logic
function setupAdminSearch() {
    const searchInput = document.getElementById('venueSearch');
    
    searchInput.addEventListener('input', () => {
        const filter = searchInput.value.toLowerCase();
        // Target the dynamic cards we created in loadVenues
        const cards = document.querySelectorAll('.venue-card-horizontal');

        cards.forEach(card => {
            // Find the specific text fields within each card
            const name = card.querySelector('.venue-title').innerText.toLowerCase();
            
            // We search through all the detail-text spans (Address, Size, Contact, Email)
            const details = card.querySelectorAll('.detail-text span');
            let detailTextConcat = "";
            details.forEach(span => detailTextConcat += span.innerText.toLowerCase() + " ");

            // If the name OR any detail (address/contact) matches the search term
            if (name.includes(filter) || detailTextConcat.includes(filter)) {
                card.style.display = "flex"; // Show (using flex because horizontal cards usually need it)
            } else {
                card.style.display = "none"; // Hide
            }
        });
    });
}


// The logic to delete particular venue

async function deleteVenue(venueId) {
    if (!confirm("Are you sure? You want to delete this venue!")) return;

    try {
        // MUST use backticks ` for ${variable} to work
        const response = await fetch(`/api/venues/${venueId}`, { 
            method: 'DELETE'
        });

        // Add this check to stop the "Unexpected Token" error
        if (!response.headers.get("content-type")?.includes("application/json")) {
            throw new Error("The server sent back HTML instead of JSON. Check your API route!");
        }

        const result = await response.json();
        if (result.success) {
            location.reload();
        }
    } catch (err) {
        console.error("Delete Error:", err);
        alert(err.message);
    }
}

// The logic to Edit particular venue

async function editVenue(id) {
    if (!id) {
        alert("Error: No ID found for this venue.");
        return;
    }
    console.log("Entering Edit Mode for ID:", id);
    isEditMode = true;
    currentEditId = id;
    console.log("Switching to Edit Mode. ID:", currentEditId);

    try {
        const response = await fetch('/api/venues');
        const venues = await response.json();
        const venue = venues.find(v => v._id === id);

        if (venue) {
            // Fill form with existing data
            document.getElementById('vName').value = venue.name;
            document.getElementById('vAddress').value = venue.address;
            document.getElementById('vPhone').value = venue.phone;
            document.getElementById('vEmail').value = venue.email;
            document.getElementById('vImage').value = venue.imgUrl;
            document.getElementById('vDesc').value = venue.desc;
            document.getElementById('vType').value = venue.type;
            document.getElementById('vSize').value = venue.size;
            document.getElementById('vCost').value = venue.cost;

            // Change UI to reflect Edit Mode
            document.querySelector('.modal-header h2').innerHTML = "<i class='bx bx-edit'></i> Edit Venue";
            document.querySelector('.btn-primary').innerText = "Update Venue";
            
            venueModal.classList.add('active');
        }
    } catch (err) {
        console.error("Error fetching venue for edit:", err);
    }
}

// View Booking option for admin
// Global storage to avoid redundant API calls when switching months
let venueBookings = [];
let selectedVenueId = null;

async function openCalendar(venueId, venueName) {
    selectedVenueId = venueId;
    document.getElementById('calVenueName').innerText = venueName;
    const modal = document.getElementById('calendarModal');

    try {
        // 1. Fetch bookings from your API
        const response = await fetch(`/api/bookings/venue/${venueId}`);
        venueBookings = await response.json();

        // 2. Setup the Dropdown (Current month + next 5)
        setupMonthDropdown();

        // 3. Show the Modal
        modal.style.display = 'flex'; // Using display instead of active class for simplicity
    } catch (err) {
        console.error("Calendar Load Error:", err);
        alert("Failed to load bookings for this venue.");
    }
}

function setupMonthDropdown() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect'); // Grab the new year dropdown
    if (!monthSelect || !yearSelect) return;
    
    monthSelect.innerHTML = ''; 
    yearSelect.innerHTML = ''; 

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();

    // 1. Populate Year Dropdown (Current Year and Next Year)
    [currentYear, currentYear + 1].forEach(yr => {
        const option = document.createElement('option');
        option.value = yr;
        option.innerText = yr;
        yearSelect.appendChild(option);
    });

    // 2. Populate Month Dropdown (All 12 Months)
    for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, i, 1);
        const option = document.createElement('option');
        
        // Value is just the month number "01", "02", etc.
        const monthNum = String(i + 1).padStart(2, '0');
        option.value = monthNum;
        option.innerText = date.toLocaleString('default', { month: 'long' });
        
        // Auto-select current month
        if (i === currentMonthIndex) {
            option.selected = true;
        }
        monthSelect.appendChild(option);
    }

    // 3. Helper to combine Year and Month for the grid
    const refreshAdminGrid = () => {
        const year = yearSelect.value;
        const month = monthSelect.value;
        // Reconstructs the "YYYY-MM" format your grid needs
        renderCalendarGrid(`${year}-${month}`);
    };

    // 4. Update grid when either selection changes
    yearSelect.onchange = refreshAdminGrid;
    monthSelect.onchange = refreshAdminGrid;

    // Initial Render
    refreshAdminGrid();
}

function renderCalendarGrid(yearMonth) {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = ''; 

    const [year, month] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Get today's date and set to midnight for accurate comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = String(i).padStart(2, '0');
        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;

        // Create a date object for the current day in the loop
        const loopDate = new Date(year, month - 1, i);
        
        const booking = venueBookings.find(b => b.bookingDate === formattedDate);
        const isPast = loopDate < today;

        const day = document.createElement('div');
        day.innerText = i;

        // --- Logic Branching ---
        
        if (booking) {
            // 1. Date is Booked (Red)
            day.className = "day-box busy";
            day.onclick = () => {
                window.location.href = `detail/booking_detail.html?id=${booking._id}`;
            };
        } 
        else if (isPast) {
            // 2. Date is in the PAST and was EMPTY (Grey/Neutral)
            day.className = "day-box past-empty"; 
            day.onclick = () => alert(`No bookings were recorded on ${formattedDate} by any client.`);
        } 
        else {
            // 3. Date is in the FUTURE and EMPTY (Green)
            day.className = "day-box free";
            day.onclick = () => alert(`Date ${formattedDate} is available now for Further Bookings.`);
        }

        grid.appendChild(day);
    }
}

function closeCalendar() {
    document.getElementById('calendarModal').style.display = 'none';
}

// Ensure outside click also closes it
window.addEventListener('click', (e) => {
    const modal = document.getElementById('calendarModal');
    if (e.target === modal) {
        closeCalendar();
    }
});