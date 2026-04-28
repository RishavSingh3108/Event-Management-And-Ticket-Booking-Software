document.addEventListener('DOMContentLoaded', () => {
    fetchAdminBookings();
});

// 1. Fetch and Display Data
async function fetchAdminBookings() {
    const tableBody = document.getElementById('bookingTableBody');
    tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center;">Loading bookings...</td></tr>`;

    try {
        const response = await fetch('/api/admin/bookings');
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
                            ` : `<small style="color:#aaa;">Finalized</small>`}
                        </div>
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