const path = require("path");
const fs = require("fs");

const test = (typeof global.it === "function"); // test mode (inside mocha/chai environment)
const production = (!test && (process.env.NODE_ENV === "production")); // production mode (production behaviour, production db on public host)
const staging = (!test && (process.env.NODE_ENV === "staging")); // staging mode (production behaviour, production db on local host)
const development = (!test && (process.env.NODE_ENV === "development")); // development mode (development behaviour , local db on local host)
const livestripe = (!test && (process.env.STRIPE_MODE === "live")); // stripe mode is "live"  

const apiPort = 5000;
const apiName = "ACME";
const appName = "acme";
const description = "A powerful web app, easily customizable";
const dir = "ltr";
const charset = "UTF-8";
const themeColor = "#a5dc6f";
const cacheControl = "mag-age=1440";
const currency = "EUR"; // default currency (ISO 4217:2015)
const company = "Sistemi Solari Rossi";
const urlPublic = "https://acme-server-lingering-brook-4120.fly.dev";
const urlLocal = `http://localhost:${apiPort}`;
const baseUrl = production ? urlPublic : urlLocal;
const clientSrc = `../${appName}-client/src`; // client app source relative folder to inject config file (do not change for customizations)
const serverLocale = "it"; // server locale
//const serverCountry = "IT"; // server country
//const defaultLocaleLanguage = "it_IT"; // default initial locale and language
const customization = "mda"; // custom configuration to be merged with configBase

/**
 * Import envronment variables from env file depending on current mode.
 * In production we don't have an env file, but a "secrets" environment from the provider
 */
if (!production) {
  require("dotenv").config({ path: staging ? "./.env" : "./.env.dev" });
}


