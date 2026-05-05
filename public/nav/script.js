const dropdownButtons = document.querySelectorAll(".dropbtn");

dropdownButtons.forEach(button => {
    button.addEventListener("click", function (e) {
        e.preventDefault();
        document.querySelectorAll(".dropdown-content").forEach(menu => {
            if (menu !== this.nextElementSibling) {
                menu.classList.remove("show");
            }
        });
        this.nextElementSibling.classList.toggle("show");
    });
});
window.addEventListener("click", function (e) {
    if (!e.target.closest(".dropdown")) {
        document.querySelectorAll(".dropdown-content").forEach(menu => {
            menu.classList.remove("show");
        });
    }
});
