document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('id');

    if (!bookingId) return;

    try {
        const response = await fetch(`/api/bookings/single/${bookingId}`);
        const booking = await response.json();

        if (booking) {
            // Mapping values to our luxury design
            document.getElementById('detVenueName').innerText = booking.venueName || "Our Exquisite Venue";
            document.getElementById('detGuestName').innerText = booking.bookedBy;
            document.getElementById('detDate').innerText = booking.bookingDate;
            document.getElementById('detPhone').innerText = booking.contact || "Not Provided";
            document.getElementById('detEmail').innerText = booking.email || "No Email On File";
            document.getElementById('detGuests').innerText = `${booking.guests} Honored Guests`;
            document.getElementById('detPurpose').innerText = booking.purpose || "Celebration";
            document.getElementById('detRequirements').innerText = booking.requirements ? `"${booking.requirements}"` : "The guest has requested our standard premium service.";
        }
    } catch (err) {
        console.error("Dossier Load Error:", err);
    }
});
