let role = null;
function openModal(role) {
    const modal = document.getElementById("loginModal");
    const portalTypeDisplay = document.getElementById("portalType");
    const dropdownContent = document.querySelector('.dropdown-content');
    if (modal && portalTypeDisplay) {
        portalTypeDisplay.innerText = role;
        modal.style.display = "block";
        dropdownContent.classList.remove('show');
        document.body.style.overflow = "hidden";
        role = portalTypeDisplay.innerText;
    }
}
function closeModal() {
    const modal = document.getElementById("loginModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}
let currentRegStep = 1;
function openRegisterModal(role) {
    const regModal = document.getElementById("registerModal");
    const regTypeDisplay = document.getElementById("regType");

    if (regModal) {
        if (regTypeDisplay) regTypeDisplay.innerText = role;
        nextStep(1);
        
        regModal.style.display = "block";
        document.body.style.overflow = "hidden";
        const dropdownContent = document.querySelector('.dropdown-content');
        if (dropdownContent) dropdownContent.classList.remove('show');
    }
}
function nextStep(step) {
    const allSteps = document.querySelectorAll('.reg-step');
    allSteps.forEach(s => s.style.display = 'none');
    const targetStep = document.getElementById(`step${step}`);
    if (targetStep) {
        targetStep.style.display = 'block';
    }
    const dots = document.querySelectorAll('.step-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === (step - 1));
    });

    currentRegStep = step;
}
function closeRegisterModal() {
    const regModal = document.getElementById("registerModal");
    if (regModal) {
        regModal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}
function switchToLogin() {
    const regRole = document.getElementById("regType").innerText;
    closeRegisterModal();
    openModal(regRole);
}
function switchToRegistration() {
    const loginRole = document.getElementById("portalType").innerText;
    closeModal();
    openRegisterModal(loginRole);
}
/* --- NOTICE MODAL LOGIC --- */
function requireLogin(event) {
    if (event) event.preventDefault();
    
    const noticeModal = document.getElementById("noticeModal");
    if (noticeModal) {
        noticeModal.style.display = "block";
        document.body.style.overflow = "hidden"; // Disable scroll
    }
}
function closeNoticeModal() {
    const noticeModal = document.getElementById("noticeModal");
    if (noticeModal) {
        noticeModal.style.display = "none";
        document.body.style.overflow = "auto"; 
    }
}
function proceedToLogin() {
    closeNoticeModal();
    openModal('User');
}
function proceedToRegister() {
    closeNoticeModal();
    openRegisterModal('User');
}
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action'); 
    const role = urlParams.get('role') || 'User'; 

    if (action === 'login') {
        openModal(role);
    } 
    else if (action === 'register') {
        openRegisterModal(role);
    } 

    if (action) {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
});
// --- FORGOT PASSWORD FUNCTIONS ---

function openForgotPassword() {
    // Close login modal first
    closeModal();
    
    const forgotModal = document.getElementById("forgotPasswordModal");
    if (forgotModal) {
        // Reset to Step 1
        document.getElementById('forgotStep1').style.display = 'block';
        document.getElementById('forgotStep2').style.display = 'none';
        
        forgotModal.style.display = "block";
        document.body.style.overflow = "hidden";
    }
}

function closeForgotModal() {
    const forgotModal = document.getElementById("forgotPasswordModal");
    if (forgotModal) {
        forgotModal.style.display = "none";
        document.body.style.overflow = "auto";
    }
}

// Function to Verify OTP and move to the next step
async function verifyStepOTP(type, nextStepNumber) {
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const target = (type === 'email') ? email : phone;
    const otpInput = (type === 'email') ? 
        document.getElementById('emailOTP').value : 
        document.getElementById('phoneOTP').value;

    try {
        const response = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target, otp: otpInput })
        });

        // Call .json() only ONCE
        const data = await response.json();

        if (response.ok && data.success) {
            alert("Verified!");
            nextStep(nextStepNumber); 
        } else {
            console.error("Server says:", data.message || data.error);
            alert(data.message || "Invalid or Expired OTP.");
        }
    } catch (error) {
        console.error("Network or parsing error:", error);
        alert("Something went wrong. Please check your connection.");
    }
}
// Function to send OTP to Email or Phone
async function sendOTP(type) {
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const target = (type === 'email') ? email : phone;

    if (!target) return alert(`Please enter your ${type} first.`);

    const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, type })
    });
    
    const data = await response.json();
    if (data.success) alert("OTP sent to " + target);
}
async function sendForgotOTP() {
    const emailField = document.getElementById('forgotEmail');
    const email = emailField ? emailField.value.trim() : "";

    // 1. Validation
    if (!email) {
        return alert("Please enter your email first.");
    }

    try {
        const response = await fetch('/api/auth/forgot-password-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {
            alert("✅ Reset OTP sent to " + email);
            
            // Note: You don't need to hide Step 1 yet because 
            // the OTP input field is already inside Step 1.
            // You only move to Step 2 AFTER verifyForgotOTP() is successful.
            
            console.log("OTP Sent Successfully");
        } else {
            alert("❌ " + data.message);
        }
    } catch (error) {
        console.error("Forgot OTP Error:", error);
        alert("An error occurred. Check the console.");
    }
}
async function verifyForgotOTP() {
    const email = document.getElementById('forgotEmail').value;
    const otp = document.getElementById('forgotOTP').value;

    if (!otp) return alert("Please enter the OTP.");

    try {
        const response = await fetch('/api/auth/verify-reset-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });

        const data = await response.json();

        if (data.success) {
            // Success! Now we hide Step 1 and show Step 2
            document.getElementById('forgotStep1').style.display = 'none';
            document.getElementById('forgotStep2').style.display = 'block';
        } else {
            alert("❌ Invalid OTP. Please try again.");
        }
    } catch (error) {
        console.error("Verification Error:", error);
    }
}
async function updatePassword() {
    const email = document.getElementById('forgotEmail').value;
    const newP = document.getElementById('newPass').value;
    const confirmP = document.getElementById('confirmNewPass').value;

    if (!newP || !confirmP) return alert("Please fill in both fields.");
    if (newP !== confirmP) return alert("Passwords do not match!");

    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newPassword: newP })
        });

        const data = await response.json();

        if (data.success) {
            alert("✅ Password updated! You can now login.");
            closeForgotModal();
            openModal('User'); 
        } else {
            alert("❌ " + data.message);
        }
    } catch (error) {
        console.error("Update Error:", error);
    }
}
async function finalizeRegistration() {
    // 1. Collect data from all steps
    const name = document.getElementById('regName').value;
    const dob = document.getElementById('regDOB').value; // From Step 1
    const email = document.getElementById('regEmail').value; // From Step 2
    const phone = document.getElementById('regPhone').value; // From Step 3
    const password = document.getElementById('regPass').value; // From Step 4
    const confirmPass = document.getElementById('regConfirmPass').value;
    const roleText = document.getElementById('regType').innerText; 
    const role = (roleText.includes('Admin')) ? 'Admin' : 'User';

    // 3. Basic Validation
    if (!password || !confirmPass) {
        return alert("Please enter and confirm your password.");
    }
    if (password !== confirmPass) {
        return alert("Passwords do not match!");
    }

    try {
        // 4. Send the data to the backend
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, dob, email, phone, password, role })
        });

        const data = await response.json();

        if (data.success) {
            alert(`✅ Registration successful as ${role}!`);
            closeRegisterModal(); 
            openModal(role === 'Admin' ? 'admin' : 'user'); 
        } else {
            alert("❌ Registration failed: " + data.message);
        }
    } catch (error) {
        console.error("Final Registration Error:", error);
        alert("Server error. Please try again later.");
    }
}
async function handleLogin(event) {
    if (event) event.preventDefault(); 
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const portalType = document.getElementById("portalType").innerText;
    const role = portalType.includes('Admin') ? 'Admin' : 'User';
    if (!email || !password) {
        return alert("Please enter both email and password.");
    }
    try {
        const response = await fetch('/api/login', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();
        if (data.success) {
            alert(`Welcome, ${data.user.name}!`);
            const user = data.user;

            if (user.role === 'Admin') {
                // --- Admin Specific Keys ---
                localStorage.setItem('adminId', user.id);
                localStorage.setItem('adminName', user.name);
                localStorage.setItem('adminRole', user.role);
                localStorage.setItem('adminEmail', user.email);
                window.location.href = '/admin.html';
                
                console.log("Stored as Admin:", user.id);
            } else {
                // --- User Specific Keys ---
                localStorage.setItem('userId', user.id);
                localStorage.setItem('userName', user.name);
                localStorage.setItem('userRole', user.role);
                localStorage.setItem('userEmail', user.email);
                window.location.href = '/user.html';
                
                console.log("Stored as User:", user.id);
            }
        }

    } catch (error) {
        console.error("Login Error:", error);
        alert("An error occurred during login. Please try again.");
    }
}
