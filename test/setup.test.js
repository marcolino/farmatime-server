/**
 * Tests common configuration
 */

const config = {
  language: "en", // use English for tests
  admin: {
    name: "Alice",
    surname: "Azure",
    email: "admin@mail.com",
    password: "admin!",
    fiscalCode: "CGNNMO80A01A001T",
    address: {
      street: "Solari street",
      streetNo: "0",
      city: "Rivoli",
      province: "TO",
      zip: "10100",
      country: "Italy",
    },
  },
  user: {
    name: "Bob",
    surname: "Blue",
    email: "user@mail.com",
    password: "user!",
    fiscalCode: "CGNNMO81A01A001U",
    address: {
      street: "Solari street",
      streetNo: "1",
      city: "Rivoli",
      province: "TO",
      zip: "10100",
      country: "Italy",
    },
  },
  userInvalidEmail: {
    name: "Bob",
    surname: "Blue",
    email: "invalid-email",
    password: "user!",
    fiscalCode: "CGNNMO81A01A001U",
    address: {
      street: "Solari street",
      streetNo: "1",
      city: "Rivoli",
      province: "TO",
      zip: "10100",
      country: "Italy",
    },
  },
  testProduct: {
    mdaCode: "TEST123",
    oemCode: "OEM456",
    make: "Test Make",
    models: ["Model A", "Model B"],
    application: "Test Application",
    kw: "1.5",
    volt: "12",
    teeth: "9",
    rotation: "destra",
    ampere: "100",
    regulator: "incorporato",
    notes: "Test notes",
    type: "motorino"
  },
};

module.exports = config;

