/**
 * Tests common configuration
 */

process.env.NODE_ENV = "test";

const config = {
  language: "en",
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
  adminstandardplan: {
    name: "Alice",
    surname: "Azure",
    email: "admin-standard@mail.com",
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
  }
};

module.exports = {
  config,
};
