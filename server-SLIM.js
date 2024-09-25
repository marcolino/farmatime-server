const express = require("express");
const path = require("path");
const cors = require("cors");
const controller = require("./src/controllers/auth.controller");
const passportSetup = require("./src/middlewares/passportSetup");

const app = express();

app.use(cors({
  origin: [ // TODO: check we need all of them, that paths are really neededd, and then store urls to config.clientDomains, or config.clientDomainsWhiteList
    "http://localhost:5005",
  ],
  credentials: true // if you need cookies/auth headers
}));

// initialize Passport and session management using the middleware
passportSetup(app);

// routes
app.get("/api/auth/google", controller.googleLogin); // TODO: /api/auth/google/login
app.get("/api/auth/google/callback", controller.googleCallback);
app.post("/api/auth/google/revoke", controller.googleRevoke);

// the client root: the folder with the frontend site
const rootClient = path.join(__dirname, "client", "build");

// handle static routes
app.use("/", express.static(rootClient));

// handle not found API routes
app.all("/api/*", (req, res, next) => {
  return res.status(404).json({ message: "Not found" });
})

// handle client route for base urls
app.get("/", async (req, res) => {
  res.sendFile(path.resolve(rootClient, "index.html"));
});

// handle client routes for all other urls
app.get("*", (req, res) => {
  res.sendFile(path.resolve(rootClient, "index.html"));
});

try {
  // listen for requests
  let port = 5000;
  app.listen(port, () => {
    console.info(`Server is running on port ${port}`);
  });
} catch (err) {
  console.error(`Server listen error: ${err}`);
}


// export the app
module.exports = app;
