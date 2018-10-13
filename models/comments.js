var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var Commentschema = new Schema({
	title: String,
	body: String
  });

var comments = mongoose.model("comments", Commentschema);

module.exports = comments;