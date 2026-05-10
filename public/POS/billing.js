let advancePaid = 0;
// Global variables to store hidden reference IDs
let currentCustomerId = null;
let currentVenueId = null;
let fetchedBills = [];
// Priority: localStorage, but we can fallback if the API provides a specific adminId
let currentAdminId = localStorage.getItem('adminId');

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('id');

    // 1. Pre-populate IDs from the URL (passed from goToBilling)
    // These act as immediate fallbacks
    currentCustomerId = urlParams.get('cid');
    currentVenueId = urlParams.get('vid');

    try {
        const response = await fetch(`/api/admin/generate-bill/${bookingId}`);
        const data = await response.json();

        if (data.success) {
            const b = data.bill;
            advancePaid = b.paid;
            
            // 2. Override with API data if the backend returns specific IDs
            // Use '||' to keep URL IDs if API IDs are null/undefined
            currentCustomerId = b.customerId || b.cid || currentCustomerId;
            currentVenueId = b.venueId || b.vid || currentVenueId;
            
            // If the API returns a logged-in adminId, use it; otherwise, keep localStorage
            if(b.adminId) currentAdminId = b.adminId;

            // Header Details
            document.getElementById('invNum').innerText = b.invoiceNumber;
            document.getElementById('invDate').innerText = `Date: ${b.date}`;
            document.getElementById('custName').innerText = b.customer;
            document.getElementById('custEmail').innerText = b.email;
            document.getElementById('custPhone').innerText = b.contact;
            document.getElementById('venueName').innerText = b.venue;
            document.getElementById('venueAddr').innerText = b.venueAddress;
            document.getElementById('venueGst').innerText = `GSTIN: ${b.venueGst || 'N/A'}`;
            document.getElementById('venuefssai').innerText = `FSSAI: ${b.venuefssai || 'N/A'}`;
            document.getElementById('venueSupport').innerText = b.venueContact;
            document.getElementById('paidAmount').innerText = `-₹${b.paid.toLocaleString()}`;

            addDefaultVenueRow(b.venue, b.total, b.bookingDate);
        }
    } catch (err) {
        console.error("Error loading bill:", err);
    }
});

// --- SAVE FUNCTION ---
async function saveInvoiceToDB() {
    const saveBtn = document.getElementById('saveBtn');
    const printBtn = document.getElementById('printBtn');
    
    // 1. Scrape the Billing Table data
    const tableRows = document.querySelectorAll('#invoiceItems tr');
    const billingTable = Array.from(tableRows).map(row => {
        const descInput = row.cells[1].querySelector('input');
        const description = descInput ? descInput.value : row.cells[1].innerText.split('\n')[0].trim();

        return {
            description: description,
            serviceCost: parseFloat(row.querySelector('.row-cost').value) || 0,
            gstPercentage: parseFloat(row.querySelector('.row-gst').value) || 0,
            rowTotal: parseFloat(row.querySelector('.row-total').innerText.replace(/[^0-9.]/g, '')) || 0
        };
    });

    // 2. Build the full payload
    // We explicitly ensure null is sent instead of an empty string to avoid Mongoose CastErrors
    const payload = {
        bookingId: new URLSearchParams(window.location.search).get('id'),
        customerId: currentCustomerId || null,
        venueId: currentVenueId || null,
        adminId: currentAdminId || null,
        invoiceNumber: document.getElementById('invNum').innerText,
        invoiceDate: document.getElementById('invDate').innerText.replace('Date: ', ''),
        customerDetail: {
            name: document.getElementById('custName').innerText,
            email: document.getElementById('custEmail').innerText,
            phone: document.getElementById('custPhone').innerText
        },
        billingTable: billingTable,
        summary: {
            subtotal: parseFloat(document.getElementById('subtotal').innerText.replace(/[^0-9.]/g, '')),
            advancePaid: advancePaid,
            balanceDue: parseFloat(document.getElementById('finalBalance').innerText.replace(/[^0-9.]/g, ''))
        }
    };

    try {
        saveBtn.innerText = "Saving...";
        saveBtn.disabled = true;

        const response = await fetch('/api/admin/save-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            alert("Invoice Saved Successfully!");
            lockUI();
        } else {
            alert("Error: " + result.message);
            saveBtn.disabled = false;
            saveBtn.innerText = "Save Invoice";
        }
    } catch (err) {
        console.error("Save failed:", err);
        alert("Failed to connect to server.");
        saveBtn.disabled = false;
        saveBtn.innerText = "Save Invoice";
    }
}

// ... rest of helper functions (calculateTotal, addDefaultVenueRow, etc.) remain the same

