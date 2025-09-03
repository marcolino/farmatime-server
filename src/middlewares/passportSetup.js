/**
 * Configure passport strategies for Google and Facebook
 */

const passport = require("passport");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const FacebookStrategy = require("passport-facebook").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { logger } = require("../controllers/logger.controller");
const config = require("../config");

module.exports = (app) => {
  // Google OAuth Strategies (differentiate among web and pwa to avoid bad interferences)
  //console.log("process.env.GOOGLE_OAUTH_CLIENT_ID:", process.env.GOOGLE_OAUTH_CLIENT_ID);
  const setupGoogleStrategy = (flow = "web") => {
    passport.use(`google-${flow}`, new GoogleStrategy({
      clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      callbackURL: `${config.baseUrl}/api/auth/google/callback/${flow}`,
      proxy: true, // important for services like fly.io
      profileFields: ["id", "displayName", "email"]
      // TODO: remove accessToken, refreshToken below ?
    }, (accessToken, _refreshToken, profile, done) => { // Google profile data is returned here
      logger.info(`Google Auth ${flow} Callback in Passport: accessToken length:`, accessToken.length);
      logger.info(`Google Auth ${flow} Callback in Passport: profile display name:`, profile.displayName);
      return done(null, profile);
    }));
  };

  // Facebook OAuth Strategies (differentiate among web and pwa to avoid bad interferences)
  const setupFacebookStrategy = (flow = "web") => {
    passport.use(`facebook-${flow}`, new FacebookStrategy({
      clientID: process.env.FACEBOOK_OAUTH_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_OAUTH_SECRET_KEY,
      callbackURL: `${config.baseUrl}/api/auth/facebook/callback/${flow}`,
      profileFields: ["id", "displayName", "email"], // request email and profile info
      // TODO: remove accessToken, refreshToken below ?
    }, (accessToken, _refreshToken, profile, done) => { // Facebook profile data is returned here
      logger.info(`Facebook Auth ${flow} Callback in Passport: accessToken length:`, accessToken.length);
      logger.info(`Facebook Auth ${flow} Callback in Passport: profile display name:`, profile.displayName);
      return done(null, profile);
    }));
  };

  setupGoogleStrategy("web");
  setupGoogleStrategy("pwa");
  
  setupFacebookStrategy("web");
  setupFacebookStrategy("pwa");

  // serialize user for session management
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  // deserialize user from session
  passport.deserializeUser((obj, done) => {
    done(null, obj);
  });

  // sessions and passport initialization
  app.use(session({
    cookie: {
      maxAge: config.app.auth.refreshTokenExpirationSeconds
    },
    resave: false,
    saveUninitialized: false,
    secret: process.env.PASSPORT_SECRET,
    store: new MemoryStore({
      checkPeriod: config.app.auth.refreshTokenExpirationSeconds // prune expired entries when maxAge expires
    }),
  }));
  
  // initialize Passport and use session
  app.use(passport.initialize());
  app.use(passport.session());
};
