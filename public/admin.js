// 1. Get the elements
let isEditMode = false;
let currentEditId = null;
const venueModal = document.getElementById('venueModal');
const addVenueBtn = document.querySelector('.add-venue-btn');
const addVenueForm = document.getElementById('addVenueForm');

// 2. Modal Controls
addVenueBtn.addEventListener('click', () => {
    isEditMode = false;     // Reset mode
    currentEditId = null;   // Reset ID
    addVenueForm.reset();   // Clear fields
    
    // Reset Modal UI
    document.querySelector('.modal-header h2').innerHTML = "<i class='bx bx-building-house'></i> Register New Venue";
    document.querySelector('.btn-primary').innerText = "Submit";
    
    venueModal.classList.add('active');
});

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

    // 1. Data Collection
    const venueData = {
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

    try {
        const response = await fetch('/api/venues');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const venues = await response.json();
        container.innerHTML = ""; // Clear loading text

        if (venues.length === 0) {
            container.innerHTML = "<p>No venues found in the database.</p>";
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
    const select = document.getElementById('monthSelect');
    select.innerHTML = ''; 
    const now = new Date();

    for (let i = 0; i < 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const option = document.createElement('option');
        
        // Value format: "YYYY-MM" (e.g., 2026-04)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        option.value = `${year}-${month}`;
        option.innerText = date.toLocaleString('default', { month: 'long' });
        select.appendChild(option);
    }

    // Default: Render the first month (Current)
    renderCalendarGrid(select.value);

    // Event: Update grid when dropdown changes
    select.onchange = (e) => renderCalendarGrid(e.target.value);
}

function renderCalendarGrid(yearMonth) {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = ''; // Clear previous days

    const [year, month] = yearMonth.split('-').map(Number);
    
    // Get total days in selected month (Date with day 0 of next month)
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = String(i).padStart(2, '0');
        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;

        // Find if this date exists in the bookings array
        const booking = venueBookings.find(b => b.bookingDate === formattedDate);

        const day = document.createElement('div');
        
        // CLASSES: 'free' = Green, 'busy' = Red (Matches the final CSS)
        day.className = `day-box ${booking ? 'busy' : 'free'}`;
        day.innerText = i;

        // Interaction Logic
        if (booking) {
            day.onclick = () => {
                window.location.href = `detail/booking_detail.html?id=${booking._id}`;
            };
        } else {
            day.onclick = () => alert(`Date ${formattedDate} is available.`);
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