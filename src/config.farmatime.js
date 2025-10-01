const apiName = "farmatime";
const appName = "FarmaTime";
//const company = "Farmatime";

const config = {
  api: {
    name: apiName,
  },
  logs: {
    file: {
      name: "logs/farmatime.log", // logs and exceptions file
    },
  },
  name: appName, // app name
  title: appName, // app title
  // app: {
  //   company: {
  //     name: `${company}`,
  //     title: `${company}`,
  //     phone: "+39 333 3333333",
  //     address: "Via Leinì, 1/A - 10077 San Maurizio Canavese (TO)",
  //     mail: "info@mdasrl.eu",
  //     copyright: `© ${new Date().getFullYear()} ${company}. All rights reserved.`,
  //     homeSite: {
  //       name: "mdasrl.eu",
  //     },
  //     owner: {
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
