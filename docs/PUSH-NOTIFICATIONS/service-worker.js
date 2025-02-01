// service Worker for Push Notifications

// in service-worker.js
self.addEventListener("push", function(event) {
  const options = {
    body: event.data.text(),
    icon: "path/to/icon.png",
    badge: "path/to/badge.png"
  };

  event.waitUntil(
    self.registration.showNotification("Your App Name", options)
  );
});