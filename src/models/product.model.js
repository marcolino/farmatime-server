const mongoose = require("mongoose");
const config = require("../config");

const ProductSchema = mongoose.Schema({
  mdaCode: {
    type: String,
  },
  oemCode: {
    type: String,
  },
  make: {
    type: String,
    custom: {
      searchable: true, // this field will be "searchable", i.e.: normalized across diacritics
    }
  },
  models: [{
    type: String,
    custom: {
      searchable: true, // this field will be "searchable", i.e.: normalized across diacritics
    }
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
//     console.log("COLLATION APPLIED:", this.options.collation);
//   }
//   console.log("COLLATION ALREADY PRESENT:", this.options.collation);
//   next();
// });

ProductSchema.post(/^find/, function() {
  // TODO: trap regular expression errors...
});

module.exports = mongoose.model("Product", ProductSchema);
