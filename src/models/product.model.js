const mongoose = require("mongoose");
const config = require("../config");

const ProductSchema = new mongoose.Schema({
  mdaCode: {
    type: String,
  },
  oemCode: {
    type: String,
  },
  make: {
    type: String,
    // custom: {
    //   searchable: true, // this field will be "searchable", i.e.: normalized across diacritics
    // }
  },
  models: [{
    type: String,
    // custom: {
    //   searchable: true, // this field will be "searchable", i.e.: normalized across diacritics
    // }
  }],
  application: {
    type: String,
  },
  kw: {
    type: Number,
  },
  volt: {
    type: Number,
  },
  ampere: {
    type: Number,
  },
  teeth: {
    type: Number,
  },
  rotation: {
    type: String,
    enum: ["", "destra", "sinistra"],
  },
  regulator: {
    type: String,
    enum: ["", "incorporato", "esterno"],
  },
  type: {
    type: String,
    enum: ["", "motorino", "alternatore"],
  },
  imageNameOriginal: {
    type: String,
  },
  imageName: {
    type: String,
  },
  notes: {
    type: String,
  },
  price: {
    type: Number,
    get: getPrice, // get from integere cents to decimal units
    set: setPrice, // set from decimal units to integer cents
  },
  currency: {
    type: String,
    enum: Object.keys(config.currencies),
    default: config.currency,
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
}, {
  timestamps: true,
  // collation: {
  //   locale: config.db.collation.locale,
  //   strength: config.db.collation.strength,
  // },
});

function getPrice(num) {
  return (num / 100).toFixed(2);
}

function setPrice(num) {
  return num * 100;
}

ProductSchema.paths.make.options.searchable = true;
ProductSchema.paths.models.options.searchable = true;

// filter deleted documents by default for all `find` and `count` queries
ProductSchema.pre(/^find|^count/, function(next) {
  //const operation = this.op; // we might need the effective operation matched
  const product = this;
  let condition = {};
  if (!this.options.allowDeleted) condition.isDeleted = false;
  product.where(condition);
  next();
});

// // add collation to all `find` queries
// ProductSchema.pre(/^find/, function(next) {
//   if (!this.options.collation) {
//     this.options.collation = {
//       locale: config.db.collation.locale,
//       strength: config.db.collation.strength,
//     };
//     // COLLATION APPLIED: this.options.collation
//   }
//   // COLLATION ALREADY PRESENT: this.options.collation
//   next();
// });

// ProductSchema.post(/^find/, function() {
//   // trap regular expression errors...
//   try {
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

module.exports = mongoose.model("Product", ProductSchema);
