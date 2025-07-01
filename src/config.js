const path = require("path");
const fs = require("fs");
const merge = require("lodash.merge");

const test = (typeof global.it === "function"); // test mode (inside mocha/chai environment)
const testInCI = (test && !!process.env.GITHUB_ACTIONS); // test mode, inside CI (github actions), use public test db
//const production = (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging"); // production mode
const production = (process.env.NODE_ENV === "production"); // production mode (production behaviour, production db on public host)
const development = (process.env.NODE_ENV === "development"); // development mode (development behaviour, local db on local host)
const staging = (process.env.NODE_ENV === "staging"); // staging mode (production behaviour, production db on local host)
const stripelive = (process.env.LIVE_MODE === "true"); // stripe mode is "live"  

/**
 * Import envronment variables from env file.
 * IMPORTANT: in production we don"t have an env file, but a "secrets" environment from the hosting provider
 */
if (!(production || staging)) {
  const envFile = ".env";
  if (!fs.existsSync(envFile)) {
    throw new Error(`Error: ${envFile} file does not exist`);
  }
  try {
    require("dotenv").config({ path: envFile, override: true });
    //console.log(`${envFile} file loaded successfully`); // eslint-disable-line no-console
  } catch (err) {
    throw new Error(`Failed to load ${envFile} file: ${err.message}`);
  }
}

const customization = process.env.CUSTOMIZATION || null; // custom configuration to be merged with configBase

const apiPort = 5000; // development only
const apiPortClient = 5005; // development only
const apiName = "MEDICARE";
const appName = "medicare";
const description = "A powerful web app, easily customizable";
const dir = "ltr";
const charset = "UTF-8";
const themeColor = "#4e4f4c";
const cacheControl = "mag-age=1440";
const currency = "EUR"; // default currency (ISO 4217:2015)
const currencies = { // allowed currencies
  "EUR": "€",
  "USD": "$",
  "CHF": "fr.",
  "GBP": "£",
};
const company = "Sistemi Solari Rossi";
const urlPublic = staging ? "https://medicare-staging.fly.dev" : "https://medicare-prod.fly.dev";
const urlLocal = `http://localhost:${apiPort}`;
const baseUrl = (production || staging) ? urlPublic : urlLocal;
const urlPublicClient = urlPublic;
const urlLocalClient = `http://localhost:${apiPortClient}`;
const baseUrlClient = (production || staging) ? urlPublicClient : urlLocalClient;
const baseUrlClientPreview = (production || staging) ? "" : "http://localhost:4173";
const clientSrc = `../${appName}-client/src`; // client app source relative folder to inject config file (do not change for customizations)
const serverLocale = "it"; // server locale
//const customization = "mda"; // custom configuration to be merged with configBase