// --- EXISTING FUNCTIONS (KEEP AS IS) ---

function addDefaultVenueRow(venueName, cost, date) {
    const tbody = document.getElementById('invoiceItems');
    const row = document.createElement('tr');
    const numericCost = Number(cost) || 0;

    row.innerHTML = `
        <td class="sn"></td>
        <td>
            <strong>Venue Reservation (${venueName})</strong><br>
            <small>Event Date: ${date}</small>
        </td>
        <td><input type="number" class="row-cost" value="${numericCost}" oninput="calculateTotal()"></td>
        <td>
            <select class="row-gst" onchange="calculateTotal()">
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="18" selected>18%</option>
                <option value="28">28%</option>
            </select>
        </td>
        <td class="text-right row-total">₹0</td>
        <td class="no-print"><button class="delete-btn" onclick="deleteRow(this)"><i class='bx bx-trash-alt'></i></button></td>
    `;
    tbody.appendChild(row);
    updateSerialNumbers();
    setTimeout(calculateTotal, 100); 
}

function addNewRow() {
    const tbody = document.getElementById('invoiceItems');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="sn"></td>
        <td><input type="text" placeholder="Service Description (e.g. Catering)"></td>
        <td><input type="number" class="row-cost" value="0" oninput="calculateTotal()"></td>
        <td>
            <select class="row-gst" onchange="calculateTotal()">
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="18" selected>18%</option>
                <option value="28">28%</option>
            </select>
        </td>
        <td class="text-right row-total">₹0</td>
        <td class="no-print"><button class="delete-btn" onclick="deleteRow(this)"><i class='bx bx-trash-alt'></i></button></td>
    `;
    tbody.appendChild(row);
    updateSerialNumbers();
}

function deleteRow(btn) {
    btn.closest('tr').remove();
    updateSerialNumbers();
    calculateTotal();
}

function updateSerialNumbers() {
    const rows = document.querySelectorAll('#invoiceItems tr');
    rows.forEach((row, index) => {
        row.querySelector('.sn').innerText = index + 1;
    });
}

function clearFullInvoice() {
    if (confirm("Clear all items from the invoice?")) {
        document.getElementById('invoiceItems').innerHTML = "";
        calculateTotal();
    }
}

function calculateTotal() {
    let grandTotal = 0;
    const rows = document.querySelectorAll('#invoiceItems tr');

    rows.forEach(row => {
        const cost = parseFloat(row.querySelector('.row-cost').value) || 0;
        const gstPercent = parseFloat(row.querySelector('.row-gst').value) || 0;
        const total = cost + (cost * (gstPercent / 100));
        
        row.querySelector('.row-total').innerText = `₹${total.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        grandTotal += total;
    });

    document.getElementById('subtotal').innerText = `₹${grandTotal.toLocaleString()}`;
    const balance = grandTotal - advancePaid;
    document.getElementById('finalBalance').innerText = `₹${balance.toLocaleString()}`;
}

// 1. DATA FETCHING & SYNC
// Inside billing.js

