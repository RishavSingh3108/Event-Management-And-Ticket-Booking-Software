// To hide forgot password option during registration
const originalToggle = toggleAuth;
toggleAuth = function() {
    originalToggle();
    const forgotLink = document.getElementById('forgotPassWrapper');
    if (isRegistering) {
        forgotLink.style.display = 'none';
    } else {
        forgotLink.style.display = 'block';
    }
};