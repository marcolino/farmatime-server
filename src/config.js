//const i18n = require("./middlewares/i18n");
const apiName = "ACME";
const appName = "acme";
const currency = "EUR"; // default currency (ISO 4217:2015)
const company = "Sistemi Solari Rossi";
const portPublic = "";
const urlPublic = `https://acme-server-lingering-brook-4120.fly.dev${portPublic}`;
const portLocal = ":5000";
const urlLocal = `http://localhost${portLocal}`;
const test = (typeof global.it === "function"); // testing (mocha/chai/...)
const production = (!test && (process.env.NODE_ENV === "production")); // production mode
const development = (!test && (process.env.NODE_ENV !== "production")); // development mode
const stripeIsLive = process.env.STRIPE_MODE === "live"; // stripe mode is "live"  
const serverBaseUrl = production ? `${urlPublic}` : `${urlLocal}`;
const clientBaseUrl = production ? `${urlPublic}` : `${urlLocal}`;
require("dotenv").config({ path: production ? "./.env" : "./.env.dev" });

clientEmailUnsubscribeUrl = `${clientBaseUrl}/email-unsubscribe`;
clientEmailPreferencesUrl = `${clientBaseUrl}/email-preferences`;

module.exports = {
  mode: {
    production,
    development,
    test,
  },
  api: {
    name: apiName,
    payloadLimit: "100mb",
    rateLimit: {
      maxRequestsPerMinute: 1000, // limit requests per minute (use 1 to throttle all requests)
      delayAfterMaxRequestsMilliseconds: 2.5 * 1000, // delay after limit is reached
    },
    allowedVerbs: [
      "GET",
      "POST",
    ],
  },
  publicBasePath: null, // use for example as "/public/" if a puglic folder on server is needed
  auth: {
    accessTokenExpirationSeconds: 60 * 30, // 30 minutes TTL
    refreshTokenExpirationSeconds: 60 * 60 * 24 * 7, // 1 week TTL
    verificationCodeExpirationSeconds: 60 * 60 * 1, // 1 hour TTL
    codeDeliveryMedium: "email", // "email" / "sms" / ...
  },
  roles: [
    {
      name: "user",
      priority: 1,
    }, {
      name: "dealer",
      priority: 10,
    }, {
      name: "operator",
      priority: 20,
    }, {
      name: "admin",
      priority: 100,
    },
  ],
  plans: [
    {
      name: "free",
      priceCurrency: currency,
      pricePerYear: 0,
      pricePerMonth: undefined,
      supportTypes: [ "email" ],
    },
    {
      name: "standard",
      priceCurrency: currency,
      pricePerYear: 399,
      pricePerMonth: undefined,
      supportTypes: [ "email" ],
    },
    {
      name: "unlimited",
      priceCurrency: currency,
      pricePerYear: 799,
      pricePerMonth: undefined,
      supportTypes: [ "email", "phone" ],
    },
  ],
  db: {
    HOST: "localhost",
    PORT: 27017,
    DB: "acme",
  },
  logs: {
    file: "logs/acme.log", // logs and exceptions file
    betterstack: {
      enable: true,
    },
    papertrail: {
      enable: false,
      host: "logs6.papertrailapp.com",
      port: 18466,
    },
    levelMap: { // log levels for all currently foreseen modes
      // in test mode skip console logging for levels lower than crit (error, warning, notice, info, debug)
      // in production mode skip console logging for levels lower than warning (notice, info, debug)
      // in staging mode skip console logging for levels lower than debug (none)
      // in development mode skip console logging for levels lower than info (debug)
      test: "crit",
      production: "warning",
      staging: "debug",
      development: "debug",
    },
  },
  locale: "it", // server's locale (for dates)
  currency,
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10 MB
  },
  serverDomain: serverBaseUrl,
  clientDomains: [
    clientBaseUrl,
    //clientShowcaseBaseUrl,
  ],
  clientEmailUnsubscribeUrl,
  payment: {
    stripe: {
      products: stripeIsLive ? { // stripe mode is live
        free: {
          name: "Prodotto Gratuito LIVE",
          product_id: "prod_LC4k3rwA64D45l",
          price_id: "price_1KVgafFZEWHriL1u8PFSvxSy",
        },
        standard: {
          name: "Prodotto Standard LIVE",
          product_id: "prod_LC4lYicsBXPmIA",
          price_id: "price_1KVgbfFZEWHriL1uR5BnWO9W",
        },
        unlimited: {
          name: "Prodotto Illimitato LIVEKBJ",
          price_id: "price_1KVgdSFZEWHriL1udJubMAAn",
        },
      } : { // stripe mode is test
        free: {
          name: "Prodotto Gratuito (test)",
          product_id: "prod_LC4q54jgFITE0U",
          price_id: "price_1KVggqFZEWHriL1uD8hlzL3S",
        },
        standard: {
          name: "Prodotto Standard (test)",
          product_id: "prod_LC4tiakN3cKlSA",
          price_id: "price_1KVgjRFZEWHriL1ujZm3tF2h",
        },
        unlimited: {
          name: "Prodotto Illimitato (test)",
          product_id: "prod_LC4og5H6lpSLoK",
          price_id: "price_1KVgfKFZEWHriL1utJyT904c",
        },
      },
      paymentSuccessUrl: "http://localhost:5000/api/payment/paymentSuccess",
      paymentCancelUrl: "http://localhost:5000/api/payment/paymentCancel",
      paymentSuccessUrlClient: `${clientBaseUrl}/payment-success`,
      paymentCancelUrlClient: `${clientBaseUrl}/payment-cancel`,
      paymentSuccessUrlShowcase: `${clientBaseUrl}/payment-success`, // was `${clientShowcaseBaseUrl}/payment-success`
      paymentCancelUrlShowcase: `${clientBaseUrl}/payment-cancel`, // was `${clientShowcaseBaseUrl}/payment-cancel`
    },
  },
  email: {
    dryrun: !production, // if true, do not really send emails, use fake send
    subject: {
      prefix: apiName,
    },
    administration: {
      from: "marcosolari@gmail.com",
      fromName: "Sistemi Solari Rossi backend server",
      to: "marcosolari@gmail.com", // "sistemisolarirossi@gmail.com" // when we read this account
      toName: "ACME admin",
    },
    support: {
      to: "marcosolari@gmail.com", // "sistemisolarirossi@gmail.com" // when we read this account
      toName: "ACME support",
    },
    templatesPath: "../templates",
    templatesExtension: ".ejs",
  },
  defaultUsers: {
    admin: {
      email: "marcosolari@gmail.com",
      password: process.env.ADMIN_USER_DEFAULT_PASSWORD,
      firstName: "admin name",
      lastName: "admin surname",
    },
  },
  envRequiredVariables: [
    "JWT_TOKEN_SECRET",
    "ADMIN_USER_DEFAULT_PASSWORD",
    "MONGO_SCHEME",
    "MONGO_URL",
    "MONGO_DB",
    "MONGO_USER",
    "MONGO_PASS",
    "BREVO_EMAIL_API_KEY",
    "STRIPE_MODE",
    "STRIPE_API_KEY_TEST",
    "STRIPE_API_KEY_LIVE",
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "FACEBOOK_OAUTH_CLIENT_ID",
    "FACEBOOK_OAUTH_SECRET_KEY",
  ],
  app: {
    mode: {
      production,
      development,
      test,
    },
    name: appName, // app name
    title: apiName, // app title
    siteUrl: serverBaseUrl, // site url
    serviceWorkerRegistration: production, // use in production (if really needed...)
    company: {
      name: `${company} s.r.l.`,
      title: `${company}`,
      phone: "+39 333 6480983",
      address: "Via Felisio, 19 - 10098 Rivoli (TO)",
      mailto: "mailto:marcosolari@gmail.com", // "sistemisolarirossi@gmail.com" // when we read this account
      copyright: `© ${new Date().getFullYear()} ${company}. All rights reserved.`,
      homeSite: {
        name: "sistemisolarirossi.it",
        url: serverBaseUrl,
      },
      owner: {
        name: "Marco Solari",
        fiscalCode: "SLRMRC61M31L219Y",
        streetAddress: "Via Felisio, 19",
        city: "Rivoli",
        province: "TO",
        zipCode: "10098",
        phone: "+39 333 6480983",
        email: "marcosolari@gmail.com",
      },
      contacts: {
        // claimsTitle: i18n.t("Our Company Claims"),
        // claimsSubtitle: i18n.t("We provide the best services in the industry, focusing on quality and customer satisfaction"),
        map: {
          center: [45.0708062, 7.5151672],
          zoom: 13,
        }
      },
    },
    api: { // API settings for clients
      version: 1, // use this as a default for all API calls which do not specify any specific version (in headers["Accept-Version"])
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow",
    },
    legal: {
      termsValidityStartDate: "01-01-2025", // start date of terms validity
      cookieConsentExpirationDays: 365, // days after which cookie with privacy consent does expire
    },
    manifest: {
      // if PWA is hosted at the root of domain (https://example.com/), and it always starts from the root
      // regardless of where the manifest.json is located, use: "start_url": "/";
      // if instead PWA is within a subdirectory (https://example.com/app), and it starts from that subdirectory,
      // use: "start_url": "/app"
      startUrl: "./", // start_url value in manifest
      display: "standalone", // display value in manifest
    },
    auth: {
      clientSessionExpirationSeconds: 60 * 60 * 2, // client session expiration seconds (should be less than auth.refreshTokenExpirationSeconds)
      warnBeforeSessionExpirationSeconds: 60 * 2, // seconds before client session expiration warning
    },
    spinner: { // loading spinner
      /** choose one in type in:
       *    Audio, Comment, Grid, Hearts, Hourglass, Oval,
       *    RotatingLines, RotatingSquare, ThreeDots, Watch
       */
      type: "Watch",
      delay: 500,
      height: 200,
      width: 200,
      opacity: .50,
      color: "midnightBlue",
      secondaryColor: "darkBlue",
      strokeWidth: 10,
      strokeWidthSecondary: 8,
    },
    i18n: {
      country: "it",
      phonePrefix: "+39",
      languages: {
        initial: "it", // the initial language to use for translations: when initializing i18next, setting the lng option determines the language (lng) that i18next will attempt to use first for translations
        supported: {
          "en": { icon: "🇬🇧" },
          "it": { icon: "🇮🇹" },
        },
        fallback: "it", // defines the fallback language(s) to use when a translation in the initial language (lng) is not found; this can be a single language code, an array of language codes, or even a function that dynamically determines the fallback language based on the current language code
      },
    },
    ui: {
      footerHeight: "1.5rem",
      extraSmallWatershed: 600,
      mobileDesktopWatershed: 900,
      // sounds: {
      //   buttonClick,
      // },
      usePlans: true, // if we do use plans in the app
      toastAutoCloseSeconds: 7,
    },
    oauth: {
      domain: "auth.sistemisolari.com",
      // OK for Google // scope: [ "phone", "email", "profile", "openid", "aws.cognito.signin.user.admin" ],
      scope: [ "email", "openid", "aws.cognito.signin.user.admin" ],
      responseType: "code",
      redirectSignIn: serverBaseUrl,
      redirectSignOut: serverBaseUrl,
      federatedSigninProviders: [ // we currently handle "Facebook", "Google"
        //"Facebook",
        //"Google",
      ],
    },
  },
};