const configBase = {
  mode: {
    production,
    staging,
    development,
    test,
  },
  baseUrl,
  baseUrlPublic: urlPublic, // for image urls in emails, they must always be public urls
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
    products: {
      search: {
        mode: "ANYWHERE", // EXACT ("borghi" does not find "Lamborghini") / ANYWHERE ("borghi" finds "Lamborghini")
        caseInsensitive: true, // if true, search ignoring case
      },
    },
  },
  publicBasePath: "/public", // use for example as "/public/" if a public folder on server is needed
  clientSrc, // client src folder, to be able to inject the client app section of this config file
  auth: {
    accessTokenExpirationSeconds: 60 * 30, // 30 minutes TTL
    refreshTokenExpirationSeconds: 60 * 60 * 24 * 7 * 2, // 2 week TTL
    notificationTokenExpirationSeconds: 60 * 60 * 1, // 6 hours TTL
    codeDeliveryMedium: "email", // "email" / "sms" / ...
  },
  // db: {
  //   products: {
  //     search: {
  //       mode: "ANYWHERE", // EXACT ("borghi" does not find "Lamborghini") / ANYWHERE ("borghi" finds "Lamborghini")
  //       caseInsensitive: true, // if true, search ignoring case
  //     },
  //   }
    // collation: {
    //   // "en" locale treats accented characters as variants of their base letters,
    //   // and tends to ignore apostrophes and certain punctuation for comparisons
    //   locale: "en",
    //   strength: 1, // ignores accents and case differences
    // },
  //},
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
    limitForNonDealers: 3,
  },
  logs: {
    file: {
      name: "logs/acme.log", // logs and exceptions file
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
  currency,
  upload: {
    maxFileSize: 10 * (1024 ** 2), // 10 MB
  },
  envReloadIntervalSeconds: 60, // the seconds interval when to reload env collection from database
  clientDomains: [
    baseUrl,
    "http://localhost:5000", // for testing a production environment in a local container
    "http://localhost:5005", // for development only
    "http://localhost:4173", // for staging only
  ],
  clientEmailPreferencesUrl: `${baseUrl}/email-preferences`,
  clientEmailUnsubscribeUrl: `${baseUrl}/email-unsubscribe`,
  clientPushNotificationsPreferencesUrl: `${baseUrl}/push-notifications-preferences`,
  clientPushNotificationsUnsubscribeUrl: `${baseUrl}/push-notifications-unsubscribe`,
  payment: {
    stripe: {
      enabled: false,
      products: livestripe ? { // stripe mode is live
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
      paymentSuccessUrl: `${baseUrl}/api/payment/paymentSuccess`, // test me
      paymentCancelUrl: `${baseUrl}/api/payment/paymentCancel`, // test me
      paymentSuccessUrlClient: `${baseUrl}/payment-success`,
      paymentCancelUrlClient: `${baseUrl}/payment-cancel`,
    },
  },
  email: {
    dryrun: false, // TODOOOOOOOOOO !production, // if true, do not really send emails, use fake send
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
  defaultNotifications: { // defaults
    email: {
      newsUpdates: true,
      tipsTutorials: false,
      userResearch: false,
      comments: false,
      reminders: false,
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
    "JWT_ACCESS_TOKEN_SECRET",
    "JWT_REFRESH_TOKEN_SECRET",
    "JWT_NOTIFICATION_TOKEN_SECRET",
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
    "FACEBOOK_OAUTH_SECRET_KEY",
  ],
  app: { // this section will be copied to client project as "config.json" file
    _: "WARNING: Please do not edit this file directly! Edit file \"src/config.js\" on the server project, then do \`yarn start-dev\` to inject new config here.",
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
        name: "sistemisolarirossi.it", // TODO...
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
      version: 1, // use this as a default for all API calls which do not specify any specific version (in headers["Accept-Version"])
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow",
      timeoutSeconds: production ? 20 : 30, // the maximum time in seconds to wait for an API response (production to free fly.io instance must be at lest 20 seconds...)
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
    auth: {
      clientSessionExpirationSeconds: 0, //60 * 60 * 72, // the seconds of user inactivity before we ask user for session continuation (should be less than auth.refreshTokenExpirationSeconds)
      clientSessionExpirationResponseMaximumSeconds: 15 * 60, // the seconds the user has to respond to the question, before being forcibly logged out
      clientLastActivityCheckTimeoutSeconds: 60 * 60 * 1, // the seconds timeout when we check if client session is expired for user inactivity
    },
    cookies: { // defaults
      key: "cookieConsent",
      expirationDays: 365, // one year
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
      backgroundVideo: "wave" // see in "/public/videos/*.mp4" for available videos
    },
    oauth: {
      domain: "auth.sistemisolari.com", // TODO: removeme, used only in client, test-federated-login.js
      // OK for Google // scope: [ "phone", "email", "profile", "openid", "aws.cognito.signin.user.admin" ],
      scope: [ "email", "openid" ],
      responseType: "code",
      redirectSignIn: baseUrl,
      redirectSignOut: baseUrl, // TODO: use me!!!
      scope: {
        google: ["profile", "email"],
        facebook: ["email"],
      },
      federatedSigninProviders: [ // we currently handle "Facebook", "Google"
        "Google",
        "Facebook",
      ],
    },
    index: { // to inject index.html
      language: serverLocale, // TODO: update index.language when user changes locale
      dir: dir, // TODO: update index.dir when user changes locale
      charset: charset, // TODO: update index.charset when user changes locale
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
        locale: serverLocale, // TODO: update index.og.locale when user changes locale
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
    let error = `Config file ${configCustomizationPath} not found`;
    console.error(error);
    throw new Error(error);
  }
}

// deeply merge objects with precedence to the source one
const deepMergeObjects = (target, source) => {
  for (let key in source) {
    // check if the value is an object or an array
    if (source[key] instanceof Object && !Array.isArray(source[key])) {
      // if both target and source have the same key and they are objects, merge them recursively
      if (key in target) {
        Object.assign(source[key], deepMergeObjects(target[key], source[key]));
      }
    } else if (Array.isArray(source[key])) {
      // if the value is an array, merge arrays by concatenating them
      target[key] = (target[key] || []).concat(source[key]);
    }
  }
  // combine target and updated source
  const retval = Object.assign(target || {}, source);
  return Object.assign(target || {}, source);
}

const config = deepMergeObjects(configBase, configCustom);

module.exports = config;