const configBase = {
  mode: {
    production,
    development,
    staging,
    test,
    stripelive,
    testInCI,
  },
  baseUrl,
  baseUrlPublic: urlPublic, // for image urls in emails, they must always be public urls
  baseUrlClient, // base url of the client (while developing client base url and server base url differ, while in production baseUrl === baseUrlClient)
  api: {
    name: apiName,
    port: apiPort,
    payloadLimit: "100mb",
    rateLimit: {
      maxRequestsPerMinute: 1000, // limit requests per minute (use 1 to throttle all requests)
      delayAfterMaxRequestsSeconds: 3, // delay after limit is reached
    },
    allowedVerbs: [
      "GET",
      "POST",
    ],
  },
  db: {
    debug: false, // to debug database queries
    products: {
      search: {
        mode: "ANYWHERE", // EXACT ("borghi" does not find "Lamborghini") / ANYWHERE ("borghi" finds "Lamborghini")
        caseInsensitive: true, // if true, search ignoring case
      },
    },
  },
  publicBasePath: "/public", // use for example as "/public/" if a public folder on server is needed
  clientSrc, // client src folder, to be able to inject the client app section of this config file
  security: {
    allowedReferers: {
      connectSrc: [
        baseUrl,
        baseUrlClient,
        baseUrlClientPreview,
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "https://www.gravatar.com",
        "https://secure.gravatar.com",
        //"https://*.tile.openstreetmap.org", // do not use wildards, because also used literally in checkReferer
        "https://a.tile.openstreetmap.org",
        "https://b.tile.openstreetmap.org",
        "https://c.tile.openstreetmap.org",
        "https://checkout.stripe.com",
      ],
      fontSrc: [
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
      ],
      styleSrc: [
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
      ],
      imgSrc: [
        "https://www.gravatar.com",
        "https://secure.gravatar.com",
        //"https://*.tile.openstreetmap.org", // do not use wildards, because also used literally in checkReferer
        "https://a.tile.openstreetmap.org",
        "https://b.tile.openstreetmap.org",
        "https://c.tile.openstreetmap.org",
        "https://cdnjs.cloudflare.com",
      ]
    }
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
  persistentStorage: { // use if provider enforces a persistent storage limit for current plan
    size: {
      watermark: 2.5 * (1024 ** 3), // 2.5 GB
      overflow: 3 * (1024 ** 3), // 3 GB
    },
  },
  products: {
    images: {
      path: "/public/assets/products/images",
      pathWaterMark: "/public/assets/products/imagesWaterMark",
      maximumSidePixels: 1024,
      format: "webp",
      qualityPercent: 80,
      alphaQualityPercent: 98,
      basepath: "/assets/products/images",
    },
    restrictForNonDealers: 3,
  },
  logs: {
    file: {
      name: "logs/medicare.log", // logs and exceptions file
      maxsize: 5 * (1024 ** 2), // max logs file size: 5MB
    },
    betterstack: {
      enable: true,
    },
    // papertrail: {
    //   enable: false,
    //   host: "logs6.papertrailapp.com",
    //   port: 18466,
    // },
    levelMap: { // log levels for all currently foreseen modes
      test: "crit",
      production: "debug", // when production will be fully stable, we can high this up to "info"...
      staging: "debug",
      development: "debug",
    },
  },
  currency, // default currency
  currencies, // all accepted currencies
  upload: {
    maxFileSize: 10 * (1024 ** 2), // 10 MB
  },
  envReloadIntervalSeconds: 60, // the seconds interval when to reload env collection from database
  clientDomains: [
    baseUrl,
    baseUrlClient,
    baseUrlClientPreview,
  ],
  clientEmailUnsubscribeUrl: `${baseUrlClient}/email-unsubscribe`,
  clientEmailPreferencesUrl: `${baseUrlClient}/email-preferences`,
  clientPushNotificationsUnsubscribeUrl: `${baseUrlClient}/push-notifications-unsubscribe`,
  clientPushNotificationsPreferencesUrl: `${baseUrlClient}/push-notifications-preferences`,
  clientSmsUnsubscribeUrl: `${baseUrlClient}/sms-unsubscribe`,
  clientSmsPreferencesUrl: `${baseUrlClient}/sms-preferences`,
  payment: {
    gateway: "stripe",
    gateways: { // TODO...
      stripe: {
        enabled: false,
        products: stripelive ? { // products for a typical SAAS
          // stripe mode is live
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
        } : {
          // stripe mode is test
          free: {
            name: "Prodotto Gratuito TEST",
            product_id: "prod_LC4q54jgFITE0U",
            price_id: "price_1KVggqFZEWHriL1uD8hlzL3S",
          },
          standard: {
            name: "Prodotto Standard TEST",
            product_id: "prod_LC4tiakN3cKlSA",
            price_id: "price_1KVgjRFZEWHriL1ujZm3tF2h",
          },
          unlimited: {
            name: "Prodotto Illimitato TEST",
            product_id: "prod_LC4og5H6lpSLoK",
            price_id: "price_1KVgfKFZEWHriL1utJyT904c",
          },
        },
        paymentSuccessUrl: `${baseUrl}/api/payment/paymentSuccess`,
        paymentCancelUrl: `${baseUrl}/api/payment/paymentCancel`,
        paymentSuccessUrlClient: `${baseUrlClient}/payment-success`,
        paymentCancelUrlClient: `${baseUrlClient}/payment-cancel`,
        checkout: {
          shipping_allowed_countries: ["IT", "CH"], // the countries you ship to 
        },
      },
    },
  },
  email: {
    dryrun: test || development, // if true, do not really send emails, use fake send
    subject: {
      prefix: apiName,
    },
    administration: {
      from: "sistemisolarirossi@gmail.com",
      fromName: "Sistemi Solari Rossi backend server",
      to: "marcosolari@gmail.com", // "sistemisolarirossi@gmail.com" // when we read this account
      toName: "MEDICARE admin",
    },
    support: {
      to: "marcosolari@gmail.com", // "sistemisolarirossi@gmail.com" // when we read this account
      toName: "MEDICARE support",
    },
    templatesPath: "../templates",
    templatesExtension: ".ejs",
  },
  defaultNotifications: { // defaults
    email: {
      newsUpdates: true,
      tipsTutorials: false,
      userResearch: false,
      comments: false,
      reminders: false,
      offers: false,
    },
    push: {
      comments: false,
      reminders: false,
      activity: false,
    },
    sms: {
      transactionAlerts: true,
      marketingMessages: false,
    },
  },
  envRequiredVariables: [
    "LIVE_MODE",
    "JWT_ACCESS_TOKEN_SECRET",
    "JWT_REFRESH_TOKEN_SECRET",
    "JWT_NOTIFICATION_TOKEN_SECRET",
    "ADMIN_USER_DEFAULT_EMAIL",
    "ADMIN_USER_DEFAULT_PASSWORD",
    "MONGO_SCHEME",
    "MONGO_URL",
    "MONGO_DB",
    "MONGO_USER",
    "MONGO_PASS",
    "PASSPORT_SECRET",
    "BREVO_EMAIL_API_KEY",
    "STRIPE_MODE",
    "STRIPE_API_KEY_TEST",
    "STRIPE_API_KEY_LIVE",
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "FACEBOOK_OAUTH_CLIENT_ID",
    //"FACEBOOK_OAUTH_SECRET_KEY",
  ],
  app: { // this section will be copied to client project as "config.json" file
    _: "WARNING: Please do not edit this file directly! Edit file \"src/config.js\" on the server project, then do `yarn start-dev` to inject new config here.",
    customization,
    mode: {
      production,
      staging,
      development,
      test,
    },
    name: appName, // app name
    title: apiName, // app title
    siteUrl: baseUrl, // site url
    company: {
      name: `${company} s.r.l.`,
      title: `${company}`,
      phone: "+39 333 6480983",
      address: "Via Felisio, 19 - 10098 Rivoli (TO)",
      mailto: "mailto:marcosolari@gmail.com", // "sistemisolarirossi@gmail.com" // when we read this account
      copyright: `© ${new Date().getFullYear()} ${company}. All rights reserved.`,
      homeSite: {
        name: "sistemisolarirossi.it", // TODO: use real home site name
        url: baseUrl,
      },
      owner: {
        name: "Marco Solari",
        fiscalCode: "SLRMRC61M31L219Y",
        streetAddress: "Via Felisio, 19",
        city: "Rivoli",
        province: "TO",
        country: "Italy",
        zipCode: "10098",
        phone: "+39 333 6480983",
        email: "marcosolari@gmail.com",
      },
      contacts: {
        dealerRoleRequestPhoneNumber: "+39 333 6480983",
        // claimsTitle: i18n.t("Our Company Claims"),
        // claimsSubtitle: i18n.t("We provide the best services in the industry, focusing on quality and customer satisfaction"),
        map: {
          center: [45.0708062, 7.5151672],
          zoom: 13,
        }
      },
    },
    api: { // API settings for clients
      name: appName,
      version: "1", // use this as a default for all API calls which do not specify any specific version (in headers["Accept-Version"])
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow",
      timeoutSeconds: production ? 20 : 30, // the maximum time in seconds to wait for an API response (production to free fly.io instance must be at lest 20 seconds...)
    },
    auth: {
      cookiesExpirationSeconds: 60 * 60 * 24 * ((7 * 2) + 1), // 2 week + 1 day TTL: should be longer than refreshTokenExpirationSeconds, to avoid cookie expiration before tokens inside expiration
      accessTokenExpirationSeconds: 60 * 30, // 30 minutes TTL: time after access token expires, and must be refreshed
      refreshTokenExpirationSeconds: 60 * 60 * 24 * 7 * 2, // 2 week TTL: time after refresh token expires, and user must sign in again (in case user did not check DontRememberMe)
      refreshTokenExpirationDontRememberMeSeconds: 3600, //60 * 60, // 1 hour TTL: time after refresh token expires, and user must sign in again (in case user did check DontRememberMe)
      notificationTokenExpirationSeconds: 60 * 60 * 1, // 6 hours TTL: time after notification token expires (in notifiction emails for example)
      verificationCodeExpirationSeconds: 60 * 60 * 1, // 1 hour TTL
      codeDeliveryMedium: "email", // "email" / "sms" / ...: the signup confirmation code delivery medium
      clientSessionExpirationSeconds: 0, // time after which session "pre-expires": user is asked to signout if session is no longer in use - 0 means no expiration
      clientSessionExpirationResponseMaximumSeconds: 900, // time after which - after a session "pre-expiration" prompt has been presented to user and no response is obtained, the session will be terminated, and user logged out
      //"clientLastActivityCheckTimeoutSeconds": 3600, // unused...
    },
    images: {
      publicPath: "/assets/products/images",
      publicPathWaterMark: "/assets/products/imagesWaterMark",
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
    currency,
    currencies,
    cookies: { // defaults
      key: "cookieConsent",
      expirationDays: 365, // one year
      "default": { // default values
        "technical": true,
        "profiling": false,
        "statistics": false
      },
    },
    spinner: { // loading spinner
      /** choose one in type in:
       *    Audio, Comment, Grid, Hearts, Hourglass, Oval,
       *    RotatingLines, RotatingSquare, ThreeDots, Watch
       */
      //type: "Watch",
      delay: 500,
      thickness: 4,
      size: 64,
      opacity: 0.9,
      color: "ochra",
    },
    serverLocale, // server locale
    locales: { // supported locales
      "en": { flag: "🇬🇧", dir: "ltr", country: "EN", phonePrefix:  "+1", charset: "utf-8" },
      "it": { flag: "🇮🇹", dir: "ltr", country: "IT", phonePrefix: "+39", charset: "utf-8" },
      "fr": { flag: "🇫🇷", dir: "ltr", country: "FR", phonePrefix: "+33", charset: "utf-8" },
    },
    ui: {
      themes: [
        "light",
        "dark",
      ],
      defaultTheme: "light",
      defaultThemeColor: "#a5dc6f",
      headerHeight: 64,
      footerHeight: 64,
      headerPadding: 10,
      footerPadding: 10,
      extraSmallWatershed: 600,
      mobileDesktopWatershed: 900,
      usePlans: true, // if we do use plans in the app
      snacks: {
        maxInStack: 3,
        autoHideDurationSeconds: 5,
        anchorOrigin: {
          vertical: "bottom",
          horizontal: "right"
        },
        style: {
          fontSize: "1.1rem",
          whiteSpace: "pre-line"
        },
        closeIcon: {
          fontSize: "1.1rem",
        }
      },
      products: {
        enabled: false,
        images: {
          minHeight: 300,
          watermark: {
            path: "assets/images/watermark.png",
            percentWidth: 33,
            percentOpacity: 12,
            contrast: 1.5,
          }
        },
      },
      contacts: {
        enabled: false,
      },
      cart: {
        enabled: false,
      },
      backgroundVideo: "wind-turbines", // see in "/public/videos/*.mp4" for available videos
      jobs: {
        storageKey: "jobs",
        dragAndDrop: {
          desktop: {
            enabled: true,
          },
          mobile: {
            enabled: false,
          }
        },
        qrcode: {
          encryption: false, // ecryption is more secure, but produces far too big qrcodes
          size: 360,
          level: "L", // "L" = Low (max capacity), "M" = Medium (default), "Q", "H" = High (max redundancy)
          expirationMinutes: 3,
        }
      }
    },
    oauth: {
      scope: {
        google: ["profile", "email"],
        facebook: ["email"],
      },
      responseType: "code",
      redirectSignIn: baseUrl,
      redirectSignOut: baseUrl,
      federatedSigninProviders: [
        "Google",
        "Facebook",
      ],
    },
    ecommerce: {
      enabled: true, // enable ecommerce flag
      checkoutProvider: "Stripe",
      gift: true, // enable gift flag (no invoice in the package, better packaging...)
      delivery: {
        enabled: true,
        methods: [
          { code: "none", description: "No delivery", price: 0 }, // see misc/strings-for-translation.js
          { code: "standard", description: "Standard delivery, 7 days", price: 600 }, // see misc/strings-for-translation.js
          { code: "express", description: "Express delivery, 3 days", price: 900 }, // see misc/strings-for-translation.js
        ],
      },
    },
    index: { // to inject index.html
      language: serverLocale,
      dir: dir,
      charset: charset,
      description: description,
      themeColor: themeColor,
      cacheControl: cacheControl,
      og: {
        title: apiName,
        description: description,
        url: baseUrl, // i.e.: "https://ahrefs.com/blog/open-graph-meta-tags/""
        type: "website",
        image: { // use custom images for “shareable” pages (e.g., homepage, articles, etc.). Use your logo or any other branded image for the rest of your pages. Use images with a 1.91:1 ratio and minimum recommended dimensions of 1200x630 for optimal clarity across all devices.
          url: `${baseUrl}/apple-touch-icon.png`,
          alt: `${apiName} logo image`,
        },
        locale: serverLocale,
        site_name: apiName,
      },
      twitter: {
        card: `${baseUrl}/apple-touch-icon.png`,
        title: apiName,
        description: description,
        image: `${baseUrl}/favicon-64x64.png`,
      },
      apple: {
        mobileWebAppCapable: "yes",
        mobileWebAppStatusBarStyle: "black-translucent",
        mobileWebAppTitle: apiName,
      },
      ms: {
        themeColor: themeColor,
        tileImage: `${baseUrl}/ms-tile.png`,
      },
      canonicalUrl: baseUrl,
      fontFamily: "Open+Sans:wght@400;600;700",
      fontDisplayMode: "block",
      title: apiName,
    },
  },
};

let configCustom = {};
if (customization) {
  const configCustomizationPath = path.join(__dirname, `config.${customization}.js`);
  if (fs.existsSync(configCustomizationPath)) {
    configCustom = require(configCustomizationPath);
  } else {
    throw new Error(`Config file ${configCustomizationPath} not found`);
  }
}

const config = merge(configBase, configCustom);

module.exports = config;
