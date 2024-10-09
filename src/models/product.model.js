const mongoose = require("mongoose");

const ProductSchema = mongoose.Schema({
  mdaCode: {
    type: String,
  },
  oemCode: {
    type: String,
  },
  make: {
    type: String,
  },
  models: [{
    type: String
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
    enum: ["motorino", "alternatore"],
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
}, {timestamps: true});

ProductSchema.pre(/^find|^count/, function() {
  const operation = this.op; // we might need the effective operation matched
  const product = this;
  let condition = {};
  if (!this.options.allowDeleted) condition.isDeleted = false;
  product.where(condition);
});

module.exports = mongoose.model("Product", ProductSchema);
