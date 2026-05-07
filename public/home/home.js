function requireLogin(event) {
    if (event) event.preventDefault();
    openModal('User');
}
function openModal(role) {
    const modal = document.getElementById("loginModal");
    const portalTypeDisplay = document.getElementById("portalType");
    const dropdownContent = document.querySelector('.dropdown-content');
    if (modal && portalTypeDisplay) {
        portalTypeDisplay.innerText = role;
        modal.style.display = "block";
        dropdownContent.classList.remove('show');
        document.body.style.overflow = "hidden";
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
window.onclick = function(event) {
    const loginModal = document.getElementById("loginModal");
    const regModal = document.getElementById("registerModal");
    const noticeModal = document.getElementById("noticeModal");
    const forgotModal = document.getElementById("forgotPasswordModal");
    
    if (event.target === loginModal) {
        closeModal();
    }
    if (event.target === regModal) {
        closeRegisterModal();
    }
    if (event.target === noticeModal) {
        closeNoticeModal();
    }
    if (event.target === forgotModal) {
        closeForgotModal();
    }
};
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action'); 
    const role = urlParams.get('role') || 'User'; 
    console.log("Action detected:", action);
    console.log("Role detected:", role);

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

function sendForgotOTP() {
    const email = document.getElementById('forgotEmail').value;
    if(!email) return alert("Please enter your email");
    
    // Logic for Node.js backend to send email
    alert("Reset OTP sent to " + email);
}

function verifyForgotOTP() {
    // Logic to check OTP against backend
    const otp = document.getElementById('forgotOTP').value;
    if(!otp) return alert("Please enter the OTP");

    // On success, show Step 2
    document.getElementById('forgotStep1').style.display = 'none';
    document.getElementById('forgotStep2').style.display = 'block';
}

function updatePassword() {
    const newP = document.getElementById('newPass').value;
    const confirmP = document.getElementById('confirmNewPass').value;

    if (newP !== confirmP) {
        alert("Passwords do not match!");
        return;
    }

    // Logic for MongoDB update
    alert("Password updated successfully! Please login with your new password.");
    closeForgotModal();
    openModal('User'); // Redirect back to login
}