async function fetchBillingHistory() {
    // Get bookingId from URL parameters (e.g., billing.html?id=69f4ab...)
    const urlParams = new URLSearchParams(window.location.search);
    const currentBookingId = urlParams.get('id'); 
    
    if (!currentBookingId) return;

    try {
        // Pass the bookingId to the API
        const response = await fetch(`http://localhost:3000/api/admin/billing/history?bookingId=${currentBookingId}`);
        const data = await response.json();
        
        if (data.success) {
            fetchedBills = data.bills; // Store data globally
            renderMasterList(data.bills);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

// 2. RENDERING THE LIST
function renderMasterList(bills) {
    const historyBody = document.getElementById('historyBody');
    historyBody.innerHTML = ''; // Clear existing rows

    bills.forEach(bill => {
        const row = document.createElement('tr');
        
        // Match the columns defined in your CSS: SUBMITTED, CLIENT, TOTAL, BALANCE, ACTION
        row.innerHTML = `
            <td>
                <div>${new Date(bill.createdAt).toLocaleDateString()}</div>
                <small style="color: #999">${new Date(bill.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
            </td>
            <td>
                <strong>${bill.customerDetail.name}</strong>
            </td>
            <td>₹${bill.summary.subtotal.toLocaleString()}</td>
            <td class="text-danger">₹${bill.summary.balanceDue.toLocaleString()}</td>
            <td>
                <button class="delete-btn" onclick="viewPastBill('${bill._id}')" title="View Invoice">
                    <i class='bx bx-show-alt' style="color: var(--primary-purple)"></i>
                </button>
            </td>
        `;
        historyBody.appendChild(row);
    });
}

// 3. SEARCH FUNCTIONALITY
document.getElementById('historySearch').addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#historyBody tr');

    rows.forEach(row => {
        const clientName = row.querySelector('strong').innerText.toLowerCase();
        // Toggle visibility based on search match
        if (clientName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
});

// 4. SYNC BUTTON ACTION
function toggleBillingHistory() {
    const syncBtn = document.querySelector('.sync-btn');
    const icon = syncBtn.querySelector('i');
    
    // Add spinning animation
    icon.classList.add('bx-spin');
    syncBtn.style.opacity = '0.7';
    syncBtn.innerText = ' Syncing...';
    syncBtn.prepend(icon);

    // Fetch fresh data
    fetchBillingHistory().then(() => {
        // Reset button after slight delay for visual feedback
        setTimeout(() => {
            icon.classList.remove('bx-spin');
            syncBtn.style.opacity = '1';
            syncBtn.innerText = ' Sync Data';
            syncBtn.prepend(icon);
        }, 800);
    });
}
function viewPastBill(billId) {
    // Use .toString() to ensure a perfect string match
    const bill = fetchedBills.find(b => b._id.toString() === billId.toString());
    if (!bill) {
        console.error("Bill not found!");
        return;
    }
    lockUI();
    // 2. Sync with your HTML IDs (e.g., 'invNum' instead of 'invoiceNumber')
    if(document.getElementById('invNum')) document.getElementById('invNum').innerText = bill.invoiceNumber;
    if(document.getElementById('invDate')) document.getElementById('invDate').innerText = `Date: ${bill.invoiceDate}`;

    // 3. Populate Customer Info specifically
    document.getElementById('custName').innerText = bill.customerDetail.name;
    document.getElementById('custEmail').innerText = bill.customerDetail.email;
    document.getElementById('custPhone').innerText = bill.customerDetail.phone;

    // 4. Reconstruct Table (Matching your payload property names: serviceCost, gstPercentage, rowTotal)
    const tbody = document.getElementById('invoiceItems');
    tbody.innerHTML = ''; 

    bill.billingTable.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="sn">${index + 1}</td>
            <td>
                <strong>${item.description}</strong><br>
                <small>Event Date: ${bill.bookingDate || 'N/A'}</small>
            </td>
            <td><input type="number" class="row-cost" value="${item.serviceCost}" readonly></td>
            <td>
                <select class="row-gst" disabled>
                    <option>${item.gstPercentage}%</option>
                </select>
            </td>
            <td class="text-right row-total">₹${item.rowTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td class="no-print"></td> 
        `;
        tbody.appendChild(row);
    });

    // 5. Update Summary (Using the IDs from your DOM: subtotal, finalBalance)
    document.getElementById('subtotal').innerText = `₹${bill.summary.subtotal.toLocaleString()}`;
    document.getElementById('paidAmount').innerText = `-₹${bill.summary.advancePaid.toLocaleString()}`;
    document.getElementById('finalBalance').innerText = `₹${bill.summary.balanceDue.toLocaleString()}`;

    // 6. UI Adjustments
    const saveBtn = document.getElementById('saveBtn');
    if(saveBtn) saveBtn.style.display = 'none'; // Hide save to prevent duplicates
    if (returnBtn) returnBtn.style.display = 'flex';
    
    const printBtn = document.getElementById('printBtn');
    if(printBtn) {
        printBtn.disabled = false;
        printBtn.classList.add('print-btn-active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function lockUI(){
    // 1. SELECT BUTTONS & TOOLS
    const saveBtn = document.getElementById('saveBtn');
    const printBtn = document.getElementById('printBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const tableActions = document.querySelector('.table-actions'); // Add/Clear container
    const deleteIcons = document.querySelectorAll('.no-print'); // Trash icons

    // 2. HIDE EDITING TOOLS
    if (saveBtn) saveBtn.style.display = 'none';
    if (tableActions) tableActions.style.display = 'none';
    deleteIcons.forEach(icon => icon.style.display = 'none');

    // 3. SHOW PRINT & REFRESH (Force display)
    if (printBtn) {
        printBtn.style.setProperty('display', 'flex', 'important');
        printBtn.disabled = false;
    }
    if (refreshBtn) {
        refreshBtn.style.setProperty('display', 'flex', 'important');
    }

    // Refresh history list visually without a page reload
    fetchBillingHistory();
}

// Initial load
document.addEventListener('DOMContentLoaded', fetchBillingHistory);