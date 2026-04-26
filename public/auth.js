window.currentRole = 'User';
window.isRegistering = false;

function setRole(role) {
    window.currentRole = role;
    document.getElementById('userBtn').classList.toggle('active', role === 'User');
    document.getElementById('adminBtn').classList.toggle('active', role === 'Admin');
    updateTitle();
}

function toggleAuth() {
    window.isRegistering = !window.isRegistering;
    document.getElementById('regOnlyFields').classList.toggle('hidden');
    updateTitle();
}

function updateTitle() {
    const title = document.getElementById('formTitle');
    const submitBtn = document.getElementById('submitBtn');
    const footerText = document.getElementById('footerText');
    const toggleLink = document.getElementById('toggleLink');

    title.innerText = `${window.currentRole} ${window.isRegistering ? 'Registration' : 'Login'}`;
    submitBtn.innerText = window.isRegistering ? "GET STARTED" : "CONTINUE";
    footerText.innerText = window.isRegistering ? "Already Registered?" : "New User?";
    toggleLink.innerText = window.isRegistering ? " Sign In" : " Sign Up";
}

document.getElementById('authForm').onsubmit = async (e) => {
    e.preventDefault();
    
    // 1. Capture Inputs correctly
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    
    let payload = { 
        email, 
        password, 
        role: window.currentRole 
    };

    // 2. If Registering, add Name and Phone
    if (window.isRegistering) {
        payload.name = e.target.querySelector('input[placeholder="Full Name"]').value;
        payload.phone = e.target.querySelector('input[placeholder="Phone Number"]').value;
    }

    const endpoint = window.isRegistering ? '/api/register' : '/api/login';

    try {
        console.log("Sending request to:", endpoint, payload); 

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            if (window.isRegistering) {
                alert("Registration Successful! Please login.");
                toggleAuth(); 
            } else {
                // --- THE CRITICAL UPDATE IS HERE ---
                // We save the ID, Name, and Role so they can be used across the app
                localStorage.setItem('userId', result.userId); 
                localStorage.setItem('userName', result.userName);
                localStorage.setItem('userRole', window.currentRole);
                
                window.location.href = result.redirect; 
            }
        } else {
            alert(result.message); 
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        alert("Server Connection Failed. Check if Node.js is running on Port 3000.");
    }
};