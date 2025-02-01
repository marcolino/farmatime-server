const express = require("express");
const webpush = require("web-push");
const schedule = require("node-schedule");

const app = express();

// set VAPID keys
const publicVapidKey = "YOUR_PUBLIC_VAPID_KEY";
const privateVapidKey = "YOUR_PRIVATE_VAPID_KEY";

webpush.setVapidDetails("mailto:your@email.com", publicVapidKey, privateVapidKey);

// store subscriptions (in-memory for this example; use a database in production)
let subscriptions = [];

app.post("/subscribe", (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({});
});

// schedule notification (e.g., every Monday at 9:00 AM)
schedule.scheduleJob("0 9 * * 1", function() {
  const notificationPayload = JSON.stringify({
    title: "Your App Name",
    body: "Your periodic notification message"
  });

  subscriptions.forEach(subscription => {
    webpush.sendNotification(subscription, notificationPayload)
      .catch(error => {
        console.error("Error sending notification:", error);
      });
  });
});

app.listen(3000, () => console.log("Server running on port 3000"));
