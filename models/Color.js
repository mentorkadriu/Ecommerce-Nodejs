const mongoose = require("mongoose");

const colorSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
});

const Color = (module.exports = mongoose.model("Colors", colorSchema));

module.exports.colorSchema = colorSchema;

module.exports.getAllColors = function (callback) {
  Color.find(callback);
};

module.exports.getColorById = function (id, callback) {
  Color.findById(id, callback);
};
