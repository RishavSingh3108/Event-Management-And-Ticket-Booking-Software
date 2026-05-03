let advancePaid = 0;
// Global variables to store hidden reference IDs
let currentCustomerId = null;
let currentVenueId = null;
// Priority: localStorage, but we can fallback if the API provides a specific adminId
let currentAdminId = localStorage.getItem('userId');

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
            printBtn.disabled = false;
            printBtn.classList.remove('print-btn-locked');
            printBtn.classList.add('print-btn-active');
            saveBtn.style.display = 'none';
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