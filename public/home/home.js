function requireLogin(event) {
    // Prevent the default action (like form submission or navigation)
    if (event) event.preventDefault();

    // The Popup Alert
    alert("Please login to access these features.");

    // Optional: Redirect them to the login section/page after they click OK
    // window.location.href = "#login-section"; 
}
