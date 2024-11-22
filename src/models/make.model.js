const mongoose = require("mongoose");

const MakeSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  models: [ // we define models as an array of strings; if it will be preferrable for them to be a mode, see https://chatgpt.com/share/6736cd2c-e648-8003-8f24-3d6cd4c2cb78
    {
      name: {
        type: String,
        required: true
      }
    }]
});

module.exports = mongoose.model("Make", MakeSchema);
