// 1. SESSION GUARD (Runs immediately before page renders)
(function() {
    const adminName = localStorage.getItem('adminName');
    const userName = localStorage.getItem('userName');

    if (!adminName && !userName) {
        // .replace is key: it removes the dashboard from history
        window.location.replace('/home/home.html');
    }
})();

// 2. BF-CACHE KILLER (Forces script to run even if back button is clicked)
window.addEventListener('pageshow', function (event) {
    // If page is loaded from cache (back button), force a reload to trigger the guard
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        window.location.reload();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const nameDisplay = document.getElementById('NameDisplay');
    const logoutBtn = document.querySelector('.logout-btn') || document.querySelector('.icon-logout');

    // 3. Identify and Display Name
    const adminName = localStorage.getItem('adminName');
    const userName = localStorage.getItem('userName');

    if (nameDisplay) {
        if (adminName) {
            const icon = nameDisplay.querySelector('i') ? nameDisplay.querySelector('i').outerHTML : "<i class='bx bxs-user-circle'></i>";
            nameDisplay.innerHTML = `${icon} ${adminName}`;
        } else if (userName) {
            nameDisplay.textContent = userName;
        }
    }

    // 4. Logout Logic
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            
            const confirmLogout = confirm("Are you sure you want to log out?");

            if (confirmLogout) {
                // Clear the session
                localStorage.clear();

                // CRITICAL: pushState "traps" the current history 
                // so the back button doesn't have a dashboard to return to.
                window.history.pushState(null, null, window.location.href);
                
                // Use .replace instead of .href
                window.location.replace('/home/home.html'); 
            } else {
                console.log("Logout cancelled");
            }
        });
    }
});