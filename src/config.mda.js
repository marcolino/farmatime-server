//const i18n = require("./middlewares/i18n");
const apiName = "MDA";
const appName = "mda";
const company = "M.D.A. s.r.l.";

const config = {
  api: {
    name: apiName,
  },
  logs: {
    file: "logs/mda.log", // logs and exceptions file
  },
  name: appName, // app name
  title: apiName, // app title
  // app: {
  //   company: {
  //     name: `${company} s.r.l.`,
  //     title: `${company}`,
  //     phone: "+39 333 3333333",
  //     address: "Via Leinì, 1/A - 10077 San Maurizio Canavese (TO)",
  //     mailto: "mailto:info@mdasrl.eu", // TODO
  //     copyright: `© ${new Date().getFullYear()} ${company}. All rights reserved.`,
  //     homeSite: {
  //       name: "mdasrl.eu", // TODO
  //     },
  //     owner: { // TODO
  //       name: "NOME_RESPONSABILE COGNOME_RESPONSABILE",
  //       fiscalCode: "CODICE_FISCALE_RESPONSABILE",
  //       streetAddress: "INDIRIZZO_RESPONSABILE",
  //       city: "CITTA_RESPONSABILE",
  //       province: "PROVINCIA_RESPONSABILE",
  //       zipCode: "ZIP_RESPONSABILE",
  //       phone: "+39_PHONE_RESPONSABILE",
  //       email: "EMAIL_RESPONSABILE",
  //     },
  //     contacts: {
  //       map: {
  //         center: [45.21932184594953, 7.638683839906466],
  //         zoom: 13,
  //       }
  //     },
  //   }
  // }
};

module.exports = config;