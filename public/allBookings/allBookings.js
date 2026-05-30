let currentRefundBookingId = null;
let currentRefundMethod = "upi";

document.addEventListener('DOMContentLoaded', () => {
    fetchAdminBookings();
});

// 1. Fetch and Display Data
async function fetchAdminBookings() {
    const tableBody = document.getElementById('bookingTableBody');
    tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center;">Loading bookings...</td></tr>`;

    const myId = localStorage.getItem('adminId'); // added this

    try {
        const response = await fetch(`/api/admin/particularAdmin/bookings?adminId=${myId}`); // added this
        const data = await response.json();

        if (data.success && data.bookings.length > 0) {
            tableBody.innerHTML = data.bookings.map(book => {
                // Calculation Logic based on your payment plan percentages
                let totalCost = 0;
                if (book.paymentType === 'partial') totalCost = book.paymentAmount * 4; // 25% paid
                else if (book.paymentType === 'advance') totalCost = book.paymentAmount * 2; // 50% paid
                else totalCost = book.paymentAmount; // 100% paid

                const balance = totalCost - book.paymentAmount;

                return `
                <tr class="status-row ${book.status.toLowerCase()}">
                    <td>
                        <div style="font-weight:600;">${new Date(book.submittedAt).toLocaleDateString()}</div>
                        <small style="color:#888;">${new Date(book.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                    </td>
                    <td><strong>${book.bookedBy}</strong></td>
                    <td><a href="mailto:${book.email}" style="color:var(--primary); text-decoration:none;">${book.email}</a></td>
                    <td>${book.contact}</td>
                    <td>${book.bookingDate}</td>
                    <td><span class="guest-count"><i class='bx bx-group'></i> ${book.guests}</span></td>
                    <td><span class="purpose-tag">${book.purpose}</span></td>
                    <td>₹${totalCost.toLocaleString()}</td>
                    <td class="paid-cell">₹${book.paymentAmount.toLocaleString()}</td>
                    <td class="bal-cell">₹${balance.toLocaleString()}</td>
                    <td>
                        <div class="requirements-cell" title="${book.requirements || 'None'}">
                            ${book.requirements ? (book.requirements.length > 100 ? book.requirements.substring(0, 100) + '...' : book.requirements) : '-'}
                        </div>
                    </td>
                    <td>
                        <button class="view-btn" onclick="openProof('${book._id}', '${book.bookedBy}')">
                            <i class='bx bx-image-alt'></i> View
                        </button>
                    </td>
                    <td>
                        <div class="action-btns">
                            ${book.status === 'Pending' ? `
                                <button class="ok-btn" onclick="updateStatus('${book._id}', 'Approved')" title="Approve">
                                    <i class='bx bx-check'></i>
                                </button>
                                <button class="no-btn" onclick="updateStatus('${book._id}', 'Rejected')" title="Reject">
                                    <i class='bx bx-x'></i>
                                </button>
                            ` : `<small style="color:${book.status === 'Approved' ? 'green' : 'red'}; font-weight:800;"> ${book.status}</small>   
                            `}
                        </div>
                    </td>
                    <td>
                        ${book.status === 'Approved' ? `
                                <button class="billing-btn"
                                    onclick="goToBilling('${book._id}' , '${book.userId}' , '${book.venueId._id}')">
                                    <i class='bx bx-receipt'></i> Generate Bill
                                </button>
                            `
                            : (book.status === 'Rejected' || book.status === 'Cancelled') ? `
                                <button class="refund-btn"
                                    onclick="openRefundModal('${book._id}', '${book.userId ? (book.userId._id || book.userId) : ''}')">
                                    <i class='bx bx-undo'></i> Refund
                                </button>
                            `
                            : ``}
                    </td>
                </tr>`;
            }).join('');
        } else {
            tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; padding: 40px;">No bookings found.</td></tr>`;
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; color:red;">Failed to load data. Is the server running?</td></tr>`;
    }
}

// 2. Update Booking Status (Approve/Reject)
async function updateStatus(id, newStatus) {
    if (!confirm(`Are you sure you want to mark this booking as ${newStatus}?`)) return;

    try {
        const response = await fetch(`/api/bookings/status/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const result = await response.json();
        if (result.success) {
            fetchAdminBookings(); // Refresh the table
        } else {
            alert("Error: " + result.message);
        }
    } catch (err) {
        console.error("Update Error:", err);
        alert("Failed to update status.");
    }
}

// 3. Modal Image Handling
function openProof(id, name) {
    console.log(id);
    console.log(name);
    const modal = document.getElementById('proofModal');
    const img = document.getElementById('proofImage');
    const downloadLink = document.getElementById('downloadProof');
    const caption = document.getElementById('proofCaption');

    const imgSrc = `/api/bookings/screenshot/${id}`;
    
    img.src = imgSrc;
    downloadLink.href = imgSrc;
    caption.innerText = `Payment Proof: ${name}`;
    
    modal.style.display = "flex";
}

function closeProof() {
    document.getElementById('proofModal').style.display = "none";
}

// 4. Search Filter
function filterTable() {
    const input = document.getElementById("adminSearch");
    const filter = input.value.toUpperCase();
    const table = document.getElementById("bookingTable");
    const tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) {
        const tdName = tr[i].getElementsByTagName("td")[1]; // User Name
        const tdEmail = tr[i].getElementsByTagName("td")[2]; // Email
        if (tdName || tdEmail) {
            const txtValueName = tdName.textContent || tdName.innerText;
            const txtValueEmail = tdEmail.textContent || tdEmail.innerText;
            if (txtValueName.toUpperCase().indexOf(filter) > -1 || txtValueEmail.toUpperCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
}
function goToBilling(bookingId, customerId, venueId) {
    console.log(bookingId);
    console.log(customerId);
    console.log(venueId);
    window.location.href = `/POS/billing.html?id=${bookingId}&cid=${customerId}&vid=${venueId}`;
}
// 5. Open Refund Modal
let activeUserId = null;
async function openRefundModal(bookingId, UserId) {
    activeUserId = UserId;
    currentRefundBookingId = bookingId;

    try {
        const response = await fetch(`/api/admin/bookings/particular/${bookingId}`);
        const data = await response.json();
        const book = data.booking;

        // Calculate refund amount (what was paid)
        const amountPaid = book.paymentAmount;

        // Populate user details
        document.getElementById('refUserName').innerText = book.bookedBy || '-';
        document.getElementById('refUserPhone').innerText = book.contact || '-';
        document.getElementById('refUserEmail').innerText = book.email || '-';
        document.getElementById('refAmountDisplay').innerText = `₹${amountPaid.toLocaleString()}`;
        document.getElementById('refundAmountRaw').value = amountPaid;
        document.getElementById('refundBookingId').value = bookingId;

        // Populate UPI / Bank details (from user profile if available)
        document.getElementById('refUserUpi').innerText = book.upiId || 'Not provided';
        document.getElementById('refAccName').innerText = book.bookedBy || '-';
        document.getElementById('refAccNumber').innerText = book.accountNumber || '-';
        document.getElementById('refIfsc').innerText = book.ifscCode || '-';

        // Generate QR code for UPI payment
        generateQRCode(book.upiId, amountPaid);

        // Reset to UPI view
        togglePaymentFields('UPI');

        // Show modal
        document.getElementById('refundModal').style.display = 'flex';

    } catch (err) {
        console.error("Refund Modal Error:", err);
        alert("Failed to load booking details for refund.");
    }
}

// 6. Close Refund Modal
function closeRefundModal() {
    document.getElementById('refundModal').style.display = 'none';
    const formElement = document.getElementById('refundForm'); //  Defined formElement
    formElement.reset();
    activeUserId = null; //  Reset global variable
    currentRefundBookingId = null;
}

// 7. Toggle UPI vs Bank fields
function togglePaymentFields(mode) {
    currentRefundMethod = mode;
    const upiContainer = document.getElementById('upiFieldContainer');
    const bankContainer = document.getElementById('bankFieldContainer');

    if (mode === 'UPI') {
        upiContainer.style.display = 'block';
        bankContainer.style.display = 'none';
    } else {
        upiContainer.style.display = 'none';
        bankContainer.style.display = 'block';
    }
}

// 8. Generate QR Code (uses free QR API — no library needed)
function generateQRCode(upiId, amount) {
    const container = document.getElementById('qrcodeContainer');

    if (!upiId || upiId === 'Not provided') {
        container.innerHTML = `<span style="color:#999; font-size:13px;">No UPI ID available</span>`;
        return;
    }

    // UPI deep link format
    const upiString = `upi://pay?pa=${upiId}&am=${amount}&cu=INR`;
    const encodedUpi = encodeURIComponent(upiString);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodedUpi}`;

    container.innerHTML = `<img src="${qrUrl}" alt="UPI QR Code" style="width:160px; height:160px; border-radius:6px;">`;
}

// 9. Submit Refund with screenshot upload


async function submitRefund(event) {
    event.preventDefault();

    // 1. Get Core Fields
    const bookingId = document.getElementById('refundBookingId').value;
    const adminId = localStorage.getItem('adminId'); // Vital for tracing who processed it
    const screenshotFile = document.getElementById('refundScreenshot').files[0];

    if (!screenshotFile) {
        alert("Please attach a payment receipt screenshot.");
        return;
    }

    // 2. Get Selected Payout Mode dynamically from the radio buttons
    const checkedRadio = document.querySelector('input[name="paymentMode"]:checked');
    const payoutMode = checkedRadio ? checkedRadio.value : 'UPI';

    // 3. Initialize Multipart FormData
    const formData = new FormData();
    formData.append('bookingId', bookingId);
    formData.append('adminId', adminId);
    formData.append('userId', activeUserId); // <--- Added payload parameter link
    formData.append('payoutMode', payoutMode);
    formData.append('amountRefunded', document.getElementById('refundAmountRaw').value);
    
    // Append User Profile Logs for your separate DB model
    formData.append('userName', document.getElementById('refUserName').innerText);
    formData.append('userEmail', document.getElementById('refUserEmail').innerText);
    formData.append('userPhone', document.getElementById('refUserPhone').innerText);

    // 4. Conditionally Append Details based on active selection
    if (payoutMode === 'UPI') {
        formData.append('upiId', document.getElementById('refUserUpi').innerText);
    } else {
        formData.append('accountHolder', document.getElementById('refAccName').innerText);
        formData.append('accountNumber', document.getElementById('refAccNumber').innerText);
        formData.append('ifscCode', document.getElementById('refIfsc').innerText);
    }

    // Append the binary file stream (Matches your 'refundScreenshot' multer configuration)
    formData.append('refundScreenshot', screenshotFile);

    // 5. Asynchronous Server Request Transmission
    try {
        const response = await fetch(`/api/admin/bookings/refund/${bookingId}`, {
            method: 'POST',
            body: formData // Let the browser set the multi-part boundaries automatically
        });

        const result = await response.json();

        if (result.success) {
            alert("Refund submitted and archived successfully!");
            closeRefundModal();
            fetchAdminBookings(); // Automatically re-sync and reload table
        } else {
            alert("Error: " + result.message);
        }
    } catch (err) {
        console.error("Refund Submit Error:", err);
        alert("Failed to submit refund due to a network or server communication error.");
    }
}