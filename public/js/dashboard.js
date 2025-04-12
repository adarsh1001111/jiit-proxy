document.addEventListener("alpine:init", () => {
  Alpine.data("dashboard", () => ({
    mobileMenu: false,
  }));
});

// Handle proxy request form validation
document.addEventListener("DOMContentLoaded", function () {
  const proxyForm = document.querySelector('form[action="/proxy/create"]');

  if (proxyForm) {
    proxyForm.addEventListener("submit", function (e) {
      const startTime = document.getElementById("startTime").value;
      const endTime = document.getElementById("endTime").value;

      if (startTime >= endTime) {
        e.preventDefault();
        alert("End time must be later than start time");
      }
    });
  }
});
