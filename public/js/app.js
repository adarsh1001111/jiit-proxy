// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/js/service-worker.js")
      .then((registration) => {
        console.log(
          "ServiceWorker registration successful with scope: ",
          registration.scope
        );

        // Request notification permission
        if ("Notification" in window) {
          requestNotificationPermission();
        }
      })
      .catch((error) => {
        console.log("ServiceWorker registration failed: ", error);
      });
  });
}

// Request notification permission
async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    console.log("Notification permission granted");
  }
}

// Initialize Alpine.js data for header
document.addEventListener("alpine:init", () => {
  Alpine.data("header", () => ({
    mobileMenu: false,
  }));
});

// Add to homescreen prompt
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent Chrome 76+ from automatically showing the prompt
  e.preventDefault();

  // Stash the event so it can be triggered later
  deferredPrompt = e;

  // Show install button if available
  const installButton = document.getElementById("install-button");
  if (installButton) {
    installButton.classList.remove("hidden");

    installButton.addEventListener("click", (e) => {
      // Show the prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install prompt");
        } else {
          console.log("User dismissed the install prompt");
        }

        // Clear the saved prompt
        deferredPrompt = null;

        // Hide install button
        installButton.classList.add("hidden");
      });
    });
  }
});

// Handle online/offline status
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

function updateOnlineStatus() {
  const statusElement = document.getElementById("online-status");

  if (statusElement) {
    if (navigator.onLine) {
      statusElement.textContent = "Online";
      statusElement.classList.remove("bg-red-500");
      statusElement.classList.add("bg-green-500");
    } else {
      statusElement.textContent = "Offline";
      statusElement.classList.remove("bg-green-500");
      statusElement.classList.add("bg-red-500");
    }
  }
}
