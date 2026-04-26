document.addEventListener('DOMContentLoaded', () => {
    const savedName = localStorage.getItem('userName');
    const savedRole = localStorage.getItem('userRole');
    const nameDisplay = document.getElementById('NameDisplay');
    const logoutBtn = document.querySelector('.icon-logout') || document.querySelector('.logout-btn');

    if (savedName && nameDisplay) {
        if (nameDisplay.querySelector('i')) {
            const icon = nameDisplay.querySelector('i').outerHTML;
            nameDisplay.innerHTML = `${icon} ${savedName}`;
        } else {
            nameDisplay.innerText = savedName;
        }
    } else {
        window.location.href = 'auth.html';
    }

    const currentPath = window.location.pathname;
    if (currentPath.includes('admin') && savedRole !== 'Admin') {
        alert("Access Denied: Admin privileges required.");
        window.location.href = 'auth.html';
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            const roleToRemember = localStorage.getItem('userRole');
            localStorage.clear(); 
            if (roleToRemember) {
                window.location.href = `auth.html?role=${roleToRemember}`;
            } else {
                window.location.href = 'auth.html';
            }
        });
    }
});