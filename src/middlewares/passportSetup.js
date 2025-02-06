/**
 * Configure passport strategies for Google and Facebook
 */

const passport = require("passport");
const session = require("express-session");
const MemoryStore = require("memorystore")(session);
const FacebookStrategy = require("passport-facebook").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const config = require("../config");


module.exports = (app) => {
  // Facebook OAuth Strategy
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_OAUTH_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_OAUTH_SECRET_KEY,
    callbackURL: `${config.baseUrl}/api/auth/facebook/callback`,
    profileFields: ["id", "displayName", "email"], // request email and profile info
  }, (accessToken, refreshToken, profile, done) => { // Facebook profile data is returned here
    return done(null, profile);
  }));

  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    callbackURL: `${config.baseUrl}/api/auth/google/callback`,

    //passReqToCallback: true,
    proxy: true, // important for services like fly.io
    profileFields: ["id", "displayName", "email"]

  }, (accessToken, refreshToken, profile, done) => { // Google profile data is returned here
    console.log("Google Auth Callback in Passport:", { // eslint-disable-line no-console
      profile: profile?._json,
      baseUrl: config.baseUrl,
      env: process.env.NODE_ENV
    });
    return done(null, profile);
  }));

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
