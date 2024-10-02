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
    callbackURL: `${config.serverDomain}/api/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'email'], // request email and profile info
  }, (accessToken, refreshToken, profile, done) => { // Facebook profile data is returned here
    return done(null, profile);
  }));

  // Google OAuth Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    callbackURL: `${config.serverDomain}/api/auth/google/callback`,
  }, (accessToken, refreshToken, profile, done) => { // Google profile data is returned here
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
  // app.use(session({
  //   secret: process.env.PASSPORT_SECRET,
  //   resave: true,
  //   saveUninitialized: true,
  // }));
  // sessions and passport initialization
  app.use(session({
    cookie: {
      maxAge: config.auth.refreshTokenExpirationSeconds
    },
    resave: false,
    saveUninitialized: false,
    secret: process.env.PASSPORT_SECRET,
    store: new MemoryStore({
      checkPeriod: config.auth.refreshTokenExpirationSeconds // prune expired entries when maxAge expires
    }),
  }))
  
  // initialize Passport and use session
  app.use(passport.initialize());
  app.use(passport.session());
};
