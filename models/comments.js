var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var Commentschema = new Schema({
	title: {
		type: String,
	},
	body: {
		type: String,
	}
});

var comments = mongoose.model("comments", Commentschema);
module.exports = comments;