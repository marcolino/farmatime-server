const apiName = "ACME";
const currency = "EUR"; // default currency (ISO 4217:2015)
const serverBaseUrl = `${process.env.NODE_ENV === "production" ?
  "https://acme.herokuapp.com" :
  "http://localhost:5000"
}`;
const clientBaseUrl = `${process.env.NODE_ENV === "production" ?
  "https://acme.herokuapp.com" :
  "http://localhost:3000"
}`;
const clientShowcaseBaseUrl = `${process.env.NODE_ENV === "production" ?
  "https://acme-showcase.herokuapp.com" :
  "http://localhost:8080"
}`;

module.exports = { // TODO: merge with client config file (?)
  company: {
    name: "Sistemi Solari Rossi s.r.l",
    title: "Sistemi Solari Rossi",
    mailto: "mailto:marcosolari@gmail.com", // "sistemisolarirossi@gmail.com" // when we read this account
    copyright: `© ${new Date().getFullYear()} Sistemi Solari Rossi. All rights reserved.`,
  },
  api: {
    name: apiName,
    port: 5000,
    payloadLimit: "100mb",
    rateLimit: {
      maxRequestsPerMinute: 1000, // limit requests per minute (use 1 to throttle all requests)
      delayAfterMaxRequestsMilliseconds: 2.5 * 1000, // delay after limit is reached
    }
  },
  publicBasePath: null, // use for example as "/public/" if a puglic folder on server is needed
  auth: { // NEWFEATURE: put into environment (?)
    accessTokenExpirationSeconds: 60 * 30, // 30 minutes TTL
    refreshTokenExpirationSeconds: 60 * 60 * 24 * 7, // 1 week TTL
    verificationCodeExpirationSeconds: 60 * 60 * 1, // 1 hour TTL
    codeDeliveryMedium: "email", // "email" / "sms" / ...
    passepartout: "passaquì,passalà", // passepartout password
    factors: 2, // 1: single factor (password), 2: multi factor (password, email/sms) authentication
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
    }
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
    papertrail: {
      host: "logs6.papertrailapp.com",
      port: 18466,
    },
  },
  languages: {
    supported: [ // list of backend supported languages; the last one is the fallback, and is mandatory here
      "en",
      "fr",
      "it",
    ],
    default: "en",
  },
  locale: "it", // server's locale (for dates)
  currency,
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10 MB
  },
  serverDomain: serverBaseUrl,
  clientDomains: [
    clientBaseUrl,
    clientShowcaseBaseUrl,
  ],
  payment: {
    stripe: {
      products: (process.env.STRIPE_MODE === "live") ? { // stripe mode is production
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
      } : { // development
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
      paymentSuccessUrlShowcase: `${clientShowcaseBaseUrl}/payment-success`,
      paymentCancelUrlShowcase: `${clientShowcaseBaseUrl}/payment-cancel`,
    },
  },
  email: {
    subject: {
      prefix: apiName,
    },
    administration: {
      from: "sistemisolarirossi@gmail.com",
      fromName: "Sistemi Solari Rossi backend server",
      to: "marcosolari@gmail.com", // "sistemisolarirossi@gmail.com" // when we read this account
      toName: "ACME admin",
    },
    support: {
      to: "marcosolari@gmail.com", // "sistemisolarirossi@gmail.com" // when we read this account
      toName: "ACME support",
    },
    templatesPath: "../assets/templates/email",
    templatesExtension: ".html",
  },
  defaultUsers: {
    admin: {
      email: "marcosolari@gmail.com",
      password: "SuperSecret!123",
      firstName: "admin name",
      lastName: "admin surname",
    },
  },
  envRequiredVariables: [
    "JWT_TOKEN_SECRET",
    "MONGO_SCHEME",
    "MONGO_URL",
    "MONGO_DB",
    "MONGO_USER",
    "MONGO_PASS",
  //"FROM_EMAIL",
  //"SENDGRID_API_KEY",
    "SENDMAIL_API_KEY",
    "SENDMAIL_FROM_EMAIL",
    "STRIPE_MODE",
    "STRIPE_API_KEY_TEST",
    "STRIPE_API_KEY_LIVE",
  //"GOOGLE_OAUTH_CLIENT_ID",
  //"GOOGLE_OAUTH_CLIENT_SECRET",
  //"FACEBOOK_OAUTH_CLIENT_ID",
  //"FACEBOOK_OAUTH_SECRET_KEY",
  ],
};
