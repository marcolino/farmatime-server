// in the React app
if ("serviceWorker" in navigator && "PushManager" in window) {
  navigator.serviceWorker.register("/service-worker.js")
    .then(function(registration) {
      console.log("Service Worker registered");
      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
      });
    })
    .then(function(subscription) {
      // send subscription to your server
      return fetch("/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription),
        headers: {
          "Content-Type": "application/json"
        }
      });
    })
    .catch(function(error) {
      console.error("Error:", error);
    })
  ;
}

// helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
